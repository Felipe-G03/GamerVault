import React, { useState, useEffect, useRef } from 'react';
import {
  Maximize2,
  Minimize2,
  X,
  Volume2,
  VolumeX,
  Copy,
  Check,
  ArrowRightLeft,
  Square,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Tv,
  Users,
  Lock,
  Unlock,
  Radio,
  Sliders,
  Sparkles
} from 'lucide-react';

const STORAGE_POS_KEY = 'gamervault_cast_window_pos';
const STORAGE_SIZE_KEY = 'gamervault_cast_window_size';

export default function VaultCastFloatingWindow({
  isDetached = false,
  detachedWindow = null,
  mode = 'broadcaster', // 'broadcaster' | 'viewer'
  stream = null,
  isBroadcasting = false,
  watchingCast = null,
  elapsedTime = '00:00:00',
  viewerCount = 0,
  selectedSource = null,
  streamTitle = '',
  videoFilterStyle = '',
  monitorAudio = false,
  onToggleMonitorAudio = () => {},
  onCopyDiscord = () => {},
  copiedDiscord = false,
  onCopyDirectLink = () => {},
  copiedLink = false,
  onSwitchSource = () => {},
  onStopBroadcast = () => {},
  onStopWatching = () => {},
  onExpandModal = () => {},
  onClose = () => {}
}) {
  const videoRef = useRef(null);
  const windowRef = useRef(null);

  // Tamanhos e posições iniciais (usados no fallback in-app)
  const [pos, setPos] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_POS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return {
            x: Math.max(10, Math.min(window.innerWidth - 380, parsed.x)),
            y: Math.max(10, Math.min(window.innerHeight - 260, parsed.y))
          };
        }
      }
    } catch (_) {}
    return {
      x: Math.max(20, window.innerWidth - 560),
      y: Math.max(20, window.innerHeight - 380)
    };
  });

  const [size, setSize] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SIZE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.width === 'number' && typeof parsed.height === 'number') {
          return {
            width: Math.max(340, Math.min(window.innerWidth - 40, parsed.width)),
            height: Math.max(220, Math.min(window.innerHeight - 40, parsed.height))
          };
        }
      }
    } catch (_) {}
    return { width: 540, height: 360 };
  });

  const [osWindowDimensions, setOsWindowDimensions] = useState({
    width: detachedWindow?.innerWidth || 540,
    height: detachedWindow?.innerHeight || 360
  });

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [showPresetsMenu, setShowPresetsMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Monitora redimensionamento nativo da janela do sistema operacional (Windows)
  useEffect(() => {
    if (isDetached && detachedWindow) {
      const handleResize = () => {
        setOsWindowDimensions({
          width: detachedWindow.innerWidth,
          height: detachedWindow.innerHeight
        });
      };
      detachedWindow.addEventListener('resize', handleResize);
      return () => detachedWindow.removeEventListener('resize', handleResize);
    }
  }, [isDetached, detachedWindow]);

  // Conecta o MediaStream ao elemento de vídeo
  useEffect(() => {
    const el = videoRef.current;
    if (el && stream) {
      if (el.srcObject !== stream) {
        el.srcObject = stream;
        el.play().catch(err => console.warn('Erro ao reproduzir stream na janela destacada:', err));
      }
    }
  }, [stream]);

  // Aplica volume/mute ao vídeo
  useEffect(() => {
    if (videoRef.current) {
      if (mode === 'broadcaster') {
        videoRef.current.muted = !monitorAudio;
      } else {
        videoRef.current.muted = isMuted;
        videoRef.current.volume = isMuted ? 0 : volume;
      }
    }
  }, [mode, monitorAudio, isMuted, volume]);

  // Salva pos/size no localStorage para o modo in-app
  useEffect(() => {
    if (!isDetached) {
      try {
        localStorage.setItem(STORAGE_POS_KEY, JSON.stringify(pos));
        localStorage.setItem(STORAGE_SIZE_KEY, JSON.stringify(size));
      } catch (_) {}
    }
  }, [pos, size, isDetached]);

  // ----------------------------------------------------
  // PRESETS DE TAMANHO RÁPIDO
  // Se for janela destacada no Windows, chama resizeTo nativo do OS!
  // ----------------------------------------------------
  const applySizePreset = (w, h) => {
    if (isDetached && detachedWindow) {
      detachedWindow.resizeTo(w, h);
      setOsWindowDimensions({ width: w, height: h });
    } else {
      const maxX = Math.max(10, window.innerWidth - w - 10);
      const maxY = Math.max(10, window.innerHeight - h - 10);
      setSize({ width: w, height: h });
      setPos(prev => ({
        x: Math.min(prev.x, maxX),
        y: Math.min(prev.y, maxY)
      }));
    }
    setShowPresetsMenu(false);
    setIsCollapsed(false);
  };

  // Alterna tela cheia na janela destacada
  const handleToggleFullscreen = () => {
    const targetDoc = isDetached && detachedWindow ? detachedWindow.document : document;
    if (!targetDoc.fullscreenElement) {
      targetDoc.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      targetDoc.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // ----------------------------------------------------
  // DRAG & RESIZE PARA FALLBACK IN-APP (SE NÃO FOR DESTACADA)
  // ----------------------------------------------------
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, startX: 0, startY: 0 });
  const handleMouseDownHeader = (e) => {
    if (isDetached) return; // Na janela destacada, o Windows gerencia a movimentação nativamente!
    if (e.button !== 0 || e.target.closest('button') || e.target.closest('input')) return;
    e.preventDefault();

    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: pos.x,
      startY: pos.y
    };
    setIsDragging(true);

    const onMouseMove = (moveEvt) => {
      const deltaX = moveEvt.clientX - dragStartRef.current.mouseX;
      const deltaY = moveEvt.clientY - dragStartRef.current.mouseY;
      const currentWidth = isCollapsed ? 320 : size.width;
      const currentHeight = isCollapsed ? 46 : size.height;

      const maxX = Math.max(0, window.innerWidth - currentWidth - 10);
      const maxY = Math.max(0, window.innerHeight - currentHeight - 10);

      setPos({
        x: Math.max(10, Math.min(maxX, dragStartRef.current.startX + deltaX)),
        y: Math.max(10, Math.min(maxY, dragStartRef.current.startY + deltaY))
      });
    };

    const onMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleMouseDownResize = (e, handle = 'se') => {
    if (isDetached) return;
    e.preventDefault();
    e.stopPropagation();

    const startW = size.width;
    const startH = size.height;
    const startX = e.clientX;
    const startY = e.clientY;
    setIsResizing(true);

    const onMouseMove = (moveEvt) => {
      const deltaX = moveEvt.clientX - startX;
      const deltaY = moveEvt.clientY - startY;

      const minW = 340;
      const minH = 220;
      const maxW = Math.max(minW, window.innerWidth - pos.x - 10);
      const maxH = Math.max(minH, window.innerHeight - pos.y - 10);

      let newW = startW;
      let newH = startH;

      if (handle.includes('e')) newW = Math.max(minW, Math.min(maxW, startW + deltaX));
      if (handle.includes('s')) newH = Math.max(minH, Math.min(maxH, startH + deltaY));

      setSize({ width: Math.round(newW), height: Math.round(newH) });
    };

    const onMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const titleText = mode === 'broadcaster' 
    ? (streamTitle || selectedSource?.name || 'Sua Transmissão')
    : (watchingCast ? `${watchingCast.pilotName} - ${watchingCast.gameTitle}` : 'Transmissão da Guilda');

  // Dimensões exibidas no botão de preset
  const displayW = Math.round(isDetached ? osWindowDimensions.width : size.width);
  const displayH = Math.round(isDetached ? osWindowDimensions.height : size.height);

  return (
    <div
      ref={windowRef}
      style={isDetached ? {
        width: '100vw',
        height: '100vh',
        margin: 0,
        padding: 0
      } : {
        position: 'fixed',
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: isCollapsed ? '340px' : `${size.width}px`,
        height: isCollapsed ? 'auto' : `${size.height}px`,
        zIndex: 9998,
        transition: isDragging || isResizing ? 'none' : 'box-shadow 0.2s ease'
      }}
      className={`bg-[#0a0d16] text-white select-none flex flex-col overflow-hidden ${
        isDetached
          ? 'w-full h-full'
          : `rounded-2xl border border-[#23293d] shadow-[0_20px_60px_rgba(0,0,0,0.95),_0_0_30px_rgba(16,185,129,0.2)] backdrop-blur-2xl animate-fadeIn ${
              isDragging ? 'cursor-grabbing opacity-90' : ''
            }`
      }`}
    >
      {/* ---------------- CABEÇALHO DA JANELA DESTACADA ---------------- */}
      <div
        onMouseDown={handleMouseDownHeader}
        style={{ WebkitAppRegion: isDetached ? 'drag' : 'no-drag' }}
        className={`px-3 py-2 bg-[#0e1220] border-b border-[#1c2236] flex items-center justify-between gap-2 select-none ${
          !isDetached ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
        title={isDetached ? "Janela do Windows (Always-On-Top)" : "Arraste para mover a janela pela tela"}
      >
        {/* Lado Esquerdo: Status AO VIVO e Título */}
        <div className="flex items-center gap-2 min-w-0" style={{ WebkitAppRegion: 'no-drag' }}>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_#f43f5e]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 font-gamer">
              {mode === 'broadcaster' ? 'AO VIVO' : 'ASSISTINDO'}
            </span>
          </div>

          <span className="text-gray-600 text-xs shrink-0">•</span>

          <span 
            className="text-[11px] font-bold text-gray-200 truncate max-w-[150px] sm:max-w-[240px]"
            title={titleText}
          >
            {titleText}
          </span>

          {mode === 'broadcaster' && (
            <span className="text-[10px] font-mono text-gray-400 shrink-0">
              ({elapsedTime})
            </span>
          )}
        </div>

        {/* Lado Direito: Controles da Janela */}
        <div className="flex items-center gap-1 shrink-0" style={{ WebkitAppRegion: 'no-drag' }}>
          {/* Menu de Tamanhos / Presets (redimensiona a janela no Windows!) */}
          <div className="relative">
            <button
              onClick={() => setShowPresetsMenu(!showPresetsMenu)}
              title="Redimensionar tamanho da janela"
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1a2136] transition-colors text-[10px] font-mono flex items-center gap-1 cursor-pointer"
            >
              <span>{displayW}x{displayH}</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {showPresetsMenu && (
              <div className="absolute right-0 mt-1 w-44 rounded-xl bg-[#121626] border border-[#27304d] shadow-2xl py-1.5 z-50 text-xs font-mono backdrop-blur-md">
                <div className="px-2.5 py-1 text-[9px] uppercase tracking-wider text-gray-400 font-bold">
                  Tamanhos Pré-definidos
                </div>
                <button
                  onClick={() => applySizePreset(380, 260)}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-[#1f2742] text-gray-300 hover:text-white flex items-center justify-between cursor-pointer"
                >
                  <span>Compacto</span>
                  <span className="text-[10px] text-gray-500">380x260</span>
                </button>
                <button
                  onClick={() => applySizePreset(540, 360)}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-[#1f2742] text-gray-300 hover:text-white flex items-center justify-between cursor-pointer"
                >
                  <span>Médio (Padrão)</span>
                  <span className="text-[10px] text-gray-500">540x360</span>
                </button>
                <button
                  onClick={() => applySizePreset(720, 470)}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-[#1f2742] text-gray-300 hover:text-white flex items-center justify-between cursor-pointer"
                >
                  <span>Grande</span>
                  <span className="text-[10px] text-gray-500">720x470</span>
                </button>
                <button
                  onClick={() => applySizePreset(920, 580)}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-[#1f2742] text-gray-300 hover:text-white flex items-center justify-between cursor-pointer"
                >
                  <span>Cinema HD</span>
                  <span className="text-[10px] text-gray-500">920x580</span>
                </button>
              </div>
            )}
          </div>

          {/* Botão Tela Cheia */}
          <button
            onClick={handleToggleFullscreen}
            title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
            className="p-1.5 rounded-lg text-gray-400 hover:text-cyan-400 hover:bg-[#1a2136] transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* Voltar para o App GamerVault Principal */}
          <button
            onClick={onExpandModal}
            title="Voltar a live para dentro do Gamer's Vault"
            className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-400 hover:bg-[#1a2136] transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Voltar ao App</span>
          </button>

          {/* Fechar Janela / Encerrar Live ou Parar de Assistir */}
          <button
            onClick={() => {
              if (mode === 'broadcaster') {
                if (confirm('Deseja encerrar sua transmissão do VaultCast?')) {
                  onStopBroadcast();
                  onClose();
                }
              } else {
                onStopWatching();
                onClose();
              }
            }}
            title={mode === 'broadcaster' ? 'Encerrar Transmissão' : 'Parar de Assistir'}
            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-[#1a2136] transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ---------------- CORPO DA JANELA: VÍDEO & STAGE ---------------- */}
      {!isCollapsed && (
        <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center min-h-[140px] group">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            controls={false}
            style={{ filter: mode === 'broadcaster' ? videoFilterStyle : undefined }}
            className="w-full h-full object-contain"
          />

          {/* Badges Flutuantes sobre o Vídeo */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity pointer-events-none">
            {mode === 'viewer' && watchingCast && (
              <span className={`text-[9px] font-mono px-2 py-0.5 rounded backdrop-blur-md border ${
                watchingCast.engine === 'livekit'
                  ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300'
                  : 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
              }`}>
                {watchingCast.engine === 'livekit' ? '☁️ SFU' : '⚡ P2P'}
              </span>
            )}
            {mode === 'broadcaster' && (
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-black/70 backdrop-blur-md border border-gray-700 text-gray-300 flex items-center gap-1">
                <Users className="w-2.5 h-2.5 text-emerald-400" />
                <span>{viewerCount} espectador{viewerCount !== 1 ? 'es' : ''}</span>
              </span>
            )}
          </div>

          {/* Indicador de título no rodapé do vídeo */}
          <div className="absolute bottom-2 left-2 max-w-[70%] truncate px-2.5 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[10px] font-semibold text-gray-200 border border-white/10 pointer-events-none">
            {streamTitle || selectedSource?.name || (watchingCast ? watchingCast.gameTitle : 'Gameplay')}
          </div>
        </div>
      )}

      {/* ---------------- BARRA DE CONTROLES INFERIOR DA JANELA ---------------- */}
      {!isCollapsed && (
        <div className="px-3 py-2 bg-[#0c101c] border-t border-[#1c2236] flex items-center justify-between gap-2 shrink-0">
          {mode === 'broadcaster' ? (
            /* CONTROLES DO TRANSMISSOR */
            <>
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <button
                  onClick={onCopyDiscord}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white text-[11px] font-bold transition-all shadow cursor-pointer"
                  title="Copiar convite com embed do Discord"
                >
                  {copiedDiscord ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedDiscord ? 'Copiado!' : 'Discord'}</span>
                </button>

                <button
                  onClick={onCopyDirectLink}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-[#151a2c] hover:bg-[#1d253f] border border-[#273252] text-gray-300 hover:text-white text-[11px] transition-colors cursor-pointer"
                  title="Copiar link web direto"
                >
                  {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <ExternalLink className="w-3 h-3" />}
                  <span className="hidden sm:inline">{copiedLink ? 'Link Copiado' : 'Link Web'}</span>
                </button>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {/* Trocar Janela */}
                <button
                  onClick={onSwitchSource}
                  className="p-1.5 rounded-lg bg-[#151a2c] hover:bg-[#1d253f] border border-[#273252] text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                  title="Trocar Janela / Tela Transmitida"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                </button>

                {/* Retorno de Áudio */}
                <button
                  onClick={onToggleMonitorAudio}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    monitorAudio
                      ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-400'
                      : 'bg-[#151a2c] border-[#273252] text-gray-400 hover:text-white'
                  }`}
                  title={monitorAudio ? 'Mutar Retorno de Áudio' : 'Ouvir Retorno de Áudio'}
                >
                  {monitorAudio ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>

                {/* Encerrar Live */}
                <button
                  onClick={() => {
                    if (confirm('Deseja encerrar a live no VaultCast?')) {
                      onStopBroadcast();
                      onClose();
                    }
                  }}
                  className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 border border-rose-500/50 text-rose-300 hover:text-white transition-all ml-1 cursor-pointer"
                  title="Encerrar Transmissão"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              </div>
            </>
          ) : (
            /* CONTROLES DO ESPECTADOR (VIEWER) */
            <>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* Mute e Volume Slider */}
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-1.5 rounded-lg border transition-colors shrink-0 cursor-pointer ${
                    isMuted
                      ? 'bg-rose-950/60 border-rose-500/50 text-rose-400'
                      : 'bg-[#151a2c] border-[#273252] text-gray-300 hover:text-white'
                  }`}
                  title={isMuted ? 'Desmutar' : 'Mutar'}
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const newVol = parseFloat(e.target.value);
                    setVolume(newVol);
                    if (newVol > 0 && isMuted) setIsMuted(false);
                  }}
                  className="w-20 sm:w-28 h-1 bg-[#1a2136] rounded-lg appearance-none cursor-pointer accent-emerald-400"
                  title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                />
                <span className="text-[10px] font-mono text-gray-400 shrink-0">
                  {Math.round((isMuted ? 0 : volume) * 100)}%
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => {
                    onStopWatching();
                    onClose();
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 border border-rose-500/50 text-rose-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
                  title="Parar de assistir transmissão"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Desconectar</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Alças de redimensionamento in-app (se não for janela destacada no Windows) */}
      {!isDetached && !isCollapsed && (
        <>
          <div
            onMouseDown={(e) => handleMouseDownResize(e, 'e')}
            className="absolute top-8 right-0 w-2 h-[calc(100%-16px)] cursor-ew-resize hover:bg-emerald-500/30 transition-colors z-20"
            title="Redimensionar largura"
          />
          <div
            onMouseDown={(e) => handleMouseDownResize(e, 's')}
            className="absolute bottom-0 left-0 w-full h-2 cursor-ns-resize hover:bg-emerald-500/30 transition-colors z-20"
            title="Redimensionar altura"
          />
          <div
            onMouseDown={(e) => handleMouseDownResize(e, 'se')}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize hover:bg-emerald-500/40 rounded-br-2xl transition-colors z-30 flex items-end justify-end p-0.5"
            title="Arraste para redimensionar livremente a janela"
          >
            <div className="w-2 h-2 border-r-2 border-b-2 border-emerald-400/80 rounded-br-xs" />
          </div>
        </>
      )}
    </div>
  );
}
