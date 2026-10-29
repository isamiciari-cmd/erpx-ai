import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import { ErrorBoundary } from './app/components/ErrorBoundary';
// Keep Tailwind's theme and class-based dark variant in the same CSS context.
import './styles/index.css';
import './styles/erpx-v2.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
