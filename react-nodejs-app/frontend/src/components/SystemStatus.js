import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SystemStatus = () => {
  const [status, setStatus] = useState({
    backend: 'checking',
    translation: 'checking',
    transcription: 'checking',
    organAnalyzer: 'checking'
  });

  const API_BASE_URL = 'http://localhost:5001/api';

  useEffect(() => {
    // Delay initial check to avoid startup race conditions
    const timer = setTimeout(() => {
      checkSystemStatus();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  const checkSystemStatus = async () => {
    try {
      // Check backend health
      try {
        await axios.get('http://localhost:5001/health', { timeout: 5000 });
        setStatus(prev => ({ ...prev, backend: 'online' }));
      } catch (error) {
        setStatus(prev => ({ ...prev, backend: 'offline' }));
      }

      // Check translation API
      try {
        const response = await axios.post(`${API_BASE_URL}/translate`, {
          text: 'test',
          targetLanguage: 'Spanish'
        }, { timeout: 10000 });
        setStatus(prev => ({ ...prev, translation: response.data.success ? 'working' : 'error' }));
      } catch (error) {
        setStatus(prev => ({ ...prev, translation: 'error' }));
      }

      // Check transcription API (expect error without file)
      try {
        await axios.post(`${API_BASE_URL}/transcription`, new FormData(), { timeout: 5000 });
        setStatus(prev => ({ ...prev, transcription: 'working' }));
      } catch (error) {
        // Expected error without file means API is working
        if (error.response?.status === 400) {
          setStatus(prev => ({ ...prev, transcription: 'working' }));
        } else {
          setStatus(prev => ({ ...prev, transcription: 'error' }));
        }
      }

      // Check organ analyzer API (expect error without image)
      try {
        await axios.post(`${API_BASE_URL}/organ-analyzer/analyze`, new FormData(), { timeout: 5000 });
        setStatus(prev => ({ ...prev, organAnalyzer: 'working' }));
      } catch (error) {
        // Expected error without image means API is working
        if (error.response?.status === 400 || error.response?.data?.error?.message?.includes('No image')) {
          setStatus(prev => ({ ...prev, organAnalyzer: 'working' }));
        } else {
          setStatus(prev => ({ ...prev, organAnalyzer: 'error' }));
        }
      }
    } catch (globalError) {
      console.warn('SystemStatus check failed:', globalError);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
      case 'working':
        return '#28a745';
      case 'offline':
      case 'error':
        return '#dc3545';
      case 'checking':
        return '#ffc107';
      default:
        return '#6c757d';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'online':
        return '✅ Online';
      case 'working':
        return '✅ Working';
      case 'offline':
        return '❌ Offline';
      case 'error':
        return '❌ Error';
      case 'checking':
        return '🔄 Checking...';
      default:
        return '❓ Unknown';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'white',
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '15px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      zIndex: 1000,
      minWidth: '200px'
    }}>
      <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>System Status</h4>
      <div style={{ fontSize: '12px' }}>
        <div style={{ marginBottom: '5px' }}>
          <span style={{ color: getStatusColor(status.backend) }}>
            Backend: {getStatusText(status.backend)}
          </span>
        </div>
        <div style={{ marginBottom: '5px' }}>
          <span style={{ color: getStatusColor(status.translation) }}>
            Translation: {getStatusText(status.translation)}
          </span>
        </div>
        <div style={{ marginBottom: '5px' }}>
          <span style={{ color: getStatusColor(status.transcription) }}>
            Speech-to-Text: {getStatusText(status.transcription)}
          </span>
        </div>
        <div style={{ marginBottom: '5px' }}>
          <span style={{ color: getStatusColor(status.organAnalyzer) }}>
            Organ Analyzer: {getStatusText(status.organAnalyzer)}
          </span>
        </div>
        <button 
          onClick={checkSystemStatus}
          style={{
            marginTop: '10px',
            padding: '5px 10px',
            fontSize: '11px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Refresh Status
        </button>
      </div>
    </div>
  );
};

export default SystemStatus;