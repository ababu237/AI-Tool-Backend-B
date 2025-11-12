import express from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import OpenAI from 'openai';
import config from '../config.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { translateText, textToSpeechBase64, detectLanguage } from '../utils/helpers.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: config.maxFileSize },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: config.openaiApiKey
});

// Store document data (in production, use database)
const documentStore = new Map();

/**
 * Extract text from PDF buffer
 */
async function extractPdfText(buffer) {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    throw new Error(`PDF extraction failed: ${error.message}`);
  }
}

/**
 * Create embeddings and store document
 */
async function processDocument(fileId, text) {
  // Split text into chunks
  const chunkSize = 1000;
  const chunks = [];
  
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize));
  }

  // Store document data
  documentStore.set(fileId, {
    text,
    chunks,
    uploadedAt: new Date()
  });

  return { fileId, chunkCount: chunks.length };
}

/**
 * POST /api/document/upload
 * Upload and process a PDF document
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { message: 'No file uploaded' }
      });
    }

    const fileBuffer = await fs.readFile(req.file.path);
    const text = await extractPdfText(fileBuffer);

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Could not extract text from PDF' }
      });
    }

    const fileId = uuidv4();
    const { chunkCount } = await processDocument(fileId, text);

    // Clean up uploaded file
    await fs.unlink(req.file.path);

    res.json({
      success: true,
      data: {
        fileId,
        chunkCount,
        textLength: text.length,
        message: 'Document processed successfully'
      }
    });

  } catch (error) {
    console.error('Document upload error:', error);
    
    // Clean up file if it exists
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (e) {}
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to process document',
        details: error.message
      }
    });
  }
});

/**
 * POST /api/document/query
 * Query a processed document
 */
router.post('/query', upload.single('file'), async (req, res) => {
  try {
    const { fileId, question, outputLanguage = 'en' } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        error: { message: 'Question is required' }
      });
    }

    let document;
    
    // If file is provided, use it directly (no fileId needed)
    if (req.file) {
      try {
        const fileBuffer = await fs.readFile(req.file.path);
        const text = await extractPdfText(fileBuffer);
        document = { text, filename: req.file.originalname };
        
        // Clean up uploaded file
        await fs.unlink(req.file.path);
      } catch (error) {
        if (req.file) {
          try {
            await fs.unlink(req.file.path);
          } catch (e) {}
        }
        throw new Error(`Failed to process PDF: ${error.message}`);
      }
    } 
    // Fall back to fileId if provided (backward compatibility)
    else if (fileId) {
      document = documentStore.get(fileId);
      if (!document) {
        return res.status(404).json({
          success: false,
          error: { message: 'Document not found. Please upload the document first.' }
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        error: { message: 'Either file or fileId is required' }
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: { message: 'OpenAI API key not configured' }
      });
    }

    // Use OpenAI to answer question based on document context
    const prompt = `Based on the following document content, please answer the question.

Document content:
${document.text.substring(0, 12000)}

Question: ${question}

Please provide a clear and concise answer based only on the information in the document. If the answer is not in the document, say so.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that answers questions based on provided document content.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const answer = completion.choices[0].message.content.trim();

    // Translate answer if needed
    const detectedLang = detectLanguage(answer);
    const translatedAnswer = outputLanguage !== detectedLang
      ? await translateText(answer, detectedLang, outputLanguage)
      : answer;

    // Generate audio
    let audioBase64 = null;
    try {
      audioBase64 = await textToSpeechBase64(translatedAnswer, outputLanguage);
    } catch (audioError) {
      console.error('Audio generation error:', audioError);
    }

    res.json({
      success: true,
      data: {
        answer: translatedAnswer,
        audioBase64,
        audioFormat: 'mp3',
        detectedLanguage: detectedLang,
        outputLanguage
      }
    });

  } catch (error) {
    console.error('Document query error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to process question',
        details: error.message
      }
    });
  }
});

/**
 * DELETE /api/document/:fileId
 * Delete a processed document
 */
router.delete('/:fileId', (req, res) => {
  try {
    const { fileId } = req.params;
    
    if (documentStore.has(fileId)) {
      documentStore.delete(fileId);
      res.json({
        success: true,
        data: { message: 'Document deleted successfully' }
      });
    } else {
      res.status(404).json({
        success: false,
        error: { message: 'Document not found' }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to delete document' }
    });
  }
});

// Simplified alias routes that combine upload and query
router.post('/analyze', upload.single('file'), async (req, res) => {
  // This route handles document upload and returns a summary
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { message: 'No file uploaded' }
      });
    }

    const fileBuffer = await fs.readFile(req.file.path);
    const text = await extractPdfText(fileBuffer);

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Could not extract text from PDF' }
      });
    }

    const fileId = uuidv4();
    await processDocument(fileId, text);

    // Clean up uploaded file
    await fs.unlink(req.file.path).catch(console.error);

    // Return summary
    const summary = text.substring(0, 500) + (text.length > 500 ? '...' : '');
    
    res.json({
      success: true,
      data: {
        fileId,
        filename: req.file.originalname,
        summary,
        textLength: text.length
      },
      summary // For frontend compatibility
    });

  } catch (error) {
    console.error('Document analysis error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to analyze document',
        details: error.message
      }
    });
  }
});

export default router;
