import { useState, useEffect } from 'react';
import useVoiceRecognition from '../hooks/useVoiceRecognition';
import api from '../services/api';
import './VoiceChat.css';

const METHOD_LABELS = {
    'local_whisper': '🤖 Local Whisper',
    'openai_api': '☁️ OpenAI API',
    'browser': '🌐 Browser'
};

function VoiceChat({ onBookingCreated }) {
    const {
        isListening,
        isRecording,
        transcript,
        interimTranscript,
        error: voiceError,
        isSupported,
        transcriptionMethod,
        voiceServiceAvailable,
        startListening,
        stopListening,
        startBrowserListening,
        speak,
        resetTranscript
    } = useVoiceRecognition();

    const [messages, setMessages] = useState([
        {
            type: 'assistant',
            text: "Hi! I'm your laundry assistant. Tap the microphone and tell me what you need. You can say things like \"Book a wash and fold for tomorrow at 2 PM\" or \"What services do you offer?\""
        }
    ]);
    const [isProcessing, setIsProcessing] = useState(false);

    // Process transcript when user stops speaking
    useEffect(() => {
        if (transcript && !isListening && !isProcessing) {
            processVoiceCommand(transcript);
        }
    }, [transcript, isListening]);

    async function processVoiceCommand(text) {
        setIsProcessing(true);
        
        // Add user message with transcription method
        setMessages(prev => [...prev, { 
            type: 'user', 
            text,
            method: transcriptionMethod
        }]);
        resetTranscript();

        try {
            const response = await api.createVoiceBooking(text);
            
            let assistantMessage = response.message;
            
            // Add assistant response
            setMessages(prev => [...prev, { 
                type: 'assistant', 
                text: assistantMessage,
                booking: response.booking,
                services: response.services
            }]);

            // Speak the response
            speak(assistantMessage);

            // Notify parent if booking was created
            if (response.success && response.booking && onBookingCreated) {
                onBookingCreated(response.booking);
            }
        } catch (err) {
            const errorMsg = "Sorry, I couldn't process that. Please try again.";
            setMessages(prev => [...prev, { type: 'assistant', text: errorMsg }]);
            speak(errorMsg);
        } finally {
            setIsProcessing(false);
        }
    }

    function handleMicClick() {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    }

    function handleBrowserFallback() {
        if (!isListening) {
            startBrowserListening();
        }
    }

    if (!isSupported) {
        return (
            <div className="voice-chat voice-unsupported">
                <div className="voice-unsupported-content">
                    <span className="voice-unsupported-icon">🎤</span>
                    <h3>Voice Not Supported</h3>
                    <p>Your browser doesn't support voice recognition. Please use Chrome, Edge, or Safari.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="voice-chat">
            <div className="voice-header">
                <div className="voice-header-icon">🎙️</div>
                <div className="voice-header-content">
                    <h3>Voice Assistant</h3>
                    <p>Book laundry services by speaking</p>
                </div>
                <div className="voice-service-status">
                    {voiceServiceAvailable === null ? (
                        <span className="status-checking">⏳</span>
                    ) : voiceServiceAvailable ? (
                        <span className="status-online" title="Whisper AI active">🤖 AI</span>
                    ) : (
                        <span className="status-browser" title="Using browser speech">🌐</span>
                    )}
                </div>
            </div>

            <div className="voice-messages">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`voice-message ${msg.type}`}>
                        {msg.type === 'assistant' && (
                            <div className="message-avatar">🤖</div>
                        )}
                        <div className="message-content">
                            <p>{msg.text}</p>
                            
                            {msg.method && (
                                <span className="message-method">
                                    {METHOD_LABELS[msg.method] || msg.method}
                                </span>
                            )}
                            
                            {msg.booking && (
                                <div className="message-booking-card">
                                    <div className="booking-card-header">
                                        <span className="booking-icon">✅</span>
                                        <span>Booking Confirmed</span>
                                    </div>
                                    <div className="booking-card-details">
                                        <div><strong>{msg.booking.service_name}</strong></div>
                                        <div>📅 {msg.booking.pickup_date} at {msg.booking.pickup_time}</div>
                                        <div>💰 ${msg.booking.total_price}</div>
                                    </div>
                                </div>
                            )}

                            {msg.services && (
                                <div className="message-services">
                                    {msg.services.map(service => (
                                        <div key={service.id} className="service-chip">
                                            {service.name} - ${service.price}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {msg.type === 'user' && (
                            <div className="message-avatar user-avatar">🗣️</div>
                        )}
                    </div>
                ))}

                {(isListening || interimTranscript) && (
                    <div className="voice-message user interim">
                        <div className="message-content">
                            <p>{interimTranscript || (isRecording ? 'Recording...' : 'Listening...')}</p>
                        </div>
                        <div className="message-avatar user-avatar">🗣️</div>
                    </div>
                )}

                {isProcessing && (
                    <div className="voice-message assistant">
                        <div className="message-avatar">🤖</div>
                        <div className="message-content">
                            <div className="typing-indicator">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {voiceError && (
                <div className="voice-error">
                    <span>⚠️</span> {voiceError}
                    {!voiceServiceAvailable && (
                        <button className="browser-fallback-btn" onClick={handleBrowserFallback}>
                            Try Browser Speech
                        </button>
                    )}
                </div>
            )}

            <div className="voice-controls">
                <div className="mic-buttons">
                    <button 
                        className={`mic-button ${isListening ? 'listening' : ''} ${isProcessing ? 'processing' : ''}`}
                        onClick={handleMicClick}
                        disabled={isProcessing}
                    >
                        <span className="mic-icon">{isListening ? '🔴' : '🎤'}</span>
                        {isListening && (
                            <>
                                <span className="ripple"></span>
                                <span className="ripple delay"></span>
                            </>
                        )}
                    </button>
                    
                    {voiceServiceAvailable && (
                        <button 
                            className="browser-mic-button"
                            onClick={handleBrowserFallback}
                            disabled={isListening || isProcessing}
                            title="Use browser speech recognition"
                        >
                            🌐
                        </button>
                    )}
                </div>
                <p className="voice-hint">
                    {isRecording ? 'Recording... Tap to stop' : 
                     isListening ? 'Listening... Tap to stop' : 
                     isProcessing ? 'Processing...' : 
                     'Tap to speak'}
                </p>
                {voiceServiceAvailable && (
                    <p className="voice-method-hint">
                        Using Whisper AI for accurate transcription
                    </p>
                )}
            </div>

            <div className="voice-suggestions">
                <p>Try saying:</p>
                <div className="suggestion-chips">
                    <button onClick={() => speak("You can say: Book wash and fold for tomorrow at 2 PM")}>
                        "Book wash and fold for tomorrow at 2 PM"
                    </button>
                    <button onClick={() => speak("You can say: What services do you offer?")}>
                        "What services do you offer?"
                    </button>
                    <button onClick={() => speak("You can say: Schedule dry cleaning for Saturday morning")}>
                        "Schedule dry cleaning for Saturday"
                    </button>
                </div>
            </div>
        </div>
    );
}

export default VoiceChat;
