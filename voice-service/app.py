"""
Voice Processing Microservice
Uses local Whisper model with fallback to OpenAI API
"""

import os
import tempfile
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app, origins=['http://localhost:5173', 'http://localhost:3000'])

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global model reference (lazy loaded)
whisper_model = None
WHISPER_MODEL_SIZE = os.getenv('WHISPER_MODEL_SIZE', 'base')  # tiny, base, small, medium, large

def get_whisper_model():
    """Lazy load Whisper model"""
    global whisper_model
    if whisper_model is None:
        try:
            import whisper
            logger.info(f"Loading Whisper model: {WHISPER_MODEL_SIZE}")
            whisper_model = whisper.load_model(WHISPER_MODEL_SIZE)
            logger.info("Whisper model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load Whisper model: {e}")
            return None
    return whisper_model

def transcribe_with_local_whisper(audio_path):
    """Transcribe audio using local Whisper model"""
    model = get_whisper_model()
    if model is None:
        raise Exception("Whisper model not available")
    
    result = model.transcribe(audio_path, language='en')
    return result['text'].strip()

def transcribe_with_openai_api(audio_path):
    """Transcribe audio using OpenAI Whisper API"""
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        raise Exception("OpenAI API key not configured")
    
    from openai import OpenAI
    client = OpenAI(api_key=api_key)
    
    with open(audio_path, 'rb') as audio_file:
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            language="en"
        )
    return transcript.text.strip()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    model_status = "loaded" if whisper_model is not None else "not_loaded"
    openai_configured = bool(os.getenv('OPENAI_API_KEY'))
    
    return jsonify({
        'status': 'ok',
        'service': 'voice-processing',
        'whisper_model': model_status,
        'whisper_model_size': WHISPER_MODEL_SIZE,
        'openai_fallback': openai_configured
    })

@app.route('/transcribe', methods=['POST'])
def transcribe():
    """
    Transcribe audio to text
    Accepts: multipart/form-data with 'audio' file
    Returns: { transcript: string, method: string }
    """
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
    
    audio_file = request.files['audio']
    if audio_file.filename == '':
        return jsonify({'error': 'No audio file selected'}), 400
    
    # Save to temp file
    suffix = '.webm' if 'webm' in audio_file.content_type else '.wav'
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        audio_file.save(tmp.name)
        tmp_path = tmp.name
    
    transcript = None
    method = None
    errors = []
    
    try:
        # Try 1: Local Whisper model
        try:
            logger.info("Attempting transcription with local Whisper model")
            transcript = transcribe_with_local_whisper(tmp_path)
            method = 'local_whisper'
            logger.info(f"Local Whisper transcription successful: {transcript[:50]}...")
        except Exception as e:
            errors.append(f"Local Whisper failed: {str(e)}")
            logger.warning(f"Local Whisper failed: {e}")
            
            # Try 2: OpenAI API fallback
            try:
                logger.info("Attempting transcription with OpenAI API")
                transcript = transcribe_with_openai_api(tmp_path)
                method = 'openai_api'
                logger.info(f"OpenAI API transcription successful: {transcript[:50]}...")
            except Exception as e2:
                errors.append(f"OpenAI API failed: {str(e2)}")
                logger.warning(f"OpenAI API failed: {e2}")
        
        if transcript:
            return jsonify({
                'success': True,
                'transcript': transcript,
                'method': method
            })
        else:
            return jsonify({
                'success': False,
                'error': 'All transcription methods failed',
                'details': errors,
                'fallback_to_browser': True
            }), 503
            
    finally:
        # Clean up temp file
        try:
            os.unlink(tmp_path)
        except:
            pass

@app.route('/preload', methods=['POST'])
def preload_model():
    """Pre-load the Whisper model"""
    try:
        model = get_whisper_model()
        if model:
            return jsonify({'success': True, 'message': 'Model loaded'})
        else:
            return jsonify({'success': False, 'message': 'Failed to load model'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    
    logger.info(f"Starting Voice Processing Service on port {port}")
    logger.info(f"Whisper model size: {WHISPER_MODEL_SIZE}")
    
    # Optionally preload model on startup
    if os.getenv('PRELOAD_MODEL', 'false').lower() == 'true':
        get_whisper_model()
    
    app.run(host='0.0.0.0', port=port, debug=debug)



