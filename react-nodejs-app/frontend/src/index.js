import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { suppressResizeObserverErrors, optimizeResizeObserver } from './utils/resizeObserverFix';

// Apply ResizeObserver fixes before app initialization
suppressResizeObserverErrors();
optimizeResizeObserver();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <App />
);
