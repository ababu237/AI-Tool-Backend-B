"""Master Backend API Aggregator

This FastAPI application unifies multiple legacy backend_api modules:
- clinical_chat_api (clinical chat, translation, text-to-speech)
- document_api (document Q&A / vector search)
- csv_file_api (CSV agent / translation)
- organ_analyzer_api (organ scan analysis)
- transcription_api (audio transcription + translation)
- translate_text_api (stand‑alone translation if present)

Goals:
1. Single run target exposing all capabilities under consistent routes.
2. Unified API key security (optional, can be disabled if no key configured).
3. Normalized response schema: {"success": bool, "data": {...} | None, "error": {"message": str, "details": any} | None, "meta": {...}}.
4. Consolidated helpers for translation and text-to-speech to reduce duplication.
5. Health & info endpoints summarizing available tools.
6. Background cleanup hooks for temporary storage (documents, CSVs, audio) where applicable.

Run (development):
    python -m backend_api.master_backend_api

or with uvicorn:
    uvicorn backend_api.master_backend_api:app --reload --port 8000

"""
from __future__ import annotations
from gtts import gTTS  # type: ignore
from langdetect import detect  # type: ignore
from deep_translator import GoogleTranslator  # type: ignore
import os
import io
import json
import uuid
import base64
import traceback
from typing import Optional, Dict, Any

from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Attempt imports from sibling legacy modules (best‑effort: if something fails we log and continue)
try:
    from .clinical_chat_api import clinical_chat as _legacy_clinical_chat, translate_text as _legacy_translate_text, text_to_speech_base64 as _legacy_tts, conversation_history as _clinical_history
except Exception as e:  # noqa
    _legacy_clinical_chat = None
    _legacy_translate_text = None
    _legacy_tts = None
    _clinical_history = []
    print(f"[master_backend] Warning: clinical_chat_api import failed: {e}")

try:
    from .document_api import process_document as _legacy_process_document, cleanup_temp_storage as _legacy_doc_cleanup
except Exception as e:  # noqa
    _legacy_process_document = None
    _legacy_doc_cleanup = None
    print(f"[master_backend] Warning: document_api import failed: {e}")

try:
    from .csv_file_api import process_csv as _legacy_process_csv
except Exception as e:  # noqa
    _legacy_process_csv = None
    print(f"[master_backend] Warning: csv_file_api import failed: {e}")

try:
    from .transcription_api import api_transcribe_audio as _legacy_transcribe_audio, test_transcription_api as _legacy_test_transcription
except Exception as e:  # noqa
    _legacy_transcribe_audio = None
    _legacy_test_transcription = None
    print(f"[master_backend] Warning: transcription_api import failed: {e}")

try:
    from .organ_analyzer_api import api_analyze_organ_scan as _legacy_analyze_organ_scan, test_organ_analyzer_api as _legacy_test_organ
except Exception as e:  # noqa
    _legacy_analyze_organ_scan = None
    _legacy_test_organ = None
    print(f"[master_backend] Warning: organ_analyzer_api import failed: {e}")

# ----------------------------------------------------------------------------
# Config & Security
# ----------------------------------------------------------------------------
CONFIG_PATH = os.path.join(os.path.dirname(__file__), 'config', 'config.json')
CONFIG: Dict[str, Any] = {}
if os.path.exists(CONFIG_PATH):
    try:
        with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
            CONFIG = json.load(f)
    except Exception as e:  # noqa
        print(f"[master_backend] Warning reading config.json: {e}")

OPENAI_API_KEY = CONFIG.get('OPENAI_API_KEY') or os.getenv('OPENAI_API_KEY')
MASTER_API_KEY = CONFIG.get('MASTER_API_KEY') or os.getenv(
    'MASTER_API_KEY')  # separate key to gate endpoints

REQUIRE_API_KEY = bool(MASTER_API_KEY)  # Only enforce if provided

API_KEY_HEADER_NAME = 'x-api-key'


def verify_api_key_dependency(x_api_key: Optional[str] = Header(None)):
    """FastAPI dependency to enforce API key if configured."""
    if REQUIRE_API_KEY:
        if not x_api_key or x_api_key != MASTER_API_KEY:
            raise HTTPException(
                status_code=401, detail='Invalid or missing API key')
    return True


# ----------------------------------------------------------------------------
# Unified Helpers (translation + TTS) - fallback to legacy where possible
# ----------------------------------------------------------------------------


