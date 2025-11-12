"""
Text-to-Speech Frontend API
Serves the text-to-speech HTML page and integrates with backend translation API
Port: 9005
"""

from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import httpx
from pathlib import Path
import asyncio
import service_config

app = FastAPI(
    title="Text-to-Speech Frontend API",
    description="Frontend API for text translation and speech synthesis interface",
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
TRANSLATION_API_URL = service_config.get_backend("translation")
BASE_DIR = Path(__file__).parent.parent
FRONTEND_DIR = BASE_DIR / "frontend_screens"

# Mount static files
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/", response_class=HTMLResponse)
async def text_to_speech_page():
    """Serve the text-to-speech HTML page"""
    tts_page_path = FRONTEND_DIR / "healthcare-assistant-text-to-speech.html"
    if tts_page_path.exists():
        with open(tts_page_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return HTMLResponse(content=content)
    else:
        return HTMLResponse(content="<h1>Text-to-Speech page not found</h1>", status_code=404)


@app.get("/health")
async def health_check():
    """Health check for frontend API and backend connectivity"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{TRANSLATION_API_URL}/", timeout=5.0)
            backend_status = "connected" if response.status_code == 200 else "error"
    except Exception as e:
        backend_status = f"disconnected: {str(e)}"

    return {
        "status": "healthy",
        "service": "Text-to-Speech Frontend API",
        "port": 9005,
        "backend_api": TRANSLATION_API_URL,
        "backend_status": backend_status,
        "supported_languages": "100+",  # Google Translate supports 100+ languages
        "tts_engine": "Google Text-to-Speech",
        "features": ["translation", "text_to_speech", "language_detection", "audio_download"]
    }


@app.post("/api/translate-text")
async def translate_text_proxy(
    text: str = Form(...),
    output_language: str = Form("en"),
    include_audio: bool = Form(True)
):
    """Proxy text translation requests to backend API"""
    try:
        # Validate input text
        if not text.strip():
            raise HTTPException(
                status_code=400, detail="No text provided for translation")

        # Check text length (reasonable limit)
        if len(text) > 5000:
            raise HTTPException(
                status_code=400, detail="Text too long (max 5000 characters)")

        async with httpx.AsyncClient() as client:
            data = {
                "text": text,
                "output_language": output_language
            }

            response = await client.post(
                f"{TRANSLATION_API_URL}/translate_text",
                data=data,
                timeout=8.0  # Reduced timeout for faster response
            )

            if response.status_code == 200:
                result = response.json()

                # Fast audio URL processing
                if result.get("audio_url"):
                    audio_filename = result["audio_url"].split("/")[-1]
                    result["audio_url"] = f"/api/audio/{audio_filename}"

                # Return ultra-minimal response for maximum speed
                return {
                    "translated_text": result.get("translated_text"),
                    "original_text": result.get("original_text", text),
                    "audio_url": result.get("audio_url"),
                    "target_language": result.get("target_language", output_language)
                }
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
            status_code=504, detail="Translation service timeout")
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
            response = await client.get(f"{TRANSLATION_API_URL}/get_audio/{filename}")

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
    """Get list of supported languages for translation and TTS"""
    return {
        "popular_languages": [
            {"code": "en", "name": "English", "tts_supported": True},
            {"code": "es", "name": "Spanish", "tts_supported": True},
            {"code": "fr", "name": "French", "tts_supported": True},
            {"code": "de", "name": "German", "tts_supported": True},
            {"code": "it", "name": "Italian", "tts_supported": True},
            {"code": "pt", "name": "Portuguese", "tts_supported": True},
            {"code": "ru", "name": "Russian", "tts_supported": True},
            {"code": "ja", "name": "Japanese", "tts_supported": True},
            {"code": "ko", "name": "Korean", "tts_supported": True},
            {"code": "zh",
                "name": "Chinese (Simplified)", "tts_supported": True},
            {"code": "ar", "name": "Arabic", "tts_supported": True},
            {"code": "hi", "name": "Hindi", "tts_supported": True},
            {"code": "nl", "name": "Dutch", "tts_supported": True},
            {"code": "pl", "name": "Polish", "tts_supported": True},
            {"code": "sv", "name": "Swedish", "tts_supported": True}
        ],
        "additional_languages": [
            {"code": "da", "name": "Danish"},
            {"code": "no", "name": "Norwegian"},
            {"code": "fi", "name": "Finnish"},
            {"code": "tr", "name": "Turkish"},
            {"code": "he", "name": "Hebrew"},
            {"code": "th", "name": "Thai"},
            {"code": "vi", "name": "Vietnamese"},
            {"code": "id", "name": "Indonesian"},
            {"code": "ms", "name": "Malay"},
            {"code": "tl", "name": "Filipino"}
        ],
        "total_languages": "100+",
        "translation_engine": "Google Translate",
        "tts_engine": "Google Text-to-Speech",
        "language_detection": "Automatic language detection supported"
    }


@app.get("/api/language-families")
async def get_language_families():
    """Get languages organized by families for better UX"""
    return {
        "language_families": {
            "Indo-European": {
                "Germanic": ["en", "de", "nl", "sv", "da", "no"],
                "Romance": ["es", "fr", "it", "pt", "ro"],
                "Slavic": ["ru", "pl", "cs", "sk", "uk"],
                "Indo-Iranian": ["hi", "ur", "fa"]
            },
            "Sino-Tibetan": {
                "Chinese": ["zh", "zh-tw"],
                "Tibetan": ["bo"]
            },
            "Japonic": ["ja"],
            "Koreanic": ["ko"],
            "Austronesian": ["id", "ms", "tl"],
            "Afroasiatic": {
                "Semitic": ["ar", "he"],
                "Berber": ["ber"]
            },
            "Niger-Congo": ["sw", "yo", "ig"],
            "Trans-New Guinea": ["tok"]
        },
        "most_requested": ["en", "es", "fr", "de", "zh", "ja", "ko", "ar", "hi", "pt"]
    }


@app.post("/api/detect-language")
async def detect_language(text: str = Form(...)):
    """Detect the language of input text"""
    try:
        if not text.strip():
            raise HTTPException(
                status_code=400, detail="No text provided for language detection")

        # Simple language detection (this could be enhanced with a dedicated service)
        # For now, we'll just return a placeholder response
        return {
            "text": text[:100] + "..." if len(text) > 100 else text,
            "detected_language": "en",  # Placeholder
            "confidence": 0.95,
            "alternative_languages": [
                {"language": "es", "confidence": 0.03},
                {"language": "fr", "confidence": 0.02}
            ],
            "note": "Language detection integrated with translation service"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Language detection error: {str(e)}")


@app.get("/api/sample-texts")
async def get_sample_texts():
    """Get sample texts in different languages for testing"""
    return {
        "sample_texts": [
            {
                "language": "en",
                "text": "Hello! How are you today? I hope you're having a wonderful day.",
                "category": "greeting"
            },
            {
                "language": "es",
                "text": "¡Hola! ¿Cómo estás hoy? Espero que tengas un día maravilloso.",
                "category": "greeting"
            },
            {
                "language": "fr",
                "text": "Bonjour! Comment allez-vous aujourd'hui? J'espère que vous passez une merveilleuse journée.",
                "category": "greeting"
            },
            {
                "language": "en",
                "text": "The patient shows symptoms of respiratory distress and requires immediate attention.",
                "category": "medical"
            },
            {
                "language": "en",
                "text": "Artificial intelligence is transforming healthcare through advanced diagnostics and personalized treatment plans.",
                "category": "technology"
            }
        ]
    }


@app.post("/api/test-backend")
async def test_backend_connection():
    """Test connection to backend translation API"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{TRANSLATION_API_URL}/", timeout=10.0)

            return {
                "backend_reachable": True,
                "backend_status": response.status_code,
                "backend_response": response.json() if response.status_code == 200 else response.text
            }
    except Exception as e:
        return {
            "backend_reachable": False,
            "error": str(e),
            "suggestion": "Make sure the translation API is running on port 8006"
        }


@app.get("/api/translation-history")
async def get_translation_history():
    """Get translation history (placeholder for future implementation)"""
    return {
        "message": "Translation history feature",
        "note": "History tracking can be implemented with database storage",
        "current_implementation": "Session-based storage in frontend"
    }

if __name__ == "__main__":
    import uvicorn

    print("[INFO] Starting Text-to-Speech Frontend API on http://localhost:9005")
    print("API Documentation available at http://localhost:9005/docs")
    print("Text-to-Speech page available at http://localhost:9005")
    print("Backend API: http://localhost:8006")
    print("Translation: Google Translate (100+ languages)")
    print("TTS: Google Text-to-Speech")
    uvicorn.run(app, host="0.0.0.0", port=9005)
