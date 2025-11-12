// Text to Speech API Integration
// This file handles the frontend API integration for text_to_speech.html

class TextToSpeechAPI {
    constructor() {
        const metaOrigin = document.querySelector('meta[name="backend-origin"]');
        this.baseURL = (window.API_ORIGIN || metaOrigin?.content || window.location.origin).replace(/\/$/, '');
        this.currentTranslation = null;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Form handling
        const translateForm = document.getElementById('translateForm');
        const textInput = document.getElementById('textInput');
        const translateBtn = document.getElementById('translateBtn');
        const clearBtn = document.getElementById('clearBtn');
        const speakOriginalBtn = document.getElementById('speakOriginalBtn');
        const speakTranslatedBtn = document.getElementById('speakTranslatedBtn');

        if (translateForm) {
            translateForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        if (translateBtn) {
            translateBtn.addEventListener('click', () => this.translateText());
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAll());
        }

        if (speakOriginalBtn) {
            speakOriginalBtn.addEventListener('click', () => this.speakOriginalText());
        }

        if (speakTranslatedBtn) {
            speakTranslatedBtn.addEventListener('click', () => this.speakTranslatedText());
        }

        if (textInput) {
            textInput.addEventListener('input', () => this.handleTextInputChange());
            textInput.addEventListener('paste', () => {
                setTimeout(() => this.handleTextInputChange(), 100);
            });
        }

        // Language selection handling
        const outputLangSelect = document.getElementById('outputLanguage');
        if (outputLangSelect) {
            outputLangSelect.addEventListener('change', () => this.updateLanguageSettings());
        }

        // Voice settings
        const voiceSelect = document.getElementById('voiceSelect');
        if (voiceSelect) {
            voiceSelect.addEventListener('change', () => this.updateVoiceSettings());
        }

        // Initialize voice options
        this.initializeVoiceOptions();
    }

    handleFormSubmit(event) {
        event.preventDefault();
        this.translateText();
    }

    handleTextInputChange() {
        const textInput = document.getElementById('textInput');
        const translateBtn = document.getElementById('translateBtn');
        const charCount = document.getElementById('charCount');
        const speakOriginalBtn = document.getElementById('speakOriginalBtn');
        
        if (textInput) {
            const textLength = textInput.value.length;
            const hasText = textLength > 0;
            
            if (translateBtn) {
                translateBtn.disabled = !hasText;
            }
            
            if (speakOriginalBtn) {
                speakOriginalBtn.disabled = !hasText;
            }
            
            if (charCount) {
                charCount.textContent = `${textLength} characters`;
                charCount.className = textLength > 5000 ? 'char-count warning' : 'char-count';
            }
        }
    }

