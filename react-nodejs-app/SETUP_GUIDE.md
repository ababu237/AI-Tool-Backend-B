# 🚀 Healthcare Assistant - Complete Setup Guide

This guide will walk you through setting up the complete React + Node.js Healthcare Assistant application.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.0.0 or higher) - [Download](https://nodejs.org/)
- **npm** (v9.0.0 or higher) - Comes with Node.js
- **OpenAI API Key** - [Get API Key](https://platform.openai.com/api-keys)
- **Git** (optional) - For version control

### Verify Installation

```powershell
node --version  # Should show v18.0.0 or higher
npm --version   # Should show v9.0.0 or higher
```

## 🏗️ Step-by-Step Installation

### Step 1: Navigate to Project Directory

```powershell
cd c:\work\AI-Tool-Stack\react-nodejs-app
```

### Step 2: Backend Setup

#### 2.1 Install Backend Dependencies

```powershell
cd backend
npm install
```

This will install all required packages:

- express, cors, dotenv
- openai, axios
- multer (file uploads)
- pdf-parse (PDF processing)
- csv-parser (CSV processing)
- gtts (text-to-speech)
- sharp (image processing)
- And more...

#### 2.2 Configure Backend Environment

```powershell
# Copy the example environment file
copy .env.example .env
```

Edit `.env` file with your favorite text editor:

```env
NODE_ENV=development
PORT=8000
FRONTEND_URL=http://localhost:3000
OPENAI_API_KEY=sk-your-actual-openai-key-here
```

**Important:** Replace `sk-your-actual-openai-key-here` with your real OpenAI API key!

#### 2.3 Test Backend

```powershell
# Start the backend server
npm run dev
```

You should see:

```
🚀 Healthcare Assistant API running on port 8000
📚 Environment: development
🔗 API Info: http://localhost:8000/api/info
❤️  Health Check: http://localhost:8000/health
```

Open your browser and visit: `http://localhost:8000/health`

You should see: `{"status":"healthy","timestamp":"...","service":"Healthcare Assistant API"}`

**Keep this terminal open!** The backend needs to keep running.

### Step 3: Frontend Setup

Open a **NEW** PowerShell terminal:

#### 3.1 Install Frontend Dependencies

```powershell
cd c:\work\AI-Tool-Stack\react-nodejs-app\frontend
npm install
```

This will install:

- react, react-dom, react-router-dom
- axios (API client)
- react-scripts (build tools)
- And more...

#### 3.2 Configure Frontend Environment

```powershell
# Copy the example environment file
copy .env.example .env
```

The default `.env` should work:

```env
REACT_APP_API_URL=http://localhost:8000/api
```

#### 3.3 Start Frontend

```powershell
npm start
```

The React app will automatically open in your browser at: `http://localhost:3000`

## 🎉 Verify Everything Works

### 1. Check Home Page

- You should see the Healthcare Assistant homepage
- All feature cards should be displayed

### 2. Test Clinical Chat

- Click "Clinical Chat" or navigate to it via bottom menu
- Ask a question like: "What are the symptoms of diabetes?"
- You should get an AI response with audio

### 3. Test Document Upload

- Click "Document Analyzer"
- Try uploading a PDF file
- Ask a question about the document content

## 🛠️ Common Issues & Solutions

### Issue: "OPENAI_API_KEY not configured"

**Solution:**

- Check your backend `.env` file
- Ensure `OPENAI_API_KEY` is set correctly
- Restart the backend server

### Issue: "Network Error" or "Cannot connect to backend"

**Solution:**

- Verify backend is running on port 8000
- Check `REACT_APP_API_URL` in frontend `.env`
- Ensure no firewall is blocking the connection

### Issue: Port 8000 already in use

**Solution:**

```powershell
# Find process using port 8000
netstat -ano | findstr :8000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or change PORT in backend .env to 8001, 8002, etc.
```

### Issue: Port 3000 already in use

**Solution:**

- React will prompt to use another port (Y/n)
- Type `y` and press Enter
- Or manually change the port:
  ```powershell
  set PORT=3001 && npm start
  ```

### Issue: npm install fails

**Solution:**

```powershell
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json

# Reinstall
npm install
```

## 📁 Project Structure Overview

```
react-nodejs-app/
├── backend/                    # Node.js API Server
│   ├── routes/                # API endpoints
│   │   ├── clinicalChat.js   # Clinical chat API
│   │   ├── document.js       # Document analysis
│   │   ├── csv.js            # CSV processing
│   │   ├── organAnalyzer.js  # Image analysis
│   │   ├── transcription.js  # Audio transcription
│   │   └── translation.js    # Translation & TTS
│   ├── utils/                # Helper functions
│   ├── server.js             # Main server
│   ├── package.json          # Dependencies
│   └── .env                  # Configuration
│
├── frontend/                  # React Application
│   ├── public/               # Static files
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API integration
│   │   ├── App.js           # Main app
│   │   └── index.js         # Entry point
│   ├── package.json         # Dependencies
│   └── .env                 # Configuration
│
└── README.md                # Main documentation
```

## 🔐 Security Checklist

- ✅ `.env` files are in `.gitignore`
- ✅ Never commit API keys to version control
- ✅ Use environment variables for sensitive data
- ✅ Rate limiting is enabled (100 req/15min)
- ✅ CORS is properly configured
- ✅ File upload limits are set

## 📊 Testing Checklist

- [ ] Backend health check returns 200 OK
- [ ] Frontend loads without errors
- [ ] Clinical chat sends and receives messages
- [ ] Document upload and query works
- [ ] CSV upload and analysis works
- [ ] Audio playback works
- [ ] Language selection works
- [ ] Navigation between pages works
- [ ] Responsive design works on mobile

## 🚀 Production Deployment

### Backend Production

```powershell
cd backend
npm run build  # If you have a build script
npm start      # Production mode
```

### Frontend Production

```powershell
cd frontend
npm run build
```

Serve the `build/` folder with:

- Nginx
- Apache
- Vercel
- Netlify
- AWS S3 + CloudFront

## 📚 Next Steps

1. **Customize the UI** - Edit CSS in `frontend/src/` files
2. **Add More Features** - Extend routes in `backend/routes/`
3. **Improve Error Handling** - Add more robust error messages
4. **Add Authentication** - Implement user login/signup
5. **Database Integration** - Store conversation history
6. **Deploy to Cloud** - Use AWS, Azure, or Google Cloud

## 🆘 Getting Help

If you encounter issues:

1. Check the console logs (both frontend and backend)
2. Review the README files in each directory
3. Verify all environment variables are set
4. Ensure all dependencies are installed
5. Check that ports are not blocked

## 📞 Support Resources

- [OpenAI API Docs](https://platform.openai.com/docs)
- [React Documentation](https://react.dev/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Node.js Docs](https://nodejs.org/docs/)

## ⚠️ Important Reminders

1. **Medical Disclaimer**: This is for educational purposes only - not medical advice
2. **API Costs**: OpenAI API usage incurs costs - monitor your usage
3. **Security**: Never expose your API keys or `.env` files
4. **Backups**: Regularly backup your code and data

---

## 🎊 You're All Set!

Your Healthcare Assistant application should now be running:

- **Backend:** http://localhost:8000
- **Frontend:** http://localhost:3000

Enjoy building with AI! 🚀
