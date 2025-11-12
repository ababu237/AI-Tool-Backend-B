/**
 * Healthcare API Client
 * Unified JavaScript client for all healthcare frontend screens
 * Handles all API communication with proper error handling and loading states
 */

class HealthcareAPI {
    constructor() {
        // Allow override via global variable or meta tag
        const metaBackend = document.querySelector('meta[name="backend-origin"]');
        const override = window.BACKEND_ORIGIN || (metaBackend ? metaBackend.getAttribute('content') : null);
        this.baseURL = override || window.location.origin; // default to same origin
        // Node backend exposes endpoints at root (no /api prefix). Keep legacy prefix if explicitly forced.
        this.apiPrefix = window.USE_LEGACY_PREFIX ? '/api' : '';
        this.currentRequests = new Map(); // Track ongoing requests
        this.sessionId = this.generateSessionId();
        
        // Initialize event listeners
        this.initializeGlobalEventListeners();
        
        console.log('🏥 Healthcare API Client initialized');
    console.log('📡 Base URL:', this.baseURL);
    console.log('🔧 API Prefix:', this.apiPrefix || '(none)');
        console.log('🆔 Session ID:', this.sessionId);
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    showLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <span>Processing...</span>
                </div>
            `;
            element.classList.add('loading');
        }
    }

    hideLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove('loading');
        }
    }

    showError(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <div class="error-message">
                    <span class="error-icon">⚠️</span>
                    <span class="error-text">${message}</span>
                </div>
            `;
            element.classList.add('error');
        }
        
