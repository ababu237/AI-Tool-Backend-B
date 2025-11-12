import express from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import OpenAI from 'openai';
import config from '../config.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { createReadStream } from 'fs';
import { promises as fsPromises } from 'fs';
import { translateText, textToSpeechBase64, detectLanguage } from '../utils/helpers.js';

const router = express.Router();

// Configure multer for CSV uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: config.maxFileSize },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: config.openaiApiKey
});

// Store CSV data
const csvStore = new Map();

/**
 * Parse CSV file and extract data
 */
async function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    const headers = [];
    
    createReadStream(filePath)
      .pipe(csv())
      .on('headers', (headerList) => {
        headers.push(...headerList);
      })
      .on('data', (row) => {
        rows.push(row);
      })
      .on('end', () => {
        resolve({ headers, rows });
      })
      .on('error', reject);
  });
}

/**
 * Generate CSV summary for AI context
 */
function generateCSVSummary(headers, rows) {
  const summary = {
    rowCount: rows.length,
    columnCount: headers.length,
    columns: headers,
    sampleRows: rows.slice(0, 5),
    columnTypes: {}
  };

  // Infer column types
  headers.forEach(header => {
    const sampleValues = rows.slice(0, 10).map(row => row[header]);
    const numericCount = sampleValues.filter(val => !isNaN(parseFloat(val))).length;
    summary.columnTypes[header] = numericCount > 5 ? 'numeric' : 'text';
  });

  return summary;
}

/**
 * POST /api/csv/upload
 * Upload and process a CSV file
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { message: 'No file uploaded' }
      });
    }

    const { headers, rows } = await parseCSV(req.file.path);
    
    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'CSV file is empty' }
      });
    }

    const fileId = uuidv4();
    const summary = generateCSVSummary(headers, rows);

    csvStore.set(fileId, {
      headers,
      rows,
      summary,
      uploadedAt: new Date()
    });

    // Clean up uploaded file
    await fsPromises.unlink(req.file.path);

    res.json({
      success: true,
      data: {
        fileId,
        summary: {
          rowCount: summary.rowCount,
          columnCount: summary.columnCount,
          columns: summary.columns
        },
        message: 'CSV processed successfully'
      }
    });

  } catch (error) {
    console.error('CSV upload error:', error);
    
    if (req.file) {
      try {
        await fsPromises.unlink(req.file.path);
      } catch (e) {}
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to process CSV',
        details: error.message
      }
    });
  }
});

/**
 * POST /api/csv/query
 * Query CSV data using AI
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

    let csvData;
    
    // If file is provided, parse it directly (no fileId needed)
    if (req.file) {
      try {
        const { headers, rows } = await parseCSV(req.file.path);
        const summary = generateCSVSummary(headers, rows);
        
        csvData = {
          headers,
          rows,
          summary
        };
        
        // Clean up uploaded file
        await fsPromises.unlink(req.file.path);
      } catch (error) {
        if (req.file) {
          try {
            await fsPromises.unlink(req.file.path);
          } catch (e) {}
        }
        throw new Error(`Failed to process CSV: ${error.message}`);
      }
    }
    // Fall back to fileId if provided (backward compatibility)
    else if (fileId) {
      csvData = csvStore.get(fileId);
      if (!csvData) {
        return res.status(404).json({
          success: false,
          error: { message: 'CSV file not found. Please upload the file first.' }
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

    // Create context for AI
    const context = `CSV Data Analysis:
- Rows: ${csvData.summary.rowCount}
- Columns: ${csvData.summary.columns.join(', ')}

Column Types:
${Object.entries(csvData.summary.columnTypes).map(([col, type]) => `- ${col}: ${type}`).join('\n')}

Sample Data (first 5 rows):
${JSON.stringify(csvData.summary.sampleRows, null, 2)}

Complete Data:
${JSON.stringify(csvData.rows.slice(0, 50), null, 2)}
${csvData.rows.length > 50 ? `\n(Showing first 50 of ${csvData.rows.length} rows)` : ''}`;

    const prompt = `Based on the following CSV data, please answer the question.

${context}

Question: ${question}

Please provide a clear and specific answer based on the data. Include relevant numbers, statistics, or insights.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a data analysis assistant. Analyze CSV data and provide clear, accurate answers with specific numbers and insights.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 600
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
    console.error('CSV query error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to process query',
        details: error.message
      }
    });
  }
});

/**
 * DELETE /api/csv/:fileId
 * Delete a processed CSV file
 */
router.delete('/:fileId', (req, res) => {
  try {
    const { fileId } = req.params;
    
    if (csvStore.has(fileId)) {
      csvStore.delete(fileId);
      res.json({
        success: true,
        data: { message: 'CSV file deleted successfully' }
      });
    } else {
      res.status(404).json({
        success: false,
        error: { message: 'CSV file not found' }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to delete CSV' }
    });
  }
});

// Simplified alias route for analyzing CSV
router.post('/analyze', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { message: 'No CSV file uploaded' }
      });
    }

    const { headers, rows } = await parseCSV(req.file.path);
    const summary = generateCSVSummary(headers, rows);
    const fileId = uuidv4();

    csvStore.set(fileId, {
      filename: req.file.originalname,
      headers,
      rows,
      summary,
      uploadedAt: new Date()
    });

    // Clean up uploaded file
    await fsPromises.unlink(req.file.path).catch(console.error);

    res.json({
      success: true,
      data: {
        fileId,
        filename: req.file.originalname,
        headers,
        rowCount: rows.length,
        columnCount: headers.length,
        preview: rows.slice(0, 5),
        summary: `CSV file contains ${rows.length} rows and ${headers.length} columns. Columns: ${headers.join(', ')}`
      }
    });

  } catch (error) {
    console.error('CSV analysis error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to analyze CSV',
        details: error.message
      }
    });
  }
});

export default router;
