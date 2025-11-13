import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './ClinicalChat.css';
import { API_BASE_URL } from '../config/api';

function ClinicalChat() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      type: 'user',
      text: inputMessage,
      time: getCurrentTime(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/clinical-chat`, {
        message: inputMessage,
        conversation_history: '',
      });

      const aiMessage = {
        type: 'ai',
        text: response.data.response || response.data.message,
        audio: response.data.audio_base64,
        time: getCurrentTime(),
      };

      setMessages((prev) => [...prev, aiMessage]);

    } catch (error) {
      const errorMessage = {
        type: 'ai',
        text: `⚠️ Sorry, I encountered an error while processing your message. Please try again.\nError: ${error.message}`,
        time: getCurrentTime(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
      console.error('Clinical Chat Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="clinical-chat-page">
      <div className="content-container">
        <h2 className="page-title">Clinical Chat Assistant</h2>
        <hr className="divider" />

        <div className="chat-container">
          <div className="chat-messages" id="chatMessages">
            {messages.length === 0 && (
              <div className="welcome-message">
                <h3 className="welcome-title">Welcome to Clinical Chat</h3>
                <p className="welcome-subtitle">
                  Ask me any clinical questions, discuss medical cases, or get
                  assistance with healthcare-related queries. I'm here to help
                  you with professional medical insights.
                </p>
              </div>
            )}

            {messages.map((message, index) => (
              <div key={index} className={`message ${message.type}`}>
                {message.type === 'ai' && (
                  <div className="message-avatar">AI</div>
                )}
                <div className="message-content">
                  <p className="message-text" style={message.isError ? { color: '#d32f2f' } : {}}>
                    {message.text}
                  </p>
                  {message.audio && (
                    <div className="response-audio" style={{ marginTop: '10px' }}>
                      <audio controls style={{ width: '100%', maxWidth: '300px' }}>
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

            {isLoading && (
              <div className="message ai loading">
                <div className="message-avatar">AI</div>
                <div className="message-content">
                  <div className="loading-spinner">
                    <div className="spinner"></div>
                    <span>Thinking...</span>
                  </div>
                  <div className="message-time">{getCurrentTime()}</div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-section">
            <div className="input-container">
              <textarea
                className="input-box"
                placeholder="Type your clinical question or message here..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                rows="3"
              />
              <div className="input-controls">
                <div className="input-actions">
                  <button className="action-btn" title="Attach file">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M16.667 10.833L10 17.5C8.847 18.653 7.153 18.653 6 17.5S4.347 14.847 6 13.333L12.5 6.833C13.237 6.096 14.429 6.096 15.167 6.833C15.904 7.571 15.904 8.762 15.167 9.5L9.167 15.5C8.929 15.738 8.571 15.738 8.333 15.5C8.096 15.262 8.096 14.904 8.333 14.667L13.833 9.167"
                        stroke="#666"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    className="action-btn send-btn"
                    title="Send message"
                    onClick={sendMessage}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M3 10L17 10M17 10L13 6M17 10L13 14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <nav className="standard-nav">
          <Link to="/" className="nav-btn">Home</Link>
          <Link to="/document-analyzer" className="nav-btn">Document Analyzer</Link>
          <Link to="/translator" className="nav-btn">Translator</Link>
          <Link to="/speech-to-text" className="nav-btn">Audio Transcription</Link>
          <Link to="/clinical-chat" className="nav-btn active">Healthcare Chat</Link>
          <Link to="/organ-analyzer" className="nav-btn">Organ Scan Analysis</Link>
        </nav>
      </div>
    </div>
  );
}

export default ClinicalChat;
