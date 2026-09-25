import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Settings,
  X,
  Power,
  Layers,
  Minimize2,
  Command,
  Check,
  Zap,
  Info,
  Keyboard,
  RotateCw,
  Rocket
} from 'lucide-react';

const PRESET_SHORTCUTS = [
  { label: 'Alt + Espaço (Padrão)', value: 'Alt+Space' },
  { label: 'Ctrl + Shift + G', value: 'CommandOrControl+Shift+G' },
  { label: 'Ctrl + Alt + V', value: 'CommandOrControl+Alt+V' },
  { label: 'F10', value: 'F10' }
];

export default function SettingsModal({ onClose, onCheckUpdate, updateInfo }) {
  const [settings, setSettings] = useState({
    openAtLogin: false,
    startMinimized: false,
    minimizeToTray: true,
    globalShortcut: 'Alt+Space'
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isRecordingShortcut, setIsRecordingShortcut] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateFeedback, setUpdateFeedback] = useState(null);

  const handleCheckUpdateClick = async () => {
    if (checkingUpdate) return;
    setCheckingUpdate(true);
    setUpdateFeedback(null);
    try {
      const res = await onCheckUpdate?.();
      if (res?.hasUpdate) {
        setUpdateFeedback({ type: 'hasUpdate', message: `Nova versão v${res.latestVersion} disponível!` });
      } else {
        const currentVer = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.0.0';
        setUpdateFeedback({ type: 'latest', message: `Você já está na versão mais recente (v${currentVer})!` });
      }
    } catch (_) {
      setUpdateFeedback({ type: 'error', message: 'Erro ao verificar atualizações no servidor.' });
    } finally {
      setCheckingUpdate(false);
    }
  };

  // Carrega as configurações atuais do Electron ou LocalStorage
  useEffect(() => {
    async function fetchSettings() {
      try {
        if (window.electronAPI?.getSettings) {
          const res = await window.electronAPI.getSettings();
          if (res) {
            setSettings(res);
          }
        } else {
          // Fallback para ambiente web
          const saved = localStorage.getItem('gamervault_settings');
          if (saved) {
            setSettings(JSON.parse(saved));
          }
        }
      } catch (err) {
        console.error('Erro ao carregar configurações:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  // Gravação de atalho de teclado interativa
  useEffect(() => {
    if (!isRecordingShortcut) return;

    const handleKeyDown = (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Ignora teclas modificadoras sozinhas
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
        return;
      }

      const keys = [];
      if (e.ctrlKey) keys.push('CommandOrControl');
      if (e.altKey) keys.push('Alt');
      if (e.shiftKey) keys.push('Shift');

      let mainKey = e.key;
      if (mainKey === ' ') mainKey = 'Space';
      if (mainKey.length === 1) mainKey = mainKey.toUpperCase();

      keys.push(mainKey);
      const shortcutStr = keys.join('+');

      setSettings((prev) => ({ ...prev, globalShortcut: shortcutStr }));
      setIsRecordingShortcut(false);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isRecordingShortcut]);

  const handleToggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (window.electronAPI?.saveSettings) {
        await window.electronAPI.saveSettings(settings);
      } else {
        localStorage.setItem('gamervault_settings', JSON.stringify(settings));
      }
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 700);
    } catch (e) {
      console.error('Erro ao salvar configurações:', e);
    } finally {
      setSaving(false);
    }
  };

  if (typeof document === 'undefined') return null;

  // Formatação amigável para exibição do atalho
  const formatShortcutDisplay = (shortcut) => {
    if (!shortcut) return 'Nenhum';
    return shortcut
      .replace('CommandOrControl', 'Ctrl')
      .replace('Alt', 'Alt')
      .replace('Shift', 'Shift')
      .replace('Space', 'Espaço');
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div
        className="relative w-full max-w-xl flex flex-col rounded-2xl bg-surface-container border border-border/80 shadow-2xl text-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border/60 bg-surface/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent-bright/15 border border-accent-bright/30 text-accent-bright shadow-neon-green">
              <Settings className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-gamer font-bold tracking-wide flex items-center gap-2">
                Configurações do Sistema
              </h2>
              <p className="text-xs text-gray-400 font-mono">
                Inicialização, Bandeja do Windows e Atalhos Globais
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

        {/* Conteúdo */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Seção 1: Inicialização do Windows */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono text-accent-bright uppercase tracking-wider font-bold">
              <Power className="w-4 h-4" />
              <span>Inicialização & Windows</span>
            </div>

            <div className="space-y-3">
              {/* Toggle: Iniciar com o Windows */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface/60 border border-border/60 hover:border-accent-bright/40 transition-colors">
                <div className="space-y-0.5 pr-4">
                  <div className="text-xs sm:text-sm font-gamer font-semibold text-white">
                    Iniciar com o Windows
                  </div>
                  <div className="text-[11px] text-gray-400 font-sans">
                    Abre o GamerVault automaticamente ao ligar o computador.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggle('openAtLogin')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.openAtLogin ? 'bg-accent-bright' : 'bg-surface-high'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface-low shadow-lg ring-0 transition duration-200 ease-in-out ${
                      settings.openAtLogin ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle: Iniciar minimizado na bandeja */}
              <div
                className={`flex items-center justify-between p-3.5 rounded-xl bg-surface/60 border border-border/60 transition-colors ${
                  !settings.openAtLogin ? 'opacity-50 pointer-events-none' : 'hover:border-accent-bright/40'
                }`}
              >
                <div className="space-y-0.5 pr-4">
                  <div className="text-xs sm:text-sm font-gamer font-semibold text-white">
                    Iniciar Silencioso na Bandeja
                  </div>
                  <div className="text-[11px] text-gray-400 font-sans">
                    Inicia minimizado perto do relógio sem abrir a janela na tela ao ligar o PC.
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!settings.openAtLogin}
                  onClick={() => handleToggle('startMinimized')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.startMinimized && settings.openAtLogin ? 'bg-accent-bright' : 'bg-surface-high'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface-low shadow-lg ring-0 transition duration-200 ease-in-out ${
                      settings.startMinimized && settings.openAtLogin ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Seção 2: Bandeja do Sistema (Tray) & Atalho Global */}
          <div className="space-y-4 pt-2 border-t border-border/60">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-wider font-bold">
              <Layers className="w-4 h-4" />
              <span>Bandeja & Atalho Rápido</span>
            </div>

            <div className="space-y-3">
              {/* Toggle: Minimizar para bandeja ao fechar */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface/60 border border-border/60 hover:border-cyan-400/40 transition-colors">
                <div className="space-y-0.5 pr-4">
                  <div className="text-xs sm:text-sm font-gamer font-semibold text-white">
                    Minimizar para a Bandeja ao Fechar (X)
                  </div>
                  <div className="text-[11px] text-gray-400 font-sans">
                    Ao clicar no "X", mantém o GamerVault rodando em standby na bandeja para abrir em menos de 1 segundo.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggle('minimizeToTray')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.minimizeToTray ? 'bg-cyan-500' : 'bg-surface-high'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface-low shadow-lg ring-0 transition duration-200 ease-in-out ${
                      settings.minimizeToTray ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Configuração de Atalho Global do Teclado */}
              <div className="p-3.5 rounded-xl bg-surface/60 border border-border/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs sm:text-sm font-gamer font-semibold text-white flex items-center gap-1.5">
                      <Keyboard className="w-4 h-4 text-cyan-400" />
                      <span>Atalho Global no Windows</span>
                    </div>
                    <div className="text-[11px] text-gray-400 font-sans">
                      Aperte este atalho em qualquer jogo ou aplicativo para trazer o GamerVault na tela.
                    </div>
                  </div>

                  {/* Botão de Gravação / Indicador Atual */}
                  <button
                    type="button"
                    onClick={() => setIsRecordingShortcut(!isRecordingShortcut)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all active:scale-95 ${
                      isRecordingShortcut
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse'
                        : 'bg-surface border-border hover:border-cyan-400 text-cyan-400'
                    }`}
                  >
                    <span>{isRecordingShortcut ? 'Pressione teclas...' : formatShortcutDisplay(settings.globalShortcut)}</span>
                  </button>
                </div>

                {/* Presets Rápidos */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] font-mono text-gray-400 mr-1">Sugestões:</span>
                  {PRESET_SHORTCUTS.map((preset) => {
                    const isSelected = settings.globalShortcut === preset.value;
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => {
                          setSettings((prev) => ({ ...prev, globalShortcut: preset.value }));
                          setIsRecordingShortcut(false);
                        }}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-md border transition-all ${
                          isSelected
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                            : 'bg-surface hover:bg-surface-high border-border text-gray-300'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Seção: Atualizações do Gamer's Vault */}
          <div className="p-4 rounded-xl bg-surface border border-border/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <RotateCw className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-gamer font-bold text-white tracking-wider uppercase">
                    Atualizações do Gamer's Vault
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    Versão instalada: <span className="text-cyan-400 font-mono font-semibold">v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.0.0'}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCheckUpdateClick}
                disabled={checkingUpdate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-xs font-mono font-bold text-cyan-400 hover:text-cyan-300 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.15)]"
              >
                <RotateCw className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
                <span>{checkingUpdate ? 'Buscando...' : 'Buscar Atualizações'}</span>
              </button>
            </div>

            {updateFeedback && (
              <div className={`text-[11px] font-mono p-2.5 rounded-lg border flex items-center gap-2 ${
                updateFeedback.type === 'hasUpdate' 
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                  : updateFeedback.type === 'latest'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-red-500/15 border-red-500/40 text-red-300'
              }`}>
                {updateFeedback.type === 'hasUpdate' && <Rocket className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                {updateFeedback.type === 'latest' && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                <span>{updateFeedback.message}</span>
              </div>
            )}
          </div>

          {/* Card Informativo: Standby de Zero Consumo */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-accent-bright/10 border border-accent-bright/20 text-accent-bright">
            <Zap className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="text-[11px] font-sans leading-relaxed text-gray-300">
              <strong className="text-accent-bright font-mono">Standby Total Ativo:</strong> Quando o GamerVault está minimizado na bandeja, todas as músicas, animações e renderizações são suspensas para garantir <span className="text-white font-semibold">zero consumo de CPU e GPU</span>.
            </div>
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="flex items-center justify-between p-4 border-t border-border/60 bg-surface/80">
          <span className="text-[10px] font-mono text-gray-400">
            {savedSuccess ? (
              <span className="text-accent-bright flex items-center gap-1 font-bold">
                <Check className="w-3.5 h-3.5" />
                Configurações aplicadas!
              </span>
            ) : (
              'As alterações passam a valer imediatamente.'
            )}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-high text-xs font-semibold text-gray-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-bright hover:bg-accent-bright/90 text-surface-low text-xs font-gamer font-bold tracking-wider shadow-neon-green transition-all active-press disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'Gravando...' : 'Salvar Preferências'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
