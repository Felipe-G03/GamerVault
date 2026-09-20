import React from 'react';
import { Minus, Square, X, Gamepad2, Rocket } from 'lucide-react';

export default function TitleBar({ updateInfo, onOpenUpdateModal }) {
  const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron;

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
      className="w-full h-9 bg-[#07080c] border-b border-border/70 flex items-center justify-between px-3 select-none z-50 text-xs font-mono"
      style={{ WebkitAppRegion: isElectron ? 'drag' : 'default' }}
    >
      {/* Branding & Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-accent-bright font-bold tracking-wider">
          <Gamepad2 className="w-4 h-4 text-accent-bright" />
          <span className="text-[11px] font-gamer text-white tracking-widest uppercase">Gamer's Vault</span>
        </div>
        <span className="hidden sm:inline text-[10px] text-gray-500 border-l border-border/80 pl-2.5">
          v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.0.0'} DESKTOP
        </span>
        <div className="hidden md:flex items-center gap-1.5 text-[10px] text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-bright shadow-[0_0_8px_#3dd69b]"></span>
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

      {/* Controles da Janela do Electron */}
      {isElectron && (
        <div
          className="flex items-center gap-1 -mr-1"
          style={{ WebkitAppRegion: 'no-drag' }}
        >
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
  );
}
