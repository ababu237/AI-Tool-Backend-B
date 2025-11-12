import React, { useState, useEffect } from 'react';

const RateLimitNotification = ({ show, onClose, retryAfter = 60 }) => {
  const [countdown, setCountdown] = useState(retryAfter);

  useEffect(() => {
    if (show && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [show, countdown]);

  useEffect(() => {
    if (show) {
      setCountdown(retryAfter);
    }
  }, [show, retryAfter]);

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: '#fff3cd',
      border: '1px solid #ffeaa7',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 1000,
      maxWidth: '400px',
      textAlign: 'center'
    }}>
      <h3 style={{ color: '#856404', marginBottom: '15px' }}>
        ⚠️ Rate Limit Reached
      </h3>
      <p style={{ color: '#856404', marginBottom: '15px' }}>
        The OpenAI API is temporarily overloaded. This is a temporary limitation that helps ensure fair usage for all users.
      </p>
      <div style={{ 
        background: '#fff', 
        border: '1px solid #ffeaa7', 
        borderRadius: '4px', 
        padding: '10px', 
        marginBottom: '15px',
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#856404'
      }}>
        {countdown > 0 ? (
          <>Please wait: {countdown} seconds</>
        ) : (
          <>✅ You can try again now!</>
        )}
      </div>
      <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '15px' }}>
        <strong>What can you do:</strong>
        <br />
        • Wait for the countdown to finish
        <br />
        • Try with a smaller file if uploading
        <br />
        • Check if you have multiple requests running
      </div>
      <button
        onClick={onClose}
        style={{
          background: '#28a745',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        {countdown > 0 ? 'Dismiss' : 'Try Again'}
      </button>
    </div>
  );
};

export default RateLimitNotification;