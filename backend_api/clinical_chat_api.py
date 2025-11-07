import os
import uuid
import json
import base64
from fastapi import FastAPI, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from gtts import gTTS
from deep_translator import GoogleTranslator
from langdetect import detect
import openai

# Create FastAPI app
app = FastAPI(title="Clinical Chat API", description="AI-powered medical assistant with multi-language support")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

AUDIO_FOLDER = "audios"
os.makedirs(AUDIO_FOLDER, exist_ok=True)

# Load API keys from config.json file
config_path = os.path.join(os.path.dirname(__file__), "config", "config.json")
try:
    with open(config_path) as config_file:
        config = json.load(config_file)
        OPENAI_API_KEY = config.get("OPENAI_API_KEY")
except FileNotFoundError:
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    print("Warning: config.json not found, using environment variable")

# Conversation history
conversation_history = []

def translate_text(text, output_lang):
    if not text.strip():
        return ""
    try:
        input_lang = detect(text)
    except:
        input_lang = "en"
    return GoogleTranslator(source=input_lang, target=output_lang).translate(text)

def text_to_speech_base64(text: str) -> str:
    if not text.strip():
        raise ValueError("No text to convert to audio")
    
    filename = f"temp_audio_{uuid.uuid4()}.mp3"
    filepath = os.path.join(AUDIO_FOLDER, filename)
    
    tts = gTTS(text)
    tts.save(filepath)
    
    with open(filepath, "rb") as audio_file:
        audio_base64 = base64.b64encode(audio_file.read()).decode('\''utf-8'\'')
    
    os.remove(filepath)
    return audio_base64

@app.get("/")
async def root():
    return {
        "message": "Clinical Chat API",
        "description": "AI-powered medical assistant with multi-language support",
        "endpoints": {
            "clinical_chat": "POST /clinical_chat",
            "health": "GET /health",
            "documentation": "/docs"
        }
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "clinical_chat"}

@app.post("/clinical_chat")
async def clinical_chat_endpoint(prompt: str = Form(...), output_language: str = Form('\''en'\'')):
    try:
        openai.api_key = OPENAI_API_KEY
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful clinical assistant."},
                {"role": "user", "content": prompt}
            ]
        )
        answer = response.choices[0].message.content.strip()
        
        if output_language != '\''en'\'':
            answer = translate_text(answer, output_language)
        
        audio_b64 = text_to_speech_base64(answer)
        
        return {
            "success": True,
            "data": {
                "answer": answer,
                "audio_base64": audio_b64,
                "audio_format": "mp3"
            }
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )

if __name__ == "____main____":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
