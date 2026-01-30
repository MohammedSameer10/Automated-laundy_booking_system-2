# LaundryVoice - Voice-Enabled Laundry Booking Service

A full-featured laundry booking application with voice chat interface. Book laundry services simply by speaking!

## Features

- 🎤 **Voice Booking** - Book services using natural language
- 🤖 **Multi-tier Voice Processing** - Local Whisper → OpenAI API → Browser fallback
- 📅 **Flexible Scheduling** - Choose pickup date and time slots
- ⚡ **Express Delivery** - Same-day delivery option
- 👤 **User Authentication** - Secure login/register with JWT
- 📋 **Booking Management** - View, track, and cancel bookings
- 💎 **Multiple Services** - Wash & Fold, Dry Cleaning, Ironing, Special Care

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │ Voice Chat  │───→│  Recording   │───→│ Transcription    │   │
│  │ Component   │    │  (MediaRec)  │    │ Fallback Chain   │   │
│  └─────────────┘    └──────────────┘    └────────┬─────────┘   │
└────────────────────────────────────────────────────┬────────────┘
                                                     │
                     ┌───────────────────────────────┴───────┐
                     ▼                   ▼                   ▼
            ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
            │ Voice Service│    │  OpenAI API  │    │ Browser Web  │
            │ (Whisper)    │    │  (Whisper)   │    │ Speech API   │
            │ Port: 5000   │    │              │    │              │
            └──────────────┘    └──────────────┘    └──────────────┘
                     │
                     ▼
            ┌──────────────┐
            │   Backend    │───→ SQLite Database
            │ (Express.js) │
            │ Port: 3001   │
            └──────────────┘
```

## Tech Stack

- **Backend**: Express.js, SQLite (better-sqlite3), JWT Authentication
- **Frontend**: React 18, Vite, React Router
- **Voice Service**: Python, Flask, OpenAI Whisper (open-source)
- **Voice Fallback**: OpenAI Whisper API, Web Speech API

## Quick Start

### Prerequisites

- Node.js 18+ installed
- Python 3.9+ (for voice service, optional)
- npm or yarn

### 1. Backend Setup

```bash
cd backend
npm install
npm run init-db
npm start
```

Server runs on http://localhost:3001

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

App runs on http://localhost:5173

### 3. Voice Service Setup (Optional - for better accuracy)

```bash
cd voice-service
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Voice service runs on http://localhost:5000

**Note**: First run downloads the Whisper model (~140MB for base).

## Voice Processing Fallback Chain

1. **Local Whisper** (Primary) - Free, private, runs locally
2. **OpenAI API** (Secondary) - More reliable, requires API key
3. **Browser Speech** (Fallback) - Free, works without backend

### Configure OpenAI API (Optional)

Create `frontend/.env`:
```
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_VOICE_SERVICE_URL=http://localhost:5000
```

## Usage

### Voice Commands

The voice assistant understands natural language:

- "Book wash and fold for tomorrow at 2 PM"
- "Schedule dry cleaning for Saturday morning"
- "I need express delivery for ironing"
- "What services do you offer?"
- "Cancel my booking"

### Manual Booking

1. Sign up or log in
2. Go to Dashboard
3. Switch to "Form" mode
4. Select a service
5. Choose pickup date and time
6. Confirm booking

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile

### Services
- `GET /api/services` - List all services
- `GET /api/services/slots/available` - Get available time slots

### Bookings
- `POST /api/bookings` - Create booking
- `POST /api/bookings/voice` - Create booking from voice command
- `GET /api/bookings` - Get user's bookings
- `PATCH /api/bookings/:id/cancel` - Cancel booking

### Voice Service
- `GET /health` - Health check
- `POST /transcribe` - Transcribe audio file
- `POST /preload` - Pre-load Whisper model

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── index.js          # Express server
│   │   ├── db/               # Database setup
│   │   ├── routes/           # API routes
│   │   ├── middleware/       # Auth middleware
│   │   └── utils/            # Voice parser
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/            # Page components
│   │   ├── hooks/            # Custom hooks (voice recognition)
│   │   ├── context/          # Auth context
│   │   └── services/         # API service
│   └── package.json
├── voice-service/
│   ├── app.py                # Flask voice service
│   ├── requirements.txt      # Python dependencies
│   └── README.md             # Voice service docs
└── README.md
```

## Services Available

| Service | Price | Description |
|---------|-------|-------------|
| Wash & Fold | $15 | Professional washing and folding |
| Dry Only | $10 | Machine drying service |
| Wash & Iron | $25 | Washing with professional ironing |
| Dry Cleaning | $35 | Premium dry cleaning for delicates |
| Special Care | $45 | Specialized care for luxury items |
| Express Delivery | +$10 | Same-day delivery addon |

## Whisper Model Sizes

| Model  | Size  | VRAM   | Speed   | Accuracy |
|--------|-------|--------|---------|----------|
| tiny   | 39M   | ~1GB   | Fastest | Basic    |
| base   | 74M   | ~1GB   | Fast    | Good     |
| small  | 244M  | ~2GB   | Medium  | Better   |
| medium | 769M  | ~5GB   | Slow    | Great    |
| large  | 1550M | ~10GB  | Slowest | Best     |

Set `WHISPER_MODEL_SIZE=base` in voice-service `.env` for best balance.

## Browser Support

- Chrome (recommended) - Full support
- Edge - Full support
- Safari - Full support
- Firefox - Limited (no Web Speech API)

## License

MIT
