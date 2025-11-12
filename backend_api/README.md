# Legacy backend_api Modules

This folder contains the original, per-feature FastAPI implementations before the modular secure backend (`backend/`) wrapper was introduced.

## Contents

- `clinical_chat_api.py` – Clinical assistant logic (now wrapped by router in `backend/routes/api1.py`).
- `document_api.py` – PDF document Q&A using LangChain + FAISS (emits deprecation warnings).
- `csv_file_api.py` – CSV analysis (refactored to direct OpenAI; removed deprecated LangChain `create_csv_agent`).
- `organ_analyzer_api.py` – Organ image analysis (contains malformed torchvision import section; currently not mounted directly).
- `transcription_api.py` – Whisper transcription + translation.
- `translate_text_api.py` – Simple translation + TTS.
- `config/config.json` – Legacy configuration file for API keys (prefer environment variables going forward).

## Recommended Usage

Instead of starting each file independently, use the unified secure backend app:

```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Routers call the utility functions defined here. New development should avoid editing these legacy files directly; move shared logic into `backend/utils/` as part of refactoring.

## Installing Dependencies (Legacy Only)

If you want to run or test these modules in isolation:

```bash
pip install -r backend_api/requirements.txt
```

Consider using the root `requirements.txt` instead for consistency.

## Migration Plan

1. Extract common helpers: translation, text-to-speech, PDF/CSV parsing into `backend/utils/`.
2. Remove deprecated LangChain usage from `document_api.py` (replace with direct OpenAI prompts + optional embeddings if still needed).
3. Fix `organ_analyzer_api.py` malformed import block (torchvision try/except).
4. Replace config file key loading with environment-first logic everywhere.
5. Standardize response schema across routers (success / data / error / meta).

## Security Notes

- These legacy modules do not enforce the API key header themselves anymore; security is applied at the router layer in `backend/main.py`.
- Do not expose `/docs` on these individual apps in production.

## Deprecation Status

All files here are considered legacy. Future removals will follow once utility extraction and refactors complete.
