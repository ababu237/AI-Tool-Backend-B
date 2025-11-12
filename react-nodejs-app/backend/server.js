import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

// Load configuration first
import config from './config.js';

// ES6 module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import route handlers AFTER loading configuration
import clinicalChatRoutes from './routes/clinicalChat.js';
import documentRoutes from './routes/document.js';
import csvRoutes from './routes/csv.js';
import organAnalyzerRoutes from './routes/organAnalyzer.js';
import transcriptionRoutes from './routes/transcription.js';
import translationRoutes from './routes/translation.js';

// Initialize Express app
const app = express();
const PORT = config.port;

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging middleware
app.use(morgan('combined'));

// Create necessary directories
const createDirectories = async () => {
  const dirs = [
    path.join(__dirname, 'uploads'),
    path.join(__dirname, 'temp'),
    path.join(__dirname, 'audio_outputs'),
    path.join(__dirname, 'translated_csvs')
  ];
  
  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      console.error(`Error creating directory ${dir}:`, error);
    }
  }
};

createDirectories();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'Healthcare Assistant API'
  });
});

// API Info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    message: 'Healthcare Assistant API',
    version: '1.0.0',
    description: 'Unified backend API for healthcare assistant application',
    endpoints: {
      clinical_chat: '/api/clinical-chat',
      document: '/api/document',
      csv: '/api/csv',
      organ_analyzer: '/api/organ-analyzer',
      transcription: '/api/transcription',
      translation: '/api/translation'
    },
    features: [
      'Clinical chat with AI',
      'PDF/Document Q&A',
      'CSV analysis',
      'Medical image analysis',
      'Audio transcription',
      'Multi-language translation',
      'Text-to-speech'
    ]
  });
});

// Mount API routes
app.use('/api/clinical-chat', clinicalChatRoutes);
app.use('/api/document', documentRoutes);
app.use('/api/csv', csvRoutes);
app.use('/api/organ-analyzer', organAnalyzerRoutes);
app.use('/api/transcription', transcriptionRoutes);
app.use('/api/translation', translationRoutes);

// Add simplified route aliases for frontend compatibility
app.use('/api/clinical-chat', clinicalChatRoutes);
app.use('/api/translate', translationRoutes);
app.use('/api/transcribe', transcriptionRoutes);
app.use('/api/analyze-organ', organAnalyzerRoutes);
app.use('/api/analyze-document', documentRoutes);
app.use('/api/analyze-csv', csvRoutes);

// Serve static files from React build
if (process.env.NODE_ENV === 'production') {
  const frontendBuildPath = path.join(__dirname, '../frontend/build');
  app.use(express.static(frontendBuildPath));
  
  // Serve index.html for all non-API routes
  app.get('*', (req, res, next) => {
    // Skip if it's an API route
    if (req.path.startsWith('/api/')) {
      return next();
    }
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      path: req.path
    }
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Healthcare Assistant API running on port ${PORT}`);
  console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Info: http://localhost:${PORT}/api/info`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
});

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
