# Organ Analyzer API - Standalone FastAPI App

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Create FastAPI app
app = FastAPI(title="Organ Analyzer API", description="Medical organ scan analysis")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": "Organ Analyzer API",
        "description": "Medical organ scan analysis",
        "endpoints": {
            "analyze_organ_scan": "POST /analyze_organ_scan",
            "test_organ_analyzer": "POST /test_organ_analyzer",
            "health": "GET /health",
            "documentation": "/docs"
        }
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "organ_analyzer"}

@app.post("/analyze_organ_scan")
async def analyze_organ_scan_endpoint(
    image: UploadFile = File(...),
    organ: str = Form(...),
    input_language: str = Form("en"),
    output_language: str = Form("en")
):
    try:
        # Placeholder implementation - add full organ analysis here
        return {
            "success": True,
            "data": {
                "filename": image.filename,
                "organ": organ,
                "analysis": f"Organ analysis for {organ} - implementation in progress",
                "input_language": input_language,
                "output_language": output_language
            }
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )

@app.post("/test_organ_analyzer")
async def test_organ_analyzer_endpoint(
    organ: str = Form("lung"),
    input_language: str = Form("en"),
    output_language: str = Form("en")
):
    return {
        "success": True,
        "data": {
            "message": f"Test organ analyzer for {organ}",
            "organ": organ,
            "input_language": input_language,
            "output_language": output_language
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8006)
