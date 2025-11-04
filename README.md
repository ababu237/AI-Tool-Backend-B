# Render Node Healthcare Backend

This folder is a deployment-ready Node.js Express version of the healthcare backend APIs that mirror the Python `backend_api` functionality:

Services:
- Clinical Chat (`/clinical/chat`)
- Document Q&A (`/document/process`)
- CSV Analysis (`/csv/process`)
- Organ Analyzer placeholder (`/organ/analyze`)
- Transcription stub (`/transcription/transcribe`)
- Translation placeholder (`/translation/translate`)
- Text-to-Speech (`/tts/speak`)

## Quick Start
```bash
npm install
npm start
```

Then visit: `http://localhost:8080/health`

## Environment Variables
| Name | Description |
|------|-------------|
| OPENAI_API_KEY | Required for clinical/chat, document, csv. If missing those endpoints return configuration error. |
| MASTER_API_KEY | Optional. If set, all API routes require `x-api-key` header. |
| ALLOWED_ORIGINS | Comma-separated list for CORS allowlist. |
| PORT | Port to bind (default 8080). |

Create a `.env` file:
```
OPENAI_API_KEY=sk-yourkey
MASTER_API_KEY=your-master-api-key
ALLOWED_ORIGINS=http://localhost:3000
PORT=8080
```

## Render Deployment
Add a service with:
- Build Command: `npm install`
- Start Command: `npm start`
- Root Directory: `render_node_backend_api`
- Environment Variables: set above keys.

Alternatively use a `render.yaml` at repo root to define the service.

## Notes
- Transcription currently returns a stub (no real audio model call). Integrate Whisper/Audio API later.
- Translation is a pass-through placeholder.
- Organ analyzer is a static placeholder until a real model integration.
- For production, replace placeholder logic and add rate limiting & logging.

## License
Internal use; adapt for public distribution as needed.
