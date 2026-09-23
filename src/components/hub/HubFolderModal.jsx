import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Folder, FolderOpen, RotateCcw, Check, AlertCircle } from 'lucide-react';
import { resetHubPlatformPath, saveHubPlatformPath } from '../../services/hubService';
import PlatformIcon from '../common/PlatformIcon';

export default function HubFolderModal({ platform, currentPath, onClose, onPathUpdated }) {
  const [folderPath, setFolderPath] = useState(currentPath || '');
  const [statusMsg, setStatusMsg] = useState('');

  if (!platform) return null;
  if (typeof document === 'undefined') return null;

  // Abre o seletor nativo de diretório do Windows via Electron
  const handleBrowseFolder = async () => {
    try {
      if (window.electronAPI?.selectDirectory) {
        const selected = await window.electronAPI.selectDirectory();
        if (selected) {
          setFolderPath(selected);
          setStatusMsg('Pasta selecionada!');
        }
      } else {
        alert('O seletor nativo de pastas está disponível apenas no aplicativo desktop Electron.');
      }
    } catch (err) {
      console.error('Erro ao abrir seletor de pastas:', err);
    }
  };

  // Restaura o caminho padrão da plataforma
  const handleResetDefault = () => {
    const defaultPath = resetHubPlatformPath(platform.id);
    setFolderPath(defaultPath);
    setStatusMsg('Caminho padrão restaurado!');
  };

  // Salva e fecha
  const handleSave = () => {
    if (!folderPath.trim()) return;
    saveHubPlatformPath(platform.id, folderPath.trim());
    onPathUpdated(platform.id, folderPath.trim());
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-2xl bg-surface-container border border-border/80 shadow-2xl p-6 text-white space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <PlatformIcon platformId={platform.id} size="lg" />
            <div>
              <h2 className="text-lg font-gamer font-bold tracking-wide">
                Configurar Pasta: {platform.name}
              </h2>
              <p className="text-xs text-gray-400">
                Aponte o diretório onde os jogos dessa plataforma estão instalados
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input e Ações de Pasta */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-gray-300 uppercase tracking-wider mb-2">
              Caminho da Pasta no PC:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="Ex: C:\Program Files (x86)\Steam"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-sm font-mono text-white focus:outline-none focus:border-accent-bright"
              />
              <button
                type="button"
                onClick={handleBrowseFolder}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface-high hover:bg-surface border border-border hover:border-accent-bright text-xs font-bold font-gamer tracking-wide whitespace-nowrap transition-all active-press"
                title="Procurar Pasta no Windows"
              >
                <FolderOpen className="w-4 h-4 text-accent-bright" />
                <span>Procurar</span>
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-surface/80 border border-border/50 text-xs text-gray-400 space-y-1">
            <div className="flex items-center gap-1.5 text-gray-300 font-semibold">
              <AlertCircle className="w-4 h-4 text-accent-bright shrink-0" />
              <span>Caminho Padrão Recomendado:</span>
            </div>
            <p className="font-mono text-[11px] text-gray-400 break-all select-all">
              {platform.defaultPath}
            </p>
          </div>

          {statusMsg && (
            <div className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              <span>{statusMsg}</span>
            </div>
          )}
        </div>

        {/* Botões do Rodapé */}
        <div className="flex items-center justify-between pt-4 border-t border-border/60">
          <button
            type="button"
            onClick={handleResetDefault}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-surface transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Padrão</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-high text-xs font-semibold text-gray-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-accent-bright hover:bg-accent-bright/90 text-surface-low text-xs font-gamer font-bold tracking-wider shadow-neon-green transition-all active-press"
            >
              <Check className="w-4 h-4" />
              <span>Salvar e Escanear</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
