import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import { isTauri } from '@tauri-apps/api/core';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { useStore } from './store';

if (isTauri()) document.documentElement.classList.add('tauri');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if (import.meta.env.DEV) Object.assign(window, { __plot: useStore });