        // Also show toast notification
        this.showToast('Error: ' + message, 'error');
    }

    showSuccess(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove('error');
            element.classList.add('success');
        }
        
        this.showToast(message, 'success');
    }

    showToast(message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        // Add to page
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }
        
        toastContainer.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    async makeRequest(endpoint, options = {}) {
        const requestId = Math.random().toString(36).substr(2, 9);
    const normalized = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseURL}${this.apiPrefix}${normalized}`;
        
        try {
            // Track request
            this.currentRequests.set(requestId, { url, timestamp: Date.now() });
            
            console.log(`📡 API Request [${requestId}]:`, url, options);
            
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...options.headers,
                    'X-Session-ID': this.sessionId,
                    'X-Request-ID': requestId
                }
            });
            
            const responseData = await response.json();
            
            console.log(`✅ API Response [${requestId}]:`, responseData);
            
            if (!response.ok) {
                throw new Error(responseData.error || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            return responseData;
            
        } catch (error) {
            console.error(`❌ API Error [${requestId}]:`, error);
            throw error;
        } finally {
            // Remove from tracking
            this.currentRequests.delete(requestId);
        }
    }

    // ============================================================================
    // CLINICAL CHAT API
    // ============================================================================

    async sendClinicalChatMessage(userMessage, context = '', responseElementId = 'chatResponse') {
        try {
            this.showLoading(responseElementId);
            
            const response = await this.makeRequest('/clinical_chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_message: userMessage,
                    context: context,
                    session_id: this.sessionId
                })
            });
            
            this.hideLoading(responseElementId);
            
            // Display response in the specified element
            const responseElement = document.getElementById(responseElementId);
            if (responseElement) {
                responseElement.innerHTML = `
                    <div class="chat-response">
                        <div class="response-text">${response.response || response.message}</div>
                        ${response.audio_base64 ? `
                            <div class="response-audio">
                                <audio controls>
                                    <source src="data:audio/mp3;base64,${response.audio_base64}" type="audio/mp3">
                                    Your browser does not support audio playback.
                                </audio>
                            </div>
                        ` : ''}
                        <div class="response-meta">
                            <span class="session-id">Session: ${response.session_id || this.sessionId}</span>
                        </div>
                    </div>
                `;
            }
            
            this.showSuccess(responseElementId, 'Message sent successfully');
            return response;
            
        } catch (error) {
            this.hideLoading(responseElementId);
            this.showError(responseElementId, error.message);
            throw error;
        }
    }

    // ============================================================================
    // DOCUMENT PROCESSING API
    // ============================================================================

    async processDocument(file, question, responseElementId = 'documentResponse') {
        try {
            this.showLoading(responseElementId);
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('question', question);
            
            const response = await this.makeRequest('/process_document', {
                method: 'POST',
                body: formData
            });
            
            this.hideLoading(responseElementId);
            
            // Display response
            const responseElement = document.getElementById(responseElementId);
            if (responseElement) {
                responseElement.innerHTML = `
                    <div class="document-response">
                        <div class="response-text">${response.response || response.analysis}</div>
                        ${response.audio_base64 ? `
                            <div class="response-audio">
                                <audio controls>
                                    <source src="data:audio/mp3;base64,${response.audio_base64}" type="audio/mp3">
                                    Your browser does not support audio playback.
                                </audio>
                            </div>
                        ` : ''}
                        <div class="document-info">
                            <span class="file-name">File: ${file.name}</span>
                            <span class="file-id">ID: ${response.file_id}</span>
                        </div>
                    </div>
                `;
            }
            
            this.showSuccess(responseElementId, 'Document processed successfully');
            return response;
            
        } catch (error) {
            this.hideLoading(responseElementId);
            this.showError(responseElementId, error.message);
            throw error;
        }
    }

    // ============================================================================
    // AUDIO TRANSCRIPTION API
    // ============================================================================

    async transcribeAudio(audioFile, language = 'en', responseElementId = 'transcriptionResponse') {
        try {
            this.showLoading(responseElementId);
            
            const formData = new FormData();
            formData.append('audio_file', audioFile);
            formData.append('session_id', this.sessionId);
            formData.append('language', language);
            
            const response = await this.makeRequest('/transcribe_audio', {
                method: 'POST',
                body: formData
            });
            
            this.hideLoading(responseElementId);
            
            // Display response
            const responseElement = document.getElementById(responseElementId);
            if (responseElement) {
                responseElement.innerHTML = `
                    <div class="transcription-response">
                        <div class="transcribed-text">${response.transcribed_text}</div>
                        ${response.audio_base64 ? `
                            <div class="response-audio">
                                <audio controls>
                                    <source src="data:audio/mp3;base64,${response.audio_base64}" type="audio/mp3">
                                    Your browser does not support audio playback.
                                </audio>
                            </div>
                        ` : ''}
                        <div class="transcription-info">
                            <span class="language">Language: ${language}</span>
                            <span class="confidence">Confidence: ${response.confidence || 'N/A'}</span>
                        </div>
                    </div>
                `;
            }
            
            this.showSuccess(responseElementId, 'Audio transcribed successfully');
            return response;
            
        } catch (error) {
            this.hideLoading(responseElementId);
            this.showError(responseElementId, error.message);
            throw error;
        }
    }

    // ============================================================================
    // TEXT TRANSLATION API
    // ============================================================================

    async translateText(text, targetLanguage, responseElementId = 'translationResponse') {
        try {
            this.showLoading(responseElementId);
            
            const response = await this.makeRequest('/translate_text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    target_language: targetLanguage,
                    session_id: this.sessionId
                })
            });
            
            this.hideLoading(responseElementId);
            
            // Display response
            const responseElement = document.getElementById(responseElementId);
            if (responseElement) {
                responseElement.innerHTML = `
                    <div class="translation-response">
                        <div class="translated-text">${response.translated_text}</div>
                        ${response.audio_base64 ? `
                            <div class="response-audio">
                                <audio controls>
                                    <source src="data:audio/mp3;base64,${response.audio_base64}" type="audio/mp3">
                                    Your browser does not support audio playback.
                                </audio>
                            </div>
                        ` : ''}
                        <div class="translation-info">
                            <span class="source-language">From: ${response.source_language || 'Auto-detected'}</span>
                            <span class="target-language">To: ${targetLanguage}</span>
                        </div>
                    </div>
                `;
            }
            
            this.showSuccess(responseElementId, 'Text translated successfully');
            return response;
            
        } catch (error) {
            this.hideLoading(responseElementId);
            this.showError(responseElementId, error.message);
            throw error;
        }
    }

    // ============================================================================
    // CSV PROCESSING API
    // ============================================================================

    async processCSV(csvFile, targetLanguage, responseElementId = 'csvResponse') {
        try {
            this.showLoading(responseElementId);
            
            const formData = new FormData();
            formData.append('csv_file', csvFile);
            formData.append('target_language', targetLanguage);
            formData.append('session_id', this.sessionId);
            
            const response = await this.makeRequest('/process_csv', {
                method: 'POST',
                body: formData
            });
            
            this.hideLoading(responseElementId);
            
            // Display response
            const responseElement = document.getElementById(responseElementId);
            if (responseElement) {
                responseElement.innerHTML = `
                    <div class="csv-response">
                        <div class="processing-summary">${response.message || response.summary}</div>
                        ${response.download_url ? `
                            <div class="download-section">
                                <a href="${response.download_url}" class="download-button" download>
                                    📥 Download Translated CSV
                                </a>
                            </div>
                        ` : ''}
                        ${response.audio_base64 ? `
                            <div class="response-audio">
                                <audio controls>
                                    <source src="data:audio/mp3;base64,${response.audio_base64}" type="audio/mp3">
                                    Your browser does not support audio playback.
                                </audio>
                            </div>
                        ` : ''}
                        <div class="csv-info">
                            <span class="file-name">File: ${csvFile.name}</span>
                            <span class="language">Target: ${targetLanguage}</span>
                        </div>
                    </div>
                `;
            }
            
            this.showSuccess(responseElementId, 'CSV processed successfully');
            return response;
            
        } catch (error) {
            this.hideLoading(responseElementId);
            this.showError(responseElementId, error.message);
            throw error;
        }
    }

    // ============================================================================
    // ORGAN SCAN ANALYSIS API
    // ============================================================================

    async analyzeOrganScan(scanImage, organType, responseElementId = 'organResponse') {
        try {
            this.showLoading(responseElementId);
            
            const formData = new FormData();
            formData.append('scan_image', scanImage);
            formData.append('organ_type', organType);
            formData.append('session_id', this.sessionId);
            
            const response = await this.makeRequest('/analyze_organ_scan', {
                method: 'POST',
                body: formData
            });
            
            this.hideLoading(responseElementId);
            
            // Display response
            const responseElement = document.getElementById(responseElementId);
            if (responseElement) {
                responseElement.innerHTML = `
                    <div class="organ-analysis-response">
                        <div class="analysis-result">${response.analysis || response.result}</div>
                        ${response.confidence ? `
                            <div class="confidence-score">
                                <span>Confidence: ${(response.confidence * 100).toFixed(1)}%</span>
                            </div>
                        ` : ''}
                        ${response.audio_base64 ? `
                            <div class="response-audio">
                                <audio controls>
                                    <source src="data:audio/mp3;base64,${response.audio_base64}" type="audio/mp3">
                                    Your browser does not support audio playback.
                                </audio>
                            </div>
                        ` : ''}
                        <div class="scan-info">
                            <span class="organ-type">Organ: ${organType}</span>
                            <span class="image-name">Image: ${scanImage.name}</span>
                        </div>
                    </div>
                `;
            }
            
            this.showSuccess(responseElementId, 'Organ scan analyzed successfully');
            return response;
            
        } catch (error) {
            this.hideLoading(responseElementId);
            this.showError(responseElementId, error.message);
            throw error;
        }
    }

    // ============================================================================
    // GLOBAL EVENT HANDLERS
    // ============================================================================

    initializeGlobalEventListeners() {
        // Handle page navigation
        document.addEventListener('click', (event) => {
            if (event.target.matches('[data-navigate]')) {
                event.preventDefault();
                const url = event.target.getAttribute('data-navigate');
                window.location.href = url;
            }
        });

        // Handle form submissions
        document.addEventListener('submit', (event) => {
            if (event.target.matches('.healthcare-form')) {
                event.preventDefault();
                this.handleFormSubmission(event.target);
            }
        });

        // Add loading styles to head if not present
        this.addLoadingStyles();
    }

    addLoadingStyles() {
        if (!document.getElementById('healthcare-api-styles')) {
            const styles = document.createElement('style');
            styles.id = 'healthcare-api-styles';
            styles.textContent = `
                .loading-spinner {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }
                
                .spinner {
                    width: 24px;
                    height: 24px;
                    border: 3px solid #f3f3f3;
                    border-top: 3px solid #284497;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-right: 10px;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                .error-message {
                    background: #ffe6e6;
                    color: #d32f2f;
                    padding: 15px;
                    border-radius: 5px;
                    border-left: 4px solid #d32f2f;
                    margin: 10px 0;
                }
                
                .toast-container {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 9999;
                }
                
                .toast {
                    background: white;
                    border-radius: 5px;
                    padding: 15px;
                    margin-bottom: 10px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    border-left: 4px solid #2196f3;
                    min-width: 300px;
                }
                
                .toast-error { border-left-color: #f44336; }
                .toast-success { border-left-color: #4caf50; }
                .toast-warning { border-left-color: #ff9800; }
            `;
            document.head.appendChild(styles);
        }
    }

    // ============================================================================
    // API STATUS METHODS
    // ============================================================================

    async checkAPIStatus() {
        try {
            const response = await this.makeRequest('/info');
            console.log('📊 API Status:', response);
            return response;
        } catch (error) {
            console.error('❌ API Status Check Failed:', error);
            throw error;
        }
    }

    async checkHealth() {
        try {
            const response = await this.makeRequest('/health');
            console.log('💚 Health Check:', response);
            return response;
        } catch (error) {
            console.error('❌ Health Check Failed:', error);
            throw error;
        }
    }
}

// Initialize global API instance
const healthcareAPI = new HealthcareAPI();

// Make it globally available
window.HealthcareAPI = HealthcareAPI;
window.healthcareAPI = healthcareAPI;

console.log('🚀 Healthcare API Client loaded and ready!');