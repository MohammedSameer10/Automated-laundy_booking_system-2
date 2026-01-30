import { useState, useEffect, useCallback, useRef } from 'react';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// Voice service URL
const VOICE_SERVICE_URL = import.meta.env.VITE_VOICE_SERVICE_URL || 'http://localhost:5000';
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';

export function useVoiceRecognition() {
    const [isListening, setIsListening] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [error, setError] = useState(null);
    const [isSupported, setIsSupported] = useState(false);
    const [transcriptionMethod, setTranscriptionMethod] = useState(null);
    const [voiceServiceAvailable, setVoiceServiceAvailable] = useState(null);
    
    const recognitionRef = useRef(null);
    const synthRef = useRef(window.speechSynthesis);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    // Check voice service availability on mount
    useEffect(() => {
        checkVoiceServiceHealth();
    }, []);

    // Setup browser speech recognition
    useEffect(() => {
        if (!SpeechRecognition) {
            // If no browser support, we can still use recording + Whisper
            setIsSupported(true);
            return;
        }

        setIsSupported(true);
        
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsListening(true);
            setError(null);
            setTranscript('');
            setInterimTranscript('');
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.onerror = (event) => {
            setIsListening(false);
            
            switch (event.error) {
                case 'not-allowed':
                    setError('Microphone access denied. Please allow microphone access.');
                    break;
                case 'no-speech':
                    setError('No speech detected. Please try again.');
                    break;
                case 'network':
                    setError('Network error. Please check your connection.');
                    break;
                default:
                    setError(`Speech recognition error: ${event.error}`);
            }
        };

        recognition.onresult = (event) => {
            let finalTranscript = '';
            let interim = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalTranscript += result[0].transcript;
                } else {
                    interim += result[0].transcript;
                }
            }

            if (finalTranscript) {
                setTranscript(finalTranscript);
                setInterimTranscript('');
                setTranscriptionMethod('browser');
            } else {
                setInterimTranscript(interim);
            }
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (e) {
                    // Ignore errors during cleanup
                }
            }
        };
    }, []);

    async function checkVoiceServiceHealth() {
        try {
            const response = await fetch(`${VOICE_SERVICE_URL}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(3000)
            });
            if (response.ok) {
                const data = await response.json();
                setVoiceServiceAvailable(true);
                console.log('Voice service available:', data);
            } else {
                setVoiceServiceAvailable(false);
            }
        } catch (err) {
            console.log('Voice service not available, using fallbacks');
            setVoiceServiceAvailable(false);
        }
    }

    async function transcribeWithVoiceService(audioBlob) {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');

        const response = await fetch(`${VOICE_SERVICE_URL}/transcribe`, {
            method: 'POST',
            body: formData,
            signal: AbortSignal.timeout(30000)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Transcription failed');
        }

        const data = await response.json();
        if (data.success) {
            return { transcript: data.transcript, method: data.method };
        } else if (data.fallback_to_browser) {
            throw new Error('Service suggests browser fallback');
        } else {
            throw new Error(data.error || 'Unknown error');
        }
    }

    async function transcribeWithOpenAI(audioBlob) {
        if (!OPENAI_API_KEY) {
            throw new Error('OpenAI API key not configured');
        }

        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.webm');
        formData.append('model', 'whisper-1');
        formData.append('language', 'en');

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: formData,
            signal: AbortSignal.timeout(30000)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'OpenAI API failed');
        }

        const data = await response.json();
        return { transcript: data.text, method: 'openai_api' };
    }

    const startRecording = useCallback(async () => {
        try {
            audioChunksRef.current = [];
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
            });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());

                if (audioChunksRef.current.length === 0) {
                    setError('No audio recorded');
                    return;
                }

                const audioBlob = new Blob(audioChunksRef.current, { 
                    type: mediaRecorder.mimeType 
                });

                setInterimTranscript('Processing audio...');

                // Try transcription with fallbacks
                try {
                    let result = null;

                    // Method 1: Try voice service (local Whisper)
                    if (voiceServiceAvailable) {
                        try {
                            console.log('Trying voice service...');
                            result = await transcribeWithVoiceService(audioBlob);
                        } catch (err) {
                            console.warn('Voice service failed:', err.message);
                        }
                    }

                    // Method 2: Try OpenAI API directly
                    if (!result && OPENAI_API_KEY) {
                        try {
                            console.log('Trying OpenAI API...');
                            result = await transcribeWithOpenAI(audioBlob);
                        } catch (err) {
                            console.warn('OpenAI API failed:', err.message);
                        }
                    }

                    if (result) {
                        setTranscript(result.transcript);
                        setTranscriptionMethod(result.method);
                        setInterimTranscript('');
                        console.log(`Transcription successful via ${result.method}:`, result.transcript);
                    } else {
                        throw new Error('All transcription methods failed');
                    }
                } catch (err) {
                    setError('Transcription failed. Try using the browser speech button instead.');
                    setInterimTranscript('');
                }
            };

            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start();
            setIsRecording(true);
            setError(null);
            setTranscript('');
            setInterimTranscript('Recording...');
        } catch (err) {
            setError('Failed to start recording: ' + err.message);
        }
    }, [voiceServiceAvailable]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    }, [isRecording]);

    const startListening = useCallback(() => {
        // If voice service is available, use recording + Whisper for better accuracy
        if (voiceServiceAvailable || OPENAI_API_KEY) {
            startRecording();
        } else if (recognitionRef.current && !isListening) {
            // Fall back to browser speech recognition
            try {
                synthRef.current.cancel();
                recognitionRef.current.start();
                setTranscriptionMethod('browser');
            } catch (e) {
                console.error('Failed to start recognition:', e);
            }
        }
    }, [isListening, voiceServiceAvailable, startRecording]);

    const stopListening = useCallback(() => {
        if (isRecording) {
            stopRecording();
        } else if (recognitionRef.current && isListening) {
            try {
                recognitionRef.current.stop();
            } catch (e) {
                console.error('Failed to stop recognition:', e);
            }
        }
    }, [isListening, isRecording, stopRecording]);

    // Use browser speech recognition directly (fallback button)
    const startBrowserListening = useCallback(() => {
        if (recognitionRef.current && !isListening) {
            try {
                synthRef.current.cancel();
                recognitionRef.current.start();
                setTranscriptionMethod('browser');
            } catch (e) {
                console.error('Failed to start browser recognition:', e);
            }
        }
    }, [isListening]);

    const speak = useCallback((text, onEnd = null) => {
        if (!synthRef.current) return;

        synthRef.current.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 1;
        utterance.pitch = 1;
        
        const voices = synthRef.current.getVoices();
        const preferredVoice = voices.find(v => 
            v.name.includes('Samantha') || 
            v.name.includes('Google') || 
            v.name.includes('Female') ||
            v.lang.startsWith('en')
        );
        
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        if (onEnd) {
            utterance.onend = onEnd;
        }

        synthRef.current.speak(utterance);
    }, []);

    const cancelSpeech = useCallback(() => {
        if (synthRef.current) {
            synthRef.current.cancel();
        }
    }, []);

    const resetTranscript = useCallback(() => {
        setTranscript('');
        setInterimTranscript('');
        setError(null);
        setTranscriptionMethod(null);
    }, []);

    return {
        isListening: isListening || isRecording,
        isRecording,
        transcript,
        interimTranscript,
        error,
        isSupported,
        transcriptionMethod,
        voiceServiceAvailable,
        startListening,
        stopListening,
        startBrowserListening,
        speak,
        cancelSpeech,
        resetTranscript,
        checkVoiceServiceHealth
    };
}

export default useVoiceRecognition;
