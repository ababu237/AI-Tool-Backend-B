import express from 'express';
import multer from 'multer';
import OpenAI from 'openai';
import config from '../config.js';
import { promises as fsPromises } from 'fs';
import fs from 'fs';
import { translateText, textToSpeechBase64, detectLanguage } from '../utils/helpers.js';
import { callOpenAIWithRetry, format429Error } from '../utils/openaiRetry.js';

const router = express.Router();

// Configure multer for audio uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: config.maxFileSize },
  fileFilter: (req, file, cb) => {
    // OpenAI Whisper officially supported formats as per documentation
    // Ref: https://platform.openai.com/docs/guides/speech-to-text
    const allowedMimeTypes = [
      // FLAC
      'audio/flac', 'audio/x-flac',
      // M4A
      'audio/m4a', 'audio/x-m4a', 'audio/mp4',
      // MP3
      'audio/mp3', 'audio/mpeg', 'audio/mpeg3', 'audio/x-mpeg-3',
      // MP4
      'audio/mp4', 'video/mp4',
      // MPEG
      'audio/mpeg', 'video/mpeg',
      // MPGA
      'audio/mpga',
      // OGA/OGG
      'audio/ogg', 'audio/oga', 'audio/opus', 'audio/x-ogg',
      // WAV
      'audio/wav', 'audio/wave', 'audio/x-wav', 'audio/vnd.wave',
      // WEBM
      'audio/webm', 'video/webm',
      // Fallback for browsers that send generic MIME types
      'application/octet-stream', 'audio/*'
    ];
    
    // Match extensions for all supported formats
    const allowedExtensions = /\.(flac|m4a|mp3|mp4|mpeg|mpga|oga|ogg|opus|wav|wave|webm)$/i;
    
    console.log('Multer file validation:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      extension: file.originalname.split('.').pop()?.toLowerCase()
    });
    
    // Accept if MIME type matches OR if file extension matches
    const mimeTypeOk = allowedMimeTypes.includes(file.mimetype) || file.mimetype.startsWith('audio/');
    const extensionOk = file.originalname.match(allowedExtensions);
    
    if (mimeTypeOk || extensionOk) {
      console.log('✅ File accepted by multer');
      cb(null, true);
    } else {
      console.log('❌ File rejected by multer');
      cb(new Error(`Unsupported audio format. Supported formats: FLAC, M4A, MP3, MP4, MPEG, MPGA, OGG, OGA, OPUS, WAV, WEBM. Received: ${file.mimetype || 'unknown'} (${file.originalname})`));
    }
  }
});

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: config.openaiApiKey
});

