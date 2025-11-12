# Healthcare Assistant Frontend APIs

This directory contains dedicated FastAPI servers for each frontend screen of the Healthcare Assistant application. Each frontend API serves its corresponding HTML page and integrates with the backend APIs.

## 🏗️ Architecture Overview

### Frontend APIs (Port 9000-9005)

- **Homepage API (9000)**: Main navigation and homepage
- **Clinical Chat Frontend (9001)**: Clinical chat interface with backend integration
- **Document Analyzer Frontend (9002)**: PDF/CSV analysis interface
- **Organ Analyzer Frontend (9003)**: Medical image analysis interface
- **Speech-to-Text Frontend (9004)**: Audio transcription interface
- **Text-to-Speech Frontend (9005)**: Translation and TTS interface

### Backend APIs (Port 8001-8006)

- **Clinical Chat API (8001)**: AI-powered clinical chat with OpenAI GPT
- **Document API (8002)**: PDF document processing and Q&A
- **CSV API (8003)**: CSV file analysis and processing
- **Organ Analyzer API (8004)**: Medical image analysis with AI models
- **Transcription API (8005)**: Audio transcription with Whisper
- **Translation API (8006)**: Text translation and speech synthesis

## 🚀 Quick Start

### Option 1: Start All Frontend APIs

```bash
cd frontend_api
python start_frontend_apis.py
```

### Option 2: Start Individual APIs

```bash
cd frontend_api

# Homepage (Port 9000)
python homepage_api.py

# Clinical Chat Frontend (Port 9001)
python clinical_chat_frontend_api.py

# Document Analyzer Frontend (Port 9002)
python document_analyzer_frontend_api.py

# Organ Analyzer Frontend (Port 9003)
python organ_analyzer_frontend_api.py

# Speech-to-Text Frontend (Port 9004)
python speech_to_text_frontend_api.py

# Text-to-Speech Frontend (Port 9005)
python text_to_speech_frontend_api.py
```

## 📋 Prerequisites

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Required Packages

- `fastapi` - Web framework for APIs
- `uvicorn` - ASGI server for FastAPI
- `httpx` - Async HTTP client for backend communication
- `python-multipart` - File upload support
- `aiofiles` - Async file operations

### Backend APIs

Make sure the backend APIs are running for full functionality:

```bash
cd ../backend_api

# Start backend APIs (ports 8001-8006)
python clinical_chat_api.py &
python document_api.py &
python csv_file_api.py &
python organ_analyzer_api.py &
python transcription_api.py &
python translate_text_api.py &
```

## 🌐 Access Points

### Main Application

- **Homepage**: http://localhost:9000
- **Clinical Chat**: http://localhost:9001
- **Document Analyzer**: http://localhost:9002
- **Organ Analyzer**: http://localhost:9003
- **Speech-to-Text**: http://localhost:9004
- **Text-to-Speech**: http://localhost:9005

### API Documentation

- **All APIs**: http://localhost:900X/docs (FastAPI auto-generated docs)
- **Health Checks**: http://localhost:900X/health

## 🔧 Configuration

### CORS Settings

All frontend APIs are configured with permissive CORS settings for development:

```python
allow_origins=["*"]  # Configure for production with specific domains
allow_credentials=True
allow_methods=["*"]
allow_headers=["*"]
```

### Backend Integration

Each frontend API is configured to communicate with its corresponding backend API:

```python
# Example configuration
BACKEND_API_URL = "http://localhost:8001"  # Clinical Chat Backend
```

## 📁 File Structure

```
frontend_api/
├── homepage_api.py                      # Homepage API server
├── clinical_chat_frontend_api.py        # Clinical Chat frontend
├── document_analyzer_frontend_api.py    # Document Analyzer frontend
├── organ_analyzer_frontend_api.py       # Organ Analyzer frontend
├── speech_to_text_frontend_api.py       # Speech-to-Text frontend
├── text_to_speech_frontend_api.py       # Text-to-Speech frontend
├── start_frontend_apis.py               # Startup script for all APIs
├── requirements.txt                     # Python dependencies
└── README.md                           # This file
```

