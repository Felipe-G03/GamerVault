import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Music, Tv, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const audioRef = useRef(null);

  if (!themeUrl) return null;

  const youtubeId = extractYouTubeId(themeUrl);
  const isDirectAudio = themeUrl.match(/\.(mp3|wav|ogg|m4a)($|\?)/i);

  // Efeito para áudio direto
  useEffect(() => {
    if (isDirectAudio && audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(() => setIsPlaying(false));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, isDirectAudio]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="rounded-xl bg-[#12141d] border border-border overflow-hidden shadow-lg transition-all">
      {/* Barra de Controle de Áudio */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-surface-container/90">
        {/* Ícone e Nome da Trilha */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`p-2 rounded-full shrink-0 ${isPlaying ? 'bg-accent/20 text-accent-bright animate-pulse' : 'bg-surface text-gray-400'}`}>
            <Music className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-mono tracking-wider uppercase text-accent-bright font-semibold">
              Música Tema do Jogo
            </span>
            <span className="text-xs font-semibold text-white truncate max-w-[200px] sm:max-w-[280px]">
              {gameTitle}
            </span>
          </div>
        </div>

        {/* Equalizador Neon quando tocando */}
        {isPlaying && (
          <div className="hidden sm:flex items-end gap-1 h-5 px-3">
            <span className="w-1 bg-accent-bright rounded-full animate-eq-1"></span>
            <span className="w-1 bg-accent-bright rounded-full animate-eq-2"></span>
            <span className="w-1 bg-accent-bright rounded-full animate-eq-3"></span>
            <span className="w-1 bg-accent-bright rounded-full animate-eq-4"></span>
          </div>
        )}

        {/* Controles Principais */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Botão para alternar exibição do mini-player de vídeo */}
          {youtubeId && (
            <button
              onClick={() => setShowVideo(!showVideo)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                showVideo ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-surface hover:bg-surface-high text-gray-400'
              }`}
              title={showVideo ? 'Ocultar tela do vídeo' : 'Exibir tela do vídeo'}
            >
              <Tv className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{showVideo ? 'Ocultar Vídeo' : 'Ver Vídeo'}</span>
            </button>
          )}

          {/* Botão Play / Pause */}
          <button
            onClick={togglePlay}
            className={`flex items-center justify-center w-9 h-9 rounded-full font-bold transition-all shadow-md active:scale-95 ${
              isPlaying
                ? 'bg-accent-bright text-black shadow-neon-green'
                : 'bg-surface-high hover:bg-surface-higher text-white border border-border'
            }`}
            title={isPlaying ? 'Pausar música' : 'Tocar música tema'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>
        </div>
      </div>

      {/* Mini-player de Vídeo YouTube Embutido */}
      {youtubeId && (
        <div
          className={`transition-all duration-300 overflow-hidden bg-black ${
            isPlaying || showVideo ? 'max-h-64 border-t border-border' : 'max-h-0'
          }`}
        >
          <div className="relative aspect-video max-w-sm sm:max-w-md mx-auto my-2 rounded-lg overflow-hidden border border-border/80 shadow-2xl">
            <iframe
              id="gamervault-yt-player"
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${youtubeId}?enablejsapi=1&autoplay=${isPlaying ? 1 : 0}&mute=0&rel=0&origin=${encodeURIComponent(
                typeof window !== 'undefined' ? window.location.origin : '*'
              )}`}
              title="YouTube Game Soundtrack Player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}

      {/* Elemento de áudio para arquivos diretos */}
      {isDirectAudio && (
        <audio ref={audioRef} src={themeUrl} loop />
      )}
    </div>
  );
}
