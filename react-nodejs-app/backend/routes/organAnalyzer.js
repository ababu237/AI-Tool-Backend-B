import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { HfInference } from '@huggingface/inference';
import config from '../config.js';
import { v4 as uuidv4 } from 'uuid';
import { promises as fsPromises } from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { translateText, textToSpeechBase64, detectLanguage } from '../utils/helpers.js';
import { callOpenAIWithRetry, format429Error } from '../utils/openaiRetry.js';

const router = express.Router();

// Initialize AI clients
const genAI = process.env.GOOGLE_API_KEY ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY) : null;
const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;
const hf = process.env.HUGGINGFACE_API_KEY ? new HfInference(process.env.HUGGINGFACE_API_KEY) : null;

// Configure multer for image uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: config.maxFileSize },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WebP) are allowed'));
    }
  }
});

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: config.openaiApiKey
});

// Organ-specific analysis prompts - Educational/Training purposes
const organPrompts = {
  lung: 'You are a medical imaging analysis system for educational and training purposes. Analyze this lung scan image and provide: 1) Observable findings: Describe visible anatomical structures, densities, patterns, and any notable features. 2) Possible interpretations: Discuss what these observations might indicate in medical training contexts (e.g., opacity patterns, infiltrates, nodules). 3) Educational recommendations: Suggest what further examination or considerations would typically be appropriate.',
  heart: 'You are a medical imaging analysis system for educational and training purposes. Analyze this cardiac image and provide: 1) Observable findings: Describe cardiac structures, chamber sizes, vessel appearance, and any notable features. 2) Possible interpretations: Discuss what these observations might indicate in medical training contexts. 3) Educational recommendations: Suggest typical next steps or considerations.',
  brain: 'You are a medical imaging analysis system for educational and training purposes. Analyze this brain scan and provide: 1) Observable findings: Describe brain structures, tissue densities, ventricle appearance, and any notable features. 2) Possible interpretations: Discuss what these observations might indicate in medical training contexts. 3) Educational recommendations: Suggest typical examination protocols or considerations.',
  kidney: 'You are a medical imaging analysis system for educational and training purposes. Analyze this kidney scan and provide: 1) Observable findings: Describe kidney structure, size, density, collecting system, and any notable features. 2) Possible interpretations: Discuss what these observations might indicate in medical training contexts. 3) Educational recommendations: Suggest typical next steps.',
  liver: 'You are a medical imaging analysis system for educational and training purposes. Analyze this liver scan and provide: 1) Observable findings: Describe liver structure, texture, size, and any notable features. 2) Possible interpretations: Discuss what these observations might indicate in medical training contexts. 3) Educational recommendations: Suggest typical considerations.',
  chest: 'You are a medical imaging analysis system for educational and training purposes. Analyze this chest X-ray and provide: 1) Observable findings: Describe lung fields, cardiac silhouette, bony structures, and any notable features. 2) Possible interpretations: Discuss what these observations might indicate in medical training contexts. 3) Educational recommendations: Suggest typical next steps.',
  knee: 'You are a medical imaging analysis system for educational and training purposes. Analyze this knee X-ray/MRI and provide: 1) Observable findings: Describe joint space width, bone alignment, cartilage appearance, soft tissue structures, any visible irregularities in bone density or surface, ligament/meniscus appearance if visible. 2) Possible interpretations: Discuss what these observations might suggest (e.g., joint space narrowing could indicate cartilage loss, bone spurs might suggest degenerative changes, alignment issues). 3) Educational recommendations: Suggest what clinical correlation, additional imaging, or specialist evaluation would typically be considered for these findings.',
  default: 'You are a medical imaging analysis system for educational and training purposes. Analyze this medical image and provide: 1) Observable findings: Describe anatomical structures and any notable features. 2) Possible interpretations: Discuss what these observations might indicate. 3) Educational recommendations: Suggest typical next steps.'
};

/**
 * Process image and prepare for analysis
 */
async function processImage(filePath) {
  try {
    // Resize and optimize image
    const processedImage = await sharp(filePath)
      .resize(1024, 1024, { fit: 'inside' })
      .jpeg({ quality: 80 })
      .toBuffer();

    return processedImage;
  } catch (error) {
    throw new Error(`Image processing failed: ${error.message}`);
  }
}

