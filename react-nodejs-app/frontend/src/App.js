import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Header from './components/Header';
import Navigation from './components/Navigation';
// import SystemStatus from './components/SystemStatus'; // Temporarily disabled
import Home from './pages/Home';
import ClinicalChat from './pages/ClinicalChat';
import DocumentAnalyzer from './pages/DocumentAnalyzer';
import OrganAnalyzer from './pages/OrganAnalyzer';
import SpeechToText from './pages/SpeechToText';
import TextToSpeech from './pages/TextToSpeech';
import SimpleDebugTest from './pages/SimpleDebugTest';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <div className="app">
          <ErrorBoundary>
            <Header />
          </ErrorBoundary>
          <ErrorBoundary>
            <Navigation />
          </ErrorBoundary>
          {/* Temporarily disabled to prevent ResizeObserver issues */}
          {/* <ErrorBoundary>
            <SystemStatus />
          </ErrorBoundary> */}
          <main className="main-content">
            <Routes>
              <Route path="/" element={<ErrorBoundary><Home /></ErrorBoundary>} />
              <Route path="/clinical-chat" element={<ErrorBoundary><ClinicalChat /></ErrorBoundary>} />
              <Route path="/document-analyzer" element={<ErrorBoundary><DocumentAnalyzer /></ErrorBoundary>} />
              <Route path="/organ-analyzer" element={<ErrorBoundary><OrganAnalyzer /></ErrorBoundary>} />
              <Route path="/speech-to-text" element={<ErrorBoundary><SpeechToText /></ErrorBoundary>} />
              <Route path="/text-to-speech" element={<ErrorBoundary><TextToSpeech /></ErrorBoundary>} />
              <Route path="/translator" element={<ErrorBoundary><TextToSpeech /></ErrorBoundary>} />
              <Route path="/debug-test" element={<ErrorBoundary><SimpleDebugTest /></ErrorBoundary>} />
            </Routes>
          </main>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
