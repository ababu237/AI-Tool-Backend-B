import React, { useState } from 'react';

const SimpleDebugTest = () => {
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugLog, setDebugLog] = useState([]);

  const log = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLog(prev => [...prev, `${timestamp}: ${message}`]);
    console.log(message);
  };

  const testTranslation = async () => {
    log('🚀 Test translation button clicked');
    log(`Input text: "${inputText}"`);
    log(`Input text length: ${inputText.length}`);
    log(`Input text trimmed: "${inputText.trim()}"`);

    if (!inputText || !inputText.trim()) {
      alert('Please enter some text to translate');
      return;
    }

    setLoading(true);
    setTranslatedText(''); // Clear previous translation
    log('🔄 Cleared previous translation, starting new request');

    try {
      // Test backend health first
      log('🔍 Checking backend health...');
      const healthResponse = await fetch('http://localhost:5001/health');
      log(`Health check status: ${healthResponse.status}`);

      // Make translation request
      log('📡 Making translation API request');
      const response = await fetch('http://localhost:5001/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: inputText,
          sourceLanguage: 'en',
          targetLanguage: 'es'
        })
      });

      log(`📥 Translation response status: ${response.status}`);
      const data = await response.json();
      log(`📄 Translation response data: ${JSON.stringify(data, null, 2)}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${data.error?.message || 'Unknown error'}`);
      }

      if (!data.success) {
        throw new Error(data.error?.message || 'Translation API returned unsuccessful response');
      }

      // Extract translated text using multiple possible paths
      const translated = data.data?.translatedText || 
                        data.translatedText ||
                        data.data?.text ||
                        data.text ||
                        null;
      
      log(`🎯 Extracted translated text: "${translated}"`);
      log(`🎯 Available data keys: ${Object.keys(data).join(', ')}`);
      if (data.data) {
        log(`🎯 Available data.data keys: ${Object.keys(data.data).join(', ')}`);
      }

      if (!translated) {
        throw new Error('No translated text found in response');
      }

      log('🔄 About to set translated text to state...');
      setTranslatedText(translated);
      log(`✅ Translation successful! Set state to: "${translated}"`);

    } catch (error) {
      log(`❌ Translation error: ${error.message}`);
      alert(`Translation failed: ${error.message}`);
    } finally {
      setLoading(false);
      log('🏁 Translation process completed');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🔧 React Component Debug Test</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Translation Test</h2>
        <input
          type="text"
          value={inputText}
          onChange={(e) => {
            log(`📝 Input changed: "${e.target.value}"`);
            setInputText(e.target.value);
          }}
          placeholder="Enter text to translate"
          style={{ width: '300px', padding: '10px', marginRight: '10px' }}
        />
        <button 
          onClick={testTranslation}
          disabled={loading}
          style={{ padding: '10px 20px', backgroundColor: loading ? '#ccc' : '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}
        >
          {loading ? '⏳ Translating...' : '🔄 Translate to Spanish'}
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Translation Result:</h3>
        <div style={{ 
          padding: '15px', 
          backgroundColor: translatedText ? '#d4edda' : '#f8f9fa', 
          border: '1px solid #ddd', 
          borderRadius: '5px',
          minHeight: '50px'
        }}>
          {translatedText || 'Translated text will appear here...'}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Debug State:</h3>
        <div style={{ padding: '10px', backgroundColor: '#f8f9fa', border: '1px solid #ddd', borderRadius: '5px' }}>
          <p><strong>Input Text:</strong> "{inputText}"</p>
          <p><strong>Translated Text:</strong> "{translatedText}"</p>
          <p><strong>Loading:</strong> {loading ? 'true' : 'false'}</p>
        </div>
      </div>

      <div>
        <h3>Debug Log:</h3>
        <div style={{ 
          height: '200px', 
          overflow: 'auto', 
          padding: '10px', 
          backgroundColor: '#f8f9fa', 
          border: '1px solid #ddd', 
          borderRadius: '5px',
          fontFamily: 'monospace',
          fontSize: '12px'
        }}>
          {debugLog.map((entry, index) => (
            <div key={index}>{entry}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SimpleDebugTest;