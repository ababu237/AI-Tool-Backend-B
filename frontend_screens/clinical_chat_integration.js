// Clinical Chat API Integration
// This file handles the frontend API integration for clinical_chat.html

class ClinicalChatAPI {
    constructor() {
        const metaOrigin = document.querySelector('meta[name="backend-origin"]');
        this.baseURL = (window.API_ORIGIN || metaOrigin?.content || window.location.origin).replace(/\/$/, '');
        this.conversationHistory = [];
        this.currentSessionId = this.generateSessionId();
        this.initializeEventListeners();
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    initializeEventListeners() {
        // Work with existing HTML structure
        const messageInput = document.getElementById('messageInput');
        
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        // Initialize chat
        this.initializeChat();
    }

    handleFormSubmit(event) {
        event.preventDefault();
        this.sendMessage();
    }

    handleInputChange() {
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        
        if (sendBtn && messageInput) {
            sendBtn.disabled = messageInput.value.trim().length === 0;
        }
    }

    initializeChat() {
        const chatContainer = document.getElementById('chatContainer');
        if (chatContainer) {
            this.addMessage('assistant', 'Hello! I\'m your AI medical assistant. How can I help you today?', true);
        }
    }

    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const chatMessages = document.getElementById('chatMessages');

        if (!messageInput || !messageInput.value.trim()) {
            return;
        }

        const userMessage = messageInput.value.trim();
        
        // Remove welcome message if it exists
        const welcomeMessage = chatMessages.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        // Add user message with existing styling
        this.addMessageToChat('user', userMessage);
        
        // Clear input
        messageInput.value = '';

        try {
            // Backend expects 'query' and 'output_language'
            const apiKey = localStorage.getItem('MASTER_API_KEY') || window.UNIFIED_API_KEY;
            const response = await fetch(`${this.baseURL}/clinical/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(apiKey? {'x-api-key': apiKey }: {})
                },
                body: JSON.stringify({ prompt: userMessage, output_language: 'en' })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            // Prefer translated_response provided by backend
            const data = result.data || result;
            const responseText = data.translated_response || data.response || data.answer || 'I received your message.';
            this.addMessageToChat('assistant', responseText);

            // If audio_url present, append an audio message unobtrusively
            if (data.audio_url) {
                this.addInlineAudio(data.audio_url);
            }

            // Optionally could use conversation_history later if needed

        } catch (error) {
            console.error('Error sending message:', error);
            this.addMessageToChat('assistant', 'I apologize, but I\'m having trouble processing your request right now. Please try again.');
        }
    }

    addInlineAudio(audioUrl) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;
        // Expect audioUrl like /get_audio/<filename>
        const fullUrl = audioUrl.startsWith('http') ? audioUrl : `${this.baseURL}${audioUrl}`;
        const wrapper = document.createElement('div');
        wrapper.className = 'message assistant';
        wrapper.innerHTML = `
            <div class="message-avatar">AI</div>
            <div class="message-content">
                <p class="message-text">
                    <audio controls style="max-width:240px;">
                        <source src="${fullUrl}" type="audio/mpeg" />
                        Your browser does not support the audio element.
                    </audio>
                </p>
                <div class="message-time">${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
            </div>`;
        chatMessages.appendChild(wrapper);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    addMessageToChat(sender, text) {
        const chatMessages = document.getElementById('chatMessages');
        const currentTime = new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        });

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        if (sender === 'user') {
            messageDiv.innerHTML = `
                <div class="message-content">
                    <p class="message-text">${text}</p>
                    <div class="message-time">${currentTime}</div>
                </div>
                <div class="message-avatar">U</div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="message-avatar">AI</div>
                <div class="message-content">
                    <p class="message-text">${text}</p>
                    <div class="message-time">${currentTime}</div>
                </div>
            `;
        }
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    addMessage(sender, text, isWelcome = false, isError = false) {
        const chatContainer = document.getElementById('chatContainer');
        if (!chatContainer) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message ${isError ? 'error-message' : ''}`;
        
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.innerHTML = `
            <div class="message-header">
                <div class="message-sender">
                    ${sender === 'user' ? '👤 You' : '🏥 Medical Assistant'}
                </div>
                <div class="message-time">${timestamp}</div>
            </div>
            <div class="message-content">
                ${this.formatMessageText(text)}
            </div>
            ${!isWelcome && !isError ? `
                <div class="message-actions">
                    <button onclick="clinicalChatAPI.copyMessage(this)" class="action-btn copy-btn" title="Copy message">
                        📋
                    </button>
                    ${sender === 'assistant' ? `
                        <button onclick="clinicalChatAPI.speakMessage(this)" class="action-btn speak-btn" title="Read aloud">
                            🔊
                        </button>
                    ` : ''}
                </div>
            ` : ''}
        `;

        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    addAudioMessage(audioFilename) {
        const chatContainer = document.getElementById('chatContainer');
        if (!chatContainer) return;

        const audioDiv = document.createElement('div');
        audioDiv.className = 'message assistant-message audio-message';
        
        audioDiv.innerHTML = `
            <div class="message-header">
                <div class="message-sender">🔊 Audio Response</div>
                <div class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            <div class="message-content">
                <div class="audio-player">
                    <audio controls>
                        <source src="${this.baseURL}/get_audio/${audioFilename}" type="audio/mpeg">
                        Your browser does not support the audio element.
                    </audio>
                    <a href="${this.baseURL}/get_audio/${audioFilename}" download="${audioFilename}" class="download-btn">
                        📥 Download
                    </a>
                </div>
            </div>
        `;

        chatContainer.appendChild(audioDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    formatMessageText(text) {
        // Convert URLs to links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        text = text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
        
        // Convert line breaks to HTML
        text = text.replace(/\n/g, '<br>');
        
        // Highlight medical terms (basic implementation)
        const medicalTerms = ['diagnosis', 'symptoms', 'treatment', 'medication', 'dosage', 'condition', 'prescription'];
        medicalTerms.forEach(term => {
            const regex = new RegExp(`\\b${term}\\b`, 'gi');
            text = text.replace(regex, `<span class="medical-term">$&</span>`);
        });
        
        return text;
    }

    showTypingIndicator() {
        const chatContainer = document.getElementById('chatContainer');
        if (!chatContainer) return;

        const typingDiv = document.createElement('div');
        typingDiv.id = 'typingIndicator';
        typingDiv.className = 'message assistant-message typing-indicator';
        typingDiv.innerHTML = `
            <div class="message-header">
                <div class="message-sender">🏥 Medical Assistant</div>
            </div>
            <div class="message-content">
                <div class="typing-animation">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                <span class="typing-text">Thinking...</span>
            </div>
        `;

        chatContainer.appendChild(typingDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    clearChat() {
        const chatContainer = document.getElementById('chatContainer');
        if (chatContainer) {
            chatContainer.innerHTML = '';
            this.conversationHistory = [];
            this.currentSessionId = this.generateSessionId();
            this.initializeChat();
            this.updateConversationStats();
        }
    }

    copyMessage(buttonElement) {
        const messageContent = buttonElement.closest('.message').querySelector('.message-content').innerText;
        navigator.clipboard.writeText(messageContent).then(() => {
            const originalText = buttonElement.innerHTML;
            buttonElement.innerHTML = '✅';
            setTimeout(() => {
                buttonElement.innerHTML = originalText;
            }, 2000);
        }).catch(() => {
            alert('Failed to copy message. Please select and copy manually.');
        });
    }

    speakMessage(buttonElement) {
        const messageContent = buttonElement.closest('.message').querySelector('.message-content').innerText;
        
        if ('speechSynthesis' in window) {
            // Stop any current speech
            speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(messageContent);
            utterance.rate = 0.8;
            utterance.pitch = 1;
            utterance.volume = 1;
            
            utterance.onstart = () => {
                buttonElement.innerHTML = '⏹️';
                buttonElement.title = 'Stop reading';
            };
            
            utterance.onend = () => {
                buttonElement.innerHTML = '🔊';
                buttonElement.title = 'Read aloud';
            };
            
            if (speechSynthesis.speaking) {
                speechSynthesis.cancel();
            } else {
                speechSynthesis.speak(utterance);
            }
        } else {
            alert('Text-to-speech is not supported in your browser.');
        }
    }

    toggleVoiceInput() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            if (!this.recognition) {
                this.initializeVoiceRecognition();
            }
            
            if (this.isListening) {
                this.stopVoiceInput();
            } else {
                this.startVoiceInput();
            }
        } else {
            alert('Voice input is not supported in your browser.');
        }
    }

    initializeVoiceRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
            this.isListening = true;
            const voiceBtn = document.getElementById('voiceBtn');
            if (voiceBtn) {
                voiceBtn.innerHTML = '🔴';
                voiceBtn.title = 'Stop recording';
            }
        };

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const messageInput = document.getElementById('messageInput');
            if (messageInput) {
                messageInput.value = transcript;
                this.handleInputChange();
            }
        };

        this.recognition.onend = () => {
            this.isListening = false;
            const voiceBtn = document.getElementById('voiceBtn');
            if (voiceBtn) {
                voiceBtn.innerHTML = '🎤';
                voiceBtn.title = 'Voice input';
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.showError('Voice recognition failed. Please try again.');
        };
    }

    startVoiceInput() {
        if (this.recognition) {
            this.recognition.start();
        }
    }

    stopVoiceInput() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }

    updateConversationStats() {
        const statsContainer = document.getElementById('conversationStats');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="stat-item">
                    <span class="stat-label">Messages:</span>
                    <span class="stat-value">${this.conversationHistory.length}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Session:</span>
                    <span class="stat-value">${this.currentSessionId.split('_')[1]}</span>
                </div>
            `;
        }
    }

    updateLanguageSettings() {
        const outputLang = document.getElementById('outputLanguage')?.value;
        
        console.log('Language settings updated:', { outputLang });
        // Store language preferences in localStorage
        if (outputLang) localStorage.setItem('clinicalChat_outputLang', outputLang);
    }

    exportConversation() {
        if (this.conversationHistory.length === 0) {
            alert('No conversation to export.');
            return;
        }

        const conversationText = this.conversationHistory.map(msg => 
            `[${new Date(msg.timestamp).toLocaleString()}]\nUser: ${msg.user_message}\nAssistant: ${msg.assistant_response}\n\n`
        ).join('');

        const blob = new Blob([conversationText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `clinical_chat_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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

    // Initialize language settings from localStorage
    initializeLanguageSettings() {
        const outputLang = localStorage.getItem('clinicalChat_outputLang');
        
        if (outputLang) {
            const outputSelect = document.getElementById('outputLanguage');
            if (outputSelect) outputSelect.value = outputLang;
        }
    }
}

// Initialize the API integration when the page loads
let clinicalChatAPI;
document.addEventListener('DOMContentLoaded', () => {
    clinicalChatAPI = new ClinicalChatAPI();
    clinicalChatAPI.initializeLanguageSettings();
});

// Export for use in HTML
window.clinicalChatAPI = clinicalChatAPI;