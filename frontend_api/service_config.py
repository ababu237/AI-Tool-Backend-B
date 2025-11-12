"""Central service configuration for frontend proxy APIs.

Allows overriding backend service base URLs via environment variables so that
all frontend proxy files import from a single source instead of hardcoding
"http://localhost:PORT" strings in multiple places.

Environment variable names follow the pattern:
  <SERVICE_NAME>_BACKEND (uppercase) e.g. CLINICAL_CHAT_BACKEND

Falls back to localhost defaults when env vars are not set.
"""

import os

BACKEND_SERVICES = {
    "clinical_chat": os.getenv("CLINICAL_CHAT_BACKEND", "http://localhost:8000"),
    "document": os.getenv("DOCUMENT_BACKEND", "http://localhost:8000"),
    "csv": os.getenv("CSV_BACKEND", "http://localhost:8000"),
    "organ": os.getenv("ORGAN_BACKEND", "http://localhost:8000"),
    "transcription": os.getenv("TRANSCRIPTION_BACKEND", "http://localhost:8000"),
    "translation": os.getenv("TRANSLATION_BACKEND", "http://localhost:8000"),
}


def get_backend(service_key: str) -> str:
    """Helper to fetch backend URL for a named service.

    Args:
        service_key: key in BACKEND_SERVICES (e.g. 'clinical_chat')
    Returns:
        Base URL string.
    Raises:
        KeyError if the key is unknown.
    """
    return BACKEND_SERVICES[service_key]
