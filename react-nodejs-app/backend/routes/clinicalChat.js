import express from 'express';
import OpenAI from 'openai';
import config from '../config.js';
import { translateText, textToSpeechBase64, detectLanguage } from '../utils/helpers.js';

const router = express.Router();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: config.openaiApiKey
});

// Store conversation history (in production, use Redis or database)
const conversationHistories = new Map();

// Handler function for sending messages
const handleSendMessage = async (req, res) => {
  try {
    // Accept both 'query' and 'message' field names for compatibility
    const { query, message, outputLanguage = 'en', sessionId = 'default' } = req.body;
    const userMessage = query || message;

    if (!userMessage || !userMessage.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Query or message is required' }
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: { message: 'OpenAI API key not configured' }
      });
    }

    // Get or create conversation history
    if (!conversationHistories.has(sessionId)) {
      conversationHistories.set(sessionId, []);
    }
    const history = conversationHistories.get(sessionId);

    // Build messages array
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful clinical assistant. Provide accurate, evidence-based medical information while being clear that you are not a substitute for professional medical advice. Be empathetic and professional.'
      },
      ...history,
      { role: 'user', content: userMessage }
    ];

    // Get response from OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages,
      temperature: 0.7,
      max_tokens: 500
    });

    const responseText = completion.choices[0].message.content.trim();

    // Update conversation history
    history.push({ role: 'user', content: userMessage });
    history.push({ role: 'assistant', content: responseText });

    // Keep only last 10 messages to avoid token limits
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }

    // Translate response if needed
    const detectedLang = detectLanguage(responseText);
    const translatedResponse = outputLanguage !== detectedLang 
      ? await translateText(responseText, detectedLang, outputLanguage)
      : responseText;

    // Generate audio
    let audioBase64 = null;
    try {
      audioBase64 = await textToSpeechBase64(translatedResponse, outputLanguage);
    } catch (audioError) {
      console.error('Audio generation error:', audioError);
      // Continue without audio
    }

    res.json({
      success: true,
      response: translatedResponse,
      audio_base64: audioBase64,
      audioFormat: 'mp3',
      sessionId,
      detectedLanguage: detectedLang,
      outputLanguage,
      data: {
        response: translatedResponse,
        audioBase64,
        audioFormat: 'mp3',
        sessionId,
        detectedLanguage: detectedLang,
        outputLanguage
      }
    });

  } catch (error) {
    console.error('Clinical chat error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to process clinical chat request',
        details: error.message
      }
    });
  }
};

/**
 * POST /api/clinical-chat (root) and /api/clinical-chat/send
 * Send a message to the clinical chat assistant
 */
router.post('/', handleSendMessage);
router.post('/send', handleSendMessage);

/**
 * POST /api/clinical-chat/clear
 * Clear conversation history for a session
 */
router.post('/clear', (req, res) => {
  try {
    const { sessionId = 'default' } = req.body;
    conversationHistories.delete(sessionId);

    res.json({
      success: true,
      data: { message: 'Conversation history cleared', sessionId }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to clear history' }
    });
  }
});

/**
 * GET /api/clinical-chat/history/:sessionId
 * Get conversation history for a session
 */
router.get('/history/:sessionId?', (req, res) => {
  try {
    const sessionId = req.params.sessionId || 'default';
    const history = conversationHistories.get(sessionId) || [];

    res.json({
      success: true,
      data: { history, sessionId }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve history' }
    });
  }
});

export default router;
