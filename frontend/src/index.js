import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

const container = document.getElementById('root');
const root = createRoot(container);
// StrictMode causes double rendering in development - disabled for now
root.render(
  React.createElement(App)
);
