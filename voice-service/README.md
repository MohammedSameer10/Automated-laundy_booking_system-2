# Voice Processing Microservice

Python microservice using OpenAI's open-source Whisper model for accurate speech-to-text transcription.

## Features

- **Local Whisper Model**: Uses OpenAI's open-source Whisper for privacy and no API costs
- **OpenAI API Fallback**: Falls back to OpenAI Whisper API if local model fails
- **Browser Fallback**: Frontend falls back to Web Speech API if service is unavailable

## Setup

### 1. Create Virtual Environment

```bash
cd voice-service
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

Note: First run will download the Whisper model (~140MB for base model).

### 3. Configure Environment

Create a `.env` file:

```env
# Whisper model size: tiny, base, small, medium, large
WHISPER_MODEL_SIZE=base

# OpenAI API key for fallback (optional)
OPENAI_API_KEY=your_key_here

# Server settings
PORT=5000
FLASK_DEBUG=false
PRELOAD_MODEL=false
```

### 4. Run the Service

```bash
python app.py
```

Or with Gunicorn (production):

```bash
gunicorn -w 2 -b 0.0.0.0:5000 app:app
```

## API Endpoints

### POST /transcribe

Transcribe audio file to text.

**Request**: `multipart/form-data` with `audio` file field

**Response**:
```json
{
  "success": true,
  "transcript": "book wash and fold for tomorrow at 2 pm",
  "method": "local_whisper"
}
```

### GET /health

Health check endpoint.

**Response**:
```json
{
  "status": "ok",
  "service": "voice-processing",
  "whisper_model": "loaded",
  "whisper_model_size": "base",
  "openai_fallback": true
}
```

### POST /preload

Pre-load the Whisper model into memory.

## Model Sizes

| Model  | Size  | VRAM   | Speed   | Accuracy |
|--------|-------|--------|---------|----------|
| tiny   | 39M   | ~1GB   | Fastest | Basic    |
| base   | 74M   | ~1GB   | Fast    | Good     |
| small  | 244M  | ~2GB   | Medium  | Better   |
| medium | 769M  | ~5GB   | Slow    | Great    |
| large  | 1550M | ~10GB  | Slowest | Best     |

For laundry booking commands, `base` model provides excellent accuracy.


