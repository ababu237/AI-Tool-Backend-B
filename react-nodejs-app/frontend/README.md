# Healthcare Assistant Frontend

React-based frontend application for the Healthcare Assistant platform.

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Configuration

Create a `.env` file:

```bash
cp .env.example .env
```

Default configuration:

```env
REACT_APP_API_URL=http://localhost:8000/api
```

### Running the App

**Development:**

```bash
npm start
```

Opens on `http://localhost:3000`

**Production Build:**

```bash
npm run build
```

## 📱 Features

### Pages

1. **Home** - Feature overview and navigation
2. **Clinical Chat** - AI medical assistant
3. **Document Analyzer** - PDF/CSV analysis
4. **Organ Analyzer** - Medical image analysis
5. **Speech to Text** - Audio transcription
6. **Text to Speech** - Translation and TTS

### Components

- `Header` - Application header with logo
- `Navigation` - Bottom navigation bar
- `AudioPlayer` - Audio playback component
- `LanguageSelector` - Language selection dropdown

## 🎨 Styling

- Custom CSS with CSS variables
- Responsive design
- Mobile-first approach
- Plus Jakarta Sans font family

### Color Scheme

```css
--primary-blue: #284497
--text-primary: #111111
--bg-light: #ffffff
--bg-accent-light: #edf2ff
--success-color: #299f38
--error-color: #e84242
```

## 📁 Project Structure

```
frontend/
├── public/              # Static files
│   ├── index.html
│   └── manifest.json
├── src/
│   ├── components/      # Reusable components
│   │   ├── Header.js/css
│   │   ├── Navigation.js/css
│   │   ├── AudioPlayer.js/css
│   │   └── LanguageSelector.js/css
│   ├── pages/           # Page components
│   │   ├── Home.js/css
│   │   ├── ClinicalChat.js/css
│   │   ├── DocumentAnalyzer.js/css
│   │   ├── OrganAnalyzer.js
│   │   ├── SpeechToText.js
│   │   └── TextToSpeech.js
│   ├── services/        # API services
│   │   └── api.js
│   ├── App.js           # Main component
│   ├── App.css
│   ├── index.js         # Entry point
│   └── index.css        # Global styles
└── package.json
```

## 🔌 API Integration

All API calls are handled through `src/services/api.js`:

```javascript
import { clinicalChatAPI } from "./services/api";

// Example usage
const response = await clinicalChatAPI.sendMessage({
  query: "What are diabetes symptoms?",
  outputLanguage: "en",
});
```

## 🛠️ Tech Stack

- **React** 18.2.0
- **React Router** 6.20.1
- **Axios** 1.6.2
- **CSS3** with custom properties
- **ES6+** JavaScript

## 📱 Responsive Breakpoints

- Desktop: > 768px
- Tablet: 480px - 768px
- Mobile: < 480px

## 🎯 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 🔧 Available Scripts

```bash
npm start       # Start development server
npm run build   # Create production build
npm test        # Run tests
npm run eject   # Eject from Create React App
```

## 📦 Key Dependencies

```json
{
  "react": "^18.2.0",
  "react-router-dom": "^6.20.1",
  "axios": "^1.6.2"
}
```

## 🎨 Customization

### Changing Colors

Edit CSS variables in `src/index.css`:

```css
:root {
  --primary-blue: #your-color;
  --text-primary: #your-color;
}
```

### Adding New Pages

1. Create component in `src/pages/`
2. Add route in `src/App.js`
3. Add navigation item in `src/components/Navigation.js`

## 🐛 Common Issues

### API Connection Errors

- Ensure backend is running on port 8000
- Check `REACT_APP_API_URL` in `.env`
- Verify CORS settings in backend

### Build Errors

```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install
```

## 📄 License

MIT
