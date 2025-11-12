import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './SpeechToText.css';

const API_BASE_URL = 'http://localhost:5001/api';

const SpeechToText = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [translation, setTranslation] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState('');
  const [loading, setLoading] = useState(false);
  const [outputLanguage, setOutputLanguage] = useState('en');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    
    if (!file) return;
    
    // All formats supported by OpenAI Whisper API
    const supportedFormats = ['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'opus', 'wav', 'wave', 'webm'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (!fileExtension || !supportedFormats.includes(fileExtension)) {
      alert(`Unsupported audio format.\n\nSupported formats:\nFLAC, M4A, MP3, MP4, MPEG, MPGA, OGG, OGA, OPUS, WAV, WEBM\n\nYour file: ${file.name}`);
      return;
    }
    
    // Additional MIME type check (allow audio/* and video/mp4 for MP4 audio)
    if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
      console.warn('MIME type check:', file.type, '- accepting based on extension');
    }
    
    setSelectedFile(file);
    console.log('✅ File selected:', file.name, 'Size:', (file.size / 1024).toFixed(2) + ' KB');
  };

  const handleTranscription = async (file) => {
    console.log('🎵 handleTranscription called with file:', file);
    
    if (!file) {
      console.error('❌ No file provided');
      alert('Please select an audio file first');
      return;
    }
    
    console.log('✅ Starting transcription for:', file.name, 'Size:', file.size, 'Type:', file.type);
    
    // Validate file type and size - All OpenAI Whisper supported formats
    const allowedExtensions = ['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'opus', 'wav', 'wave', 'webm'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const maxSize = 25 * 1024 * 1024; // 25MB (OpenAI Whisper limit)
    
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      alert('❌ Unsupported File Type\n\nPlease upload an audio file in one of these formats:\nFLAC, M4A, MP3, MP4, MPEG, MPGA, OGG, OGA, OPUS, WAV, WEBM\n\nYour file: ' + file.name);
      return;
    }
    
    if (file.size > maxSize) {
      alert('❌ File Too Large\n\nFile size must be under 25MB (OpenAI Whisper limit).\nCurrent file size: ' + (file.size / 1024 / 1024).toFixed(2) + ' MB');
      return;
    }
    
    setLoading(true);
    setTranscription(''); // Clear previous transcription
    setAudioUrl(null); // Clear previous audio
    
    const formData = new FormData();
    formData.append('audio', file);
    formData.append('outputLanguage', outputLanguage);
    
    console.log('📦 FormData created, sending to:', `${API_BASE_URL}/transcription`);

    try {
      console.log('📡 Sending POST request...');
      const response = await axios.post(`${API_BASE_URL}/transcription`, formData, {
        timeout: 120000, // 2 minute timeout for audio processing
      });
      console.log('✅ Response received:', response.status, response.data);
      
      console.log('✅ Transcription response received:', response.data);
      
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Transcription API returned unsuccessful response');
      }
      
      // Handle different response formats from backend
      const data = response.data.data;
      
      const originalText = data?.transcription || data?.text || '';
      const translatedText = data?.translation || null;
      const detectedLang = data?.detectedLanguage || '';
      
      if (!originalText) {
        console.error('No transcription text in response:', response.data);
        throw new Error('No transcription text received from server');
      }
      
      console.log('✅ Transcription successful!');
      console.log('   Original:', originalText.substring(0, 50) + '...');
      console.log('   Detected Language:', detectedLang);
      console.log('   Output Language:', data?.outputLanguage);
      if (translatedText) {
        console.log('   Translated:', translatedText.substring(0, 50) + '...');
      }
      
      // Set all state values
      setTranscription(originalText);
      setTranslation(translatedText || '');
      setDetectedLanguage(detectedLang);
      
      // Handle audio if present
      if (data?.audioBase64) {
        const audioBase64 = data.audioBase64;
        const audioFormat = data.audioFormat || 'mp3';
        const url = `data:audio/${audioFormat};base64,${audioBase64}`;
        setAudioUrl(url);
        console.log('🔊 Audio URL set successfully');
      }
      
    } catch (error) {
      console.error('❌ Error transcribing audio:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error message:', error.message);
      console.error('❌ Full error:', JSON.stringify(error, null, 2));
      
      let errorMsg = 'Unknown error occurred';
      if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        errorMsg = 'Cannot connect to server. Please ensure the backend is running on port 5001.';
      } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMsg = 'Upload timeout. File may be too large or server is busy. Try a smaller file.';
      } else if (error.response?.status === 413) {
        errorMsg = 'File too large. Please upload a smaller audio file.';
      } else if (error.response?.status === 415) {
        errorMsg = 'Unsupported file format. Please use MP3, WAV, M4A, FLAC, OGG, or WebM.';
      } else if (error.response?.status === 429) {
        const retryAfter = error.response.data?.error?.retryAfter || 60;
        errorMsg = `Rate limit exceeded. The OpenAI API is temporarily overloaded. Please wait ${retryAfter} seconds and try again.`;
      } else if (error.response?.status === 404) {
        errorMsg = 'Transcription service not found. Please check backend configuration.';
      } else if (error.response?.status === 500) {
        errorMsg = 'Server error during transcription. Please try again or check server logs.';
      } else if (error.response?.data?.error) {
        errorMsg = error.response.data.error.details || 
                  error.response.data.error.message || 
                  'Server error';
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      console.error('Processed error message:', errorMsg);
      alert(`❌ Transcription Failed\n\n${errorMsg}\n\nTroubleshooting:\n• Ensure audio file is under 25MB\n• Use supported formats: MP3, WAV, M4A, FLAC, OGG, WebM\n• Check that backend server is running on port 5001\n• Try a shorter audio file if it's very long`);
      setTranscription('');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(transcription);
        console.log('Text copied to clipboard');
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = transcription;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
    } catch (error) {
      console.error('Failed to copy text:', error);
      alert('Failed to copy text to clipboard');
    }
  };

  return (
    <div className="page-wrapper">
      <section className="main-content">
        <div className="content-container">
          <h2 className="main-title">Speech to Text</h2>
          <hr className="separator" />
          <div className="file-info-card">
            <div className="file-icon">
              <svg width="26" height="30" viewBox="0 0 26 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 0H18L24 6V28C24 29.1046 23.1046 30 22 30H2C0.89543 30 0 29.1046 0 28V2C0 0.89543 0.89543 0 2 0Z" fill="#4A90E2" />
                <path d="M18 0L24 6H20C18.8954 6 18 5.10457 18 4V0Z" fill="#357ABD" />
                <rect x="6" y="12" width="2" height="6" fill="#FFFFFF" />
                <rect x="9" y="10" width="2" height="10" fill="#FFFFFF" />
                <rect x="12" y="8" width="2" height="14" fill="#FFFFFF" />
                <rect x="15" y="11" width="2" height="8" fill="#FFFFFF" />
                <rect x="18" y="13" width="2" height="4" fill="#FFFFFF" />
              </svg>
            </div>
            <span className="file-name">{selectedFile ? selectedFile.name : 'No audio file selected'}</span>
          </div>
          {loading && <p className="processing-status">Processing audio file...</p>}
          <div className="scroll-wrapper">
            <div className="scrollable-content">
              <div className="text-block" style={{ 
                backgroundColor: transcription ? '#e8f5e8' : '#f8f9fa',
                border: transcription ? '2px solid #28a745' : '2px solid #dee2e6',
                minHeight: '100px',
                padding: '15px',
                position: 'relative'
              }}>
                {!transcription ? (
                  <p className="text-content" style={{ 
                    fontSize: '16px', 
                    lineHeight: '1.5',
                    color: '#6c757d',
                    marginBottom: '0'
                  }}>
                    Transcribed text will appear here...
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Original Transcription */}
                    <div>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        marginBottom: '8px' 
                      }}>
                        <span style={{ fontSize: '12px', color: '#155724', fontWeight: '600', textTransform: 'uppercase' }}>
                          Original ({detectedLanguage || 'detected'})
                        </span>
                      </div>
                      <p className="text-content" style={{ 
                        fontSize: '16px', 
                        lineHeight: '1.5',
                        color: '#155724',
                        fontWeight: 'bold',
                        marginBottom: '0'
                      }}>
                        {transcription}
                      </p>
                    </div>

                    {/* Translated Text */}
                    {translation && (
                      <div>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px', 
                          marginBottom: '8px' 
                        }}>
                          <span style={{ fontSize: '12px', color: '#1565c0', fontWeight: '600', textTransform: 'uppercase' }}>
                            Translated ({outputLanguage === 'en' ? 'English' : 
                                       outputLanguage === 'es' ? 'Spanish' : 
                                       outputLanguage === 'fr' ? 'French' : 
                                       outputLanguage === 'pl' ? 'Polish' : 
                                       outputLanguage === 'te' ? 'Telugu' : 
                                       outputLanguage === 'hi' ? 'Hindi' : 
                                       outputLanguage === 'ta' ? 'Tamil' : 
                                       outputLanguage === 'ga' ? 'Irish' : outputLanguage})
                          </span>
                        </div>
                        <p className="text-content" style={{ 
                          fontSize: '16px', 
                          lineHeight: '1.5',
                          color: '#0d47a1',
                          fontWeight: 'bold',
                          marginBottom: '0'
                        }}>
                          {translation}
                        </p>
                      </div>
                    )}

                    {/* Audio Player */}
                    {audioUrl && (
                      <div>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px', 
                          marginBottom: '8px' 
                        }}>
                          <span style={{ fontSize: '16px' }}>🔊</span>
                          <span style={{ fontSize: '13px', color: '#2e7d32', fontWeight: '600' }}>
                            Audio in {outputLanguage === 'en' ? 'English' : 
                                      outputLanguage === 'es' ? 'Spanish' : 
                                      outputLanguage === 'fr' ? 'French' : 
                                      outputLanguage === 'pl' ? 'Polish' : 
                                      outputLanguage === 'te' ? 'Telugu' : 
                                      outputLanguage === 'hi' ? 'Hindi' : 
                                      outputLanguage === 'ta' ? 'Tamil' : 
                                      outputLanguage === 'ga' ? 'Irish' : outputLanguage}
                          </span>
                        </div>
                        <audio 
                          controls 
                          style={{ width: '100%', height: '40px' }}
                          src={audioUrl}
                        >
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    )}
                  </div>
                )}
                
                <button className="copy-button" onClick={handleCopy} title="Copy text">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 2H12C13.1046 2 14 2.89543 14 4V12C14 13.1046 13.1046 14 12 14H4C2.89543 14 2 13.1046 2 12V4C2 2.89543 2.89543 2 4 2Z" stroke="#666" strokeWidth="1.5" fill="none" />
                    <path d="M8 6H16C17.1046 6 18 6.89543 18 8V16C18 17.1046 17.1046 18 16 18H8C6.89543 18 6 17.1046 6 16" stroke="#666" strokeWidth="1.5" fill="none" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="input-section">
        <div className="content-container">
          <div className="input-box">
            <p className="input-placeholder">
              Upload your audio file here to convert it into text.
            </p>
            <div className="input-controls">
              <div className="translate-dropdown" style={{ position: 'relative', cursor: 'pointer' }} onClick={() => {
                try {
                  setShowLanguageMenu(!showLanguageMenu);
                } catch (error) {
                  console.error('Error toggling language menu:', error);
                }
              }}>
                <span>
                  {outputLanguage === 'en' ? 'English' : 
                   outputLanguage === 'es' ? 'Spanish' : 
                   outputLanguage === 'fr' ? 'French' : 
                   outputLanguage === 'pl' ? 'Polish' : 
                   outputLanguage === 'te' ? 'Telugu' : 
                   outputLanguage === 'hi' ? 'Hindi' : 
                   outputLanguage === 'ta' ? 'Tamil' : 
                   outputLanguage === 'ga' ? 'Irish' : 'English'}
                </span>
                <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L6 6L11 1" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {showLanguageMenu && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '5px',
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
              <div className="input-actions">
                <label className="action-btn" title="Upload audio file (FLAC, M4A, MP3, MP4, MPEG, MPGA, OGG, OGA, OPUS, WAV, WEBM)">
                  <input
                    type="file"
                    accept=".flac,.m4a,.mp3,.mp4,.mpeg,.mpga,.oga,.ogg,.opus,.wav,.wave,.webm,audio/*,video/mp4"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16.667 10.833L10 17.5C8.847 18.653 7.153 18.653 6 17.5S4.347 14.847 6 13.333L12.5 6.833C13.237 6.096 14.429 6.096 15.167 6.833C15.904 7.571 15.904 8.762 15.167 9.5L9.167 15.5C8.929 15.738 8.571 15.738 8.333 15.5C8.096 15.262 8.096 14.904 8.333 14.667L13.833 9.167" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </label>
                <button 
                  className="action-btn" 
                  title="Send for transcription"
                  onClick={() => {
                    if (selectedFile) {
                      handleTranscription(selectedFile);
                    } else {
                      alert('Please select an audio file first');
                    }
                  }}
                  disabled={loading}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 10L17 10M17 10L13 6M17 10L13 14" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          <nav className="standard-nav">
            <Link to="/" className="nav-btn">Home</Link>
            <Link to="/document-analyzer" className="nav-btn">Document Analyzer</Link>
            <Link to="/text-to-speech" className="nav-btn">Translator</Link>
            <Link to="/speech-to-text" className="nav-btn active">Audio Transcription</Link>
            <Link to="/clinical-chat" className="nav-btn">Healthcare Chat</Link>
            <Link to="/organ-analyzer" className="nav-btn">Organ Scan Analysis</Link>
          </nav>
        </div>
      </section>
    </div>
  );
};

export default SpeechToText;
