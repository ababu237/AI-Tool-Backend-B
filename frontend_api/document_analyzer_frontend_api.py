"""
Document Analyzer Frontend API
Serves the document analyzer HTML page and integrates with backend document/CSV APIs
Port: 9002
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
    title="Document Analyzer Frontend API",
    description="Frontend API for document analysis interface with backend integration",
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

# Configuration (centralized backend URLs)
DOCUMENT_API_URL = service_config.get_backend("document")
CSV_API_URL = service_config.get_backend("csv")
BASE_DIR = Path(__file__).parent.parent
FRONTEND_DIR = BASE_DIR / "frontend_screens"

# Mount static files
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/", response_class=HTMLResponse)
async def document_analyzer_page():
    """Serve the document analyzer HTML page"""
    doc_page_path = FRONTEND_DIR / "healthcare-assistant-document-analyzer.html"
    if doc_page_path.exists():
        with open(doc_page_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return HTMLResponse(content=content)
    else:
        return HTMLResponse(content="<h1>Document Analyzer page not found</h1>", status_code=404)


@app.get("/health")
async def health_check():
    """Health check for frontend API and backend connectivity"""
    backends = {
        "document_api": DOCUMENT_API_URL,
        "csv_api": CSV_API_URL
    }

    backend_status = {}
    for name, url in backends.items():
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{url}/", timeout=5.0)
                backend_status[name] = "connected" if response.status_code == 200 else "error"
        except Exception as e:
            backend_status[name] = f"disconnected: {str(e)}"

    return {
        "status": "healthy",
        "service": "Document Analyzer Frontend API",
        "port": 9002,
        "backend_apis": backends,
        "backend_status": backend_status,
        "supported_formats": ["PDF", "CSV"],
        "features": ["document_qa", "csv_analysis", "multi_language", "audio_responses"]
    }


@app.post("/api/process-document")
async def process_document_proxy(
    file: UploadFile = File(None),
    file_id: str = Form(None),
    question: str = Form(None),
    output_language: str = Form("en")
):
    """Proxy document processing requests to backend API"""
    try:
        # Check if this is a file upload or question processing request
        if file is not None:
            # This is a file upload request
            # Read file content
            file_content = await file.read()

            # Determine which backend API to use based on file type
            file_extension = file.filename.lower().split(
                '.')[-1] if file.filename else ""

            if file_extension == "csv":
                backend_url = f"{CSV_API_URL}/process_csv"
            elif file_extension == "pdf":
                backend_url = f"{DOCUMENT_API_URL}/process_document"
            else:
                # Try document API for other formats
                backend_url = f"{DOCUMENT_API_URL}/process_document"

            # Prepare the file for forwarding (file upload only)
            files = {"file": (file.filename, file_content, file.content_type)}
            data = {
                "output_language": output_language
            }
            # Only add question if provided
            if question is not None:
                data["question"] = question

        elif file_id is not None and question is not None:
            # Follow-up question: attempt document backend first, fallback to CSV backend
            primary_url = f"{DOCUMENT_API_URL}/process_document"
            fallback_url = f"{CSV_API_URL}/process_csv"
            backend_url = primary_url  # try doc first
            file_extension = "pdf"  # default metadata; may be CSV

            files = None
            data = {
                "file_id": file_id,
                "question": question,
                "output_language": output_language
            }
        else:
            raise HTTPException(
                status_code=400,
                detail="Must provide either file for upload or file_id with question for processing"
            )

        async with httpx.AsyncClient() as client:

            response = await client.post(
                backend_url,
                files=files,
                data=data,
                timeout=60.0
            )

            # If follow-up against document API failed due to missing file id, try CSV backend
            if (file_id is not None and backend_url == primary_url and response.status_code in (400, 404)):
                try:
                    resp_json = response.json()
                except Exception:
                    resp_json = {}
                error_text = (resp_json.get("error")
                              or resp_json.get("detail") or "").lower()
                if "file id not found" in error_text or "upload" in error_text:
                    response = await client.post(
                        fallback_url,
                        files=None,
                        data=data,
                        timeout=60.0
                    )
                    if response.status_code == 200:
                        file_extension = "csv"  # adjust metadata

            if response.status_code == 200:
                result = response.json()

                # Process any audio URLs
                if result.get("audio_url"):
                    audio_filename = result["audio_url"].split("/")[-1]
                    result["audio_url"] = f"/api/audio/{audio_filename}"

                # Add metadata about processing
                result["processed_by"] = "document_api" if file_extension == "pdf" else "csv_api"
                result["file_type"] = file_extension

                return result
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Backend API error: {response.text}"
                )

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504, detail="Document processing timeout")
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=503, detail=f"Backend API connection error: {str(e)}")
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Internal error: {str(e)}")


@app.post("/api/analyze-csv")
async def analyze_csv_proxy(
    file: UploadFile = File(...),
    question: str = Form("Please analyze this CSV data and provide insights"),
    output_language: str = Form("en")
):
    """Specific endpoint for CSV analysis"""
    try:
        file_content = await file.read()

        async with httpx.AsyncClient() as client:
            files = {"file": (file.filename, file_content, file.content_type)}
            data = {
                "question": question,
                "output_language": output_language
            }

            response = await client.post(
                f"{CSV_API_URL}/process_csv",
                files=files,
                data=data,
                timeout=60.0
            )

            if response.status_code == 200:
                result = response.json()

                # Process audio URLs and add metadata
                if result.get("audio_url"):
                    audio_filename = result["audio_url"].split("/")[-1]
                    result["audio_url"] = f"/api/csv-audio/{audio_filename}"

                return result
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"CSV API error: {response.text}"
                )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"CSV analysis error: {str(e)}")


@app.get("/api/audio/{filename}")
async def get_document_audio(filename: str):
    """Proxy audio file requests from document API"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{DOCUMENT_API_URL}/audio/{filename}")

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


