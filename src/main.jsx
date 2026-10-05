import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import VaultCastStandaloneWindow from './components/vaultcast/VaultCastStandaloneWindow.jsx';
import InGameOverlay from './components/overlay/InGameOverlay.jsx';
import './index.css';
import { applyTheme } from './services/themeService';

// Aplica imediatamente as variáveis CSS do tema e modo salvos antes da renderização
applyTheme();

const urlParams = new URLSearchParams(window.location.search);
const popoutMode = urlParams.get('popout');
const isOverlay = urlParams.get('overlay') === 'true';

if (isOverlay) {
  document.documentElement.style.backgroundColor = 'transparent';
  document.body.style.backgroundColor = 'transparent';
  document.body.classList.remove('bg-background');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isOverlay ? (
      <InGameOverlay />
    ) : popoutMode === 'vaultcast' ? (
      <VaultCastStandaloneWindow />
    ) : (
      <App />
    )}
  </React.StrictMode>
);
