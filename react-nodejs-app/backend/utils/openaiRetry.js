/**
 * OpenAI API utilities with retry logic and 429 error handling
 */

// Exponential backoff retry utility
export const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // If it's a 429 error (rate limiting), wait and retry
      if (error.status === 429 || error.code === 'rate_limit_exceeded') {
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
          console.log(`Rate limit hit, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      // If it's not a retryable error, or we've exhausted retries, throw immediately
      if (attempt === maxRetries || !isRetryableError(error)) {
        throw error;
      }
      
      // For other errors, use shorter delay
      const delay = baseDelay * Math.pow(1.5, attempt);
      console.log(`API error, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries + 1})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

// Check if an error is worth retrying
const isRetryableError = (error) => {
  if (!error.status) return false;
  
  // Retry on rate limiting and temporary server errors
  const retryableStatuses = [429, 500, 502, 503, 504];
  return retryableStatuses.includes(error.status);
};

// Enhanced OpenAI API wrapper with retry logic
export const callOpenAIWithRetry = async (openaiFunction, maxRetries = 3) => {
  return retryWithBackoff(openaiFunction, maxRetries, 2000); // Start with 2s delay for OpenAI
};

// Format 429 error for user-friendly display
export const format429Error = (error) => {
  if (error.status === 429 || error.code === 'rate_limit_exceeded') {
    const resetTime = error.headers?.['x-ratelimit-reset-requests'] || 
                     error.headers?.['x-ratelimit-reset-tokens'] ||
                     'unknown';
    
    return {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded. Please wait a moment and try again.',
        details: `OpenAI API rate limit reached. ${resetTime !== 'unknown' ? `Resets at: ${new Date(resetTime * 1000)}` : 'Please try again in a few minutes.'}`,
        retryAfter: error.headers?.['retry-after'] || 60
      }
    };
  }
  
  return {
    success: false,
    error: {
      message: error.message || 'API request failed',
      details: error.toString(),
      status: error.status
    }
  };
};