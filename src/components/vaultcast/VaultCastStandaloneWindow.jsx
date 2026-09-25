import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Pin,
  PinOff,
  Share2,
  ArrowRightLeft,
  Square,
  Users,
  Check,
  RotateCcw,
  Sparkles,
  Sliders,
  Tv
} from 'lucide-react';
import { generateDiscordInvite } from '../../services/vaultCastService';

export default function VaultCastStandaloneWindow() {
  const videoRef = useRef(null);
  const syncChannelRef = useRef(null);

  // Informações da transmissão
  const [mode, setMode] = useState('broadcaster'); // 'broadcaster' | 'viewer'
  const [streamTitle, setStreamTitle] = useState('VaultCast AO VIVO');
  const [pilotName, setPilotName] = useState('Piloto');
  const [castId, setCastId] = useState(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [viewerCount, setViewerCount] = useState(0);

  // Estados de controle de mídia e UI
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(true);
  const [activePreset, setActivePreset] = useState('720'); // '380' | '540' | '720' | '920'
  const [filterPreset, setFilterPreset] = useState('fix_dark');
  const [showFilters, setShowFilters] = useState(false);
  const [copiedDiscord, setCopiedDiscord] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [streamAttached, setStreamAttached] = useState(false);

  // Filtros de pós-processamento de vídeo
  const VIDEO_FILTERS = {
    original: 'none',
    vibrant: 'contrast(1.08) saturate(1.18) brightness(1.02)',
    fix_dark: 'contrast(1.05) brightness(1.04) saturate(1.10)'
  };

  // Inicialização e conexão com os dados da janela principal
  useEffect(() => {
    // 1. Tenta obter os dados da janela principal via window.opener
    const opener = window.opener;
    if (opener && opener.__VAULTCAST_DATA__) {
      const data = opener.__VAULTCAST_DATA__;
      setMode(data.mode || 'broadcaster');
      setStreamTitle(data.streamTitle || 'Gameplay');
      setPilotName(data.pilotName || 'Piloto');
      setCastId(data.castId || null);
      if (data.elapsedTime) setElapsedTime(data.elapsedTime);
      if (data.viewerCount !== undefined) setViewerCount(data.viewerCount);
    }

    // 2. Conecta o MediaStream diretamente ao elemento <video>
    const attachStream = () => {
      try {
        const stream = opener?.__VAULTCAST_STREAM__ || opener?.__VAULTCAST_DATA__?.stream;
        if (stream && videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((err) => {
            console.warn('[VaultCast Popout] Autoplay inicial aguardando gesto:', err);
          });
          setStreamAttached(true);
          return true;
        }
      } catch (err) {
        console.warn('[VaultCast Popout] Erro ao anexar stream inicial:', err);
      }
      return false;
    };

    const attached = attachStream();
    if (!attached) {
      // Tenta novamente após pequeno intervalo caso o stream ainda estivesse montando
      const timer = setTimeout(attachStream, 300);
      return () => clearTimeout(timer);
    }
  }, []);

  // Sincronização em tempo real via BroadcastChannel
  useEffect(() => {
    let channel = null;
    try {
      channel = new BroadcastChannel('vaultcast_sync');
      syncChannelRef.current = channel;

      channel.onmessage = (event) => {
        const { type, payload } = event.data || {};
        if (type === 'TICK' && payload) {
          if (payload.elapsedTime) setElapsedTime(payload.elapsedTime);
          if (payload.viewerCount !== undefined) setViewerCount(payload.viewerCount);
          if (payload.streamTitle) setStreamTitle(payload.streamTitle);
        } else if (type === 'BROADCAST_ENDED') {
          // Se a live foi encerrada na janela principal, fecha a janela popout
          window.close();
        }
      };

      // Notifica a janela principal que a janela destacada está pronta
      channel.postMessage({ type: 'STANDALONE_READY' });
    } catch (err) {
      console.warn('[VaultCast Popout] BroadcastChannel indisponível:', err);
    }

    // Notifica ao fechar a janela pelo 'X' do Windows
    const handleBeforeUnload = () => {
      try {
        channel?.postMessage({ type: 'STANDALONE_CLOSED' });
      } catch (_) {}
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      try {
        channel?.close();
      } catch (_) {}
    };
  }, []);

  // Controle de volume e mudo
  const handleVolumeChange = (newVol) => {
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
    }
    if (newVol > 0 && isMuted) {
      setIsMuted(false);
      if (videoRef.current) videoRef.current.muted = false;
    }
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }
  };

  // Alterna fixação no topo (Always-on-Top)
  const handleToggleAlwaysOnTop = () => {
    const next = !isAlwaysOnTop;
    setIsAlwaysOnTop(next);
    if (window.electronAPI?.setAlwaysOnTop) {
      window.electronAPI.setAlwaysOnTop(next);
    }
  };

  // Redimensionamento rápido pelos presets de tamanho
  const handleApplyPreset = (sizeKey) => {
    setActivePreset(sizeKey);
    let width = 720;
    let height = 470;

    switch (sizeKey) {
      case '380':
        width = 380;
        height = 260;
        break;
      case '540':
        width = 540;
        height = 360;
        break;
      case '720':
        width = 720;
        height = 470;
        break;
      case '920':
        width = 920;
        height = 580;
        break;
      default:
        break;
    }

    // Aplica via IPC nativo do Electron e fallback window.resizeTo
    if (window.electronAPI?.setWindowSize) {
      window.electronAPI.setWindowSize(width, height);
    } else if (typeof window.resizeTo === 'function') {
      window.resizeTo(width, height);
    }
  };

  // Ações de comunicação com a janela principal
  const handleRestoreToApp = () => {
    try {
      syncChannelRef.current?.postMessage({ type: 'RESTORE_TO_APP' });
    } catch (_) {}
    if (window.electronAPI?.focusMainWindow) {
      window.electronAPI.focusMainWindow();
    }
    window.close();
  };

  const handleSwitchSource = () => {
    try {
      syncChannelRef.current?.postMessage({ type: 'SWITCH_SOURCE' });
    } catch (_) {}
    if (window.electronAPI?.focusMainWindow) {
      window.electronAPI.focusMainWindow();
    }
    window.close();
  };

  const handleStopBroadcast = () => {
    if (confirm('Deseja realmente encerrar a transmissão do VaultCast?')) {
      try {
        syncChannelRef.current?.postMessage({ type: 'STOP_BROADCAST' });
      } catch (_) {}
      window.close();
    }
  };

  const handleStopWatching = () => {
    try {
      syncChannelRef.current?.postMessage({ type: 'STOP_WATCHING' });
    } catch (_) {}
    window.close();
  };

  const handleCopyDiscordInvite = () => {
    if (!castId) return;
    const text = generateDiscordInvite({
      castId,
      pilotName,
      gameTitle: streamTitle
    });
    navigator.clipboard.writeText(text);
    setCopiedDiscord(true);
    setTimeout(() => setCopiedDiscord(false), 2500);
  };

  const handleCopyDirectLink = () => {
    if (!castId) return;
    const link = `https://gamer-vault-e667a.web.app/cast?room=${castId}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.warn);
    } else {
      document.exitFullscreen().catch(console.warn);
    }
  };

  return (
    <div className="w-screen h-screen bg-[#07090e] text-white flex flex-col select-none overflow-hidden font-sans">
      
      {/* ======================================================== */}
      {/* 1. BARRA SUPERIOR (HEADER / TITLEBAR)                    */}
      {/* ======================================================== */}
      <header className="h-10 px-3 flex items-center justify-between border-b border-[#1c2130] bg-[#0c0f18] shrink-0 z-30">
        
        {/* Esquerda: Badge AO VIVO e Título */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-500/50 text-[10px] font-bold text-rose-400">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
            <span>AO VIVO</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-200 truncate">
            <span className="truncate max-w-[180px] sm:max-w-[280px]" title={streamTitle}>
              {streamTitle}
            </span>
            <span className="text-gray-500">•</span>
            <span className="text-[11px] font-mono text-gray-400 shrink-0">
              {elapsedTime}
            </span>
          </div>
        </div>

        {/* Direita: Espectadores, Pin e Voltar ao App */}
        <div className="flex items-center gap-1.5 shrink-0">
          {viewerCount !== undefined && (
            <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded bg-[#131724] border border-[#23293d] text-[10px] font-mono text-cyan-300">
              <Users className="w-3 h-3" />
              <span>{viewerCount}</span>
            </div>
          )}

          {/* Botão Fixar no Topo (Always on Top) */}
          <button
            onClick={handleToggleAlwaysOnTop}
            title={isAlwaysOnTop ? 'Janela Fixada no Topo (Clique para desfixar)' : 'Fixar Janela no Topo'}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              isAlwaysOnTop
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.25)]'
                : 'bg-[#141824] border-[#222838] text-gray-400 hover:text-white'
            }`}
          >
            {isAlwaysOnTop ? <Pin className="w-3.5 h-3.5 fill-current" /> : <PinOff className="w-3.5 h-3.5" />}
          </button>

          {/* Restaurar para o GamerVault */}
          <button
            onClick={handleRestoreToApp}
            title="Restaurar visualização para dentro do Gamer's Vault"
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-[11px] font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Voltar ao App</span>
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. ÁREA CENTRAL: PLAYER DE VÍDEO                         */}
      {/* ======================================================== */}
      <main className="flex-1 relative bg-black flex items-center justify-center overflow-hidden group">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isMuted}
          style={{ filter: VIDEO_FILTERS[filterPreset] || 'none' }}
          className="w-full h-full object-contain pointer-events-none"
        />

        {!streamAttached && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#07090e]/90 text-gray-400 text-xs">
            <Tv className="w-8 h-8 text-emerald-400 animate-pulse" />
            <span>Sincronizando feed de vídeo da transmissão...</span>
          </div>
        )}

        {/* Menu Flutuante de Filtros de Imagem */}
        {showFilters && (
          <div className="absolute top-3 right-3 z-30 p-2 rounded-xl bg-[#0c0f18]/95 backdrop-blur-md border border-[#20273a] shadow-2xl flex flex-col gap-1.5 animate-fadeIn">
            <span className="text-[10px] font-mono uppercase font-bold text-gray-400 px-1">
              Correção de Cor
            </span>
            {[
              { id: 'original', label: 'Original' },
              { id: 'fix_dark', label: 'Fix Telas Escuras (DXGI)' },
              { id: 'vibrant', label: 'Cores Vivas' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setFilterPreset(f.id);
                  setShowFilters(false);
                }}
                className={`px-2.5 py-1 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                  filterPreset === f.id
                    ? 'bg-emerald-500 text-black font-bold'
                    : 'text-gray-300 hover:bg-[#181d2e]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* 3. BARRA INFERIOR DE CONTROLES (TOOLBAR)                 */}
      {/* ======================================================== */}
      <footer className="h-12 px-3 flex items-center justify-between border-t border-[#1c2130] bg-[#0c0f18] shrink-0 z-30">
        
        {/* Esquerda: Volume e Mudo */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleMute}
            title={isMuted ? 'Desmutar' : 'Mutar Áudio'}
            className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-[#1a2030] transition-colors cursor-pointer"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-16 sm:w-24 h-1.5 bg-[#1f2638] rounded-lg appearance-none cursor-pointer accent-emerald-400"
            title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
          />
        </div>

        {/* Centro: Presets de Tamanho de Janela do Windows */}
        <div className="flex items-center gap-1 bg-[#131724] p-0.5 rounded-xl border border-[#212738]">
          {[
            { id: '380', label: '380p', title: 'Pequeno (380x260)' },
            { id: '540', label: '540p', title: 'Médio (540x360)' },
            { id: '720', label: '720p', title: 'Grande (720x470)' },
            { id: '920', label: '920p', title: 'Ultra (920x580)' }
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleApplyPreset(preset.id)}
              title={preset.title}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                activePreset === preset.id
                  ? 'bg-emerald-500 text-black shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-[#1e2436]'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Direita: Ações Rápidas */}
        <div className="flex items-center gap-1.5">
          {/* Botão de Filtro de Cor */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            title="Ajuste de Cor / Brilho"
            className="p-1.5 rounded-lg text-gray-400 hover:text-cyan-300 hover:bg-[#181d2e] transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {/* Copiar Convite do Discord */}
          <button
            onClick={handleCopyDiscordInvite}
            title="Copiar convite formatado da live para o Discord"
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              copiedDiscord
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                : 'bg-[#141824] border-[#222838] text-gray-300 hover:text-white hover:border-[#30384f]'
            }`}
          >
            {copiedDiscord ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
          </button>

          {/* Trocar Janela (se streamer) */}
          {mode === 'broadcaster' && (
            <button
              onClick={handleSwitchSource}
              title="Trocar janela transmitida"
              className="p-1.5 rounded-lg bg-[#141824] border border-[#222838] text-gray-300 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Botão Tela Cheia */}
          <button
            onClick={handleToggleFullscreen}
            title="Alternar Tela Cheia"
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#181d2e] transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* Encerrar ou Parar de Assistir */}
          {mode === 'broadcaster' ? (
            <button
              onClick={handleStopBroadcast}
              title="Encerrar transmissão da live"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600 border border-rose-500/40 text-rose-300 hover:text-white text-[11px] font-bold transition-all cursor-pointer active:scale-95"
            >
              <Square className="w-3 h-3 fill-current" />
              <span className="hidden sm:inline">Encerrar</span>
            </button>
          ) : (
            <button
              onClick={handleStopWatching}
              title="Parar de assistir transmissão"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600 border border-rose-500/40 text-rose-300 hover:text-white text-[11px] font-bold transition-all cursor-pointer active:scale-95"
            >
              <Square className="w-3 h-3 fill-current" />
              <span className="hidden sm:inline">Parar</span>
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