## 🎯 Features by API

### Homepage API (Port 9000)

- ✅ Serves main homepage
- ✅ Navigation between tools
- ✅ Tool availability status
- ✅ Health check for all services

### Clinical Chat Frontend (Port 9001)

- ✅ Clinical chat interface
- ✅ Real-time chat with AI
- ✅ Audio response playback
- ✅ Conversation history
- ✅ Backend API proxy

### Document Analyzer Frontend (Port 9002)

- ✅ PDF and CSV file upload
- ✅ Document Q&A interface
- ✅ Multi-language support
- ✅ Audio response generation
- ✅ File format validation

### Organ Analyzer Frontend (Port 9003)

- ✅ Medical image upload
- ✅ AI model analysis
- ✅ Multi-format support (JPEG, PNG, DICOM)
- ✅ Analysis reports with audio
- ✅ Test case functionality

### Speech-to-Text Frontend (Port 9004)

- ✅ Audio file upload
- ✅ Real-time transcription
- ✅ Multi-language support
- ✅ Audio format validation
- ✅ Whisper AI integration

### Text-to-Speech Frontend (Port 9005)

- ✅ Text translation interface
- ✅ 100+ language support
- ✅ Speech synthesis
- ✅ Language detection
- ✅ Audio download

## 🔍 Health Monitoring

Each API provides a `/health` endpoint with:

- Service status
- Backend connectivity status
- Feature availability
- Configuration information

Example health check:

```bash
curl http://localhost:9001/health
```

## 🛠️ Development

### Adding New Features

1. Add new endpoints to the appropriate frontend API
2. Update the corresponding backend integration
3. Test with both frontend and backend running
4. Update documentation

### Testing

```bash
# Test individual API
curl http://localhost:9001/health

# Test backend connectivity
curl -X POST http://localhost:9001/api/test-backend
```

### Debugging

- Check console output for API startup messages
- Verify backend APIs are running on correct ports
- Check network connectivity between frontend and backend
- Review FastAPI auto-generated docs at `/docs` endpoints

## 🚨 Troubleshooting

### Common Issues

1. **Port Already in Use**

   ```
   Error: [Errno 10048] error while attempting to bind on address
   ```

   - Solution: Check if another process is using the port
   - Use `netstat -an | findstr :9001` to check port usage

2. **Backend API Not Reachable**

   ```
   Backend API connection error
   ```

   - Solution: Ensure backend APIs are running on ports 8001-8006
   - Check backend API health endpoints

3. **Import Errors**

   ```
   Import "fastapi" could not be resolved
   ```

   - Solution: Install requirements with `pip install -r requirements.txt`

4. **CORS Issues**
   ```
   Access to fetch blocked by CORS policy
   ```
   - Solution: CORS is configured permissively; check browser console for specific errors

### Performance Optimization

- Use connection pooling for backend communication
- Implement caching for frequently requested data
- Add request/response compression
- Monitor API response times

## 📖 API Documentation

Each API automatically generates interactive documentation:

- **Swagger UI**: http://localhost:900X/docs
- **ReDoc**: http://localhost:900X/redoc

## 🔒 Security Considerations

### Production Deployment

1. **CORS Configuration**: Replace `allow_origins=["*"]` with specific domains
2. **HTTPS**: Use SSL/TLS certificates for production
3. **Authentication**: Implement user authentication and authorization
4. **Input Validation**: Enhance input sanitization and validation
5. **Rate Limiting**: Add rate limiting to prevent abuse
6. **Logging**: Implement comprehensive logging for monitoring

### Example Production CORS:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

## 🤝 Contributing

1. Follow FastAPI best practices
2. Maintain consistent error handling
3. Add comprehensive logging
4. Update documentation for new features
5. Test with both frontend and backend APIs

## 📝 License

This project is part of the Healthcare Assistant application. See the main project README for license information.
