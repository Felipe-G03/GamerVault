import React, { useState } from 'react';
import { X, Key, Database, Check, Save } from 'lucide-react';
import { getRawgApiKey, saveRawgApiKey } from '../../config/rawg';
import { getFirebaseConfig, saveFirebaseConfig } from '../../config/firebase';

export default function SettingsModal({ onClose, onSaved }) {
  const currentRawg = getRawgApiKey();
  const currentFirebase = getFirebaseConfig() || {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  };

  const [rawgKey, setRawgKey] = useState(currentRawg);
  const [firebaseConfig, setFirebaseConfig] = useState(currentFirebase);
  const [savedMessage, setSavedMessage] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    if (rawgKey) {
      saveRawgApiKey(rawgKey);
    }
    if (firebaseConfig.apiKey && firebaseConfig.projectId) {
      saveFirebaseConfig(firebaseConfig);
    }
    setSavedMessage(true);
    setTimeout(() => {
      setSavedMessage(false);
      if (onSaved) onSaved();
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-[#0e1017] border border-border rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-container">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-accent-bright" />
            <h3 className="text-base font-gamer font-bold text-white">
              Configurações de APIs & Firebase
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-high text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* RAWG API KEY */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase text-cyan-400 font-semibold flex items-center justify-between">
              <span>Chave da API RAWG (Obrigatório para buscar jogos)</span>
              <a
                href="https://rawg.io/apidocs"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] underline text-gray-400 hover:text-cyan-300"
              >
                Obter Chave Grátis
              </a>
            </label>
            <input
              type="text"
              placeholder="Cole sua API Key do RAWG aqui..."
              value={rawgKey}
              onChange={(e) => setRawgKey(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#151722] border border-[#272a3b] rounded-xl text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="border-t border-border pt-3">
            <span className="text-xs font-mono uppercase text-emerald-400 font-semibold block mb-2 flex items-center gap-1.5">
              <Database className="w-4 h-4" />
              Credenciais do Firebase (Firestore)
            </span>
            <p className="text-[11px] text-gray-400 mb-3">
              Você pode preencher estas chaves diretamente aqui ou através do arquivo <code className="text-accent-bright font-mono">.env</code> do projeto.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-mono text-gray-400">API Key</label>
                <input
                  type="text"
                  placeholder="AIzaSy..."
                  value={firebaseConfig.apiKey || ''}
                  onChange={(e) => setFirebaseConfig({ ...firebaseConfig, apiKey: e.target.value })}
                  className="w-full px-3 py-2 bg-[#151722] border border-[#272a3b] rounded-lg text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-gray-400">Project ID</label>
                <input
                  type="text"
                  placeholder="meu-projeto-firebase"
                  value={firebaseConfig.projectId || ''}
                  onChange={(e) => setFirebaseConfig({ ...firebaseConfig, projectId: e.target.value })}
                  className="w-full px-3 py-2 bg-[#151722] border border-[#272a3b] rounded-lg text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono text-gray-400">Auth Domain</label>
                  <input
                    type="text"
                    placeholder="projeto.firebaseapp.com"
                    value={firebaseConfig.authDomain || ''}
                    onChange={(e) => setFirebaseConfig({ ...firebaseConfig, authDomain: e.target.value })}
                    className="w-full px-3 py-2 bg-[#151722] border border-[#272a3b] rounded-lg text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-gray-400">App ID</label>
                  <input
                    type="text"
                    placeholder="1:123456:web:..."
                    value={firebaseConfig.appId || ''}
                    onChange={(e) => setFirebaseConfig({ ...firebaseConfig, appId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#151722] border border-[#272a3b] rounded-lg text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {savedMessage && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-700/50 text-emerald-300 text-xs font-medium">
              <Check className="w-4 h-4" />
              <span>Configurações salvas com sucesso!</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-accent-bright hover:bg-emerald-400 text-black font-bold text-xs transition-all shadow-neon-green flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Configurações</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
