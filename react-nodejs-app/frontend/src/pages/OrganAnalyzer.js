import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './OrganAnalyzer.css';

const API_BASE_URL = 'http://localhost:5001/api';

const OrganAnalyzer = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [organType, setOrganType] = useState('general');
  const [inputLanguage, setInputLanguage] = useState('en');
  const [outputLanguage, setOutputLanguage] = useState('en');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    console.log('📁 Image file input changed!', {
      file: file,
      filesLength: event.target.files.length,
      fileName: file ? file.name : null,
      fileType: file ? file.type : null,
      isImage: file ? file.type.startsWith('image/') : false
    });
    
    if (file && file.type.startsWith('image/')) {
      console.log('✅ Image file selected:', file.name);
      setSelectedFile(file);
    } else {
      alert('Please select an image file');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
    } else {
      alert('Please select an image file');
    }
  };

  const handleAnalyze = async () => {
    console.log('🚀 Analyze button clicked!', {
      selectedFile: selectedFile,
      fileName: selectedFile ? selectedFile.name : null,
      fileSize: selectedFile ? selectedFile.size : null,
      fileType: selectedFile ? selectedFile.type : null,
      organType: organType,
      inputLanguage: inputLanguage,
      outputLanguage: outputLanguage
    });

    if (!selectedFile) {
      alert('Please select a scan file first');
      return;
    }

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!allowedTypes.includes(selectedFile.type.toLowerCase())) {
      alert('❌ Unsupported Image Format\n\nPlease upload an image in one of these formats:\n• JPEG, PNG, GIF, BMP, WebP\n\nCurrent file type: ' + (selectedFile.type || 'Unknown'));
      return;
    }
    
    if (selectedFile.size > maxSize) {
      alert('❌ Image Too Large\n\nImage size must be under 10MB.\nCurrent file size: ' + (selectedFile.size / 1024 / 1024).toFixed(2) + 'MB');
      return;
    }

    setLoading(true);
    setResults(null); // Clear previous results
    
    console.log('Starting organ analysis with:', {
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      fileType: selectedFile.type,
      organType: organType,
      inputLanguage: inputLanguage,
      outputLanguage: outputLanguage,
      url: `${API_BASE_URL}/organ-analyzer/analyze`
    });
    
    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('organ', organType);
    formData.append('input_language', inputLanguage);
    formData.append('output_language', outputLanguage);

    try {
      // Check backend availability first
      try {
        await axios.get(`${API_BASE_URL.replace('/api', '')}/health`, { timeout: 5000 });
      } catch (healthError) {
        console.warn('Health check failed, but proceeding with analysis');
      }

      const response = await axios.post(`${API_BASE_URL}/organ-analyzer/analyze`, formData, {
        timeout: 120000, // 2 minute timeout for image analysis
        headers: {
          // Don't set Content-Type - let axios handle multipart boundaries
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log('Upload progress:', percentCompleted + '%');
        }
      });
      
      console.log('Organ analysis response:', response.data);
      
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Analysis API returned unsuccessful response');
      }
      
      // Handle different response formats
      const resultData = response.data.data || response.data.result || response.data;
      
      console.log('Result data extracted:', resultData);
      
      if (!resultData) {
        throw new Error('No data in response');
      }
      
      // Check if we have valid analysis data (diagnosis, analysis, or description)
      if (!resultData.diagnosis && !resultData.analysis && !resultData.result && !resultData.description) {
        console.error('Invalid result data structure:', resultData);
        throw new Error('No analysis results received from server');
      }
      
      setResults(resultData);
      console.log('Analysis completed successfully:', resultData);
      
    } catch (error) {
      console.error('Error analyzing scan:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMsg = 'Unknown error occurred';
      if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        errorMsg = 'Cannot connect to server. Please ensure the backend is running on port 5001.';
      } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMsg = 'Analysis timeout. Image may be too large or server is busy. Try a smaller image.';
      } else if (error.response?.status === 413) {
        errorMsg = 'Image too large. Please upload a smaller image file.';
      } else if (error.response?.status === 415) {
        errorMsg = 'Unsupported image format. Please use JPEG, PNG, GIF, BMP, or WebP.';
      } else if (error.response?.status === 429) {
        const retryAfter = error.response.data?.error?.retryAfter || 60;
        errorMsg = `Rate limit exceeded. The OpenAI Vision API is temporarily overloaded. Please wait ${retryAfter} seconds and try again.`;
      } else if (error.response?.status === 404) {
        errorMsg = 'Organ analyzer service not found. Please check backend configuration.';
      } else if (error.response?.status === 500) {
        errorMsg = 'Server error during analysis. Please try again or check server logs.';
      } else if (error.response?.data?.error) {
        errorMsg = error.response.data.error.details || 
                  error.response.data.error.message || 
                  'Server error';
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      alert(`❌ Analysis Failed\n\n${errorMsg}\n\nTroubleshooting:\n• Ensure image is under 10MB\n• Use supported formats: JPEG, PNG, GIF, BMP, WebP\n• Check that backend server is running on port 5001\n• Make sure the image is clear and shows the selected organ type`);
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <main className="main-content">
        <h2 className="page-title">Organ Scan Analysis</h2>
        <hr className="divider" />

        <div
          className={`upload-section ${dragOver ? 'dragover' : ''}`}
          onClick={() => document.getElementById('organScanFile').click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {!selectedFile ? (
            <>
              <div className="upload-icon">📷</div>
              <div className="upload-text">Upload Medical Scan</div>
              <div className="upload-subtext">
                Drag and drop your scan file here or click to browse
              </div>
            </>
          ) : (
            <>
              <div className="upload-icon">✅</div>
              <div className="upload-text">{selectedFile.name}</div>
              <div className="upload-subtext">Click to change file</div>
            </>
          )}
          <input
            type="file"
            id="organScanFile"
            className="file-input"
            accept="image/*"
            onChange={handleFileSelect}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="organType">Organ Type</label>
            <select
              id="organType"
              className="form-select"
              value={organType}
              onChange={(e) => setOrganType(e.target.value)}
            >
              <option value="general">General Scan</option>
              <option value="lung">Lung</option>
              <option value="heart">Heart</option>
              <option value="brain">Brain</option>
              <option value="liver">Liver</option>
              <option value="kidney">Kidney</option>
              <option value="knee">Knee</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="inputLanguage">Input Language</label>
            <select
              id="inputLanguage"
              className="form-select"
              value={inputLanguage}
              onChange={(e) => setInputLanguage(e.target.value)}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="outputLanguage">Output Language</label>
            <select
              id="outputLanguage"
              className="form-select"
              value={outputLanguage}
              onChange={(e) => setOutputLanguage(e.target.value)}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="pl">Polish</option>
              <option value="te">Telugu</option>
              <option value="hi">Hindi</option>
              <option value="ta">Tamil</option>
              <option value="ga">Irish</option>
            </select>
          </div>
        </div>

        <button
          className="btn btn-primary analyze-btn"
          onClick={handleAnalyze}
          disabled={!selectedFile || loading}
        >
          {loading ? 'Analyzing...' : selectedFile ? 'Analyze Organ Scan' : 'Select a scan file to analyze'}
        </button>

        {loading && (
          <div className="loading show">
            <div className="spinner"></div>
            <div>Analyzing your scan...</div>
          </div>
        )}

        {/* Results Display Area */}
        {results && (
          <div className="results-section show">
            <h3 className="results-title">✅ Analysis Results</h3>
            
            <div className="results-content">
              <div className="result-item">
                <div className="result-label">Organ Type:</div>
                <div className="result-value">{results.organ ? results.organ.charAt(0).toUpperCase() + results.organ.slice(1) : 'N/A'}</div>
              </div>
              
              <div className="result-item">
                <div className="result-label">Diagnosis:</div>
                <div className="result-value diagnosis">{results.diagnosis || 'No diagnosis available'}</div>
              </div>
              
              {results.confidence_score && (
                <div className="result-item">
                  <div className="result-label">Confidence Score:</div>
                  <div className="result-value confidence">{(results.confidence_score * 100).toFixed(1)}%</div>
                </div>
              )}
              
              {results.analysis && (
                <div className="result-item full-width">
                  <div className="result-label">Detailed Analysis:</div>
                  <div className="result-value analysis-text">{results.analysis}</div>
                </div>
              )}
              
              {results.recommendations && Object.keys(results.recommendations).length > 0 && (
                <div className="result-item full-width">
                  <div className="result-label">Recommendations:</div>
                  <div className="recommendations-list">
                    {Object.entries(results.recommendations).map(([category, items]) => (
                      <div key={category} className="recommendation-category">
                        <strong>{category.charAt(0).toUpperCase() + category.slice(1)}:</strong>
                        <ul>
                          {Array.isArray(items) ? items.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          )) : <li>{items}</li>}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {results.modelUsed && (
                <div className="result-item">
                  <div className="result-label">Model Used:</div>
                  <div className="result-value">{results.modelUsed}</div>
                </div>
              )}
              
              {/* Audio Player for Analysis Results */}
              {results.audioBase64 && (
                <div className="audio-section">
                  <h4 className="audio-title">🔊 Audio Analysis</h4>
                  <audio 
                    controls 
                    className="audio-player"
                    src={`data:audio/${results.audioFormat || 'mp3'};base64,${results.audioBase64}`}
                  >
                    Your browser does not support the audio element.
                  </audio>
                  <p className="audio-description">
                    Listen to the analysis in {results.outputLanguage || 'selected language'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <nav className="standard-nav">
          <Link to="/" className="nav-btn">Home</Link>
          <Link to="/document-analyzer" className="nav-btn">Document Analyzer</Link>
          <Link to="/text-to-speech" className="nav-btn">Translator</Link>
          <Link to="/speech-to-text" className="nav-btn">Audio Transcription</Link>
          <Link to="/clinical-chat" className="nav-btn">Healthcare Chat</Link>
          <Link to="/organ-analyzer" className="nav-btn active">Organ Scan Analysis</Link>
        </nav>
      </main>
    </div>
  );
};

export default OrganAnalyzer;
