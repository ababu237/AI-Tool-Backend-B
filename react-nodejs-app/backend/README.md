# Healthcare Assistant Backend API

Node.js/Express backend server providing AI-powered healthcare assistance APIs.

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Configuration

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:

```env
OPENAI_API_KEY=your_api_key_here
PORT=8000
FRONTEND_URL=http://localhost:3000
```

### Running the Server

**Development:**

```bash
npm run dev
```

**Production:**

```bash
npm start
```

## 📡 API Endpoints

### Health Check

```
GET /health
```

### API Info

```
GET /api/info
```

### Clinical Chat

```
POST /api/clinical-chat/send
POST /api/clinical-chat/clear
GET /api/clinical-chat/history/:sessionId
```

### Document Processing

```
POST /api/document/upload
POST /api/document/query
DELETE /api/document/:fileId
```

### CSV Processing

```
POST /api/csv/upload
POST /api/csv/query
DELETE /api/csv/:fileId
```

### Organ Analysis

```
POST /api/organ-analyzer/analyze
GET /api/organ-analyzer/supported-organs
```

### Transcription

```
POST /api/transcription/transcribe
POST /api/transcription/translate-audio
```

### Translation

```
POST /api/translation/translate
POST /api/translation/text-to-speech
POST /api/translation/translate-and-speak
GET /api/translation/supported-languages
```

## 🔧 Tech Stack

- Express.js 4.x
- OpenAI API
- Multer (file uploads)
- pdf-parse (PDF processing)
- csv-parser (CSV processing)
- gtts (text-to-speech)
- Sharp (image processing)

## 📁 Project Structure

```
backend/
├── routes/              # API route handlers
│   ├── clinicalChat.js
│   ├── document.js
│   ├── csv.js
│   ├── organAnalyzer.js
│   ├── transcription.js
│   └── translation.js
├── utils/               # Helper functions
│   └── helpers.js
├── uploads/             # Temporary file storage
├── temp/                # Temp files
├── audio_outputs/       # Generated audio files
├── translated_csvs/     # Translated CSV files
├── server.js            # Main server file
├── package.json
└── .env                 # Environment variables
```

## 🔐 Security Features

- Helmet.js for security headers
- CORS configuration
- Rate limiting (100 req/15min)
- File size limits
- Input validation

## 📝 Environment Variables

| Variable         | Description         | Default               |
| ---------------- | ------------------- | --------------------- |
| `NODE_ENV`       | Environment         | development           |
| `PORT`           | Server port         | 8000                  |
| `FRONTEND_URL`   | Frontend URL (CORS) | http://localhost:3000 |
| `OPENAI_API_KEY` | OpenAI API key      | required              |
| `MASTER_API_KEY` | Optional API key    | optional              |

## 🐛 Debugging

Enable detailed logging:

```bash
NODE_ENV=development npm run dev
```

Check logs in console output.

## 📦 Dependencies

See `package.json` for full list.

Key dependencies:

- `express`: Web framework
- `openai`: OpenAI API client
- `multer`: File upload handling
- `pdf-parse`: PDF text extraction
- `csv-parser`: CSV parsing
- `gtts`: Text-to-speech
- `sharp`: Image processing

## 🤝 API Usage Examples

### Send Clinical Chat Message

```javascript
POST /api/clinical-chat/send
Content-Type: application/json

{
  "query": "What are the symptoms of diabetes?",
  "outputLanguage": "en",
  "sessionId": "user123"
}
```

### Upload Document

```javascript
POST /api/document/upload
Content-Type: multipart/form-data

file: [PDF file]
```

### Query Document

```javascript
POST /api/document/query
Content-Type: application/json

{
  "fileId": "uuid-here",
  "question": "What is the main topic?",
  "outputLanguage": "en"
}
```

## 📄 License

MIT
