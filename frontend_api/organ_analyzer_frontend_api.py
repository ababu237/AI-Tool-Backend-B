"""
Organ Analyzer Frontend API
Serves the organ analyzer HTML page and integrates with backend organ analyzer API
Port: 9003
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
    title="Organ Analyzer Frontend API",
    description="Frontend API for organ scan analysis interface with AI model integration",
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
ORGAN_API_URL = service_config.get_backend("organ")
BASE_DIR = Path(__file__).parent.parent
FRONTEND_DIR = BASE_DIR / "frontend_screens"

# Mount static files
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/", response_class=HTMLResponse)
async def organ_analyzer_page():
    """Serve the organ analyzer HTML page"""
    organ_page_path = FRONTEND_DIR / "organ-analyzer.html"
    if organ_page_path.exists():
        with open(organ_page_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return HTMLResponse(content=content)
    else:
        return HTMLResponse(content="<h1>Organ Analyzer page not found</h1>", status_code=404)


@app.get("/health")
async def health_check():
    """Health check for frontend API and backend connectivity"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{ORGAN_API_URL}/", timeout=5.0)
            backend_status = "connected" if response.status_code == 200 else "error"
    except Exception as e:
        backend_status = f"disconnected: {str(e)}"

    return {
        "status": "healthy",
        "service": "Organ Analyzer Frontend API",
        "port": 9003,
        "backend_api": ORGAN_API_URL,
        "backend_status": backend_status,
        "supported_formats": ["JPEG", "PNG", "DICOM", "TIFF"],
        "ai_models": ["ResNet50", "InceptionV3", "VGG16", "EfficientNet"],
        "features": ["organ_detection", "medical_analysis", "multi_language", "audio_reports"]
    }


@app.post("/api/analyze-organ-scan")
async def analyze_organ_scan_proxy(
    image: UploadFile = File(...),
    input_language: str = Form("en"),
    output_language: str = Form("en"),
    analysis_type: str = Form("comprehensive")
):
    """Proxy organ scan analysis requests to backend API"""
    try:
        # Validate image file
        if not image.filename:
            raise HTTPException(
                status_code=400, detail="No image file provided")

        # Check file extension
        allowed_extensions = ['.jpg', '.jpeg', '.png', '.tiff', '.dcm']
        file_extension = '.' + image.filename.lower().split('.')[-1]

        if file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format. Allowed: {', '.join(allowed_extensions)}"
            )

        # Read image content
        image_content = await image.read()

        # Validate file size (max 10MB)
        if len(image_content) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=400, detail="Image file too large (max 10MB)")

        async with httpx.AsyncClient() as client:
            # Prepare the image for forwarding
            files = {"image": (image.filename, image_content,
                               image.content_type)}
            data = {
                "input_language": input_language,
                "output_language": output_language,
                "analysis_type": analysis_type
            }

            response = await client.post(
                f"{ORGAN_API_URL}/analyze_organ_scan",
                files=files,
                data=data,
                timeout=120.0  # Longer timeout for AI model processing
            )

            if response.status_code == 200:
                result = response.json()

                # Process audio URLs
                if result.get("audio_url"):
                    audio_filename = result["audio_url"].split("/")[-1]
                    result["audio_url"] = f"/api/audio/{audio_filename}"

                # Add processing metadata
                result["processed_at"] = "organ_analyzer_frontend_api"
                result["image_info"] = {
                    "filename": image.filename,
                    "size_bytes": len(image_content),
                    "content_type": image.content_type
                }

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
            status_code=504, detail="AI model processing timeout (this can take up to 2 minutes)")
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=503, detail=f"Backend API connection error: {str(e)}")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=500, detail=f"Internal error: {str(e)}")


@app.post("/api/test-organ-analyzer")
async def test_organ_analyzer_proxy(
    test_case: str = Form("sample_xray"),
    output_language: str = Form("en")
):
    """Proxy test organ analyzer requests to backend API"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{ORGAN_API_URL}/test_organ_analyzer",
                data={
                    "test_case": test_case,
                    "output_language": output_language
                },
                timeout=60.0
            )

            if response.status_code == 200:
                result = response.json()

                # Process audio URLs
                if result.get("audio_url"):
                    audio_filename = result["audio_url"].split("/")[-1]
                    result["audio_url"] = f"/api/audio/{audio_filename}"

                return result
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Backend test API error: {response.text}"
                )

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Test error: {str(e)}")


@app.get("/api/audio/{filename}")
async def get_audio_file(filename: str):
    """Proxy audio file requests to backend API"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{ORGAN_API_URL}/get_audio/{filename}")

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


@app.get("/api/ai-models")
async def get_ai_models():
    """Get information about available AI models for organ analysis"""
    return {
        "available_models": [
            {
                "name": "ResNet50",
                "description": "Deep residual network for medical image classification",
                "best_for": ["chest_xrays", "general_organs"],
                "accuracy": "92%"
            },
            {
                "name": "InceptionV3",
                "description": "Google's Inception architecture optimized for medical imaging",
                "best_for": ["brain_scans", "detailed_analysis"],
                "accuracy": "89%"
            },
            {
                "name": "VGG16",
                "description": "Visual Geometry Group network for feature extraction",
                "best_for": ["organ_detection", "anatomical_structures"],
                "accuracy": "87%"
            },
            {
                "name": "EfficientNet",
                "description": "Efficient convolutional neural network for medical imaging",
                "best_for": ["fast_analysis", "mobile_deployment"],
                "accuracy": "90%"
            }
        ],
        "ensemble_mode": "All models can be used together for comprehensive analysis"
    }


@app.get("/api/sample-images")
async def get_sample_images():
    """Get information about sample images for testing"""
    return {
        "sample_cases": [
            {
                "id": "sample_xray",
                "name": "Chest X-Ray Sample",
                "description": "Standard chest X-ray for lung analysis",
                "type": "chest_xray"
            },
            {
                "id": "sample_ct",
                "name": "CT Scan Sample",
                "description": "Computed tomography scan sample",
                "type": "ct_scan"
            },
            {
                "id": "sample_mri",
                "name": "MRI Sample",
                "description": "Magnetic resonance imaging sample",
                "type": "mri"
            }
        ],
        "note": "These are built-in test cases in the backend API"
    }


@app.post("/api/test-backend")
async def test_backend_connection():
    """Test connection to backend organ analyzer API"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{ORGAN_API_URL}/", timeout=10.0)

            return {
                "backend_reachable": True,
                "backend_status": response.status_code,
                "backend_response": response.json() if response.status_code == 200 else response.text
            }
    except Exception as e:
        return {
            "backend_reachable": False,
            "error": str(e),
            "suggestion": "Make sure the organ analyzer API is running on port 8004"
        }

if __name__ == "__main__":
    import uvicorn

    print("[INFO] Starting Organ Analyzer Frontend API on http://localhost:9003")
    print("API Documentation available at http://localhost:9003/docs")
    print("Organ Analyzer page available at http://localhost:9003")
    print("Backend API: http://localhost:8004")
    print("AI Models: ResNet50, InceptionV3, VGG16, EfficientNet")
    uvicorn.run(app, host="0.0.0.0", port=9003)
