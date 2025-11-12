// ResizeObserver Error Suppression
// This file handles the common React development warning about ResizeObserver

const suppressResizeObserverErrors = () => {
  // Store the original console.error
  const originalError = console.error;
  
  console.error = (...args) => {
    const message = args[0];
    
    // Suppress ResizeObserver errors
    if (
      typeof message === 'string' && (
        message.includes('ResizeObserver loop completed with undelivered notifications') ||
        message.includes('ResizeObserver loop limit exceeded')
      )
    ) {
      return; // Don't log this error
    }
    
    // Log all other errors normally
    originalError.apply(console, args);
  };
  
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    if (
      event.reason?.message?.includes('ResizeObserver') ||
      event.reason?.stack?.includes('ResizeObserver')
    ) {
      event.preventDefault(); // Prevent the error from being logged
    }
  });
  
  // Handle window errors
  window.addEventListener('error', (event) => {
    if (
      event.message?.includes('ResizeObserver') ||
      event.error?.message?.includes('ResizeObserver')
    ) {
      event.preventDefault(); // Prevent the error from being logged
      event.stopImmediatePropagation();
    }
  });
};

// Add debouncing for ResizeObserver if it exists
const optimizeResizeObserver = () => {
  if (typeof ResizeObserver !== 'undefined') {
    const OriginalResizeObserver = ResizeObserver;
    
    window.ResizeObserver = class extends OriginalResizeObserver {
      constructor(callback) {
        let timeoutId;
        
        const debouncedCallback = (entries) => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            try {
              callback(entries);
            } catch (error) {
              // Suppress ResizeObserver errors
              if (!error.message?.includes('ResizeObserver')) {
                throw error;
              }
            }
          }, 10); // 10ms debounce
        };
        
        super(debouncedCallback);
      }
    };
  }
};

export { suppressResizeObserverErrors, optimizeResizeObserver };