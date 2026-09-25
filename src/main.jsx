import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import VaultCastStandaloneWindow from './components/vaultcast/VaultCastStandaloneWindow.jsx';
import './index.css';
import { applyTheme } from './services/themeService';

// Aplica imediatamente as variáveis CSS do tema e modo salvos antes da renderização
applyTheme();

const popoutMode = new URLSearchParams(window.location.search).get('popout');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {popoutMode === 'vaultcast' ? <VaultCastStandaloneWindow /> : <App />}
  </React.StrictMode>
);
