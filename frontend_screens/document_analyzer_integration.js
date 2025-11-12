/**
 * Document Analyzer Frontend API Integration
 * Connects document-analyzer.html with document_api.py and csv_file_api.py
 */

const DocumentAnalyzerAPI = {
    documentBaseURL: (window.API_ORIGIN || document.querySelector('meta[name="backend-origin"]')?.content || window.location.origin).replace(/\/$/, ''),
    csvBaseURL: (window.API_ORIGIN || document.querySelector('meta[name="backend-origin"]')?.content || window.location.origin).replace(/\/$/, ''),
    
    /**
     * Process document file
     * @param {File} documentFile - The document file to process
     * @param {string} question - Question about the document
     * @param {string} outputLanguage - Output language
     * @returns {Promise<Object>} Processing results
     */
    async processDocument(documentFile, question = 'Please provide a summary and analysis of this document', outputLanguage = 'en') {
        try {
            const formData = new FormData();
            formData.append('file', documentFile);
            formData.append('question', question);
            formData.append('output_language', outputLanguage);
            
            const apiKey = localStorage.getItem('MASTER_API_KEY') || window.UNIFIED_API_KEY;
            const response = await fetch(`${this.documentBaseURL}/document/process`, {
                method: 'POST',
                headers: { ...(apiKey? {'x-api-key': apiKey}: {}) },
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error processing document:', error);
            throw error;
        }
    },
    
    /**
     * Process CSV file
     * @param {File} csvFile - The CSV file to process
     * @param {string} question - Question about the CSV data
     * @param {string} outputLanguage - Output language
     * @returns {Promise<Object>} Processing results
     */
    async processCSV(csvFile, question = 'Please analyze this CSV data and provide insights', outputLanguage = 'en') {
        try {
            const formData = new FormData();
            formData.append('file', csvFile);
            formData.append('question', question);
            formData.append('output_language', outputLanguage);
            
            const apiKey = localStorage.getItem('MASTER_API_KEY') || window.UNIFIED_API_KEY;
            const response = await fetch(`${this.csvBaseURL}/csv/process`, {
                method: 'POST',
                headers: { ...(apiKey? {'x-api-key': apiKey}: {}) },
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error processing CSV:', error);
            throw error;
        }
    },
    
    /**
     * Test document analyzer functionality
     * @returns {Promise<Object>} Test results
     */
    async testDocumentAnalyzer() {
        try {
            const response = await fetch(`${this.documentBaseURL}/test_document`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error testing document analyzer:', error);
            throw error;
        }
    },
    
    /**
     * Test CSV analyzer functionality
     * @returns {Promise<Object>} Test results
     */
    async testCSVAnalyzer() {
        try {
            const response = await fetch(`${this.csvBaseURL}/test_csv`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error testing CSV analyzer:', error);
            throw error;
        }
    }
};

/**
 * UI Integration Functions for document-analyzer.html
 */
const DocumentAnalyzerUI = {
    
    /**
     * Initialize document analyzer functionality
     */
    initDocumentAnalyzer() {
        this.initFileUpload();
        this.initAnalysisOptions();
        this.initProcessingButtons();
    },
    
    /**
     * Initialize file upload functionality
     */
    initFileUpload() {
        const dropZone = document.getElementById('document-drop-zone');
        const fileInput = document.getElementById('document-file-input');
        const csvDropZone = document.getElementById('csv-drop-zone');
        const csvFileInput = document.getElementById('csv-file-input');
        
        // Document file upload
        if (dropZone && fileInput) {
            this.setupFileUpload(dropZone, fileInput, 'document', [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/plain'
            ]);
        }
        
        // CSV file upload
        if (csvDropZone && csvFileInput) {
            this.setupFileUpload(csvDropZone, csvFileInput, 'csv', [
                'text/csv',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            ]);
        }
    },
    
    /**
     * Setup file upload for a specific drop zone
     * @param {HTMLElement} dropZone - Drop zone element
     * @param {HTMLElement} fileInput - File input element
     * @param {string} type - File type (document or csv)
     * @param {Array} allowedTypes - Allowed MIME types
     */
    setupFileUpload(dropZone, fileInput, type, allowedTypes) {
        let selectedFile = null;
        
        // Drag and drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0], type, allowedTypes);
            }
        });
        
        dropZone.addEventListener('click', () => {
            fileInput.click();
        });
        
        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files[0], type, allowedTypes);
            }
        });
    },
    
    /**
     * Handle file selection
     * @param {File} file - Selected file
     * @param {string} type - File type (document or csv)
     * @param {Array} allowedTypes - Allowed MIME types
     */
    handleFileSelect(file, type, allowedTypes) {
        // Validate file type
        if (!allowedTypes.includes(file.type)) {
            this.showError(`Please select a valid ${type} file`);
            return;
        }
        
        // Validate file size (50MB max)
        if (file.size > 50 * 1024 * 1024) {
            this.showError('File size must be less than 50MB');
            return;
        }
        
        // Store selected file
        if (type === 'document') {
            this.selectedDocument = file;
            this.showDocumentPreview(file);
            this.enableDocumentButtons(true);
        } else if (type === 'csv') {
            this.selectedCSV = file;
            this.showCSVPreview(file);
            this.enableCSVButtons(true);
        }
    },
    
    /**
     * Show document preview
     * @param {File} file - Document file
     */
    showDocumentPreview(file) {
        const previewContainer = document.getElementById('document-preview');
        if (!previewContainer) return;
        
        previewContainer.innerHTML = `
            <div class="file-preview">
                <div class="file-icon">📄</div>
                <div class="file-info">
                    <h4>${file.name}</h4>
                    <p>Size: ${(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    <p>Type: ${file.type || 'Unknown'}</p>
                </div>
            </div>
        `;
        previewContainer.style.display = 'block';
    },
    
    /**
     * Show CSV preview
     * @param {File} file - CSV file
     */
    showCSVPreview(file) {
        const previewContainer = document.getElementById('csv-preview');
        if (!previewContainer) return;
        
        previewContainer.innerHTML = `
            <div class="file-preview">
                <div class="file-icon">📊</div>
                <div class="file-info">
                    <h4>${file.name}</h4>
                    <p>Size: ${(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    <p>Type: CSV/Excel</p>
                </div>
            </div>
        `;
        previewContainer.style.display = 'block';
    },
    
    /**
     * Initialize analysis options
     */
    initAnalysisOptions() {
        const analysisTypeSelect = document.getElementById('analysis-type');
        const csvOperationSelect = document.getElementById('csv-operation');
        const targetLanguageSelect = document.getElementById('target-language');
        
        // Set default values if not set
        if (analysisTypeSelect && !analysisTypeSelect.value) {
            analysisTypeSelect.value = 'analyze';
        }
        
        if (csvOperationSelect && !csvOperationSelect.value) {
            csvOperationSelect.value = 'analyze';
        }
        
        if (targetLanguageSelect && !targetLanguageSelect.value) {
            targetLanguageSelect.value = 'en';
        }
    },
    
    /**
     * Initialize processing buttons
     */
    initProcessingButtons() {
        const processDocBtn = document.getElementById('process-document-btn');
        const processCSVBtn = document.getElementById('process-csv-btn');
        
        if (processDocBtn) {
            processDocBtn.addEventListener('click', () => {
                this.processDocument();
            });
        }
        
        if (processCSVBtn) {
            processCSVBtn.addEventListener('click', () => {
                this.processCSV();
            });
        }
    },
    
    /**
     * Process document
     */
    async processDocument() {
        if (!this.selectedDocument) {
            this.showError('Please select a document first');
            return;
        }
        
        const questionInput = document.getElementById('document-question');
        const outputLangSelect = document.getElementById('output-language');
        
        const question = questionInput ? questionInput.value.trim() : 'Please provide a summary and analysis of this document';
        const outputLanguage = outputLangSelect ? outputLangSelect.value : 'en';
        
        if (!question) {
            this.showError('Please enter a question about the document');
            return;
        }
        
        try {
            this.showLoading('document', true);
            this.enableDocumentButtons(false);
            
            const result = await DocumentAnalyzerAPI.processDocument(this.selectedDocument, question, outputLanguage);
            this.displayDocumentResults(result);
            
            // Store file_id for follow-up questions
            if (result.file_id) {
                this.documentFileId = result.file_id;
            }
            
        } catch (error) {
            this.showError('Document processing failed: ' + error.message);
        } finally {
            this.showLoading('document', false);
            this.enableDocumentButtons(true);
        }
    },
    
    /**
     * Process CSV
     */
    async processCSV() {
        if (!this.selectedCSV) {
            this.showError('Please select a CSV file first');
            return;
        }
        
        const questionInput = document.getElementById('csv-question');
        const outputLangSelect = document.getElementById('csv-output-language');
        
        const question = questionInput ? questionInput.value.trim() : 'Please analyze this CSV data and provide insights';
        const outputLanguage = outputLangSelect ? outputLangSelect.value : 'en';
        
        if (!question) {
            this.showError('Please enter a question about the CSV data');
            return;
        }
        
        try {
            this.showLoading('csv', true);
            this.enableCSVButtons(false);
            
            const result = await DocumentAnalyzerAPI.processCSV(this.selectedCSV, question, outputLanguage);
            this.displayCSVResults(result);
            
            // Store file_id for follow-up questions
            if (result.file_id) {
                this.csvFileId = result.file_id;
            }
            
        } catch (error) {
            this.showError('CSV processing failed: ' + error.message);
        } finally {
            this.showLoading('csv', false);
            this.enableCSVButtons(true);
        }
    },
    
    /**
     * Display document processing results
     * @param {Object} results - Processing results
     */
    displayDocumentResults(results) {
        const resultContainer = document.getElementById('document-results');
        if (!resultContainer) return;
        
        // Backend returns: response, audio_url, conversation_history, file_id
        const response = results.response || 'No response received';
        const audioUrl = results.audio_url;
        const conversationHistory = results.conversation_history || [];
        
        resultContainer.innerHTML = `
            <div class="processing-results">
                <h3>Document Analysis Results</h3>
                
                <div class="result-section">
                    <h4>Analysis Response</h4>
                    <div class="response-text">${response}</div>
                </div>
                
                ${conversationHistory.length > 0 ? `
                    <div class="result-section">
                        <h4>Conversation History</h4>
                        <div class="conversation-history">
                            ${conversationHistory.map((item, index) => `
                                <div class="conversation-item">
                                    <div class="question"><strong>Q${index + 1}:</strong> ${item.question}</div>
                                    <div class="answer"><strong>A${index + 1}:</strong> ${item.answer}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${audioUrl ? `
                    <div class="result-section">
                        <h4>Audio Response</h4>
                        <div class="audio-player">
                            <audio controls>
                                <source src="${audioUrl.startsWith('http') ? audioUrl : this.documentBaseURL + audioUrl}" type="audio/mpeg">
                                Your browser does not support the audio element.
                            </audio>
                        </div>
                    </div>
                ` : ''}
                
                <div class="result-section">
                    <h4>Follow-up Question</h4>
                    <div class="followup-section">
                        <input type="text" id="followup-question" placeholder="Ask another question about this document..." style="width: 70%; padding: 8px; margin-right: 10px;">
                        <button onclick="documentAnalyzerUI.askFollowupQuestion('document')" class="followup-btn">Ask</button>
                    </div>
                </div>
            </div>
        `;
        
        resultContainer.style.display = 'block';
    },
    
    /**
     * Display CSV processing results
     * @param {Object} results - Processing results
     */
    displayCSVResults(results) {
        const resultContainer = document.getElementById('csv-results');
        if (!resultContainer) return;
        
        // Backend returns: response, audio_url, conversation_history, file_id
        const response = results.response || 'No response received';
        const audioUrl = results.audio_url;
        const conversationHistory = results.conversation_history || [];
        
        resultContainer.innerHTML = `
            <div class="processing-results">
                <h3>CSV Analysis Results</h3>
                
                <div class="result-section">
                    <h4>Analysis Response</h4>
                    <div class="response-text">${response}</div>
                </div>
                
                ${conversationHistory.length > 0 ? `
                    <div class="result-section">
                        <h4>Conversation History</h4>
                        <div class="conversation-history">
                            ${conversationHistory.map((item, index) => `
                                <div class="conversation-item">
                                    <div class="question"><strong>Q${index + 1}:</strong> ${item.question}</div>
                                    <div class="answer"><strong>A${index + 1}:</strong> ${item.answer}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${audioUrl ? `
                    <div class="result-section">
                        <h4>Audio Response</h4>
                        <div class="audio-player">
                            <audio controls>
                                <source src="${audioUrl.startsWith('http') ? audioUrl : this.csvBaseURL + audioUrl}" type="audio/mpeg">
                                Your browser does not support the audio element.
                            </audio>
                        </div>
                    </div>
                ` : ''}
                
                <div class="result-section">
                    <h4>Follow-up Question</h4>
                    <div class="followup-section">
                        <input type="text" id="csv-followup-question" placeholder="Ask another question about this CSV data..." style="width: 70%; padding: 8px; margin-right: 10px;">
                        <button onclick="documentAnalyzerUI.askFollowupQuestion('csv')" class="followup-btn">Ask</button>
                    </div>
                </div>
            </div>
        `;
        
        resultContainer.style.display = 'block';
    },
    
    /**
     * Enable/disable document buttons
     * @param {boolean} enabled - Whether buttons should be enabled
     */
    enableDocumentButtons(enabled) {
        const processBtn = document.getElementById('process-document-btn');
        if (processBtn) {
            processBtn.disabled = !enabled;
            processBtn.textContent = enabled ? 'Process Document' : 'Processing...';
        }
    },
    
    /**
     * Enable/disable CSV buttons
     * @param {boolean} enabled - Whether buttons should be enabled
     */
    enableCSVButtons(enabled) {
        const processBtn = document.getElementById('process-csv-btn');
        if (processBtn) {
            processBtn.disabled = !enabled;
            processBtn.textContent = enabled ? 'Process CSV' : 'Processing...';
        }
    },
    
    /**
     * Show loading state
     * @param {string} type - Loading type (document or csv)
     * @param {boolean} show - Show or hide loading
     */
    showLoading(type, show) {
        const loadingElement = document.getElementById(`${type}-loading`);
        if (loadingElement) {
            loadingElement.style.display = show ? 'block' : 'none';
        }
    },
    
    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.innerHTML = `
                <div class="error-message">
                    <span class="error-icon">⚠️</span>
                    <span>${message}</span>
                    <button onclick="this.parentElement.style.display='none'" class="close-error">×</button>
                </div>
            `;
            errorContainer.style.display = 'block';
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                if (errorContainer.style.display !== 'none') {
                    errorContainer.style.display = 'none';
                }
            }, 5000);
        } else {
            alert(message);
        }
    },

    /**
     * Ask follow-up question
     * @param {string} type - Type (document or csv)
     */
    async askFollowupQuestion(type) {
        const questionInputId = type === 'document' ? 'followup-question' : 'csv-followup-question';
        const questionInput = document.getElementById(questionInputId);
        
        if (!questionInput || !questionInput.value.trim()) {
            this.showError('Please enter a question');
            return;
        }
        
        const question = questionInput.value.trim();
        const fileId = type === 'document' ? this.documentFileId : this.csvFileId;
        
        if (!fileId) {
            this.showError('No file ID available. Please upload a file first.');
            return;
        }
        
        try {
            this.showLoading(type, true);
            
            const formData = new FormData();
            formData.append('file_id', fileId);
            formData.append('question', question);
            formData.append('output_language', 'en');
            
            const baseURL = type === 'document' ? DocumentAnalyzerAPI.documentBaseURL : DocumentAnalyzerAPI.csvBaseURL;
            const endpoint = type === 'document' ? 'process_document' : 'process_csv';
            
            const response = await fetch(`${baseURL}/${endpoint}`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (type === 'document') {
                this.displayDocumentResults(result);
            } else {
                this.displayCSVResults(result);
            }
            
            // Clear the input
            questionInput.value = '';
            
        } catch (error) {
            this.showError(`Follow-up question failed: ${error.message}`);
        } finally {
            this.showLoading(type, false);
        }
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.documentAnalyzerUI = new DocumentAnalyzerUI();
    documentAnalyzerUI.initDocumentAnalyzer();
});

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DocumentAnalyzerAPI, DocumentAnalyzerUI };
}