/**
 * Generate medical recommendations based on analysis findings
 */
function generateRecommendations(organ, diagnosis, analysis) {
  const recommendations = {};

  // Add organ-specific clinical recommendations
  const organSpecific = {
    knee: [
      'Rest and avoid activities that worsen pain or cause swelling',
      'Apply ice for 15-20 minutes every 2-3 hours for acute pain/swelling',
      'Use compression bandage and elevate leg when resting',
      'Start gentle range-of-motion exercises as tolerated',
      'Consider low-impact exercises like swimming or cycling',
      'Maintain healthy weight to reduce joint stress',
      'Use supportive footwear with good cushioning',
      'Take anti-inflammatory medication (as directed by physician)',
      'Physical therapy may help strengthen surrounding muscles',
      'Consult orthopedic specialist if pain persists beyond 2 weeks'
    ],
    lung: [
      'Avoid smoking and secondhand smoke exposure',
      'Practice deep breathing exercises regularly',
      'Stay well-hydrated (8-10 glasses of water daily)',
      'Get adequate rest and sleep with elevated head position',
      'Avoid air pollutants and environmental irritants',
      'Monitor oxygen saturation if experiencing breathing difficulties',
      'Take prescribed medications as directed',
      'Consider pulmonary rehabilitation if chronic issues present',
      'Get annual flu vaccine and pneumonia vaccine',
      'Seek immediate care for severe shortness of breath or chest pain'
    ],
    heart: [
      'Follow a heart-healthy diet low in saturated fats and sodium',
      'Engage in regular moderate exercise (30 minutes, 5 days/week)',
      'Monitor blood pressure regularly at home',
      'Maintain healthy cholesterol levels through diet and medication',
      'Manage stress through relaxation techniques',
      'Take prescribed cardiac medications consistently',
      'Limit alcohol consumption and avoid smoking',
      'Monitor for symptoms: chest pain, palpitations, shortness of breath',
      'Get adequate sleep (7-8 hours nightly)',
      'Seek emergency care for chest pain or severe symptoms'
    ],
    brain: [
      'Ensure adequate rest and quality sleep',
      'Stay mentally active with cognitive exercises',
      'Avoid head injuries - wear protective gear when needed',
      'Control blood pressure and blood sugar levels',
      'Stay physically active to promote brain health',
      'Maintain social connections and engage in activities',
      'Monitor for changes in memory, coordination, or behavior',
      'Take medications as prescribed for any neurological conditions',
      'Avoid alcohol and substance use',
      'Seek immediate care for sudden severe headache, confusion, or weakness'
    ],
    liver: [
      'Avoid alcohol consumption completely if liver issues suspected',
      'Follow a balanced diet rich in fruits, vegetables, and whole grains',
      'Limit intake of fatty, fried, and processed foods',
      'Maintain healthy body weight',
      'Avoid hepatotoxic medications unless prescribed',
      'Get vaccinated for Hepatitis A and B',
      'Monitor for jaundice, abdominal pain, or dark urine',
      'Stay hydrated with adequate water intake',
      'Regular liver function tests as recommended',
      'Consult hepatologist for abnormal findings'
    ],
    kidney: [
      'Stay well-hydrated (adequate water intake daily)',
      'Limit sodium intake to less than 2300mg per day',
      'Control blood pressure and blood sugar if diabetic',
      'Avoid NSAIDs and nephrotoxic medications when possible',
      'Follow low-protein diet if recommended by physician',
      'Monitor urine output and color regularly',
      'Maintain healthy weight through diet and exercise',
      'Limit potassium and phosphorus if advised',
      'Regular kidney function monitoring (creatinine, GFR)',
      'Seek care for decreased urination, severe swelling, or bloody urine'
    ],
    default: [
      'Follow up with your healthcare provider for complete evaluation',
      'Maintain overall healthy lifestyle habits',
      'Stay current with preventive health screenings',
      'Monitor symptoms and report changes to doctor',
      'Take all prescribed medications as directed'
    ]
  };

  const selectedRecommendations = organSpecific[organ.toLowerCase()] || organSpecific.default;
  recommendations.clinical = selectedRecommendations;

  // Add dietary recommendations
  const dietary = {
    knee: 'Anti-inflammatory diet rich in omega-3 fatty acids, vitamin D, calcium. Include: fatty fish, leafy greens, nuts, berries. Avoid: processed foods, excess sugar, refined carbs.',
    lung: 'Antioxidant-rich diet with fruits and vegetables. Include: berries, leafy greens, tomatoes, whole grains. Avoid: processed meats, excess sodium.',
    heart: 'Mediterranean diet with lean proteins, whole grains, fruits, vegetables. Include: fish, olive oil, nuts, legumes. Limit: saturated fats, trans fats, sodium.',
    brain: 'Brain-healthy diet rich in omega-3s, antioxidants. Include: fatty fish, blueberries, nuts, dark chocolate, leafy greens. Avoid: excess sugar, trans fats.',
    liver: 'Liver-supporting foods: leafy greens, cruciferous vegetables, berries, nuts, olive oil. Avoid: alcohol, fried foods, processed foods, excess sugar.',
    kidney: 'Low-sodium, controlled protein diet. Include: fresh fruits, vegetables, whole grains. Limit: sodium, potassium, phosphorus, protein (based on kidney function).'
  };

  if (dietary[organ.toLowerCase()]) {
    recommendations.dietary = [dietary[organ.toLowerCase()]];
  }

  // Add general precautions
  recommendations.precautions = [
    'This analysis is for educational purposes - professional medical consultation is essential',
    'Do not make treatment decisions based solely on this analysis',
    'Seek immediate emergency care for severe or worsening symptoms',
    'Keep all scheduled medical appointments and follow-ups',
    'Inform your doctor about all symptoms, even if they seem minor'
  ];

  return recommendations;
}

