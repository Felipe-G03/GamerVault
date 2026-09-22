import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Tenta obter credenciais do .env ou do LocalStorage (permitindo configuração direta no app)
export function getFirebaseConfig() {
  const envConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  };

  if (envConfig.apiKey && envConfig.projectId) {
    return envConfig;
  }

  try {
    const saved = localStorage.getItem('gamervault_firebase_config');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Erro ao ler configuração do Firebase do storage:', e);
  }

  return null;
}

let app = null;
let auth = null;
let db = null;

const initialConfig = getFirebaseConfig();
if (initialConfig && initialConfig.apiKey) {
  try {
    app = getApps().length === 0 ? initializeApp(initialConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (err) {
    console.warn('Falha na inicialização do Firebase com a configuração padrão:', err);
  }
}

export { app, auth, db };