@app.get("/api/csv-audio/{filename}")
async def get_csv_audio(filename: str):
    """Proxy audio file requests from CSV API"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{CSV_API_URL}/audio/{filename}")

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
            status_code=500, detail=f"Error fetching CSV audio: {str(e)}")


@app.post("/api/test-backends")
async def test_backend_connections():
    """Test connections to both document and CSV backend APIs"""
    results = {}

    backends = {
        "document_api": DOCUMENT_API_URL,
        "csv_api": CSV_API_URL
    }

    for name, url in backends.items():
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{url}/", timeout=10.0)

                results[name] = {
                    "reachable": True,
                    "status": response.status_code,
                    "response": response.json() if response.status_code == 200 else response.text
                }
        except Exception as e:
            results[name] = {
                "reachable": False,
                "error": str(e)
            }

    return {
        "backend_tests": results,
        "suggestions": {
            "document_api": "Make sure document API is running on port 8002",
            "csv_api": "Make sure CSV API is running on port 8003"
        }
    }


@app.get("/api/supported-formats")
async def get_supported_formats():
    """Get supported file formats and their capabilities"""
    return {
        "supported_formats": [
            {
                "type": "PDF",
                "extensions": [".pdf"],
                "capabilities": ["text_extraction", "qa", "translation", "audio"],
                "max_size": "10MB",
                "backend": "document_api"
            },
            {
                "type": "CSV",
                "extensions": [".csv"],
                "capabilities": ["data_analysis", "qa", "translation", "audio", "visualization"],
                "max_size": "5MB",
                "backend": "csv_api"
            }
        ]
    }

if __name__ == "__main__":
    import uvicorn

    print("[INFO] Starting Document Analyzer Frontend API on http://localhost:9002")
    print("API Documentation available at http://localhost:9002/docs")
    print("Document Analyzer page available at http://localhost:9002")
    print("Document Backend API: http://localhost:8002")
    print("CSV Backend API: http://localhost:8003")
    uvicorn.run(app, host="0.0.0.0", port=9002)