// Handler function for organ analysis
const handleAnalyze = async (req, res) => {
  try {
    console.log('=== Organ Analysis Request ===');
    console.log('File:', req.file?.originalname);
    console.log('Body:', req.body);
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { message: 'No image uploaded' }
      });
    }

    const { organ = 'default', outputLanguage = 'en' } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: { message: 'OpenAI API key not configured' }
      });
    }

    // Process image
    console.log('Processing image...');
    const imageBuffer = await processImage(req.file.path);
    const base64Image = imageBuffer.toString('base64');

    // Get organ-specific prompt
    const prompt = organPrompts[organ.toLowerCase()] || organPrompts.default;

    // Use Google Gemini Vision API for medical image analysis
    console.log('Calling Google Gemini Vision API for medical analysis...');
    
    let analysis;
    
    if (genAI) {
      // Use PyTorch Vision Models (ResNet50, VGG16, InceptionV3)
      console.log('Calling PyTorch Vision Models for medical image analysis...');
      
      const pythonScriptPath = path.join(__dirname, '..', 'python_services', 'organ_vision_model.py');
      
      // Call Python script
      const pythonProcess = spawn('python', [pythonScriptPath]);
      
      // Send data to Python script
      const inputData = JSON.stringify({
        image: base64Image,
        organ: organ
      });
      
      pythonProcess.stdin.write(inputData);
      pythonProcess.stdin.end();
      
      // Collect output
      let pythonOutput = '';
      let pythonError = '';
      
      pythonProcess.stdout.on('data', (data) => {
        pythonOutput += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        pythonError += data.toString();
      });
      
      // Wait for Python process to complete
      await new Promise((resolve, reject) => {
        pythonProcess.on('close', (code) => {
          if (code !== 0) {
            console.error('Python script error:', pythonError);
            reject(new Error('Python vision model failed'));
          } else {
            resolve();
          }
        });
      });
      
      // Parse Python output
      const result = JSON.parse(pythonOutput);
      
      if (!result.success) {
        throw new Error(result.error || 'Vision model analysis failed');
      }
      
      analysis = result.analysis;
      console.log('PyTorch Vision Models analysis received');
      console.log('Analysis:', analysis.substring(0, 150) + '...');
    } else {
      throw new Error('No AI API key configured. Please set GOOGLE_API_KEY or OPENAI_API_KEY in environment variables.');
    }

    // Extract key findings for summary from PyTorch analysis
    let diagnosis = 'Analysis Complete - See Details Below';
    
    // Try to extract diagnosis from analysis text
    const diagnosisMatch = analysis.match(/\*\*PRELIMINARY (?:DIAGNOSIS|ASSESSMENT):\*\*\s*([^\n]+)/i);
    if (diagnosisMatch) {
      diagnosis = diagnosisMatch[1].trim();
    } else if (analysis.toLowerCase().includes('degenerative') || analysis.toLowerCase().includes('arthritis')) {
      diagnosis = 'Degenerative changes detected - Osteoarthritis patterns observed';
    } else if (analysis.toLowerCase().includes('inflammation') || analysis.toLowerCase().includes('effusion')) {
      diagnosis = 'Inflammatory markers detected - Joint effusion present';
    } else if (analysis.toLowerCase().includes('tear') || analysis.toLowerCase().includes('rupture')) {
      diagnosis = 'Structural damage detected - Ligament/meniscus involvement';
    } else if (analysis.toLowerCase().includes('narrowing') || analysis.toLowerCase().includes('space loss')) {
      diagnosis = 'Joint space narrowing - Cartilage degradation indicated';
    } else if (analysis.toLowerCase().includes('fracture') || analysis.toLowerCase().includes('bone damage')) {
      diagnosis = 'Bone abnormalities detected - Potential fracture or damage';
    } else if (analysis.toLowerCase().includes('abnormal') || analysis.toLowerCase().includes('irregularit')) {
      diagnosis = 'Abnormal patterns detected - Further evaluation recommended';
    } else if (analysis.toLowerCase().includes('findings') || analysis.toLowerCase().includes('observable')) {
      diagnosis = 'Clinical findings identified - Professional review needed';
    }

    // Generate recommendations with analysis context
    const recommendations = generateRecommendations(organ, diagnosis, analysis);

    // Translate analysis if needed
    const detectedLang = detectLanguage(analysis);
    const translatedAnalysis = outputLanguage !== detectedLang
      ? await translateText(analysis, detectedLang, outputLanguage)
      : analysis;

    const translatedDiagnosis = outputLanguage !== 'en'
      ? await translateText(diagnosis, 'en', outputLanguage)
      : diagnosis;

    // Translate recommendations
    const translatedRecommendations = {};
    for (const [key, value] of Object.entries(recommendations)) {
      if (Array.isArray(value)) {
        translatedRecommendations[key] = await Promise.all(
          value.map(rec => outputLanguage !== 'en' ? translateText(rec, 'en', outputLanguage) : rec)
        );
      }
    }

    // Generate audio
    const audioText = `${translatedDiagnosis}. ${translatedAnalysis}`;
    let audioBase64 = null;
    try {
      audioBase64 = await textToSpeechBase64(audioText, outputLanguage);
    } catch (audioError) {
      console.error('Audio generation error:', audioError);
    }

    // Send response first
    const responseData = {
      success: true,
      data: {
        organ,
        diagnosis: translatedDiagnosis,
        analysis: translatedAnalysis,
        recommendations: translatedRecommendations,
        confidence_score: 0.85, // Placeholder - in production, use actual model confidence
        modelUsed: 'GPT-4 Vision',
        audioBase64,
        audioFormat: 'mp3',
        outputLanguage
      }
    };
    
    console.log('Sending response with data:', {
      organ,
      diagnosis: translatedDiagnosis?.substring(0, 50),
      hasAnalysis: !!translatedAnalysis,
      hasRecommendations: !!translatedRecommendations,
      hasAudio: !!audioBase64
    });
    
    res.json(responseData);

    // Clean up uploaded file after sending response (with delay and error handling)
    setTimeout(async () => {
      try {
        await fsPromises.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('File cleanup warning (non-critical):', unlinkError.message);
      }
    }, 100);

  } catch (error) {
    console.error('Organ analysis error:', error);
    
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
        message: 'Failed to analyze image',
        details: error.message
      }
    });
  }
};

/**
 * POST /api/analyze-organ (root) and /api/organ-analyzer/analyze
 * Analyze medical organ scan image
 */
router.post('/', upload.single('image'), handleAnalyze);
router.post('/analyze', upload.single('image'), handleAnalyze);

/**
 * GET /api/organ-analyzer/supported-organs
 * Get list of supported organ types
 */
router.get('/supported-organs', (req, res) => {
  res.json({
    success: true,
    data: {
      organs: Object.keys(organPrompts).filter(key => key !== 'default'),
      message: 'Supported organ types for analysis'
    }
  });
});

export default router;
