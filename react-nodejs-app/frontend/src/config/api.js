// API Configuration
// In production (Render), use relative URLs so frontend talks to same server
// In development, use localhost URLs
const isProduction = process.env.NODE_ENV === 'production';

export const API_BASE_URL = isProduction 
  ? '/api'  // Relative URL - same server as frontend
  : process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

export const HEALTH_CHECK_URL = isProduction
  ? '/health'
  : 'http://localhost:5001/health';

export default {
  API_BASE_URL,
  HEALTH_CHECK_URL
};
