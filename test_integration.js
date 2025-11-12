// Integration test for the three problematic screens
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const BASE_URL = 'http://localhost:5001/api';

async function testTextToSpeech() {
    console.log('\n=== Testing Text-to-Speech ===');
    try {
        // Test translation
        const translationResponse = await axios.post(`${BASE_URL}/translate`, {
            text: 'Hello world',
            targetLanguage: 'Spanish'
        });
        console.log('✓ Translation API:', translationResponse.data);

        // Test TTS if translation succeeded
        if (translationResponse.data.translatedText) {
            const ttsResponse = await axios.post(`${BASE_URL}/translation/text-to-speech`, {
                text: translationResponse.data.translatedText,
                language: 'Spanish'
            });
            console.log('✓ TTS API:', ttsResponse.data.success ? 'Audio generated successfully' : 'TTS failed');
        }
    } catch (error) {
        console.log('✗ Text-to-Speech Error:', error.response?.data || error.message);
    }
}

async function testSpeechToText() {
    console.log('\n=== Testing Speech-to-Text ===');
    try {
        // Check if transcription endpoint is available
        const response = await axios.get(`${BASE_URL}/transcription`);
        console.log('✓ Transcription API Available:', response.data);
    } catch (error) {
        console.log('✗ Speech-to-Text Error:', error.response?.data || error.message);
    }
}

async function testOrganAnalyzer() {
    console.log('\n=== Testing Organ Analyzer ===');
    try {
        // Test organ analyzer endpoint (expect error without image)
        const formData = new FormData();
        formData.append('organType', 'heart');
        
        const response = await axios.post(`${BASE_URL}/organ-analyzer/analyze`, formData, {
            headers: formData.getHeaders()
        });
        console.log('✓ Organ Analyzer API:', response.data);
    } catch (error) {
        const errorData = error.response?.data;
        if (errorData && errorData.error && errorData.error.message === "No image uploaded") {
            console.log('✓ Organ Analyzer API: Available (expected error without image)');
        } else {
            console.log('✗ Organ Analyzer Error:', errorData || error.message);
        }
    }
}

async function testServerHealth() {
    console.log('\n=== Testing Server Health ===');
    try {
        const response = await axios.get(`${BASE_URL}/health`);
        console.log('✓ Server Health:', response.data);
    } catch (error) {
        try {
            // Try basic connection
            const basicResponse = await axios.get('http://localhost:5001');
            console.log('✓ Server is running on port 5001');
        } catch (basicError) {
            console.log('✗ Server not responding:', basicError.message);
        }
    }
}

async function runAllTests() {
    console.log('Starting Integration Tests...\n');
    
    await testServerHealth();
    await testTextToSpeech();
    await testSpeechToText();
    await testOrganAnalyzer();
    
    console.log('\n=== Test Summary ===');
    console.log('All API endpoints tested. Check logs above for specific issues.');
}

runAllTests().catch(console.error);