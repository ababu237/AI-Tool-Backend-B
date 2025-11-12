"""
Clinical Chat Frontend API
Serves the clinical chat HTML page and integrates with backend clinical chat API
Port: 9001
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
    title="Clinical Chat Frontend API",
    description="Frontend API for clinical chat interface with backend integration",
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
BACKEND_API_URL = service_config.get_backend("clinical_chat")
BASE_DIR = Path(__file__).parent.parent
FRONTEND_DIR = BASE_DIR / "frontend_screens"

# Mount static files
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/", response_class=HTMLResponse)
async def clinical_chat_page():
    """Serve the clinical chat HTML page"""
    chat_page_path = FRONTEND_DIR / "clinical_chat.html"
    if chat_page_path.exists():
        with open(chat_page_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return HTMLResponse(content=content)
    else:
        return HTMLResponse(content="<h1>Clinical Chat page not found</h1>", status_code=404)


@app.get("/health")
async def health_check():
    """Health check for frontend API and backend connectivity"""
    try:
        async with httpx.AsyncClient() as client:
            backend_response = await client.get(f"{BACKEND_API_URL}/", timeout=5.0)
            backend_status = "connected" if backend_response.status_code == 200 else "error"
    except Exception as e:
        backend_status = f"disconnected: {str(e)}"

    return {
        "status": "healthy",
        "service": "Clinical Chat Frontend API",
        "port": 9001,
        "backend_api": BACKEND_API_URL,
        "backend_status": backend_status,
        "features": ["clinical_chat", "conversation_history", "audio_responses"]
    }


@app.post("/api/clinical-chat")
async def clinical_chat_proxy(query: str = Form(...), output_language: str = Form("en")):
    """Proxy clinical chat requests to backend API"""
    try:
        async with httpx.AsyncClient() as client:
            # Forward request to backend clinical chat API
            response = await client.post(
                f"{BACKEND_API_URL}/clinical_chat",
                data={"query": query, "output_language": output_language},
                timeout=30.0
            )

            if response.status_code == 200:
                result = response.json()

                # Process audio URL to make it accessible through frontend API
                if result.get("audio_url"):
                    # Convert backend audio URL to frontend-accessible URL
                    audio_filename = result["audio_url"].split("/")[-1]
                    result["audio_url"] = f"/api/audio/{audio_filename}"

                return result
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Backend API error: {response.text}"
                )

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Backend API timeout")
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=503, detail=f"Backend API connection error: {str(e)}")
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Internal error: {str(e)}")


@app.get("/api/audio/{filename}")
async def get_audio_file(filename: str):
    """Proxy audio file requests to backend API"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{BACKEND_API_URL}/get_audio/{filename}")

            if response.status_code == 200:
                return Response(
                    content=response.content,
                    media_type="audio/mpeg",
                    headers={
                        "Content-Disposition": f"inline; filename={filename}",
                        "Accept-Ranges": "bytes"
                    }
                )
            else:
                raise HTTPException(
                    status_code=404, detail="Audio file not found")

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching audio: {str(e)}")


@app.get("/api/conversation-history")
async def get_conversation_history():
    """Get conversation history (stored in frontend for now)"""
    # This could be enhanced to store conversation history in a database
    return {
        "message": "Conversation history feature",
        "note": "History is currently managed client-side"
    }


@app.post("/api/test-backend")
async def test_backend_connection():
    """Test connection to backend clinical chat API"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{BACKEND_API_URL}/", timeout=10.0)

            return {
                "backend_reachable": True,
                "backend_status": response.status_code,
                "backend_response": response.json() if response.status_code == 200 else response.text
            }
    except Exception as e:
        return {
            "backend_reachable": False,
            "error": str(e),
            "suggestion": "Make sure the backend clinical chat API is running on port 8010"
        }


@app.get("/api/quick-questions")
async def get_quick_questions():
    """Get predefined quick clinical questions for testing"""
    return {
        "quick_questions": [
            "What are the common symptoms of diabetes?",
            "How does blood pressure medication work?",
            "What should I know about heart disease prevention?",
            "Explain the difference between Type 1 and Type 2 diabetes",
            "What are the side effects of statins?",
            "How does the immune system respond to vaccines?",
            "What lifestyle changes help with hypertension?",
            "Explain how antibiotics work against bacterial infections"
        ]
    }

if __name__ == "__main__":
    import uvicorn

    print("[INFO] Starting Clinical Chat Frontend API on http://localhost:9001")
    print("API Documentation available at http://localhost:9001/docs")
    print("Clinical Chat page available at http://localhost:9001")
    print("Backend API: http://localhost:8010")
    uvicorn.run(app, host="0.0.0.0", port=9001)
