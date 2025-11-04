# Text Translation API

from deep_translator import GoogleTranslator
from langdetect import detect

def translate_text(text: str, target_language: str) -> str:
    if not text.strip():
        return ""
    try:
        source_lang = detect(text)
    except:
        source_lang = "auto"
    
    return GoogleTranslator(source=source_lang, target=target_language).translate(text)
