import express from 'express';
import { translateText, textToSpeechBase64, detectLanguage } from '../utils/helpers.js';

const router = express.Router();

// Handler function for translation
const handleTranslate = async (req, res) => {
  try {
    const { text, sourceLanguage, targetLanguage } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Text is required' }
      });
    }

    if (!targetLanguage) {
      return res.status(400).json({
        success: false,
        error: { message: 'Target language is required' }
      });
    }

    // Detect source language if not provided
    const sourceLang = sourceLanguage || detectLanguage(text);

    // Translate text
    const translatedText = await translateText(text, sourceLang, targetLanguage);

    res.json({
      success: true,
      data: {
        originalText: text,
        translatedText,
        sourceLanguage: sourceLang,
        targetLanguage
      }
    });

  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to translate text',
        details: error.message
      }
    });
  }
};

/**
 * POST /api/translate (root) and /api/translation/translate
 * Translate text between languages
 */
router.post('/', handleTranslate);
router.post('/translate', handleTranslate);

/**
 * POST /api/translation/text-to-speech
 * Convert text to speech
 */
router.post('/text-to-speech', async (req, res) => {
  try {
    const { text, language = 'en' } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Text is required' }
      });
    }

    // Generate audio
    const audioBase64 = await textToSpeechBase64(text, language);

    res.json({
      success: true,
      data: {
        text,
        language,
        audioBase64,
        audioFormat: 'mp3'
      }
    });

  } catch (error) {
    console.error('Text-to-speech error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to generate speech',
        details: error.message
      }
    });
  }
});

/**
 * POST /api/translation/translate-and-speak
 * Translate text and generate speech
 */
router.post('/translate-and-speak', async (req, res) => {
  try {
    const { text, sourceLanguage, targetLanguage } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Text is required' }
      });
    }

    if (!targetLanguage) {
      return res.status(400).json({
        success: false,
        error: { message: 'Target language is required' }
      });
    }

    // Detect source language if not provided
    const sourceLang = sourceLanguage || detectLanguage(text);

    // Translate text
    const translatedText = await translateText(text, sourceLang, targetLanguage);

    // Generate audio
    let audioBase64 = null;
    try {
      audioBase64 = await textToSpeechBase64(translatedText, targetLanguage);
    } catch (audioError) {
      console.error('Audio generation error:', audioError);
    }

    res.json({
      success: true,
      data: {
        originalText: text,
        translatedText,
        sourceLanguage: sourceLang,
        targetLanguage,
        audioBase64,
        audioFormat: 'mp3'
      }
    });

  } catch (error) {
    console.error('Translate and speak error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to translate and generate speech',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/translation/supported-languages
 * Get list of supported languages
 */
router.get('/supported-languages', (req, res) => {
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' },
    { code: 'bn', name: 'Bengali' },
    { code: 'pa', name: 'Punjabi' },
    { code: 'te', name: 'Telugu' },
    { code: 'mr', name: 'Marathi' },
    { code: 'ta', name: 'Tamil' },
    { code: 'ur', name: 'Urdu' },
    { code: 'vi', name: 'Vietnamese' },
    { code: 'th', name: 'Thai' }
  ];

  res.json({
    success: true,
    data: { languages }
  });
});

export default router;
