import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './TextToSpeech.css';

const API_BASE_URL = 'http://localhost:5001/api';

const TextToSpeech = () => {
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [inputLanguage] = useState('en');
  const [outputLanguage, setOutputLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  const handleGenerateSpeechInternal = async (text) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/translation/text-to-speech`,
        { text: text || translatedText, language: outputLanguage }
      );

      console.log('TTS response:', response.data);

      // Handle base64 audio response
      const audioBase64 = response.data.data?.audioBase64 || 
                         response.data.audioBase64 || 
                         response.data.audio_base64 ||
                         response.data.data?.audio_base64;
      
      if (audioBase64) {
        const url = `data:audio/mp3;base64,${audioBase64}`;
        setAudioUrl(url);
        console.log('Audio URL set successfully');
      } else {
        console.warn('No audio data found in response:', response.data);
      }
    } catch (error) {
      console.error('Error generating speech:', error);
      // Don't show alert for speech generation, just log
    }
  };

  const handleTranslate = async () => {
    console.log('🚀 Translate button clicked!', {
      inputText: inputText,
      inputTextLength: inputText ? inputText.length : 0,
      inputTextTrimmed: inputText ? inputText.trim() : null,
      sourceLanguage: inputLanguage,
      targetLanguage: outputLanguage
    });

    if (!inputText || !inputText.trim()) {
      alert('Please enter some text to translate');
      return;
    }

    setLoading(true);
    setTranslatedText(''); // Clear previous translation
    setAudioUrl(''); // Clear previous audio
    
    console.log('✅ Starting translation with:', {
      text: inputText,
      sourceLanguage: inputLanguage,
      targetLanguage: outputLanguage,
      url: `${API_BASE_URL}/translate`
    });
    
    try {
      // First check if backend is accessible
      try {
        await axios.get(`${API_BASE_URL.replace('/api', '')}/health`, { timeout: 5000 });
      } catch (healthError) {
        console.warn('Health check failed, but proceeding with translation');
      }

      const response = await axios.post(`${API_BASE_URL}/translate`, {
        text: inputText,
        sourceLanguage: inputLanguage,
        targetLanguage: outputLanguage
      }, {
        timeout: 30000, // 30 second timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Translation response:', response.data);

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Translation API returned unsuccessful response');
      }

      // Handle the correct response format
      const translated = response.data.data?.translatedText || 
                        response.data.translatedText ||
                        null;
      
      if (!translated) {
        throw new Error('No translated text received from server');
      }
      
      console.log('🎉 Setting translated text:', translated);
      setTranslatedText(translated);
      console.log('✅ Translation successful and state updated:', translated);
      
      // Auto-generate speech after translation
      try {
        await handleGenerateSpeechInternal(translated);
        console.log('Audio generation completed');
      } catch (audioError) {
        console.warn('Audio generation failed:', audioError);
        alert(`Translation successful: "${translated}"\n\nHowever, audio generation failed. You can try clicking the play button to generate audio manually.`);
      }
    } catch (error) {
      console.error('Error translating text:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMsg = 'Unknown error occurred';
      if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        errorMsg = 'Cannot connect to server. Please ensure the backend is running on port 5001.';
      } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMsg = 'Request timeout. Please try again.';
      } else if (error.response?.status === 404) {
        errorMsg = 'Translation service not found. Please check backend configuration.';
      } else if (error.response?.status === 500) {
        errorMsg = 'Server error. Please check server logs and try again.';
      } else if (error.response?.data?.error) {
        errorMsg = error.response.data.error.details || 
                  error.response.data.error.message || 
                  'Server error';
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      alert(`❌ Translation Failed\n\n${errorMsg}\n\nTroubleshooting:\n• Ensure backend server is running on port 5001\n• Check your internet connection\n• Try refreshing the page`);
      
      // Reset state on error
      setTranslatedText('');
      setAudioUrl('');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSpeech = async () => {
    if (!translatedText.trim()) {
      alert('No text available to convert to speech');
      return;
    }

    setLoading(true);
    try {
      await handleGenerateSpeechInternal(translatedText);
    } catch (error) {
      alert(`Failed to generate speech: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <section className="main-content-section">
        <main className="main-content">
          <div className="tts-header">
            <h2 className="tts-title">Text To Speech</h2>
            <hr className="tts-divider" />
          </div>

          <div className="transcript-area">
            <div className="transcript-box" style={{ 
              backgroundColor: translatedText ? '#e8f5e8' : '#f8f9fa',
              border: translatedText ? '2px solid #28a745' : '2px solid #dee2e6',
              minHeight: '100px',
              padding: '15px'
            }}>
              <p className="transcript-text" style={{ 
                fontSize: '16px', 
                lineHeight: '1.5',
                color: translatedText ? '#155724' : '#6c757d',
                fontWeight: translatedText ? 'bold' : 'normal'
              }}>
                {translatedText || 'Translated text will appear here...'}
              </p>
            </div>
            <div className="scrollbar-track">
              <div className="scrollbar-thumb"></div>
            </div>
          </div>

          <div className="audio-player-section">
            {audioUrl && (
              <>
                <p className="audio-status">Audio transcript is ready.</p>
                <audio src={audioUrl} controls style={{ width: '100%', marginTop: '10px' }} />
              </>
            )}
          </div>

          <div className="input-section">
            <div className="input-container">
              <textarea
                className="input-textarea"
                placeholder="Enter your text here to transform it into speech..."
                value={inputText}
                onChange={(e) => {
                  console.log('📝 Text input changed:', e.target.value);
                  setInputText(e.target.value);
                }}
                disabled={loading}
                onFocus={() => console.log('🎯 Textarea focused')}
                onBlur={() => console.log('🎯 Textarea blurred')}
              ></textarea>
              <div className="input-bottom-bar">
                <div className="input-controls">
                  <div className="language-selector" style={{ position: 'relative', cursor: 'pointer' }} onClick={() => {
                    try {
                      setShowLanguageMenu(!showLanguageMenu);
                    } catch (error) {
                      console.error('Error toggling language menu:', error);
                    }
                  }}>
                    <span>
                      Output: {outputLanguage === 'en' ? 'English' : 
                               outputLanguage === 'es' ? 'Spanish' : 
                               outputLanguage === 'fr' ? 'French' : 
                               outputLanguage === 'pl' ? 'Polish' : 
                               outputLanguage === 'te' ? 'Telugu' : 
                               outputLanguage === 'hi' ? 'Hindi' : 
                               outputLanguage === 'ta' ? 'Tamil' : 
                               outputLanguage === 'ga' ? 'Irish' : 'English'}
                    </span>
                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                      <path d="M1 1L6 6L11 1" stroke="#7e7e7e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {showLanguageMenu && (
                      <div style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: 0,
                        marginBottom: '5px',
                        background: 'white',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        zIndex: 1000,
                        minWidth: '150px'
                      }}>
                        {['English|en', 'Spanish|es', 'French|fr', 'Polish|pl', 'Telugu|te', 'Hindi|hi', 'Tamil|ta', 'Irish|ga'].map(lang => {
                          const [name, code] = lang.split('|');
                          return (
                            <div
                              key={code}
                              onClick={(e) => { 
                                try {
                                  e.stopPropagation(); 
                                  setOutputLanguage(code); 
                                  setShowLanguageMenu(false);
                                } catch (error) {
                                  console.error('Error selecting language:', error);
                                }
                              }}
                              style={{
                                padding: '10px 15px',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s ease'
                              }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f0f0'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                            >
                              {name}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="input-actions">
                  <button className="action-btn attach-btn" title="Attach file">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M16.667 10.833L10 17.5C8.847 18.653 7.153 18.653 6 17.5S4.347 14.847 6 13.333L12.5 6.833C13.237 6.096 14.429 6.096 15.167 6.833C15.904 7.571 15.904 8.762 15.167 9.5L9.167 15.5C8.929 15.738 8.571 15.738 8.333 15.5C8.096 15.262 8.096 14.904 8.333 14.667L13.833 9.167" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    className="action-btn share-btn"
                    onClick={(e) => {
                      console.log('🚀 TRANSLATE BUTTON CLICKED!', e);
                      handleTranslate();
                    }}
                    disabled={loading}
                    title="Translate and generate speech"
                    style={{ 
                      backgroundColor: loading ? '#6c757d' : '#007bff',
                      transform: loading ? 'scale(0.95)' : 'scale(1)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {loading ? (
                      <span>⏳</span>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M3 10L17 10M17 10L13 6M17 10L13 14" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
            
            <nav className="standard-nav">
              <Link to="/" className="nav-btn">Home</Link>
              <Link to="/document-analyzer" className="nav-btn">Document Analyzer</Link>
              <Link to="/text-to-speech" className="nav-btn active">Translator</Link>
              <Link to="/speech-to-text" className="nav-btn">Audio Transcription</Link>
              <Link to="/clinical-chat" className="nav-btn">Healthcare Chat</Link>
              <Link to="/organ-analyzer" className="nav-btn">Organ Scan Analysis</Link>
            </nav>
          </div>
        </main>
      </section>
    </div>
  );
};

export default TextToSpeech;
