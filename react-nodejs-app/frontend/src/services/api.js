import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add API key if available
    const apiKey = process.env.REACT_APP_API_KEY;
    if (apiKey) {
      config.headers['x-api-key'] = apiKey;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error
      console.error('API Error:', error.response.data);
    } else if (error.request) {
      // Request made but no response
      console.error('Network Error:', error.request);
    } else {
      // Something else happened
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Clinical Chat API
export const clinicalChatAPI = {
  sendMessage: (data) => api.post('/clinical-chat/send', data),
  clearHistory: (sessionId) => api.post('/clinical-chat/clear', { sessionId }),
  getHistory: (sessionId = 'default') => api.get(`/clinical-chat/history/${sessionId}`),
};

// Document API
export const documentAPI = {
  uploadDocument: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/document/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  queryDocument: (data) => api.post('/document/query', data),
  deleteDocument: (fileId) => api.delete(`/document/${fileId}`),
};

// CSV API
export const csvAPI = {
  uploadCSV: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/csv/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  queryCSV: (data) => api.post('/csv/query', data),
  deleteCSV: (fileId) => api.delete(`/csv/${fileId}`),
};

// Organ Analyzer API
export const organAnalyzerAPI = {
  analyzeImage: (file, organ, outputLanguage = 'en') => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('organ', organ);
    formData.append('outputLanguage', outputLanguage);
    return api.post('/organ-analyzer/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getSupportedOrgans: () => api.get('/organ-analyzer/supported-organs'),
};

// Transcription API
export const transcriptionAPI = {
  transcribeAudio: (file, outputLanguage = 'en', translateToEnglish = false) => {
    const formData = new FormData();
    formData.append('audio', file);
    formData.append('outputLanguage', outputLanguage);
    formData.append('translateToEnglish', translateToEnglish);
    return api.post('/transcription/transcribe', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  translateAudio: (file) => {
    const formData = new FormData();
    formData.append('audio', file);
    return api.post('/transcription/translate-audio', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Translation API
export const translationAPI = {
  translate: (data) => api.post('/translation/translate', data),
  textToSpeech: (data) => api.post('/translation/text-to-speech', data),
  translateAndSpeak: (data) => api.post('/translation/translate-and-speak', data),
  getSupportedLanguages: () => api.get('/translation/supported-languages'),
};

// Health Check
export const healthCheck = () => api.get('/health', { baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000' });

export default api;
