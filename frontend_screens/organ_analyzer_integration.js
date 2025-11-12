// Organ Analyzer API Integration
// This file handles the frontend API integration for organ-analyzer.html

class OrganAnalyzerAPI {
    constructor() {
        const metaOrigin = document.querySelector('meta[name="backend-origin"]');
        this.baseURL = (window.API_ORIGIN || metaOrigin?.content || window.location.origin).replace(/\/$/, '');
        this.currentAnalysisId = null;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // File upload handling
        const fileInput = document.getElementById('organScanFile');
        const dropZone = document.getElementById('dropZone');
        const analyzeBtn = document.getElementById('analyzeBtn');

        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }

        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
            dropZone.addEventListener('drop', (e) => this.handleDrop(e));
            dropZone.addEventListener('click', () => fileInput?.click());
        }

        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => this.analyzeOrganScan());
        }

        // Language selection handling
        const inputLangSelect = document.getElementById('inputLanguage');
        const outputLangSelect = document.getElementById('outputLanguage');
        
        if (inputLangSelect) {
            inputLangSelect.addEventListener('change', () => this.updateLanguageSettings());
        }
        
        if (outputLangSelect) {
            outputLangSelect.addEventListener('change', () => this.updateLanguageSettings());
        }
    }

    handleFileSelect(event) {
        const files = event.target.files;
        if (files.length > 0) {
            this.displaySelectedFile(files[0]);
        }
    }

    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        event.currentTarget.classList.add('dragover');
    }

    handleDrop(event) {
        event.preventDefault();
        event.currentTarget.classList.remove('dragover');
        
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            document.getElementById('organScanFile').files = files;
            this.displaySelectedFile(files[0]);
        }
    }

    displaySelectedFile(file) {
        const previewContainer = document.getElementById('imagePreview');
        if (previewContainer) {
            previewContainer.innerHTML = `
                <div class="file-info">
                    <div class="file-icon">📸</div>
                    <div class="file-details">
                        <div class="file-name">${file.name}</div>
                        <div class="file-size">${this.formatFileSize(file.size)}</div>
                        <div class="file-type">${file.type}</div>
                    </div>
                </div>
            `;
        }

        // Enable analyze button
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = 'Analyze Organ Scan';
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async analyzeOrganScan() {
        const fileInput = document.getElementById('organScanFile');
        const organType = document.getElementById('organType')?.value || 'general';
        const inputLanguage = document.getElementById('inputLanguage')?.value || 'en';
        const outputLanguage = document.getElementById('outputLanguage')?.value || 'en';
        const analyzeBtn = document.getElementById('analyzeBtn');

        if (!fileInput?.files[0]) {
            this.showError('Please select a medical scan image file.');
            return;
        }

        // Show loading state
        if (analyzeBtn) {
            analyzeBtn.disabled = true;
            analyzeBtn.innerHTML = '<span class="loading-spinner"></span> Analyzing...';
        }

        this.showLoadingState();

        try {
            const formData = new FormData();
            formData.append('image', fileInput.files[0]);
            formData.append('organ', organType);
            formData.append('input_language', inputLanguage);
            formData.append('output_language', outputLanguage);

            const apiKey = localStorage.getItem('MASTER_API_KEY') || window.UNIFIED_API_KEY;
            const response = await fetch(`${this.baseURL}/organ/analyze`, {
                method: 'POST',
                headers: { ...(apiKey? {'x-api-key': apiKey}: {}) },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            this.displayAnalysisResults(result);

        } catch (error) {
            console.error('Error analyzing organ scan:', error);
            this.showError('Failed to analyze organ scan. Please try again.');
        } finally {
            // Reset button state
            if (analyzeBtn) {
                analyzeBtn.disabled = false;
                analyzeBtn.innerHTML = 'Analyze Organ Scan';
            }
            this.hideLoadingState();
        }
    }

    displayAnalysisResults(result) {
        const resultsContainer = document.getElementById('analysisResults');
        if (!resultsContainer) return;
        // Backend returns: diagnosis, model_used, confidence_score (0-1), recommendations{...}, audio_url
        const diagnosis = result.diagnosis || 'Analysis completed';
        const modelUsed = result.model_used || 'Unknown Model';
        const confidence = typeof result.confidence_score === 'number' ? (result.confidence_score * 100).toFixed(1) : null;
        const recommendations = result.recommendations || {};
        const recommendationKeys = ['Explanation','Risks','Dietary suggestions','Medications','Exercises','Precautions'];

        function renderRecommendations(obj) {
            if (!obj || typeof obj !== 'object' || Object.keys(obj).length===0) return '';
            return `
                <div class="result-section">
                    <h4>🩺 Recommendations</h4>
                    <div class="recommendations-list">
                        ${recommendationKeys.filter(k=>obj[k]||obj[k.toLowerCase()]).map(k=>{
                            const val = obj[k] || obj[k.toLowerCase()] || '';
                            return `<div class="recommendation-item"><strong>${k}:</strong> ${val || ''}</div>`;
                        }).join('')}
                    </div>
                </div>`;
        }

        const audioUrl = result.audio_url ? (result.audio_url.startsWith('http') ? result.audio_url : `${this.baseURL}${result.audio_url}`) : null;

        resultsContainer.innerHTML = `
            <div class="analysis-result">
                <div class="result-header">
                    <h3>🔬 Analysis Results</h3>
                    <div class="analysis-timestamp">${new Date().toLocaleString()}</div>
                </div>
                <div class="result-section">
                    <h4>📊 Summary</h4>
                    <div class="analysis-text"><strong>Diagnosis:</strong> ${diagnosis}</div>
                    <div class="analysis-text"><strong>Model:</strong> ${modelUsed}</div>
                </div>
                ${confidence ? `
                <div class="result-section">
                    <h4>📈 Confidence</h4>
                    <div class="confidence-bar">
                        <div class="confidence-fill" style="width:${confidence}%"></div>
                        <span class="confidence-text">${confidence}%</span>
                    </div>
                </div>` : ''}
                ${renderRecommendations(recommendations)}
                ${audioUrl ? `
                <div class="result-section">
                    <h4>🔊 Audio Report</h4>
                    <div class="audio-player">
                        <audio controls>
                            <source src="${audioUrl}" type="audio/mpeg" />
                            Your browser does not support the audio element.
                        </audio>
                        <a href="${audioUrl}" download class="download-btn">📥 Download Audio Report</a>
                    </div>
                </div>` : ''}
                <div class="result-actions">
                    <button onclick="organAnalyzerAPI.exportResults()" class="export-btn">📄 Export Results</button>
                    <button onclick="organAnalyzerAPI.shareResults()" class="share-btn">📤 Share Results</button>
                </div>
            </div>`;

        resultsContainer.style.display = 'block';
        resultsContainer.scrollIntoView({ behavior: 'smooth' });
    }

    showLoadingState() {
        const loadingDiv = document.getElementById('loadingState');
        if (loadingDiv) {
            loadingDiv.style.display = 'block';
        }
    }

    hideLoadingState() {
        const loadingDiv = document.getElementById('loadingState');
        if (loadingDiv) {
            loadingDiv.style.display = 'none';
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        } else {
            alert(message);
        }
    }

    updateLanguageSettings() {
        const inputLang = document.getElementById('inputLanguage')?.value;
        const outputLang = document.getElementById('outputLanguage')?.value;
        
        console.log('Language settings updated:', { inputLang, outputLang });
        // Store language preferences in localStorage
        if (inputLang) localStorage.setItem('organAnalyzer_inputLang', inputLang);
        if (outputLang) localStorage.setItem('organAnalyzer_outputLang', outputLang);
    }

    exportResults() {
        const resultsContainer = document.getElementById('analysisResults');
        if (!resultsContainer) return;

        const results = resultsContainer.innerText;
        const blob = new Blob([results], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `organ_analysis_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    shareResults() {
        const resultsContainer = document.getElementById('analysisResults');
        if (!resultsContainer) return;

        const results = resultsContainer.innerText;
        
        if (navigator.share) {
            navigator.share({
                title: 'Organ Analysis Results',
                text: results,
            }).catch(err => console.log('Error sharing:', err));
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(results).then(() => {
                alert('Results copied to clipboard!');
            }).catch(() => {
                alert('Failed to copy results. Please select and copy manually.');
            });
        }
    }

    // Initialize language settings from localStorage
    initializeLanguageSettings() {
        const inputLang = localStorage.getItem('organAnalyzer_inputLang');
        const outputLang = localStorage.getItem('organAnalyzer_outputLang');
        
        if (inputLang) {
            const inputSelect = document.getElementById('inputLanguage');
            if (inputSelect) inputSelect.value = inputLang;
        }
        
        if (outputLang) {
            const outputSelect = document.getElementById('outputLanguage');
            if (outputSelect) outputSelect.value = outputLang;
        }
    }
}

// Initialize the API integration when the page loads
let organAnalyzerAPI;
document.addEventListener('DOMContentLoaded', () => {
    organAnalyzerAPI = new OrganAnalyzerAPI();
    organAnalyzerAPI.initializeLanguageSettings();
});

// Export for use in HTML
window.organAnalyzerAPI = organAnalyzerAPI;