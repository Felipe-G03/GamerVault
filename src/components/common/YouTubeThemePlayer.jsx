import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Music, Volume2, VolumeX } from 'lucide-react';

export function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return null;
  const cleanUrl = url.trim();

  // Suporte a todos os formatos comuns do YouTube
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/;
  const match = cleanUrl.match(regExp);
  if (match && match[1]) return match[1];

  // Caso tenham colado apenas o ID de 11 caracteres
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) {
    return cleanUrl;
  }

  return null;
}

export default function YouTubeThemePlayer({ themeUrl, gameTitle }) {
  // Inicia tocando automaticamente ao abrir o modal
  const [isPlaying, setIsPlaying] = useState(true);
  
  // Volume inicia bem mais baixo (25% por padrão) para não assustar o usuário
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('gamervault_theme_volume');
    return saved !== null ? Number(saved) : 0.25;
  });
  const [isMuted, setIsMuted] = useState(false);

  const audioRef = useRef(null);
  const iframeRef = useRef(null);

  // Pausa automaticamente a música de fundo (BGM) do Gamer's Vault enquanto a música tema estiver aberta
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('gamervault:pause-bgm'));
    return () => {
      window.dispatchEvent(new CustomEvent('gamervault:resume-bgm'));
    };
  }, []);

  if (!themeUrl) return null;

  const youtubeId = extractYouTubeId(themeUrl);
  const isDirectAudio = themeUrl.match(/\.(mp3|wav|ogg|m4a)($|\?)/i);

  // Envia comando para a API do iframe do YouTube
  const sendYouTubeCommand = (func, args = []) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func, args }),
          '*'
        );
      } catch (e) {}
    }
  };

  // Efeito para áudio direto
  useEffect(() => {
    if (isDirectAudio && audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
      if (isPlaying) {
        audioRef.current.play().catch(() => setIsPlaying(false));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, isDirectAudio, volume, isMuted]);

  // Aplica volume no player do YouTube ao carregar
  const handleIframeLoad = () => {
    setTimeout(() => {
      const initialVol = isMuted ? 0 : Math.round(volume * 100);
      sendYouTubeCommand('setVolume', [initialVol]);
      if (isMuted) sendYouTubeCommand('mute');
    }, 400);
  };

  const handleVolumeChange = (e) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    localStorage.setItem('gamervault_theme_volume', String(newVol));
    
    if (isMuted && newVol > 0) {
      setIsMuted(false);
    }
    
    const targetPercent = Math.round(newVol * 100);
    sendYouTubeCommand('unMute');
    sendYouTubeCommand('setVolume', [targetPercent]);

    if (audioRef.current) {
      audioRef.current.volume = newVol;
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (nextMuted) {
      sendYouTubeCommand('mute');
    } else {
      sendYouTubeCommand('unMute');
      sendYouTubeCommand('setVolume', [Math.round(volume * 100)]);
    }

    if (audioRef.current) {
      audioRef.current.volume = nextMuted ? 0 : volume;
    }
  };

  const togglePlay = () => {
    const nextPlay = !isPlaying;
    setIsPlaying(nextPlay);
    if (nextPlay) {
      sendYouTubeCommand('playVideo');
      sendYouTubeCommand('setVolume', [isMuted ? 0 : Math.round(volume * 100)]);
    } else {
      sendYouTubeCommand('pauseVideo');
    }
  };

  return (
    <div className="rounded-xl bg-surface-container/90 border border-border overflow-hidden shadow-lg transition-all">
      {/* Barra de Controle de Áudio */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 flex-wrap sm:flex-nowrap">
        {/* Ícone e Nome da Trilha */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className={`p-2 rounded-full shrink-0 transition-colors ${isPlaying ? 'bg-accent/20 text-accent-bright animate-pulse' : 'bg-surface text-gray-400'}`}>
            <Music className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-mono tracking-wider uppercase text-accent-bright font-semibold">
              Música Tema do Jogo
            </span>
            <span className="text-xs font-semibold text-white truncate max-w-[180px] sm:max-w-[280px]">
              {gameTitle}
            </span>
          </div>
        </div>

        {/* Equalizador Neon quando tocando */}
        {isPlaying && (
          <div className="hidden md:flex items-end gap-1 h-5 px-2">
            <span className="w-1 bg-accent-bright rounded-full animate-eq-1"></span>
            <span className="w-1 bg-accent-bright rounded-full animate-eq-2"></span>
            <span className="w-1 bg-accent-bright rounded-full animate-eq-3"></span>
            <span className="w-1 bg-accent-bright rounded-full animate-eq-4"></span>
          </div>
        )}

        {/* Controles: Slider de Volume + Botão Play/Pause */}
        <div className="flex items-center gap-2.5 shrink-0 ml-auto">
          {/* Controle Deslizante de Volume */}
          <div className="flex items-center gap-1.5 bg-surface/70 px-2.5 py-1 rounded-lg border border-border/80">
            <button
              type="button"
              onClick={toggleMute}
              className="text-gray-400 hover:text-white transition-colors cursor-pointer"
              title={isMuted ? 'Ativar Som' : 'Silenciar'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-accent-bright" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-14 sm:w-20 h-1.5 rounded-lg bg-surface-high accent-accent-bright cursor-pointer"
              title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
            />
            <span className="text-[10px] font-mono text-gray-400 w-7 text-right">
              {Math.round((isMuted ? 0 : volume) * 100)}%
            </span>
          </div>

          {/* Botão Play / Pause */}
          <button
            onClick={togglePlay}
            className={`flex items-center justify-center w-8 h-8 rounded-full font-bold transition-all shadow-md active:scale-95 cursor-pointer ${
              isPlaying
                ? 'bg-accent-bright text-black shadow-neon-green'
                : 'bg-surface-high hover:bg-surface-higher text-white border border-border'
            }`}
            title={isPlaying ? 'Pausar música tema' : 'Tocar música tema'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
          </button>
        </div>
      </div>

      {/* Mini-player invisível do YouTube com enablejsapi=1 e controle de volume via postMessage */}
      {youtubeId && isPlaying && (
        <div className="w-0 h-0 overflow-hidden opacity-0 pointer-events-none absolute -z-50">
          <iframe
            ref={iframeRef}
            id="gamervault-yt-player"
            className="w-1 h-1"
            onLoad={handleIframeLoad}
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&mute=0&rel=0&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')}`}
            title="YouTube Game Soundtrack Player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      )}

      {/* Elemento de áudio para arquivos diretos */}
      {isDirectAudio && (
        <audio ref={audioRef} src={themeUrl} loop />
      )}
    </div>
  );
}

