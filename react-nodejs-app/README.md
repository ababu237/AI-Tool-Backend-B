# Healthcare Assistant - React & Node.js Application

A comprehensive healthcare assistant platform built with React and Node.js, featuring AI-powered medical chat, document analysis, organ scan analysis, speech-to-text transcription, and multilingual translation.

## 🏗️ Project Structure

```
react-nodejs-app/
├── backend/                 # Node.js/Express API Server
│   ├── routes/             # API route handlers
│   ├── utils/              # Helper functions
│   ├── server.js           # Main server file
│   └── package.json        # Backend dependencies
├── frontend/               # React Application
│   ├── public/            # Static files
│   ├── src/
│   │   ├── components/    # Reusable React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API service layer
│   │   ├── App.js         # Main App component
│   │   └── index.js       # Entry point
│   └── package.json       # Frontend dependencies
└── README.md              # This file
```

## ✨ Features

### 1. **Clinical Chat Assistant** 💬

- AI-powered medical Q&A using GPT-3.5/GPT-4
- Multi-language support with automatic translation
- Text-to-speech audio responses
- Conversation history management

### 2. **Document & CSV Analyzer** 📄

- Upload and analyze PDF documents
- CSV file data analysis
- AI-powered question answering
- Multi-language support

### 3. **Organ Scan Analyzer** 🔬

- Medical image analysis using GPT-4 Vision
- Support for various organ scans (lung, heart, brain, etc.)
- Diagnostic recommendations
- Multi-language results

### 4. **Speech to Text** 🎤

- Audio transcription using OpenAI Whisper
- Multi-language transcription
- Translation support
- Audio file format support (MP3, WAV, WebM, M4A)

### 5. **Text Translation & TTS** 🌐

- Text translation between 20+ languages
- Text-to-speech generation
- Combined translation and audio output

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **OpenAI API Key** (required for AI features)

### Installation

#### 1. Clone the Repository

```bash
cd react-nodejs-app
```

#### 2. Backend Setup

```bash
cd backend
npm install

# Create environment file
cp .env.example .env

# Edit .env and add your OpenAI API key
# OPENAI_API_KEY=your_api_key_here
```

#### 3. Frontend Setup

```bash
cd ../frontend
npm install

# Create environment file
cp .env.example .env

# Edit .env if needed (default backend URL is http://localhost:8000/api)
```

## 🏃 Running the Application

### Development Mode

**Terminal 1 - Start Backend:**

```bash
cd backend
npm run dev
```

Backend will run on `http://localhost:8000`

**Terminal 2 - Start Frontend:**

```bash
cd frontend
npm start
```

Frontend will run on `http://localhost:3000`

### Production Mode

**Backend:**

```bash
cd backend
npm start
```

**Frontend:**

```bash
cd frontend
npm run build
# Serve the build folder with your preferred static server
```

## 📋 API Endpoints

### Clinical Chat

- `POST /api/clinical-chat/send` - Send message to AI assistant
- `POST /api/clinical-chat/clear` - Clear conversation history
- `GET /api/clinical-chat/history/:sessionId` - Get chat history

### Document Analysis

- `POST /api/document/upload` - Upload PDF document
- `POST /api/document/query` - Query uploaded document
- `DELETE /api/document/:fileId` - Delete document

### CSV Analysis

- `POST /api/csv/upload` - Upload CSV file
- `POST /api/csv/query` - Query CSV data
- `DELETE /api/csv/:fileId` - Delete CSV

### Organ Analyzer

- `POST /api/organ-analyzer/analyze` - Analyze medical image
- `GET /api/organ-analyzer/supported-organs` - Get supported organ types

### Transcription

- `POST /api/transcription/transcribe` - Transcribe audio
- `POST /api/transcription/translate-audio` - Transcribe and translate to English

### Translation

- `POST /api/translation/translate` - Translate text
- `POST /api/translation/text-to-speech` - Convert text to speech
- `POST /api/translation/translate-and-speak` - Translate and generate audio
- `GET /api/translation/supported-languages` - Get supported languages

## 🔐 Environment Variables

### Backend (.env)

```env
NODE_ENV=development
PORT=8000
FRONTEND_URL=http://localhost:3000
OPENAI_API_KEY=your_openai_api_key_here
```

### Frontend (.env)

```env
REACT_APP_API_URL=http://localhost:8000/api
```

## 🛠️ Technology Stack

### Backend

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **OpenAI API** - AI models (GPT-3.5/4, Whisper, Vision)
- **Multer** - File upload handling
- **pdf-parse** - PDF text extraction
- **csv-parser** - CSV file parsing
- **gtts** - Text-to-speech generation
- **google-translate-api-x** - Translation service

### Frontend

- **React** - UI framework
- **React Router** - Routing
- **Axios** - HTTP client
- **CSS3** - Styling with custom properties

## 📱 Responsive Design

The application is fully responsive and works on:

- Desktop browsers (Chrome, Firefox, Safari, Edge)
- Tablets
- Mobile devices

## ⚠️ Important Notes

### Medical Disclaimer

This application is for **educational and informational purposes only**. It is NOT a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of qualified healthcare providers.

### API Key Security

- Never commit `.env` files to version control
- Keep your OpenAI API key secure
- Use environment variables for all sensitive data

### Rate Limiting

The backend includes rate limiting:

- 100 requests per 15 minutes per IP
- Adjust in `server.js` if needed

## 🐛 Troubleshooting

### Backend Issues

**Port already in use:**

```bash
# Change PORT in .env or kill the process
# Windows: netstat -ano | findstr :8000
# Linux/Mac: lsof -ti:8000 | xargs kill
```

**OpenAI API errors:**

- Check your API key is valid
- Ensure you have credits in your OpenAI account
- Check API rate limits

### Frontend Issues

**API connection errors:**

- Verify backend is running
- Check `REACT_APP_API_URL` in `.env`
- Ensure CORS is properly configured

**Build errors:**

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📚 Additional Resources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [React Documentation](https://react.dev/)
- [Express.js Documentation](https://expressjs.com/)
- [Node.js Documentation](https://nodejs.org/docs/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Support

For issues, questions, or suggestions:

- Open an issue on GitHub
- Check existing documentation
- Review API documentation

---

**Built with ❤️ for Healthcare Innovation**
