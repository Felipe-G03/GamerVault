import React, { useState } from 'react';
import { Minus, Square, X, Gamepad2, Rocket, Settings, RotateCw } from 'lucide-react';
import ThemeSelector from './ThemeSelector';

export default function TitleBar({ updateInfo, onOpenUpdateModal, onOpenSettings, onCheckUpdate }) {
  const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron;
  const [isChecking, setIsChecking] = useState(false);

  const handleManualCheck = async (e) => {
    e.stopPropagation();
    if (isChecking) return;
    setIsChecking(true);
    try {
      await onCheckUpdate?.();
    } finally {
      setTimeout(() => setIsChecking(false), 800);
    }
  };

  const handleMinimize = () => {
    if (window.electronAPI) window.electronAPI.minimizeWindow();
  };

  const handleMaximize = () => {
    if (window.electronAPI) window.electronAPI.maximizeWindow();
  };

  const handleClose = () => {
    if (window.electronAPI) window.electronAPI.closeWindow();
  };

  return (
    <div
      className="w-full h-9 bg-background border-b border-border/70 flex items-center justify-between px-3 select-none z-50 text-xs font-mono"
      style={{ WebkitAppRegion: isElectron ? 'drag' : 'default' }}
    >
      {/* Branding & Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-accent-bright font-bold tracking-wider">
          <Gamepad2 className="w-4 h-4 text-accent-bright" />
          <span className="text-[11px] font-gamer text-white tracking-widest uppercase">Gamer's Vault</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 border-l border-border/80 pl-2.5">
          <span className="text-[10px] text-gray-500">
            v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.0.0'} DESKTOP
          </span>
          <button
            onClick={handleManualCheck}
            disabled={isChecking}
            className="p-1 rounded text-gray-500 hover:text-cyan-400 hover:bg-surface-high transition-colors"
            style={{ WebkitAppRegion: 'no-drag' }}
            title="Verificar atualizações do Gamer's Vault"
          >
            <RotateCw className={`w-2.5 h-2.5 ${isChecking ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
        <div className="hidden md:flex items-center gap-1.5 text-[10px] text-gray-400">
          <span 
            className="w-1.5 h-1.5 rounded-full bg-accent-bright"
            style={{ boxShadow: '0 0 8px var(--accent-bright)' }}
          />
          <span className="text-gray-300">CORE ONLINE</span>
        </div>
      </div>

      {/* Botão Central de Atualização Disponível */}
      {updateInfo?.hasUpdate && (
        <div className="flex items-center" style={{ WebkitAppRegion: 'no-drag' }}>
          <button
            onClick={onOpenUpdateModal}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 hover:text-cyan-300 font-mono text-[10px] font-bold tracking-wider transition-all shadow-[0_0_12px_rgba(6,182,212,0.25)] hover:shadow-[0_0_18px_rgba(6,182,212,0.45)] active:scale-95 group cursor-pointer"
            title="Nova versão disponível! Clique para atualizar."
          >
            <Rocket className="w-3 h-3 text-cyan-400 group-hover:animate-bounce" />
            <span className="tracking-wide">ATUALIZAÇÃO v{updateInfo.latestVersion} DISPONÍVEL</span>
          </button>
        </div>
      )}

      {/* Lado Direito: Seletor de Tema & Configurações & Controles da Janela */}
      <div className="flex items-center gap-1.5" style={{ WebkitAppRegion: 'no-drag' }}>
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg text-gray-400 hover:text-accent-bright hover:bg-surface-high transition-colors"
          title="Configurações do Sistema (Inicialização, Bandeja e Atalhos)"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        <ThemeSelector />

        {/* Controles da Janela do Electron */}
        {isElectron && (
          <div className="flex items-center gap-1 -mr-1">
            <button
              onClick={handleMinimize}
              className="w-8 h-7 flex items-center justify-center text-gray-400 hover:text-white hover:bg-surface-high rounded transition-colors"
              title="Minimizar"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleMaximize}
              className="w-8 h-7 flex items-center justify-center text-gray-400 hover:text-white hover:bg-surface-high rounded transition-colors"
              title="Maximizar"
            >
              <Square className="w-3 h-3" />
            </button>
            <button
              onClick={handleClose}
              className="w-8 h-7 flex items-center justify-center text-gray-400 hover:text-white hover:bg-red-600/90 rounded transition-colors"
              title="Fechar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