def translate_text_unified(text: str, target_lang: str) -> str:
    if not text or not text.strip():
        return ''
    try:
        # attempt detection
        try:
            src = detect(text)
        except Exception:
            src = 'auto'
        # Use legacy if available
        if _legacy_translate_text and src != 'auto':
            try:
                # some legacy signatures differ; best effort
                return _legacy_translate_text(text, target_lang)
            except Exception:
                pass
        return GoogleTranslator(source='auto', target=target_lang).translate(text)
    except Exception as e:  # noqa
        print(f"[master_backend] translate_text_unified error: {e}")
        return text  # graceful fallback


def tts_base64_unified(text: str) -> str:
    if not text or not text.strip():
        raise ValueError('No text to synthesize')
    # Try legacy first
    if _legacy_tts:
        try:
            return _legacy_tts(text)
        except Exception:
            pass
    filename = f"tts_{uuid.uuid4()}.mp3"
    temp_dir = os.path.join(os.path.dirname(__file__), 'audio_outputs')
    os.makedirs(temp_dir, exist_ok=True)
    path = os.path.join(temp_dir, filename)
    tts = gTTS(text)
    tts.save(path)
    with open(path, 'rb') as f:
        data = base64.b64encode(f.read()).decode('utf-8')
    try:
        os.remove(path)
    except OSError:
        pass
    return data


# ----------------------------------------------------------------------------
# App Initialization
# ----------------------------------------------------------------------------
app = FastAPI(title='Master Healthcare AI Backend',
              description='Unified API exposing clinical chat, document Q&A, CSV agent, organ analyzer, transcription, and translation endpoints.')

# Dynamic CORS: prefer explicit origins in production; read from ALLOWED_ORIGINS env or config
default_origins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8000',
    'https://ai-tool-1-v9rj.onrender.com',  # provided Render frontend
]
configured_origins = CONFIG.get(
    'ALLOWED_ORIGINS') or os.getenv('ALLOWED_ORIGINS')
if configured_origins:
    # Support comma-separated list
    allowed_origins = [o.strip()
                       for o in configured_origins.split(',') if o.strip()]
else:
    allowed_origins = default_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# ----------------------------------------------------------------------------
# Response helpers
# ----------------------------------------------------------------------------


def ok(data: Any, meta: Optional[Dict[str, Any]] = None):
    return {'success': True, 'data': data, 'error': None, 'meta': meta or {}}


def fail(message: str, status: int = 400, details: Any = None):
    return JSONResponse(status_code=status, content={'success': False, 'data': None, 'error': {'message': message, 'details': details}, 'meta': {}})

# ----------------------------------------------------------------------------
# Health & Info
# ----------------------------------------------------------------------------


@app.get('/health')
async def health():
    return ok({'status': 'ok'})


@app.get('/info')
async def info():
    return ok({
        'services': {
            'clinical_chat': bool(_legacy_clinical_chat),
            'document_processing': bool(_legacy_process_document),
            'csv_processing': bool(_legacy_process_csv),
            'organ_analyzer': bool(_legacy_analyze_organ_scan),
            'transcription': bool(_legacy_transcribe_audio),
        },
        'security': {
            'api_key_required': REQUIRE_API_KEY,
            'api_key_header': API_KEY_HEADER_NAME if REQUIRE_API_KEY else None,
        }
    })

# ----------------------------------------------------------------------------
# Clinical Chat Endpoint
# ----------------------------------------------------------------------------


@app.post('/clinical_chat', dependencies=[Depends(verify_api_key_dependency)])
async def clinical_chat_endpoint(
    background_tasks: BackgroundTasks,
    prompt: str = Form(...),
    output_language: str = Form('en')
):
    try:
        if not _legacy_clinical_chat:
            return fail('clinical_chat capability unavailable', 503)
        result = await _legacy_clinical_chat(prompt=prompt, output_language=output_language)
        # ensure translation / TTS fields if needed
        return ok(result)
    except HTTPException as he:  # propagate
        raise he
    except Exception as e:
        return fail('clinical_chat failed', 500, traceback.format_exc())

# ----------------------------------------------------------------------------
# Document Processing Endpoint
# ----------------------------------------------------------------------------


@app.post('/process_document', dependencies=[Depends(verify_api_key_dependency)])
async def process_document_endpoint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    question: str = Form(''),
    output_language: str = Form('en')
):
    if not _legacy_process_document:
        return fail('document processing capability unavailable', 503)
    try:
        # Pass background_tasks if legacy expects it (robust to differing signatures)
        try:
            result = await _legacy_process_document(background_tasks=background_tasks, file=file, question=question, output_language=output_language)
        except TypeError:
            # Fallback if signature differs
            result = await _legacy_process_document(file=file, question=question, output_language=output_language)
        # Schedule cleanup if available
        if _legacy_doc_cleanup:
            background_tasks.add_task(_legacy_doc_cleanup)
        return ok(result)
    except Exception:
        return fail('process_document failed', 500, traceback.format_exc())