    async translateText() {
        const textInput = document.getElementById('textInput');
        const outputLanguage = document.getElementById('outputLanguage')?.value || 'es';
        const translateBtn = document.getElementById('translateBtn');

        if (!textInput || !textInput.value.trim()) {
            this.showError('Please enter text to translate.');
            return;
        }

        const text = textInput.value.trim();

        // Show loading state
        if (translateBtn) {
            translateBtn.disabled = true;
            translateBtn.innerHTML = '<span class="loading-spinner"></span> Translating...';
        }

        this.showLoadingState();

        try {
            const apiKey = localStorage.getItem('MASTER_API_KEY') || window.UNIFIED_API_KEY;
            const response = await fetch(`${this.baseURL}/translation/translate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(apiKey? {'x-api-key': apiKey}: {}) },
                body: JSON.stringify({ text, target_language: outputLanguage })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const raw = await response.json();
            const result = raw.data || raw;
            this.displayTranslationResults(result, text, outputLanguage);

        } catch (error) {
            console.error('Error translating text:', error);
            this.showError('Failed to translate text. Please try again.');
        } finally {
            // Reset button state
            if (translateBtn) {
                translateBtn.disabled = false;
                translateBtn.innerHTML = '🌐 Translate Text';
            }
            this.hideLoadingState();
        }
    }

    displayTranslationResults(result, originalText, targetLanguage) {
        const resultsContainer = document.getElementById('translationResults');
        if (!resultsContainer) return;
        const translatedText = result.translated_text || result.translation || 'Translation not available';
        const languageName = this.getLanguageName(targetLanguage);
        const audioUrl = result.audio_url ? (result.audio_url.startsWith('http') ? result.audio_url : `${this.baseURL}${result.audio_url}`) : null;

        this.currentTranslation = {
            original: originalText,
            translated: translatedText,
            targetLanguage,
            audioUrl
        };

        resultsContainer.innerHTML = `
            <div class="translation-result">
                <div class="result-header">
                    <h3>🌐 Translation Results</h3>
                    <div class="translation-timestamp">${new Date().toLocaleString()}</div>
                </div>
                <div class="translation-section">
                    <div class="language-info">
                        <div class="target-language">
                            <span class="language-label">Target:</span>
                            <span class="language-value">${languageName}</span>
                        </div>
                    </div>
                </div>
                <div class="text-comparison">
                    <div class="text-panel original-panel">
                        <div class="panel-header">
                            <h4>📝 Original Text</h4>
                            <button onclick="textToSpeechAPI.speakText('${originalText.replace(/'/g, "\\'")}', 'auto')" class="speak-btn" title="Speak original text">🔊</button>
                        </div>
                        <div class="text-content original-text">${this.formatText(originalText)}</div>
                    </div>
                    <div class="text-panel translated-panel">
                        <div class="panel-header">
                            <h4>🌍 Translated Text</h4>
                            <button onclick="textToSpeechAPI.speakText('${translatedText.replace(/'/g, "\\'")}', '${targetLanguage}')" class="speak-btn" title="Speak translated text">🔊</button>
                        </div>
                        <div class="text-content translated-text">${this.formatText(translatedText)}</div>
                    </div>
                </div>
                ${audioUrl ? `
                <div class="audio-section">
                    <h4>🎵 Generated Audio</h4>
                    <div class="audio-player">
                        <audio controls><source src="${audioUrl}" type="audio/mpeg" />Your browser does not support the audio element.</audio>
                        <a href="${audioUrl}" download class="download-btn">📥 Download Audio</a>
                    </div>
                </div>` : ''}
                <div class="result-actions">
                    <button onclick="textToSpeechAPI.copyTranslation()" class="action-btn copy-btn">📋 Copy Translation</button>
                    <button onclick="textToSpeechAPI.shareTranslation()" class="action-btn share-btn">📤 Share Translation</button>
                    <button onclick="textToSpeechAPI.saveTranslation()" class="action-btn save-btn">💾 Save Translation</button>
                </div>
            </div>`;

        resultsContainer.style.display = 'block';
        resultsContainer.scrollIntoView({ behavior: 'smooth' });

        // Enable speak buttons
        const speakTranslatedBtn = document.getElementById('speakTranslatedBtn');
        if (speakTranslatedBtn) {
            speakTranslatedBtn.disabled = false;
        }
    }

    formatText(text) {
        // Convert URLs to links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        text = text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
        
        // Convert line breaks to HTML
        text = text.replace(/\n/g, '<br>');
        
        return text;
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
            
            // Try to use the selected voice
            const voiceSelect = document.getElementById('voiceSelect');
            if (voiceSelect && voiceSelect.value) {
                const voices = speechSynthesis.getVoices();
                const selectedVoice = voices.find(voice => voice.name === voiceSelect.value);
                if (selectedVoice) {
                    utterance.voice = selectedVoice;
                }
            }
            
            speechSynthesis.speak(utterance);
        } else {
            alert('Text-to-speech is not supported in your browser.');
        }
    }

    speakOriginalText() {
        const textInput = document.getElementById('textInput');
        if (textInput && textInput.value.trim()) {
            const detectedLang = this.currentTranslation?.detectedLanguage || 'en';
            this.speakText(textInput.value.trim(), detectedLang);
        }
    }

    speakTranslatedText() {
        if (this.currentTranslation) {
            this.speakText(this.currentTranslation.translated, this.currentTranslation.targetLanguage);
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

    initializeVoiceOptions() {
        const voiceSelect = document.getElementById('voiceSelect');
        if (!voiceSelect) return;

        const populateVoices = () => {
            const voices = speechSynthesis.getVoices();
            voiceSelect.innerHTML = '<option value="">Default Voice</option>';
            
            voices.forEach(voice => {
                const option = document.createElement('option');
                option.value = voice.name;
                option.textContent = `${voice.name} (${voice.lang})`;
                voiceSelect.appendChild(option);
            });
        };

        // Populate voices when they become available
        if (speechSynthesis.getVoices().length > 0) {
            populateVoices();
        } else {
            speechSynthesis.addEventListener('voiceschanged', populateVoices);
        }
    }

    copyTranslation() {
        if (!this.currentTranslation) {
            this.showError('No translation to copy.');
            return;
        }

        const textToCopy = this.currentTranslation.translated;
        navigator.clipboard.writeText(textToCopy).then(() => {
            this.showSuccess('Translation copied to clipboard!');
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = textToCopy;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showSuccess('Translation copied to clipboard!');
        });
    }

    shareTranslation() {
        if (!this.currentTranslation) {
            this.showError('No translation to share.');
            return;
        }

        const shareText = `Original (${this.getLanguageName(this.currentTranslation.detectedLanguage)}): ${this.currentTranslation.original}\n\nTranslation (${this.getLanguageName(this.currentTranslation.targetLanguage)}): ${this.currentTranslation.translated}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Translation Results',
                text: shareText,
            }).catch(err => console.log('Error sharing:', err));
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(shareText).then(() => {
                this.showSuccess('Translation copied to clipboard for sharing!');
            }).catch(() => {
                this.showError('Failed to copy translation. Please select and copy manually.');
            });
        }
    }

    saveTranslation() {
        if (!this.currentTranslation) {
            this.showError('No translation to save.');
            return;
        }

        const saveData = {
            timestamp: new Date().toISOString(),
            original: {
                text: this.currentTranslation.original,
                language: this.currentTranslation.detectedLanguage
            },
            translation: {
                text: this.currentTranslation.translated,
                language: this.currentTranslation.targetLanguage
            }
        };

        const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `translation_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    clearAll() {
        const textInput = document.getElementById('textInput');
        const resultsContainer = document.getElementById('translationResults');
        const charCount = document.getElementById('charCount');
        
        if (textInput) {
            textInput.value = '';
            textInput.focus();
        }
        
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
            resultsContainer.innerHTML = '';
        }
        
        if (charCount) {
            charCount.textContent = '0 characters';
            charCount.className = 'char-count';
        }

        this.currentTranslation = null;
        this.handleTextInputChange();
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
        if (outputLang) localStorage.setItem('textToSpeech_outputLang', outputLang);
    }

    updateVoiceSettings() {
        const voice = document.getElementById('voiceSelect')?.value;
        
        console.log('Voice settings updated:', { voice });
        // Store voice preferences in localStorage
        if (voice) localStorage.setItem('textToSpeech_voice', voice);
    }

    // Initialize settings from localStorage
    initializeSettings() {
        const outputLang = localStorage.getItem('textToSpeech_outputLang');
        const voice = localStorage.getItem('textToSpeech_voice');
        
        if (outputLang) {
            const outputSelect = document.getElementById('outputLanguage');
            if (outputSelect) outputSelect.value = outputLang;
        }
        
        if (voice) {
            const voiceSelect = document.getElementById('voiceSelect');
            if (voiceSelect) voiceSelect.value = voice;
        }
    }
}

// Initialize the API integration when the page loads
let textToSpeechAPI;
document.addEventListener('DOMContentLoaded', () => {
    textToSpeechAPI = new TextToSpeechAPI();
    textToSpeechAPI.initializeSettings();
});

// Export for use in HTML
window.textToSpeechAPI = textToSpeechAPI;