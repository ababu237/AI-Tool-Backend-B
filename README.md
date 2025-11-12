# AI Healthcare Assistant Tool Stack

A comprehensive healthcare AI platform featuring medical image analysis, clinical chat, document analysis, speech-to-text, and text-to-speech capabilities.

## 🌟 Features

### 1. **Organ Analyzer**
- Advanced medical image analysis using PyTorch deep learning models (ResNet50, VGG16, InceptionV3)
- Supports multiple organs: Knee, Lung, Heart, Brain, Liver
- Provides detailed diagnosis, findings, symptoms, precautions, and treatment recommendations
- Multi-language support

### 2. **Clinical Chat Assistant**
- AI-powered medical consultation chatbot
- Natural language processing for healthcare queries
- Context-aware responses

### 3. **Document Analyzer**
- Medical document processing and analysis
- Extract insights from healthcare reports
- Summarization capabilities

### 4. **Speech-to-Text**
- Real-time audio transcription
- Medical terminology recognition
- Multi-language support

### 5. **Text-to-Speech**
- Convert medical reports to audio
- Natural voice synthesis
- Accessibility features

## 🏗️ Architecture

### Frontend
- **Framework**: React 18.2
- **Port**: 3000
- **Features**: Modern UI with responsive design

### Backend
- **Framework**: Node.js with Express
- **Port**: 5001
- **AI Integration**: PyTorch vision models, OpenAI, Google Gemini, Anthropic Claude

### Python Services
- **Deep Learning**: PyTorch with pretrained models
- **Image Processing**: PIL/Pillow
- **Models**: ResNet50, VGG16, InceptionV3

## 📋 Prerequisites

- Node.js (v14 or higher)
- Python 3.7+
- npm or yarn

## 🚀 Installation

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd AI-Tool-Stack
```

### 2. Install Backend Dependencies
```bash
cd react-nodejs-app/backend
npm install
```

### 3. Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

### 4. Install Python Dependencies
```bash
cd ../backend/python_services
pip install -r requirements.txt
```

### 5. Configure Environment Variables
Create a `.env` file in the `backend` directory:
```env
# API Keys (add your own keys)
OPENAI_API_KEY=your_openai_key_here
GOOGLE_API_KEY=your_google_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
HUGGINGFACE_API_KEY=your_huggingface_key_here

# Server Configuration
PORT=5001
NODE_ENV=development
```

## 🎯 Running the Application

### Start Backend Server
```bash
cd react-nodejs-app/backend
node server.js
```
Backend will run on: `http://localhost:5001`

### Start Frontend Development Server
```bash
cd react-nodejs-app/frontend
npm start
```
Frontend will run on: `http://localhost:3000`

## 📁 Project Structure

```
AI-Tool-Stack/
├── react-nodejs-app/
│   ├── backend/
│   │   ├── routes/
│   │   │   ├── organAnalyzer.js
│   │   │   ├── clinicalChat.js
│   │   │   └── ...
│   │   ├── python_services/
│   │   │   ├── organ_vision_model.py
│   │   │   └── requirements.txt
│   │   ├── uploads/
│   │   ├── config.js
│   │   └── server.js
│   └── frontend/
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   └── App.js
│       └── public/
├── backend_api/          # Python backend services
├── frontend_api/         # Frontend API handlers
└── frontend_screens/     # HTML screens
```

## 🔧 Key Technologies

### Frontend
- React
- Axios
- React Router
- CSS3

### Backend
- Express.js
- Multer (file uploads)
- Sharp (image processing)
- CORS

### AI/ML
- PyTorch
- TorchVision
- OpenAI GPT
- Google Gemini
- Anthropic Claude
- Hugging Face Transformers

## 🏥 Organ Analyzer Details

The Organ Analyzer uses ensemble deep learning for medical image analysis:

### Supported Organs
- **Knee**: Osteoarthritis detection, joint space analysis
- **Lung**: Pulmonary infiltrates, consolidation patterns
- **Heart**: Cardiomegaly, chamber enlargement
- **Brain**: Cerebral atrophy, volume loss
- **Liver**: Hepatic steatosis, fatty liver disease

### Analysis Output
- Primary diagnosis
- Disease explanation
- Radiological findings
- Severity assessment
- Common symptoms
- Precautions
- Treatment options
- Next steps

## 🔒 Security Notes

- Never commit `.env` files with actual API keys
- Use environment variables for sensitive data
- Implement proper authentication in production
- Sanitize user inputs
- Follow HIPAA compliance for medical data

## ⚠️ Disclaimer

This application is for educational and demonstration purposes only. It should not be used as a substitute for professional medical advice, diagnosis, or treatment. Always consult qualified healthcare providers for medical decisions.

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## 📧 Contact

For questions or support, please open an issue in the GitHub repository.

---

**Note**: Make sure to replace placeholder API keys with your actual keys and never commit them to version control.
