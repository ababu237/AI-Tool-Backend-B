import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './DocumentAnalyzer.css';
import { API_BASE_URL } from '../config/api';

const DocumentAnalyzer = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [question, setQuestion] = useState('');
  const conversationEndRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [outputLanguage, setOutputLanguage] = useState('en');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);
  
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && (file.type === 'application/pdf' || file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      setSelectedFile(file);
      handleFileUpload(file);
    } else {
      alert('Please select a PDF or CSV file');
    }
  };
  
  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };
  
  const handleFileUpload = async (file) => {
    setLoading(true);
    setConversation([]); // Clear previous conversation
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      // Determine which API endpoint to use based on file type
      const endpoint = file.type === 'text/csv' || file.name.endsWith('.csv') 
        ? '/csv/analyze' 
        : '/document/analyze';
      
      // Don't set Content-Type header - let axios set it with boundary
      const response = await axios.post(`${API_BASE_URL}${endpoint}`, formData);
      
      console.log('Upload response:', response.data);
      
      // Handle different response formats
      const summary = response.data.summary || response.data.data?.summary || 
                     response.data.data?.textPreview || 'Document uploaded successfully. You can now ask questions about it.';
      
      // Add summary as initial AI message
      const summaryMessage = {
        type: 'ai',
        text: summary,
        time: getCurrentTime()
      };
      setConversation([summaryMessage]);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert(`Failed to upload and analyze file: ${error.response?.data?.error?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendQuestion = async () => {
    if (!question.trim()) {
      alert('Please enter a question');
      return;
    }
    
    if (!selectedFile) {
      alert('Please upload a document first');
      return;
    }
    
    // Add user question to conversation
    const userMessage = {
      type: 'user',
      text: question,
      time: getCurrentTime()
    };
    setConversation(prev => [...prev, userMessage]);
    
    const currentQuestion = question;
    setQuestion('');
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('question', currentQuestion);
      formData.append('outputLanguage', outputLanguage);
      
      const endpoint = selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')
        ? '/csv/query'
        : '/document/query';
      
      // Don't set Content-Type header - let axios set it with boundary
      const response = await axios.post(`${API_BASE_URL}${endpoint}`, formData);
      
      console.log('Query response:', response.data);
      
      const answer = response.data.answer || response.data.data?.answer || 
                    response.data.data?.response || 'No answer received';
      const audioBase64 = response.data.audioBase64 || response.data.data?.audioBase64;
      
      // Add AI response to conversation with audio
      const aiMessage = {
        type: 'ai',
        text: answer,
        time: getCurrentTime(),
        audio: audioBase64
      };
      setConversation(prev => [...prev, aiMessage]);
      
    } catch (error) {
      console.error('Error sending question:', error);
      
      // Add error message to conversation
      const errorMessage = {
        type: 'ai',
        text: `⚠️ Sorry, I encountered an error. Please try again.\nError: ${error.response?.data?.error?.message || error.message}`,
        time: getCurrentTime(),
        isError: true
      };
      setConversation(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <main className="main-content">
        <div className="document-viewer">
          <div className="document-header">
            <h2 className="document-title">Document Analyzer</h2>
            <div className="file-info">
              <div className="file-icon">
                <svg width="26" height="31" viewBox="0 0 26 31" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1.18" y="0" width="24.82" height="31" fill="#E5E5E5" />
                  <rect x="0" y="10.37" width="1.18" height="2.39" fill="#CCCCCC" />
                  <rect x="0" y="3.33" width="16.16" height="8.24" fill="#DDDDDD" />
                  <rect x="6.72" y="13.41" width="13.73" height="12.29" fill="#F0F0F0" />
                  <rect x="19.25" y="0" width="6.75" height="6.85" fill="#BBBBBB" />
                  <rect x="3" y="4.78" width="10.16" height="4.18" fill="#CCCCCC" />
                </svg>
              </div>
              <span className="file-name">{selectedFile ? selectedFile.name : 'No file selected'}</span>
            </div>
          </div>

          <div className="summary-prompt">
            {selectedFile ? 'Document uploaded successfully. Ask questions below.' : 'Upload a PDF or CSV file to get started'}
          </div>

          <div className="content-area">
            <div className="text-scroll-container">
              {conversation.length === 0 ? (
                <p className="document-text">Document Q&A will appear here after you ask questions...</p>
              ) : (
                <div className="conversation-container">
                  {conversation.map((message, index) => (
                    <div key={index} className={`message ${message.type}`}>
                      {message.type === 'ai' && (
                        <div className="message-avatar">AI</div>
                      )}
                      <div className="message-content">
                        <p className="message-text" style={message.isError ? { color: '#d32f2f' } : {}}>
                          {message.text}
                        </p>
                        {message.audio && (
                          <div className="message-audio">
                            <audio controls style={{ width: '100%', maxWidth: '300px', marginTop: '10px' }}>
                              <source src={`data:audio/mp3;base64,${message.audio}`} type="audio/mp3" />
                              Your browser does not support audio playback.
                            </audio>
                          </div>
                        )}
                        <div className="message-time">{message.time}</div>
                      </div>
                      {message.type === 'user' && (
                        <div className="message-avatar">U</div>
                      )}
                    </div>
                  ))}
                  {loading && (
                    <div className="message ai">
                      <div className="message-avatar">AI</div>
                      <div className="message-content">
                        <p className="message-text">Processing your question...</p>
                      </div>
                    </div>
                  )}
                  <div ref={conversationEndRef} />
                </div>
              )}
            </div>
            <div className="custom-scrollbar">
              <div className="scrollbar-thumb"></div>
            </div>
          </div>
        </div>

        <div className="input-section">
          <div className="input-container">
            <textarea
              placeholder="Give me a summary about your document |"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={loading}
            ></textarea>
            <div className="input-actions">
              <div className="language-selector" onClick={() => setShowLanguageMenu(!showLanguageMenu)}>
                <span>
                  {outputLanguage === 'en' ? 'English' : 
                   outputLanguage === 'te' ? 'Telugu' : 
                   outputLanguage === 'hi' ? 'Hindi' : 
                   outputLanguage === 'es' ? 'Spanish' : 
                   outputLanguage === 'fr' ? 'French' : 
                   outputLanguage === 'pl' ? 'Polish' : 
                   outputLanguage === 'ta' ? 'Tamil' : 
                   outputLanguage === 'ga' ? 'Irish' : 'English'}
                </span>
                <svg width="15" height="8" viewBox="0 0 15 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L7.5 7L14 1" stroke="#666" strokeWidth="2" />
                </svg>
                {showLanguageMenu && (
                  <div className="language-dropdown">
                    <div className="language-option" onClick={(e) => { e.stopPropagation(); setOutputLanguage('en'); setShowLanguageMenu(false); }}>
                      English
                    </div>
                    <div className="language-option" onClick={(e) => { e.stopPropagation(); setOutputLanguage('te'); setShowLanguageMenu(false); }}>
                      Telugu
                    </div>
                    <div className="language-option" onClick={(e) => { e.stopPropagation(); setOutputLanguage('hi'); setShowLanguageMenu(false); }}>
                      Hindi
                    </div>
                    <div className="language-option" onClick={(e) => { e.stopPropagation(); setOutputLanguage('es'); setShowLanguageMenu(false); }}>
                      Spanish
                    </div>
                    <div className="language-option" onClick={(e) => { e.stopPropagation(); setOutputLanguage('fr'); setShowLanguageMenu(false); }}>
                      French
                    </div>
                    <div className="language-option" onClick={(e) => { e.stopPropagation(); setOutputLanguage('pl'); setShowLanguageMenu(false); }}>
                      Polish
                    </div>
                    <div className="language-option" onClick={(e) => { e.stopPropagation(); setOutputLanguage('ta'); setShowLanguageMenu(false); }}>
                      Tamil
                    </div>
                    <div className="language-option" onClick={(e) => { e.stopPropagation(); setOutputLanguage('ga'); setShowLanguageMenu(false); }}>
                      Irish
                    </div>
                  </div>
                )}
              </div>
              <label className="icon-button" title="Attach file">
                <input
                  type="file"
                  accept=".pdf,.csv"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <svg width="35" height="35" viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.5 4.375C10.15 4.375 4.375 10.15 4.375 17.5C4.375 24.85 10.15 30.625 17.5 30.625C24.85 30.625 30.625 24.85 30.625 17.5C30.625 10.15 24.85 4.375 17.5 4.375ZM22.75 19.25H19.25V22.75H15.75V19.25H12.25V15.75H15.75V12.25H19.25V15.75H22.75V19.25Z" fill="#666" />
                </svg>
              </label>
              <button
                className="icon-button send-button"
                onClick={handleSendQuestion}
                disabled={loading}
                title="Send message"
              >
                <svg width="35" height="35" viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2.1875 17.5L32.8125 2.1875L29.1667 32.8125L17.5 24.0625L2.1875 17.5ZM7.29167 17.5L17.5 20.4167L24.7917 7.29167L7.29167 17.5Z" fill="#284497" />
                </svg>
              </button>
            </div>
          </div>
          
          <nav className="standard-nav">
            <Link to="/" className="nav-btn">Home</Link>
            <Link to="/document-analyzer" className="nav-btn active">Document Analyzer</Link>
            <Link to="/text-to-speech" className="nav-btn">Translator</Link>
            <Link to="/speech-to-text" className="nav-btn">Audio Transcription</Link>
            <Link to="/clinical-chat" className="nav-btn">Healthcare Chat</Link>
            <Link to="/organ-analyzer" className="nav-btn">Organ Scan Analysis</Link>
          </nav>
        </div>
      </main>
    </div>
  );
};

export default DocumentAnalyzer;
