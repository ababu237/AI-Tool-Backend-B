"""
Speech-to-Text Frontend API
Serves the speech-to-text HTML page and integrates with backend transcription API
Port: 9004
"""

from fastapi import FastAPI, Request, Form, File, UploadFile, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import httpx
from pathlib import Path
import asyncio
import service_config

app = FastAPI(
    title="Speech-to-Text Frontend API",
    description="Frontend API for audio transcription interface with Whisper AI integration",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration (centralized backend URL)
TRANSCRIPTION_API_URL = service_config.get_backend("transcription")
BASE_DIR = Path(__file__).parent.parent
FRONTEND_DIR = BASE_DIR / "frontend_screens"

# Mount static files
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/", response_class=HTMLResponse)
async def speech_to_text_page():
    """Serve the speech-to-text HTML page"""
    stt_page_path = FRONTEND_DIR / "speech-to-text.html"
    if stt_page_path.exists():
        with open(stt_page_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return HTMLResponse(content=content)
    else:
        return HTMLResponse(content="<h1>Speech-to-Text page not found</h1>", status_code=404)


@app.get("/health")
async def health_check():
    """Health check for frontend API and backend connectivity"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{TRANSCRIPTION_API_URL}/", timeout=5.0)
            backend_status = "connected" if response.status_code == 200 else "error"
    except Exception as e:
        backend_status = f"disconnected: {str(e)}"

    return {
        "status": "healthy",
        "service": "Speech-to-Text Frontend API",
        "port": 9004,
        "backend_api": TRANSCRIPTION_API_URL,
        "backend_status": backend_status,
        "supported_formats": ["MP3", "WAV", "M4A", "FLAC", "OGG"],
        "ai_model": "OpenAI Whisper",
        "features": ["transcription", "translation", "multi_language", "audio_analysis"]
    }


@app.post("/api/transcribe-audio")
async def transcribe_audio_proxy(
    audio_file: UploadFile = File(...),
    output_language: str = Form("en"),
    include_translation: bool = Form(False)
):
    """Proxy audio transcription requests to backend API"""
    try:
        # Validate audio file
        if not audio_file.filename:
            raise HTTPException(
                status_code=400, detail="No audio file provided")

        # Check file extension
        allowed_extensions = ['.mp3', '.wav',
                              '.m4a', '.flac', '.ogg', '.mp4', '.webm']
        file_extension = '.' + audio_file.filename.lower().split('.')[-1]

        if file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported audio format. Allowed: {', '.join(allowed_extensions)}"
            )

        # Read audio content
        audio_content = await audio_file.read()

        # Validate file size (max 25MB for audio files)
        if len(audio_content) > 25 * 1024 * 1024:
            raise HTTPException(
                status_code=400, detail="Audio file too large (max 25MB)")

        async with httpx.AsyncClient() as client:
            # Prepare the audio file for forwarding
            files = {"audio_file": (
                audio_file.filename, audio_content, audio_file.content_type)}
            data = {
                "output_language": output_language
            }

            response = await client.post(
                f"{TRANSCRIPTION_API_URL}/transcribe_audio",
                files=files,
                data=data,
                timeout=180.0  # Longer timeout for audio processing
            )

            if response.status_code == 200:
                result = response.json()

                # Process audio URLs
                if result.get("audio_url"):
                    audio_filename = result["audio_url"].split("/")[-1]
                    result["audio_url"] = f"/api/audio/{audio_filename}"

                # Add processing metadata
                result["processed_at"] = "speech_to_text_frontend_api"
                result["audio_info"] = {
                    "filename": audio_file.filename,
                    "size_bytes": len(audio_content),
                    "content_type": audio_file.content_type,
                    "duration_estimated": f"{len(audio_content) / (128 * 1024):.1f} minutes (approx)"
                }

                # Add translation if requested
                if include_translation and result.get("transcribed_text"):
                    result["translation_requested"] = True

                return result
            else:
                error_detail = response.text
                try:
                    error_json = response.json()
                    error_detail = error_json.get("detail", error_detail)
                except:
                    pass

                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Backend API error: {error_detail}"
                )

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Audio transcription timeout (processing can take up to 3 minutes for long files)"
        )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=503, detail=f"Backend API connection error: {str(e)}")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=500, detail=f"Internal error: {str(e)}")


@app.get("/api/audio/{filename}")
async def get_audio_file(filename: str):
    """Proxy audio file requests to backend API"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{TRANSCRIPTION_API_URL}/get_audio/{filename}")

            if response.status_code == 200:
                return Response(
                    content=response.content,
                    media_type="audio/mpeg",
                    headers={
                        "Content-Disposition": f"inline; filename={filename}"}
                )
            else:
                raise HTTPException(
                    status_code=404, detail="Audio file not found")
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching audio: {str(e)}")


@app.get("/api/supported-languages")
async def get_supported_languages():
    """Get list of supported languages for transcription and translation"""
    return {
        "transcription_languages": [
            {"code": "en", "name": "English"},
            {"code": "es", "name": "Spanish"},
            {"code": "fr", "name": "French"},
            {"code": "de", "name": "German"},
            {"code": "it", "name": "Italian"},
            {"code": "pt", "name": "Portuguese"},
            {"code": "ru", "name": "Russian"},
            {"code": "ja", "name": "Japanese"},
            {"code": "ko", "name": "Korean"},
            {"code": "zh", "name": "Chinese"},
            {"code": "ar", "name": "Arabic"},
            {"code": "hi", "name": "Hindi"}
        ],
        "translation_languages": [
            {"code": "en", "name": "English"},
            {"code": "es", "name": "Spanish"},
            {"code": "fr", "name": "French"},
            {"code": "de", "name": "German"},
            {"code": "it", "name": "Italian"},
            {"code": "pt", "name": "Portuguese"},
            {"code": "nl", "name": "Dutch"},
            {"code": "pl", "name": "Polish"},
            {"code": "sv", "name": "Swedish"},
            {"code": "da", "name": "Danish"}
        ],
        "ai_model": "OpenAI Whisper (multilingual)",
        "note": "Whisper can auto-detect the input language"
    }


@app.get("/api/audio-formats")
async def get_audio_formats():
    """Get supported audio formats and their specifications"""
    return {
        "supported_formats": [
            {
                "format": "MP3",
                "extensions": [".mp3"],
                "description": "Most common audio format",
                "max_size": "25MB",
                "recommended": True
            },
            {
                "format": "WAV",
                "extensions": [".wav"],
                "description": "Uncompressed audio, high quality",
                "max_size": "25MB",
                "recommended": True
            },
            {
                "format": "M4A",
                "extensions": [".m4a"],
                "description": "Apple audio format",
                "max_size": "25MB",
                "recommended": False
            },
            {
                "format": "FLAC",
                "extensions": [".flac"],
                "description": "Lossless audio compression",
                "max_size": "25MB",
                "recommended": False
            },
            {
                "format": "OGG",
                "extensions": [".ogg"],
                "description": "Open source audio format",
                "max_size": "25MB",
                "recommended": False
            }
        ],
        "recommendations": [
            "Use MP3 or WAV for best compatibility",
            "Keep files under 25MB for faster processing",
            "Clear audio with minimal background noise works best",
            "Whisper works well with various accents and speaking styles"
        ]
    }


@app.post("/api/test-backend")
async def test_backend_connection():
    """Test connection to backend transcription API"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{TRANSCRIPTION_API_URL}/", timeout=10.0)

            return {
                "backend_reachable": True,
                "backend_status": response.status_code,
                "backend_response": response.json() if response.status_code == 200 else response.text
            }
    except Exception as e:
        return {
            "backend_reachable": False,
            "error": str(e),
            "suggestion": "Make sure the transcription API is running on port 8005"
        }


@app.get("/api/transcription-history")
async def get_transcription_history():
    """Get transcription history (placeholder for future implementation)"""
    return {
        "message": "Transcription history feature",
        "note": "History tracking can be implemented with database storage",
        "current_implementation": "Session-based storage in frontend"
    }

if __name__ == "__main__":
    import uvicorn

    print("[INFO] Starting Speech-to-Text Frontend API on http://localhost:9004")
    print("API Documentation available at http://localhost:9004/docs")
    print("Speech-to-Text page available at http://localhost:9004")
    print("Backend API: http://localhost:8005")
    print("AI Model: OpenAI Whisper (multilingual)")
    uvicorn.run(app, host="0.0.0.0", port=9004)