// Handler function for transcription
const handleTranscribe = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { message: 'No audio file uploaded' }
      });
    }

    // Additional file validation - All formats supported by OpenAI Whisper
    const supportedFormats = ['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'opus', 'wav', 'wave', 'webm'];
    const fileExtension = req.file.originalname.split('.').pop()?.toLowerCase();
    
    console.log('Processing file:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      extension: fileExtension,
      size: req.file.size,
      path: req.file.path
    });
    
    if (!fileExtension || !supportedFormats.includes(fileExtension)) {
      return res.status(400).json({
        success: false,
        error: { 
          message: `Unrecognized file format. Supported formats: ${JSON.stringify(supportedFormats)}`,
          details: `File: ${req.file.originalname}, Extension: ${fileExtension}, MIME: ${req.file.mimetype}`
        }
      });
    }

    const { outputLanguage = 'en', translateToEnglish = false, organContext = null, analyzeContext = false } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: { message: 'OpenAI API key not configured' }
      });
    }

    // Build prompt with organ context if provided
    let prompt = '';
    if (organContext && analyzeContext === 'true') {
      const organPrompts = {
        lung: 'This audio describes lung examination findings. Listen for breathing sounds, wheezing, crackles, or respiratory symptoms.',
        heart: 'This audio describes cardiac examination findings. Listen for heart sounds, murmurs, or cardiovascular symptoms.',
        brain: 'This audio describes neurological examination findings. Listen for cognitive, motor, or sensory symptoms.',
        kidney: 'This audio describes renal examination findings. Listen for urinary symptoms or kidney-related complaints.',
        liver: 'This audio describes hepatic examination findings. Listen for abdominal symptoms or liver-related complaints.',
        knee: 'This audio describes knee examination findings. Listen for joint pain, mobility issues, or orthopedic symptoms.',
        general: 'This audio describes general medical examination findings.'
      };
      prompt = organPrompts[organContext.toLowerCase()] || organPrompts.general;
    }

    // Transcribe using OpenAI Whisper with retry logic
    const transcription = await callOpenAIWithRetry(async () => {
      // Use toFile from OpenAI SDK which handles file streams properly
      const { toFile } = await import('openai/uploads');
      const audioFile = await toFile(fs.createReadStream(req.file.path), req.file.originalname);
      
      const options = {
        file: audioFile,
        model: 'whisper-1',
        response_format: 'json'
      };
      
      // Add prompt if organ context is provided
      if (prompt) {
        options.prompt = prompt;
      }
      
      return await openai.audio.transcriptions.create(options);
    }, 3);

    let transcribedText = transcription.text;
    const detectedLang = detectLanguage(transcribedText);

    // Translate if requested
    let translatedText = transcribedText;
    if (translateToEnglish === 'true' || translateToEnglish === true) {
      if (detectedLang !== 'en') {
        translatedText = await translateText(transcribedText, detectedLang, 'en');
      }
    } else if (outputLanguage && outputLanguage !== detectedLang) {
      translatedText = await translateText(transcribedText, detectedLang, outputLanguage);
    }

    // Perform organ-based analysis if requested
    let organAnalysis = null;
    let organSummary = null;
    let recommendations = null;
    
    if (organContext && analyzeContext === 'true') {
      try {
        const analysisPrompt = `You are a medical assistant analyzing audio transcription from a ${organContext} examination. 

Transcription: "${translatedText}"

Provide a brief clinical analysis focusing on:
1. Key symptoms or findings mentioned
2. Potential concerns (if any)
3. Recommended next steps

Format your response as JSON with keys: "summary", "keyFindings", "recommendations".

IMPORTANT: This is for educational purposes only. Always consult healthcare professionals for actual medical diagnosis.`;

        const analysisCompletion = await callOpenAIWithRetry(async () => {
          return await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are a medical assistant helping to analyze patient examination transcriptions.'
              },
              {
                role: 'user',
                content: analysisPrompt
              }
            ],
            response_format: { type: "json_object" }
          });
        }, 3);

        organAnalysis = JSON.parse(analysisCompletion.choices[0].message.content);
        organSummary = organAnalysis.summary;
        recommendations = organAnalysis.recommendations;
        
        // Translate analysis if needed
        if (outputLanguage !== 'en') {
          organSummary = await translateText(organSummary, 'en', outputLanguage);
          if (Array.isArray(recommendations)) {
            recommendations = await Promise.all(
              recommendations.map(rec => translateText(rec, 'en', outputLanguage))
            );
          }
        }
      } catch (analysisError) {
        console.error('Organ analysis error:', analysisError);
      }
    }

    // Generate audio of transcription
    let audioBase64 = null;
    try {
      const audioText = organSummary ? `${translatedText}. Analysis: ${organSummary}` : translatedText;
      audioBase64 = await textToSpeechBase64(audioText, outputLanguage || 'en');
    } catch (audioError) {
      console.error('Audio generation error:', audioError);
    }

    // Clean up uploaded file
    await fsPromises.unlink(req.file.path);

    const responseData = {
      transcription: transcribedText,
      translation: translatedText !== transcribedText ? translatedText : null,
      detectedLanguage: detectedLang,
      outputLanguage: outputLanguage || detectedLang,
      audioBase64,
      audioFormat: 'mp3'
    };

    // Add organ analysis if performed
    if (organAnalysis) {
      responseData.organContext = organContext;
      responseData.organAnalysis = {
        summary: organSummary,
        keyFindings: organAnalysis.keyFindings,
        recommendations: recommendations
      };
    }

    res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Transcription error:', error);
    console.error('Error details:', error.response?.data || error.stack);
    
    if (req.file) {
      try {
        await fsPromises.unlink(req.file.path);
      } catch (e) {}
    }

    // Handle 429 rate limiting errors specifically
    if (error.status === 429 || error.code === 'rate_limit_exceeded') {
      const errorResponse = format429Error(error);
      return res.status(429).json(errorResponse);
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to transcribe audio',
        details: error.message,
        type: error.name,
        apiError: error.response?.data
      }
    });
  }
};

/**
 * POST /api/transcribe (root) and /api/transcription/transcribe
 * Transcribe audio file to text
 */
router.post('/', (req, res, next) => {
  upload.single('audio')(req, res, (err) => {
    if (err) {
      console.error('❌ Multer upload error:', err.message);
      return res.status(400).json({
        success: false,
        error: {
          message: 'File upload error',
          details: err.message
        }
      });
    }
    next();
  });
}, handleTranscribe);

router.post('/transcribe', (req, res, next) => {
  upload.single('audio')(req, res, (err) => {
    if (err) {
      console.error('❌ Multer upload error:', err.message);
      return res.status(400).json({
        success: false,
        error: {
          message: 'File upload error',
          details: err.message
        }
      });
    }
    next();
  });
}, handleTranscribe);

/**
 * POST /api/transcription/translate-audio
 * Transcribe and translate audio to English
 */
router.post('/translate-audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { message: 'No audio file uploaded' }
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: { message: 'OpenAI API key not configured' }
      });
    }

    // Read audio file
    const audioBuffer = await fsPromises.readFile(req.file.path);
    
    const audioFile = new File([audioBuffer], req.file.originalname, {
      type: req.file.mimetype
    });

    // Use OpenAI Whisper translate endpoint with retry logic
    const translation = await callOpenAIWithRetry(async () => {
      return await openai.audio.translations.create({
        file: audioFile,
        model: 'whisper-1'
      });
    }, 3);

    const translatedText = translation.text;

    // Generate audio
    let audioBase64 = null;
    try {
      audioBase64 = await textToSpeechBase64(translatedText, 'en');
    } catch (audioError) {
      console.error('Audio generation error:', audioError);
    }

    // Clean up uploaded file
    await fsPromises.unlink(req.file.path);

    res.json({
      success: true,
      data: {
        translation: translatedText,
        outputLanguage: 'en',
        audioBase64,
        audioFormat: 'mp3'
      }
    });

  } catch (error) {
    console.error('Audio translation error:', error);
    
    if (req.file) {
      try {
        await fsPromises.unlink(req.file.path);
      } catch (e) {}
    }

    // Handle 429 rate limiting errors specifically
    if (error.status === 429 || error.code === 'rate_limit_exceeded') {
      const errorResponse = format429Error(error);
      return res.status(429).json(errorResponse);
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to translate audio',
        details: error.message
      }
    });
  }
});

export default router;
