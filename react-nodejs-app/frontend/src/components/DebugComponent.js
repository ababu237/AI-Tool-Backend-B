import React, { useEffect } from 'react';

const DebugComponent = () => {
  useEffect(() => {
    console.log('DebugComponent mounted successfully');
    console.log('React version:', React.version);
    console.log('Window object available:', typeof window !== 'undefined');
    console.log('Axios available:', typeof require !== 'undefined' ? 'Yes' : 'No');
    
    // Test API connectivity
    fetch('http://localhost:5001/health')
      .then(response => response.json())
      .then(data => console.log('Backend API test:', data))
      .catch(error => console.error('Backend API error:', error));
      
  }, []);

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '10px' }}>
      <h3>Debug Component</h3>
      <p>If you can see this, React is working!</p>
      <p>Check the browser console for debug information.</p>
    </div>
  );
};

export default DebugComponent;