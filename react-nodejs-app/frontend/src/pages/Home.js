import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Home.css';
import { API_BASE_URL } from '../config/api';

function Home() {
  const [prompt, setPrompt] = useState('');
  const [selectedTool, setSelectedTool] = useState('Healthcare Chat');
  const [globalResponse, setGlobalResponse] = useState('');
  const [showResponse, setShowResponse] = useState(false);
  const [loading, setLoading] = useState(false);

  const tools = [
    { name: 'Healthcare Chat', link: '/clinical-chat' },
    { name: 'Document Analyzer', link: '/document-analyzer' },
    { name: 'Translator', link: '/translator' },
    { name: 'Audio Transcription', link: '/speech-to-text' },
    { name: 'Organ Scan Analysis', link: '/organ-analyzer' }
  ];

  const handleSendPrompt = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setShowResponse(true);
    setGlobalResponse('Processing your request...');

    try {
      let response;
      
      if (selectedTool === 'Translator') {
        response = await axios.post(`${API_BASE_URL}/translate`, {
          text: prompt,
          output_language: 'en'
        });
      } else {
        // Default to Healthcare Chat
        response = await axios.post(`${API_BASE_URL}/clinical-chat`, {
          message: prompt,
          conversation_history: ''
        });
      }

      const responseText = response.data.translated_response || response.data.response || response.data.translated_text || 'No response received';
      setGlobalResponse(responseText);
      setPrompt('');
    } catch (error) {
      setGlobalResponse(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendPrompt();
    }
  };

  return (
    <div className="home-page">
      <main className="main-section">
        <h2 className="main-heading">What can I assist you with today?</h2>
        <div className="prompt-form">
          {showResponse && (
            <div className="global-response">
              <div className="response-text">{globalResponse}</div>
            </div>
          )}
          <div className="prompt-input-wrapper">
            <textarea
              className="prompt-textarea"
              placeholder="Type your healthcare question, ask me to analyze a document, or request a translation..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button
              className="prompt-submit-btn"
              type="button"
              aria-label="Submit prompt"
              title="Submit"
              onClick={handleSendPrompt}
              disabled={loading}
            />
          </div>
          <div className="suggestion-pills">
            {tools.map((tool) => (
              tool.name === 'Healthcare Chat' || tool.name === 'Translator' ? (
                <button
                  key={tool.name}
                  className={`pill ${selectedTool === tool.name ? 'active' : ''}`}
                  data-tool={tool.name}
                  onClick={() => setSelectedTool(tool.name)}
                >
                  {tool.name}
                </button>
              ) : (
                <Link
                  key={tool.name}
                  to={tool.link}
                  className="pill"
                  data-tool={tool.name}
                >
                  {tool.name}
                </Link>
              )
            ))}
          </div>
        </div>
      </main>

      <footer className="site-footer">
        <div className="footer-background">
          <div className="bg-pattern-left"></div>
          <div className="bg-pattern-right"></div>
        </div>
        <p className="copyright">
          ©2025 Velocity Clinical Research | All Rights Reserved
        </p>
      </footer>
    </div>
  );
}

export default Home;
