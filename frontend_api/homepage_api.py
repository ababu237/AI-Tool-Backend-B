"""
Homepage Frontend API
Serves the homepage and handles navigation between different healthcare tools
Port: 9000
"""

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import httpx
import asyncio
import time
from datetime import datetime
import os
from pathlib import Path

app = FastAPI(
    title="Healthcare Assistant Homepage API",
    description="Frontend API for the healthcare assistant homepage",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Base paths
BASE_DIR = Path(__file__).parent.parent
FRONTEND_DIR = BASE_DIR / "frontend_screens"

# Mount static files (CSS, JS, images)
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/", response_class=HTMLResponse)
async def homepage():
    """Serve the homepage"""
    homepage_path = FRONTEND_DIR / "homepage_ai_tool.html"
    if homepage_path.exists():
        with open(homepage_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return HTMLResponse(content=content)
    else:
        return HTMLResponse(content="<h1>Homepage not found</h1>", status_code=404)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Homepage API",
        "port": 9000,
        "available_tools": [
            {"name": "Clinical Chat", "url": "/clinical-chat", "api_port": 9001},
            {"name": "Document Analyzer",
                "url": "/document-analyzer", "api_port": 9002},
            {"name": "Organ Analyzer", "url": "/organ-analyzer", "api_port": 9003},
            {"name": "Speech-to-Text", "url": "/speech-to-text", "api_port": 9004},
            {"name": "Text-to-Speech", "url": "/text-to-speech", "api_port": 9005}
        ]
    }


@app.get("/api/tools")
async def get_available_tools():
    """Get list of available healthcare tools"""
    return {
        "tools": [
            {
                "id": "clinical-chat",
                "name": "Clinical Chat Assistant",
                "description": "AI-powered medical assistant for clinical questions",
                "frontend_url": "http://localhost:9001",
                "backend_url": "http://localhost:8001",
                "icon": "🩺"
            },
            {
                "id": "document-analyzer",
                "name": "Document Analyzer",
                "description": "PDF and CSV document analysis with Q&A",
                "frontend_url": "http://localhost:9002",
                "backend_url": "http://localhost:8002",
                "icon": "📄"
            },
            {
                "id": "organ-analyzer",
                "name": "Organ Scan Analysis",
                "description": "Medical image analysis using AI models",
                "frontend_url": "http://localhost:9003",
                "backend_url": "http://localhost:8004",
                "icon": "🫁"
            },
            {
                "id": "speech-to-text",
                "name": "Speech to Text",
                "description": "Audio transcription and analysis",
                "frontend_url": "http://localhost:9004",
                "backend_url": "http://localhost:8005",
                "icon": "🎙️"
            },
            {
                "id": "text-to-speech",
                "name": "Text Translation & TTS",
                "description": "Multi-language text translation with speech synthesis",
                "frontend_url": "http://localhost:9005",
                "backend_url": "http://localhost:8006",
                "icon": "🌍"
            }
        ]
    }


@app.get("/api/navigation")
async def get_navigation_links():
    """Get navigation links for the homepage"""
    return {
        "navigation": [
            {
                "label": "Home",
                "url": "http://localhost:9000",
                "active": True
            },
            {
                "label": "Clinical Chat",
                "url": "http://localhost:9001",
                "active": False
            },
            {
                "label": "Document Analyzer",
                "url": "http://localhost:9002",
                "active": False
            },
            {
                "label": "Organ Analyzer",
                "url": "http://localhost:9003",
                "active": False
            },
            {
                "label": "Speech to Text",
                "url": "http://localhost:9004",
                "active": False
            },
            {
                "label": "Text Translation",
                "url": "http://localhost:9005",
                "active": False
            }
        ]
    }


# ---------------- Status Aggregator -----------------

# Define the services we want to monitor (frontend + backend)
SERVICES = [
    # Frontend services (9000-9005)
    {"name": "homepage", "category": "frontend",
     "port": 9000, "base": "http://localhost:9000"},
    {"name": "clinical_chat_frontend", "category": "frontend",
     "port": 9001, "base": "http://localhost:9001"},
    {"name": "document_frontend", "category": "frontend",
     "port": 9002, "base": "http://localhost:9002"},
    {"name": "organ_frontend", "category": "frontend",
     "port": 9003, "base": "http://localhost:9003"},
    {"name": "speech_to_text_frontend", "category": "frontend",
     "port": 9004, "base": "http://localhost:9004"},
    {"name": "text_to_speech_frontend", "category": "frontend",
     "port": 9005, "base": "http://localhost:9005"},
    # Backend services (8002-8006, 8010)
    {"name": "document_api", "category": "backend",
     "port": 8002, "base": "http://localhost:8002"},
    {"name": "csv_api", "category": "backend",
     "port": 8003, "base": "http://localhost:8003"},
    {"name": "organ_api", "category": "backend",
     "port": 8004, "base": "http://localhost:8004"},
    {"name": "transcription_api", "category": "backend",
     "port": 8005, "base": "http://localhost:8005"},
    {"name": "translation_api", "category": "backend",
     "port": 8006, "base": "http://localhost:8006"},
    {"name": "clinical_chat_api", "category": "backend",
     "port": 8010, "base": "http://localhost:8010"},
]


async def _fetch_health(client: httpx.AsyncClient, service: dict):
    url = f"{service['base']}/health"
    started = time.perf_counter()
    try:
        resp = await client.get(url, timeout=5.0)
        latency_ms = (time.perf_counter() - started) * 1000
        if resp.status_code == 200:
            data = resp.json()
            return {
                **service,
                "status": "up",
                "latency_ms": round(latency_ms, 1),
                "data": data,
                "error": None,
            }
        else:
            return {
                **service,
                "status": "error",
                "latency_ms": round(latency_ms, 1),
                "data": None,
                "error": f"HTTP {resp.status_code}",
            }
    except Exception as e:
        latency_ms = (time.perf_counter() - started) * 1000
        return {
            **service,
            "status": "down",
            "latency_ms": round(latency_ms, 1),
            "data": None,
            "error": str(e),
        }


@app.get("/api/status")
async def aggregated_status():
    """Return aggregated health for all services."""
    async with httpx.AsyncClient() as client:
        results = await asyncio.gather(*[_fetch_health(client, s) for s in SERVICES])

    up = sum(1 for r in results if r["status"] == "up")
    down = sum(1 for r in results if r["status"] == "down")
    errors = sum(1 for r in results if r["status"] == "error")
    return {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "summary": {
            "total": len(results),
            "up": up,
            "down": down,
            "error": errors
        },
        "services": results
    }


@app.get("/status", response_class=HTMLResponse)
async def status_dashboard():
    """Serve a simple status dashboard page."""
    # Minimal HTML (could be moved to its own file later)
    html = """
<!DOCTYPE html>
<html lang='en'>
<head>
    <meta charset='UTF-8'/>
    <title>Healthcare Assistant - Status Dashboard</title>
    <style>
        body { font-family: system-ui, Arial, sans-serif; margin: 24px; background:#0e1116; color:#f0f3f7; }
        h1 { margin-top:0; }
        table { border-collapse: collapse; width:100%; margin-top:16px; }
        th, td { padding:8px 10px; border-bottom:1px solid #222; text-align:left; }
        th { background:#161b22; position:sticky; top:0; }
        tr:hover { background:#1f2731; }
        .status-up { color:#19c37d; font-weight:600; }
        .status-down { color:#ff4d4f; font-weight:600; }
        .status-error { color:#ffa200; font-weight:600; }
        .pill { padding:2px 8px; border-radius:12px; font-size:12px; background:#2d3642; }
        .frontend { background:#214a7a; }
        .backend { background:#69377a; }
        #summary { margin-top:8px; font-size:14px; }
        footer { margin-top:32px; font-size:12px; opacity:0.7; }
        .small { font-size:11px; color:#a0a7b1; }
    </style>
</head>
<body>
    <h1>Healthcare Assistant – Service Status</h1>
    <div id='summary'>Loading...</div>
    <table id='status-table'>
        <thead>
            <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Port</th>
                <th>Status</th>
                <th>Latency (ms)</th>
                <th>Details</th>
            </tr>
        </thead>
        <tbody></tbody>
    </table>
    <p class='small'>Auto-refreshes every 10 seconds. Uses the /health endpoint of each service.</p>
    <footer>&copy; <span id='year'></span> Healthcare Assistant</footer>
    <script>
        const tbody = document.querySelector('#status-table tbody');
        const summaryDiv = document.getElementById('summary');
        const yearSpan = document.getElementById('year'); yearSpan.textContent = new Date().getFullYear();
        async function loadStatus(){
            try {
                const res = await fetch('/api/status');
                const data = await res.json();
                summaryDiv.textContent = `Total: ${data.summary.total} | Up: ${data.summary.up} | Down: ${data.summary.down} | Error: ${data.summary.error} | Updated: ${new Date(data.timestamp).toLocaleTimeString()}`;
                tbody.innerHTML='';
                data.services.forEach(s => {
                    const tr = document.createElement('tr');
                    const statusClass = s.status === 'up' ? 'status-up' : (s.status === 'down' ? 'status-down' : 'status-error');
                    const catClass = s.category === 'frontend' ? 'pill frontend' : 'pill backend';
                    let details = '';
                    if(s.error){ details = s.error; }
                    else if(s.data){
                         if(s.data.service) details = s.data.service; else details = Object.keys(s.data).slice(0,4).join(', ');
                    }
                    tr.innerHTML = `
                        <td>${s.name}</td>
                        <td><span class="${catClass}">${s.category}</span></td>
                        <td>${s.port}</td>
                        <td class="${statusClass}">${s.status}</td>
                        <td>${s.latency_ms ?? ''}</td>
                        <td class='small'>${details}</td>`;
                    tbody.appendChild(tr);
                });
            } catch(e){
                summaryDiv.textContent = 'Error loading status: ' + e;
            }
        }
        loadStatus();
        setInterval(loadStatus, 10000);
    </script>
</body>
</html>
        """
    return HTMLResponse(content=html)

if __name__ == "__main__":
    import uvicorn
    print("[INFO] Starting Homepage API on http://localhost:9000")
    print("API Documentation available at http://localhost:9000/docs")
    print("Homepage available at http://localhost:9000")
    uvicorn.run(app, host="0.0.0.0", port=9000)