# ----------------------------------------------------------------------------
# CSV Processing Endpoint
# ----------------------------------------------------------------------------


@app.post('/process_csv', dependencies=[Depends(verify_api_key_dependency)])
async def process_csv_endpoint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    question: str = Form(''),
    output_language: str = Form('en')
):
    if not _legacy_process_csv:
        return fail('csv processing capability unavailable', 503)
    try:
        try:
            result = await _legacy_process_csv(background_tasks=background_tasks, file=file, question=question, output_language=output_language)
        except TypeError:
            result = await _legacy_process_csv(file=file, question=question, output_language=output_language)
        return ok(result)
    except Exception:
        return fail('process_csv failed', 500, traceback.format_exc())

# ----------------------------------------------------------------------------
# Organ Analyzer Endpoint
# ----------------------------------------------------------------------------


@app.post('/analyze_organ_scan', dependencies=[Depends(verify_api_key_dependency)])
async def analyze_organ_scan_endpoint(
    background_tasks: BackgroundTasks,
    image: UploadFile = File(...),
    organ: str = Form(...),
    input_language: str = Form('en'),
    output_language: str = Form('en')
):
    if not _legacy_analyze_organ_scan:
        return fail('organ analyzer capability unavailable', 503)
    try:
        # Delegate to legacy
        result = await _legacy_analyze_organ_scan(image=image, organ=organ, input_language=input_language, output_language=output_language)
        return ok(result)
    except Exception:
        return fail('analyze_organ_scan failed', 500, traceback.format_exc())

# ----------------------------------------------------------------------------
# Transcription Endpoint
# ----------------------------------------------------------------------------


@app.post('/transcribe_audio', dependencies=[Depends(verify_api_key_dependency)])
async def transcribe_audio_endpoint(
    background_tasks: BackgroundTasks,
    audio_file: UploadFile = File(...),
    output_language: str = Form('en')
):
    if not _legacy_transcribe_audio:
        return fail('transcription capability unavailable', 503)
    try:
        result = await _legacy_transcribe_audio(audio_file=audio_file, output_language=output_language)
        return ok(result)
    except Exception:
        return fail('transcribe_audio failed', 500, traceback.format_exc())

# ----------------------------------------------------------------------------
# Test / Utility Endpoints (Kept lightweight)
# ----------------------------------------------------------------------------


@app.post('/test_transcription', dependencies=[Depends(verify_api_key_dependency)])
async def test_transcription_endpoint(output_language: str = Form('en')):
    if not _legacy_test_transcription:
        return fail('test transcription unavailable', 503)
    try:
        result = await _legacy_test_transcription(output_language=output_language)
        return ok(result)
    except Exception:
        return fail('test_transcription failed', 500, traceback.format_exc())


@app.post('/test_organ_analyzer', dependencies=[Depends(verify_api_key_dependency)])
async def test_organ_analyzer_endpoint(organ: str = Form('lung'), input_language: str = Form('en'), output_language: str = Form('en')):
    if not _legacy_test_organ:
        return fail('test organ analyzer unavailable', 503)
    try:
        result = await _legacy_test_organ(organ=organ, input_language=input_language, output_language=output_language)
        return ok(result)
    except Exception:
        return fail('test_organ_analyzer failed', 500, traceback.format_exc())

# ----------------------------------------------------------------------------
# Simple translation & TTS helper endpoints (optional for frontend convenience)
# ----------------------------------------------------------------------------


@app.post('/translate_text', dependencies=[Depends(verify_api_key_dependency)])
async def translate_text_endpoint(text: str = Form(...), target_language: str = Form('en')):
    try:
        translated = translate_text_unified(text, target_language)
        return ok({'translated_text': translated})
    except Exception:
        return fail('translate_text failed', 500, traceback.format_exc())


@app.post('/text_to_speech', dependencies=[Depends(verify_api_key_dependency)])
async def text_to_speech_endpoint(text: str = Form(...)):
    try:
        audio_b64 = tts_base64_unified(text)
        return ok({'audio_base64': audio_b64, 'audio_format': 'mp3'})
    except ValueError as ve:
        return fail(str(ve), 400)
    except Exception:
        return fail('text_to_speech failed', 500, traceback.format_exc())

# ----------------------------------------------------------------------------
# Run helper
# ----------------------------------------------------------------------------
if __name__ == '__main__':
    import uvicorn
    uvicorn.run('backend_api.master_backend_api:app',
                host='0.0.0.0', port=8000, reload=True)
