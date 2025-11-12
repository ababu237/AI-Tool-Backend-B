// Speech to Text API Integration
// This file handles the frontend API integration for speech_to_text.html

class SpeechToTextAPI {
    constructor() {
        const metaOrigin = document.querySelector('meta[name="backend-origin"]');
        this.baseURL = (window.API_ORIGIN || metaOrigin?.content || window.location.origin).replace(/\/$/, '');
        this.currentTranscription = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // File upload handling
        const fileInput = document.getElementById('audioFile');
        const dropZone = document.getElementById('dropZone');
        const transcribeBtn = document.getElementById('transcribeBtn');
        const clearBtn = document.getElementById('clearBtn');

        // Recording controls
        const recordBtn = document.getElementById('recordBtn');
        const stopRecordBtn = document.getElementById('stopRecordBtn');
        const playRecordedBtn = document.getElementById('playRecordedBtn');

        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }

        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
            dropZone.addEventListener('drop', (e) => this.handleDrop(e));
            dropZone.addEventListener('click', () => fileInput?.click());
        }

        if (transcribeBtn) {
            transcribeBtn.addEventListener('click', () => this.transcribeAudio());
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAll());
        }

        if (recordBtn) {
            recordBtn.addEventListener('click', () => this.startRecording());
        }

        if (stopRecordBtn) {
            stopRecordBtn.addEventListener('click', () => this.stopRecording());
        }

        if (playRecordedBtn) {
            playRecordedBtn.addEventListener('click', () => this.playRecordedAudio());
        }

        // Language selection handling
        const outputLangSelect = document.getElementById('outputLanguage');
        if (outputLangSelect) {
            outputLangSelect.addEventListener('change', () => this.updateLanguageSettings());
        }

        // Initialize microphone access
        this.initializeMicrophone();
    }

    async initializeMicrophone() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.enableRecordingControls();
            // Stop the stream for now, we'll start it when recording
            stream.getTracks().forEach(track => track.stop());
        } catch (error) {
            console.error('Microphone access denied:', error);
            this.disableRecordingControls();
        }
    }

    enableRecordingControls() {
        const recordBtn = document.getElementById('recordBtn');
        const micStatus = document.getElementById('micStatus');
        
        if (recordBtn) {
            recordBtn.disabled = false;
            recordBtn.title = 'Start recording';
        }
        
        if (micStatus) {
            micStatus.textContent = '🎤 Microphone ready';
            micStatus.className = 'mic-status ready';
        }
    }

    disableRecordingControls() {
        const recordBtn = document.getElementById('recordBtn');
        const micStatus = document.getElementById('micStatus');
        
        if (recordBtn) {
            recordBtn.disabled = true;
            recordBtn.title = 'Microphone access required';
        }
        
        if (micStatus) {
            micStatus.textContent = '❌ Microphone access denied';
            micStatus.className = 'mic-status error';
        }
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus' // Fallback to supported format
            });
            
            this.audioChunks = [];
            
            this.mediaRecorder.addEventListener('dataavailable', (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            });
            
            this.mediaRecorder.addEventListener('stop', () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                this.handleRecordedAudio(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            });
            
            this.mediaRecorder.start();
            this.isRecording = true;
            this.updateRecordingUI();
            
        } catch (error) {
            console.error('Error starting recording:', error);
            this.showError('Failed to start recording. Please check microphone permissions.');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.updateRecordingUI();
        }
    }

    updateRecordingUI() {
        const recordBtn = document.getElementById('recordBtn');
        const stopRecordBtn = document.getElementById('stopRecordBtn');
        const recordingIndicator = document.getElementById('recordingIndicator');
        const micStatus = document.getElementById('micStatus');
        
        if (this.isRecording) {
            if (recordBtn) recordBtn.style.display = 'none';
            if (stopRecordBtn) stopRecordBtn.style.display = 'inline-block';
            if (recordingIndicator) recordingIndicator.style.display = 'block';
            if (micStatus) {
                micStatus.textContent = '🔴 Recording...';
                micStatus.className = 'mic-status recording';
            }
        } else {
            if (recordBtn) recordBtn.style.display = 'inline-block';
            if (stopRecordBtn) stopRecordBtn.style.display = 'none';
            if (recordingIndicator) recordingIndicator.style.display = 'none';
            if (micStatus) {
                micStatus.textContent = '🎤 Microphone ready';
                micStatus.className = 'mic-status ready';
            }
        }
    }

    handleRecordedAudio(audioBlob) {
        this.recordedAudioBlob = audioBlob;
        
        // Create audio URL for playback
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Update UI to show recorded audio
        const recordedAudioSection = document.getElementById('recordedAudioSection');
        if (recordedAudioSection) {
            recordedAudioSection.innerHTML = `
                <div class="recorded-audio-info">
                    <div class="audio-icon">🎵</div>
                    <div class="audio-details">
                        <div class="audio-name">Recorded Audio</div>
                        <div class="audio-duration">Duration: ${this.formatDuration(audioBlob.size)}</div>
                    </div>
                </div>
                <audio controls src="${audioUrl}"></audio>
            `;
            recordedAudioSection.style.display = 'block';
        }
        
        // Enable transcribe button
        const transcribeBtn = document.getElementById('transcribeBtn');
        if (transcribeBtn) {
            transcribeBtn.disabled = false;
            transcribeBtn.textContent = 'Transcribe Recorded Audio';
        }
        
        // Enable play button
        const playRecordedBtn = document.getElementById('playRecordedBtn');
        if (playRecordedBtn) {
            playRecordedBtn.disabled = false;
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
            if (this.validateAudioFile(files[0])) {
                document.getElementById('audioFile').files = files;
                this.displaySelectedFile(files[0]);
            } else {
                this.showError('Please select a valid audio file (MP3, WAV, M4A, FLAC, OGG).');
            }
        }
    }

    validateAudioFile(file) {
        const audioTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/flac', 'audio/ogg', 'audio/webm'];
        const audioExtensions = ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.webm'];
        
        return audioTypes.includes(file.type.toLowerCase()) || 
               audioExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    }

    displaySelectedFile(file) {
        const previewContainer = document.getElementById('filePreview');
        if (previewContainer) {
            previewContainer.innerHTML = `
                <div class="file-info">
                    <div class="file-icon">🎵</div>
                    <div class="file-details">
                        <div class="file-name">${file.name}</div>
                        <div class="file-size">${this.formatFileSize(file.size)}</div>
                        <div class="file-type">${file.type}</div>
                    </div>
                </div>
                <audio controls>
                    <source src="${URL.createObjectURL(file)}" type="${file.type}">
                    Your browser does not support the audio element.
                </audio>
            `;
            previewContainer.style.display = 'block';
        }

        // Enable transcribe button
        const transcribeBtn = document.getElementById('transcribeBtn');
        if (transcribeBtn) {
            transcribeBtn.disabled = false;
            transcribeBtn.textContent = 'Transcribe Audio File';
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDuration(bytes) {
        // Rough estimation based on file size (this is approximate)
        const estimatedSeconds = Math.floor(bytes / 16000); // Assuming 16kbps
        const minutes = Math.floor(estimatedSeconds / 60);
        const seconds = estimatedSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    async transcribeAudio() {
        const fileInput = document.getElementById('audioFile');
        const outputLanguage = document.getElementById('outputLanguage')?.value || 'en';
        const transcribeBtn = document.getElementById('transcribeBtn');

        let audioFile = null;
        
        // Check if we have a recorded audio or uploaded file
        if (this.recordedAudioBlob) {
            // Convert blob to file for upload
            audioFile = new File([this.recordedAudioBlob], 'recorded_audio.webm', { type: 'audio/webm' });
        } else if (fileInput?.files[0]) {
            audioFile = fileInput.files[0];
        }

        if (!audioFile) {
            this.showError('Please select an audio file or record audio first.');
            return;
        }

        // Show loading state
        if (transcribeBtn) {
            transcribeBtn.disabled = true;
            transcribeBtn.innerHTML = '<span class="loading-spinner"></span> Transcribing...';
        }

        this.showLoadingState();

        try {
            const formData = new FormData();
            formData.append('audio_file', audioFile);
            formData.append('output_language', outputLanguage);

            const apiKey = localStorage.getItem('MASTER_API_KEY') || window.UNIFIED_API_KEY;
            const response = await fetch(`${this.baseURL}/api/transcribe-audio`, {
                method: 'POST',
                headers: { ...(apiKey? {'x-api-key': apiKey}: {}) },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const raw = await response.json();
            const result = raw.data || raw;
            this.displayTranscriptionResults(result, outputLanguage);

        } catch (error) {
            console.error('Error transcribing audio:', error);
            this.showError('Failed to transcribe audio. Please try again.');
        } finally {
            // Reset button state
            if (transcribeBtn) {
                transcribeBtn.disabled = false;
                transcribeBtn.innerHTML = '🎵 Transcribe Audio';
            }
            this.hideLoadingState();
        }
    }

    displayTranscriptionResults(result, targetLanguage) {
        const resultsContainer = document.getElementById('transcriptionResults');
        if (!resultsContainer) return;
        const transcription = result.transcribed_text || result.transcription || result.text || 'Transcription not available';
        const translatedText = result.translated_text || null;
        const detectedLanguage = result.detected_language || 'auto';
        const languageName = this.getLanguageName(targetLanguage);
        const audioUrl = result.audio_url ? (result.audio_url.startsWith('http') ? result.audio_url : `${this.baseURL}${result.audio_url}`) : null;

        this.currentTranscription = {
            original: transcription,
            translated: translatedText,
            detectedLanguage,
            targetLanguage,
            audioUrl
        };

        resultsContainer.innerHTML = `
            <div class="transcription-result">
                <div class="result-header">
                    <h3>🎵 Transcription Results</h3>
                    <div class="transcription-timestamp">${new Date().toLocaleString()}</div>
                </div>
                <div class="transcription-section">
                    <div class="language-info">
                        <div class="detected-language">
                            <span class="language-label">Detected:</span>
                            <span class="language-value">${this.getLanguageName(detectedLanguage)}</span>
                        </div>
                        ${translatedText ? `
                        <div class="translation-arrow">→</div>
                        <div class="target-language">
                            <span class="language-label">Translated to:</span>
                            <span class="language-value">${languageName}</span>
                        </div>` : ''}
                    </div>
                </div>
                <div class="text-results">
                    <div class="text-panel transcription-panel">
                        <div class="panel-header">
                            <h4>📝 Transcription</h4>
                            <div class="text-actions">
                                <button onclick="speechToTextAPI.speakText('${transcription.replace(/'/g, "\\'")}', '${detectedLanguage}')" class="speak-btn" title="Speak transcription">🔊</button>
                                <button onclick="speechToTextAPI.copyText('${transcription.replace(/'/g, "\\'")}', 'transcription')" class="copy-btn" title="Copy transcription">📋</button>
                            </div>
                        </div>
                        <div class="text-content transcription-text">${this.formatText(transcription)}</div>
                        <div class="text-stats"><span class="word-count">Words: ${this.countWords(transcription)}</span><span class="char-count">Characters: ${transcription.length}</span></div>
                    </div>
                    ${translatedText ? `
                    <div class="text-panel translation-panel">
                        <div class="panel-header">
                            <h4>🌍 Translation</h4>
                            <div class="text-actions">
                                <button onclick="speechToTextAPI.speakText('${translatedText.replace(/'/g, "\\'")}', '${targetLanguage}')" class="speak-btn" title="Speak translation">🔊</button>
                                <button onclick="speechToTextAPI.copyText('${translatedText.replace(/'/g, "\\'")}', 'translation')" class="copy-btn" title="Copy translation">📋</button>
                            </div>
                        </div>
                        <div class="text-content translation-text">${this.formatText(translatedText)}</div>
                        <div class="text-stats"><span class="word-count">Words: ${this.countWords(translatedText)}</span><span class="char-count">Characters: ${translatedText.length}</span></div>
                    </div>` : ''}
                </div>
                ${audioUrl ? `
                <div class="audio-section">
                    <h4>🔊 Audio Playback</h4>
                    <div class="audio-player">
                        <audio controls><source src="${audioUrl}" type="audio/mpeg" />Your browser does not support the audio element.</audio>
                        <a href="${audioUrl}" download class="download-btn">📥 Download Audio</a>
                    </div>
                </div>` : ''}
                <div class="result-actions">
                    <button onclick="speechToTextAPI.exportTranscription()" class="action-btn export-btn">📄 Export Transcription</button>
                    <button onclick="speechToTextAPI.shareTranscription()" class="action-btn share-btn">📤 Share Results</button>
                    <button onclick="speechToTextAPI.saveTranscription()" class="action-btn save-btn">💾 Save Results</button>
                </div>
            </div>`;

        resultsContainer.style.display = 'block';
        resultsContainer.scrollIntoView({ behavior: 'smooth' });
    }

    formatText(text) {
        // Convert URLs to links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        text = text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
        
        // Convert line breaks to HTML
        text = text.replace(/\n/g, '<br>');
        
        return text;
    }

    countWords(text) {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    getLanguageName(code) {
        const languages = {
            'en': 'English',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'it': 'Italian',
            'pt': 'Portuguese',
            'ru': 'Russian',
            'ja': 'Japanese',
            'ko': 'Korean',
            'zh': 'Chinese',
            'ar': 'Arabic',
            'hi': 'Hindi',
            'nl': 'Dutch',
            'sv': 'Swedish',
            'no': 'Norwegian',
            'da': 'Danish',
            'fi': 'Finnish',
            'pl': 'Polish',
            'tr': 'Turkish',
            'he': 'Hebrew'
        };
        return languages[code] || code.toUpperCase();
    }

    speakText(text, language) {
        if ('speechSynthesis' in window) {
            // Stop any current speech
            speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = this.getSpeechLang(language);
            utterance.rate = 0.8;
            utterance.pitch = 1;
            utterance.volume = 1;
            
            speechSynthesis.speak(utterance);
        } else {
            alert('Text-to-speech is not supported in your browser.');
        }
    }

    getSpeechLang(languageCode) {
        const speechLangs = {
            'en': 'en-US',
            'es': 'es-ES',
            'fr': 'fr-FR',
            'de': 'de-DE',
            'it': 'it-IT',
            'pt': 'pt-PT',
            'ru': 'ru-RU',
            'ja': 'ja-JP',
            'ko': 'ko-KR',
            'zh': 'zh-CN',
            'ar': 'ar-SA',
            'hi': 'hi-IN',
            'nl': 'nl-NL',
            'sv': 'sv-SE',
            'no': 'no-NO',
            'da': 'da-DK',
            'fi': 'fi-FI',
            'pl': 'pl-PL',
            'tr': 'tr-TR',
            'he': 'he-IL'
        };
        return speechLangs[languageCode] || 'en-US';
    }

    copyText(text, type) {
        navigator.clipboard.writeText(text).then(() => {
            this.showSuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} copied to clipboard!`);
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showSuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} copied to clipboard!`);
        });
    }

    exportTranscription() {
        if (!this.currentTranscription) {
            this.showError('No transcription to export.');
            return;
        }

        const exportData = {
            timestamp: new Date().toISOString(),
            transcription: {
                text: this.currentTranscription.original,
                language: this.currentTranscription.detectedLanguage,
                word_count: this.countWords(this.currentTranscription.original),
                character_count: this.currentTranscription.original.length
            }
        };

        if (this.currentTranscription.translated) {
            exportData.translation = {
                text: this.currentTranscription.translated,
                language: this.currentTranscription.targetLanguage,
                word_count: this.countWords(this.currentTranscription.translated),
                character_count: this.currentTranscription.translated.length
            };
        }

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `transcription_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    shareTranscription() {
        if (!this.currentTranscription) {
            this.showError('No transcription to share.');
            return;
        }

        let shareText = `Transcription (${this.getLanguageName(this.currentTranscription.detectedLanguage)}):\n${this.currentTranscription.original}`;
        
        if (this.currentTranscription.translated) {
            shareText += `\n\nTranslation (${this.getLanguageName(this.currentTranscription.targetLanguage)}):\n${this.currentTranscription.translated}`;
        }
        
        if (navigator.share) {
            navigator.share({
                title: 'Audio Transcription Results',
                text: shareText,
            }).catch(err => console.log('Error sharing:', err));
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(shareText).then(() => {
                this.showSuccess('Transcription copied to clipboard for sharing!');
            }).catch(() => {
                this.showError('Failed to copy transcription. Please select and copy manually.');
            });
        }
    }

    saveTranscription() {
        if (!this.currentTranscription) {
            this.showError('No transcription to save.');
            return;
        }

        let saveText = `AUDIO TRANSCRIPTION RESULTS\n`;
        saveText += `Generated: ${new Date().toLocaleString()}\n\n`;
        saveText += `TRANSCRIPTION (${this.getLanguageName(this.currentTranscription.detectedLanguage)}):\n`;
        saveText += `${this.currentTranscription.original}\n\n`;
        
        if (this.currentTranscription.translated) {
            saveText += `TRANSLATION (${this.getLanguageName(this.currentTranscription.targetLanguage)}):\n`;
            saveText += `${this.currentTranscription.translated}\n\n`;
        }
        
        saveText += `STATISTICS:\n`;
        saveText += `- Transcription words: ${this.countWords(this.currentTranscription.original)}\n`;
        saveText += `- Transcription characters: ${this.currentTranscription.original.length}\n`;
        
        if (this.currentTranscription.translated) {
            saveText += `- Translation words: ${this.countWords(this.currentTranscription.translated)}\n`;
            saveText += `- Translation characters: ${this.currentTranscription.translated.length}\n`;
        }

        const blob = new Blob([saveText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `transcription_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    playRecordedAudio() {
        if (this.recordedAudioBlob) {
            const audioUrl = URL.createObjectURL(this.recordedAudioBlob);
            const audio = new Audio(audioUrl);
            audio.play().catch(error => {
                console.error('Error playing audio:', error);
                this.showError('Failed to play recorded audio.');
            });
        }
    }

    clearAll() {
        const fileInput = document.getElementById('audioFile');
        const resultsContainer = document.getElementById('transcriptionResults');
        const filePreview = document.getElementById('filePreview');
        const recordedAudioSection = document.getElementById('recordedAudioSection');
        const transcribeBtn = document.getElementById('transcribeBtn');
        
        if (fileInput) {
            fileInput.value = '';
        }
        
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
            resultsContainer.innerHTML = '';
        }
        
        if (filePreview) {
            filePreview.style.display = 'none';
            filePreview.innerHTML = '';
        }
        
        if (recordedAudioSection) {
            recordedAudioSection.style.display = 'none';
            recordedAudioSection.innerHTML = '';
        }
        
        if (transcribeBtn) {
            transcribeBtn.disabled = true;
            transcribeBtn.textContent = 'Select Audio to Transcribe';
        }

        // Clear recorded audio
        this.recordedAudioBlob = null;
        this.currentTranscription = null;
        
        // Reset recording controls
        const playRecordedBtn = document.getElementById('playRecordedBtn');
        if (playRecordedBtn) {
            playRecordedBtn.disabled = true;
        }
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

    showSuccess(message) {
        const successDiv = document.getElementById('successMessage');
        if (successDiv) {
            successDiv.textContent = message;
            successDiv.style.display = 'block';
            setTimeout(() => {
                successDiv.style.display = 'none';
            }, 3000);
        } else {
            // Create temporary success message
            const tempDiv = document.createElement('div');
            tempDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #4CAF50; color: white; padding: 10px 20px; border-radius: 5px; z-index: 1000;';
            tempDiv.textContent = message;
            document.body.appendChild(tempDiv);
            setTimeout(() => {
                document.body.removeChild(tempDiv);
            }, 3000);
        }
    }

    updateLanguageSettings() {
        const outputLang = document.getElementById('outputLanguage')?.value;
        
        console.log('Language settings updated:', { outputLang });
        // Store language preferences in localStorage
        if (outputLang) localStorage.setItem('speechToText_outputLang', outputLang);
    }

    // Initialize settings from localStorage
    initializeSettings() {
        const outputLang = localStorage.getItem('speechToText_outputLang');
        
        if (outputLang) {
            const outputSelect = document.getElementById('outputLanguage');
            if (outputSelect) outputSelect.value = outputLang;
        }
    }
}

// Initialize the API integration when the page loads
let speechToTextAPI;
document.addEventListener('DOMContentLoaded', () => {
    speechToTextAPI = new SpeechToTextAPI();
    speechToTextAPI.initializeSettings();
});

// Export for use in HTML
window.speechToTextAPI = speechToTextAPI;