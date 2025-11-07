# Text Translation API - Standalone FastAPI App

from fastapi import FastAPI, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from deep_translator import GoogleTranslator
from langdetect import detect

# Create FastAPI app
app = FastAPI(title="Translation API", description="Multi-language text translation service")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def translate_text(text: str, target_language: str) -> str:
    if not text.strip():
        return ""
    try:
        source_lang = detect(text)
    except:
        source_lang = "auto"
    
    return GoogleTranslator(source=source_lang, target=target_language).translate(text)

@app.get("/")
async def root():
    return {
        "message": "Translation API",
        "description": "Multi-language text translation service",
        "endpoints": {
            "translate": "POST /translate",
            "health": "GET /health",
            "documentation": "/docs"
        }
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "translation"}

@app.post("/translate")
async def translate_endpoint(text: str = Form(...), target_language: str = Form("en")):
    try:
        translated = translate_text(text, target_language)
        return {
            "success": True,
            "data": {
                "original_text": text,
                "translated_text": translated,
                "target_language": target_language
            }
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
