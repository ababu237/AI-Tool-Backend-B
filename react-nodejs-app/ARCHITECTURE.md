# Healthcare Assistant - System Architecture

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         User Browser                         │
│                    (http://localhost:3000)                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ HTTP/REST API
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                      React Frontend                          │
│  ┌────────────┐ ┌──────────────┐ ┌─────────────────────┐  │
│  │   Pages    │ │  Components  │ │   API Services      │  │
│  │            │ │              │ │                     │  │
│  │ • Home     │ │ • Header     │ │ • clinicalChatAPI  │  │
│  │ • Clinical │ │ • Navigation │ │ • documentAPI      │  │
│  │ • Document │ │ • Audio      │ │ • csvAPI           │  │
│  │ • Organ    │ │ • Language   │ │ • organAnalyzerAPI │  │
│  │ • Speech   │ │              │ │ • transcriptionAPI │  │
│  │ • TTS      │ │              │ │ • translationAPI   │  │
│  └────────────┘ └──────────────┘ └─────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ axios HTTP requests
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   Express.js Backend                         │
│                  (http://localhost:8000)                     │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Middleware Layer                       │   │
│  │  • CORS        • Helmet      • Rate Limiting       │   │
│  │  • Compression • Body Parser • Morgan Logger       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Route Handlers                         │   │
│  │                                                      │   │
│  │  ┌──────────────────┐  ┌───────────────────┐      │   │
│  │  │ clinicalChat.js  │  │  document.js      │      │   │
│  │  │  /clinical-chat  │  │  /document        │      │   │
│  │  └──────────────────┘  └───────────────────┘      │   │
│  │                                                      │   │
│  │  ┌──────────────────┐  ┌───────────────────┐      │   │
│  │  │   csv.js         │  │  organAnalyzer.js │      │   │
│  │  │   /csv           │  │  /organ-analyzer  │      │   │
│  │  └──────────────────┘  └───────────────────┘      │   │
│  │                                                      │   │
│  │  ┌──────────────────┐  ┌───────────────────┐      │   │
│  │  │ transcription.js │  │  translation.js   │      │   │
│  │  │ /transcription   │  │  /translation     │      │   │
│  │  └──────────────────┘  └───────────────────┘      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Helper Functions                       │   │
│  │  • translateText()    • textToSpeechBase64()       │   │
│  │  • detectLanguage()   • File processing utils      │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ API Calls
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                      External APIs                           │
│                                                              │
│  ┌───────────────────┐  ┌───────────────────────────────┐  │
│  │   OpenAI API      │  │  Google Translate API         │  │
│  │                   │  │                               │  │
│  │ • GPT-3.5/4       │  │ • Text Translation            │  │
│  │ • Whisper         │  │ • Language Detection          │  │
│  │ • GPT-4 Vision    │  │                               │  │
│  └───────────────────┘  └───────────────────────────────┘  │
│                                                              │
│  ┌───────────────────┐                                      │
│  │   gTTS Service    │                                      │
│  │                   │                                      │
│  │ • Text-to-Speech  │                                      │
│  │ • Multi-language  │                                      │
│  └───────────────────┘                                      │
└──────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow Examples

### Example 1: Clinical Chat Flow

```
User Types Question
       │
       ▼
React Clinical Chat Component
       │
       ▼
axios POST /api/clinical-chat/send
       │
       ▼
Express clinicalChat Route Handler
       │
       ├─► OpenAI API (GPT-3.5)
       │   └─► AI Response
       │
       ├─► detectLanguage(response)
       │
       ├─► translateText(response, targetLang)
       │
       └─► textToSpeechBase64(translatedText)
       │
       ▼
JSON Response with text + audio
       │
       ▼
React Component Updates State
       │
       ▼
Display Message + Play Audio
```

### Example 2: Document Upload & Query Flow

```
User Uploads PDF
       │
       ▼
React Document Analyzer
       │
       ▼
multer file upload /api/document/upload
       │
       ▼
pdf-parse extracts text
       │
       ▼
Store in memory with fileId
       │
       ▼
Return fileId to frontend
       │
User Asks Question
       │
       ▼
POST /api/document/query { fileId, question }
       │
       ▼
Retrieve document from store
       │
       ▼
OpenAI API with document context
       │
       ▼
Translate & Generate Audio
       │
       ▼
Return answer + audio to frontend
```

## 📊 Component Interaction Matrix

| Frontend Component     | Backend Route             | External API     |
| ---------------------- | ------------------------- | ---------------- |
| ClinicalChat           | /clinical-chat/send       | OpenAI GPT       |
| DocumentAnalyzer       | /document/upload          | -                |
| DocumentAnalyzer       | /document/query           | OpenAI GPT       |
| DocumentAnalyzer (CSV) | /csv/upload               | -                |
| DocumentAnalyzer (CSV) | /csv/query                | OpenAI GPT       |
| OrganAnalyzer          | /organ-analyzer/analyze   | OpenAI Vision    |
| SpeechToText           | /transcription/transcribe | OpenAI Whisper   |
| TextToSpeech           | /translation/translate    | Google Translate |
| All Components         | (audio responses)         | gTTS             |

## 🔐 Security Layers

```
┌─────────────────────────────────────────┐
│          Rate Limiting Layer            │
│      (100 requests / 15 minutes)        │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│            CORS Layer                   │
│    (Whitelist frontend origin)          │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│          Helmet Security                │
│    (Security headers, XSS protection)   │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│        File Upload Limits               │
│    (Max 50MB, type validation)          │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│      Environment Variables              │
│    (API keys, secrets in .env)          │
└─────────────────────────────────────────┘
```

## 📦 File Storage Strategy

```
Backend Temporary Storage:
├── uploads/           (uploaded files - auto-cleanup)
├── temp/              (temporary processing)
├── audio_outputs/     (generated audio - auto-cleanup)
└── translated_csvs/   (processed CSVs - auto-cleanup)

In-Memory Storage:
├── documentStore (Map) - Document data by fileId
├── csvStore (Map)      - CSV data by fileId
└── conversationHistories (Map) - Chat history by sessionId

Note: All temporary files are cleaned up after 60 minutes
```

## 🌐 API Response Format

All API endpoints follow consistent format:

```json
{
  "success": true,
  "data": {
    // Response data here
    "audioBase64": "base64_encoded_audio",
    "audioFormat": "mp3"
  },
  "meta": {
    // Optional metadata
  }
}
```

Error response:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "details": "Additional error info"
  }
}
```

## 🚀 Deployment Architecture

```
Production Setup:

Frontend (Static):
├─► Vercel / Netlify / AWS S3
│   └─► CDN (CloudFront)
│
Backend (API):
├─► Heroku / AWS EC2 / DigitalOcean
│   ├─► Load Balancer (optional)
│   └─► Auto-scaling (optional)
│
Environment:
├─► Environment Variables (secure storage)
├─► HTTPS/SSL Certificates
└─► Monitoring (Sentry, LogRocket, etc.)
```

## 📈 Scalability Considerations

For production scaling:

1. **Replace In-Memory Storage**

   - Use Redis for session/file storage
   - Use PostgreSQL/MongoDB for permanent data

2. **Add Caching Layer**

   - Cache OpenAI responses
   - Cache translations
   - Use CDN for static assets

3. **Queue System**

   - Use RabbitMQ/Bull for async processing
   - Background jobs for large file processing

4. **Load Balancing**
   - Horizontal scaling with multiple backend instances
   - Session store in Redis for consistency

## 🔍 Monitoring Points

Key metrics to monitor:

- API response times
- OpenAI API usage/costs
- File upload success rate
- Error rates by endpoint
- User session duration
- Memory usage
- CPU usage
- Disk I/O

---

This architecture provides a solid foundation that's:

- **Scalable**: Can grow with usage
- **Maintainable**: Clear separation of concerns
- **Secure**: Multiple security layers
- **Performant**: Optimized for speed
- **Reliable**: Error handling throughout
