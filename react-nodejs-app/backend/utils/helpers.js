import translate from 'google-translate-api-x';
import gtts from 'gtts';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { promises as fsPromises } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Detect language of text
 * Simple implementation - in production, use a proper language detection library
 */
export function detectLanguage(text) {
  if (!text || text.trim().length < 3) {
    return 'en';
  }
  
  // Simple heuristics - you may want to use a library like 'franc' for better detection
  const patterns = {
    es: /\b(el|la|los|las|de|que|en|es|un|una|por|con)\b/i,
    fr: /\b(le|la|les|de|que|en|est|un|une|pour|avec)\b/i,
    de: /\b(der|die|das|und|ist|nicht|mit|von|zu|den)\b/i,
    it: /\b(il|lo|la|i|gli|le|di|che|e|in|un|una)\b/i,
    pt: /\b(o|a|os|as|de|que|em|é|um|uma|por|com)\b/i,
  };

  for (const [lang, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) {
      return lang;
    }
  }

  return 'en';
}

/**
 * Translate text from source language to target language
 */
export async function translateText(text, sourceLang, targetLang) {
  if (!text || !text.trim()) {
    return '';
  }

  if (sourceLang === targetLang) {
    return text;
  }

  try {
    const result = await translate(text, { 
      from: sourceLang, 
      to: targetLang 
    });
    return result.text;
  } catch (error) {
    console.error('Translation error:', error);
    // Fallback: return original text if translation fails
    return text;
  }
}

/**
 * Convert text to speech and return base64 encoded audio
 */
export async function textToSpeechBase64(text, language = 'en') {
  if (!text || !text.trim()) {
    throw new Error('No text to convert to audio');
  }

  // Map unsupported languages to English
  const supportedLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh-CN', 'zh-TW', 'ar', 'hi', 'pl', 'ta', 'ga'];
  const ttsLanguage = supportedLanguages.includes(language) ? language : 'en';
  
  if (ttsLanguage !== language) {
    console.log(`Language ${language} not supported by TTS, using English instead`);
  }

  return new Promise((resolve, reject) => {
    const filename = `temp_audio_${uuidv4()}.mp3`;
    const filepath = path.join(__dirname, '..', 'audio_outputs', filename);

    const speech = new gtts(text, ttsLanguage);
    
    speech.save(filepath, async (err) => {
      if (err) {
        reject(new Error(`Text-to-speech error: ${err.message}`));
        return;
      }

      try {
        // Read the file and convert to base64
        const audioBuffer = await fsPromises.readFile(filepath);
        const audioBase64 = audioBuffer.toString('base64');

        // Clean up temp file
        await fsPromises.unlink(filepath);

        resolve(audioBase64);
      } catch (fileError) {
        reject(new Error(`File processing error: ${fileError.message}`));
      }
    });
  });
}

/**
 * Format error response
 */
export function formatErrorResponse(message, details = null) {
  return {
    success: false,
    error: {
      message,
      details,
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Format success response
 */
export function formatSuccessResponse(data, meta = null) {
  const response = {
    success: true,
    data
  };

  if (meta) {
    response.meta = meta;
  }

  return response;
}

/**
 * Validate required fields in request body
 */
export function validateRequiredFields(body, requiredFields) {
  const missingFields = [];
  
  for (const field of requiredFields) {
    if (!body[field] || (typeof body[field] === 'string' && !body[field].trim())) {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  return true;
}

/**
 * Clean up old files from a directory
 */
export async function cleanupOldFiles(directory, maxAgeMinutes = 60) {
  try {
    const files = await fsPromises.readdir(directory);
    const now = Date.now();
    const maxAge = maxAgeMinutes * 60 * 1000;

    for (const file of files) {
      const filePath = path.join(directory, file);
      const stats = await fsPromises.stat(filePath);
      
      if (now - stats.mtimeMs > maxAge) {
        await fsPromises.unlink(filePath);
        console.log(`Cleaned up old file: ${file}`);
      }
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}
