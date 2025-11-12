# 🚀 Quick Reference - Healthcare Assistant

## ⚡ Quick Start Commands

### First Time Setup

```powershell
# Option 1: Automated (Recommended)
.\setup-all.bat

# Option 2: Manual
cd backend && npm install && cd ../frontend && npm install
```

### Running the Application

```powershell
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm start
```

### URLs

- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/api/info

## 📝 Essential Configuration

### Backend `.env`

```env
OPENAI_API_KEY=sk-your-key-here    # ⚠️ REQUIRED
PORT=8000
FRONTEND_URL=http://localhost:3000
```

### Frontend `.env`

```env
REACT_APP_API_URL=http://localhost:8000/api
```

## 🎯 Key Features & Routes

| Feature        | Frontend Route       | Backend API                      |
| -------------- | -------------------- | -------------------------------- |
| Home           | `/`                  | -                                |
| Clinical Chat  | `/clinical-chat`     | `/api/clinical-chat/send`        |
| Document/CSV   | `/document-analyzer` | `/api/document/*` & `/api/csv/*` |
| Organ Scan     | `/organ-analyzer`    | `/api/organ-analyzer/analyze`    |
| Speech-to-Text | `/speech-to-text`    | `/api/transcription/transcribe`  |
| Translation    | `/text-to-speech`    | `/api/translation/*`             |

## 🔧 Common Commands

### Backend

```powershell
npm install          # Install dependencies
npm run dev          # Start development server
npm start            # Start production server
```

### Frontend

```powershell
npm install          # Install dependencies
npm start            # Start development server (port 3000)
npm run build        # Build for production
npm test             # Run tests
```

## 🐛 Troubleshooting Quick Fixes

### Port Already in Use

```powershell
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Clear Cache & Reinstall

```powershell
npm cache clean --force
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### API Connection Issues

1. Check backend is running (Terminal 1)
2. Check frontend `.env` has correct API URL
3. Check browser console for errors
4. Verify OpenAI API key is set

## 📂 Key Files to Know

### Configuration

- `backend/.env` - Backend environment variables (⚠️ API KEY HERE)
- `frontend/.env` - Frontend environment variables
- `backend/server.js` - Main server configuration
- `frontend/src/App.js` - Main React app

### API Services

- `frontend/src/services/api.js` - All API calls
- `backend/routes/*.js` - All API endpoints

### Components

- `frontend/src/components/` - Reusable UI components
- `frontend/src/pages/` - Page components

## 🔑 Environment Variables Reference

### Backend Required

- `OPENAI_API_KEY` - OpenAI API key (REQUIRED)

### Backend Optional

- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 8000)
- `FRONTEND_URL` - Frontend URL for CORS
- `MASTER_API_KEY` - Optional API authentication

### Frontend Optional

- `REACT_APP_API_URL` - Backend API URL
- `REACT_APP_API_KEY` - Optional API key

## 📊 API Response Format

### Success

```json
{
  "success": true,
  "data": {
    "response": "AI response here",
    "audioBase64": "...",
    "audioFormat": "mp3"
  }
}
```

### Error

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "details": "Additional info"
  }
}
```

## 🎨 Supported Languages

English, Spanish, French, German, Italian, Portuguese, Russian, Japanese, Korean, Chinese, Arabic, Hindi, Bengali, Punjabi, Telugu, Marathi, Tamil, Urdu, Vietnamese, Thai

## 📱 Supported File Types

- **Documents:** PDF
- **Data:** CSV
- **Images:** JPEG, JPG, PNG, WebP
- **Audio:** MP3, WAV, WebM, M4A, OGG

## 🔐 Security Checklist

- ✅ Never commit `.env` files
- ✅ Keep API keys secure
- ✅ Use HTTPS in production
- ✅ Monitor API usage/costs
- ✅ Enable rate limiting
- ✅ Validate file uploads
- ✅ Sanitize user inputs

## 📚 Quick Links

- [Full README](README.md)
- [Setup Guide](SETUP_GUIDE.md)
- [Architecture](ARCHITECTURE.md)
- [Project Summary](PROJECT_SUMMARY.md)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [React Docs](https://react.dev/)
- [Express Docs](https://expressjs.com/)

## 🆘 Get Help

1. Check console logs (both frontend & backend)
2. Verify environment variables are set
3. Ensure all dependencies are installed
4. Check ports are not blocked
5. Review error messages carefully
6. Consult documentation

## ⚡ Pro Tips

1. **Use two terminals** - one for backend, one for frontend
2. **Check backend first** - backend must run before frontend
3. **Monitor API costs** - OpenAI API usage is not free
4. **Start small** - test with simple queries first
5. **Read logs** - they contain valuable error information
6. **Use .env.example** - always start from template

## 🎯 Next Steps After Setup

1. Test clinical chat with a simple question
2. Upload a small PDF and ask a question
3. Try uploading a CSV file
4. Experiment with different languages
5. Check audio playback works
6. Test responsive design on mobile

## 📈 Development Workflow

```
1. Make changes to code
2. Save files (auto-reload enabled)
3. Check browser/terminal for errors
4. Test the feature
5. Commit changes to git (optional)
```

## 🚀 Deployment Checklist

- [ ] Update environment variables for production
- [ ] Build frontend: `npm run build`
- [ ] Set NODE_ENV=production
- [ ] Configure CORS for production domain
- [ ] Set up HTTPS/SSL
- [ ] Configure reverse proxy (if needed)
- [ ] Set up monitoring
- [ ] Test all features in production

---

**Keep this handy for quick reference!** 📌
