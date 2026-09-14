import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Music } from 'lucide-react';

export default function YouTubeThemePlayer({ themeUrl, gameTitle }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(70);
  const audioRef = useRef(null);

  if (!themeUrl) return null;

  // Extrai o ID do YouTube se for um link do YouTube
  const getYouTubeId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : null;
  };

  const youtubeId = getYouTubeId(themeUrl);
  const isDirectAudio = themeUrl.match(/\.(mp3|wav|ogg|m4a)($|\?)/i);

  // Efeito para áudio direto
  useEffect(() => {
    if (isDirectAudio && audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
      if (isPlaying) {
        audioRef.current.play().catch(() => setIsPlaying(false));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, isMuted, volume, isDirectAudio]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-surface-container/90 border border-border hover:border-accent/40 transition-all shadow-md">
      {/* Ícone & Status */}
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-full ${isPlaying ? 'bg-accent/20 text-accent-bright animate-pulse' : 'bg-surface text-gray-400'}`}>
          <Music className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-mono tracking-wider uppercase text-gray-400">Trilha Sonora Tema</span>
          <span className="text-xs font-semibold text-white truncate max-w-[140px] sm:max-w-[180px]">
            {gameTitle}
          </span>
        </div>
      </div>

      {/* Animação de Equalizador Neon */}
      {isPlaying && (
        <div className="hidden sm:flex items-end gap-1 h-5 px-2">
          <span className="w-1 bg-accent-bright rounded-full animate-eq-1"></span>
          <span className="w-1 bg-accent-bright rounded-full animate-eq-2"></span>
          <span className="w-1 bg-accent-bright rounded-full animate-eq-3"></span>
          <span className="w-1 bg-accent-bright rounded-full animate-eq-4"></span>
        </div>
      )}

      {/* Controles */}
      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={togglePlay}
          className={`flex items-center justify-center w-8 h-8 rounded-full font-medium transition-all ${
            isPlaying
              ? 'bg-accent-bright text-black shadow-neon-green'
              : 'bg-surface-high text-white hover:bg-surface-higher'
          }`}
          title={isPlaying ? 'Pausar música' : 'Tocar música tema'}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        <button
          onClick={() => setIsMuted(!isMuted)}
          className="p-1.5 rounded-md text-gray-400 hover:text-white transition-colors"
          title={isMuted ? 'Ativar som' : 'Silenciar'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Slider de Volume */}
        <input
          type="range"
          min="0"
          max="100"
          value={isMuted ? 0 : volume}
          onChange={(e) => {
            setVolume(Number(e.target.value));
            if (isMuted) setIsMuted(false);
          }}
          className="w-16 h-1.5 bg-surface-high rounded-lg appearance-none cursor-pointer accent-accent-bright"
        />
      </div>

      {/* Renderização Headless do YouTube sem abrir o navegador */}
      {youtubeId && isPlaying && (
        <div className="absolute opacity-0 pointer-events-none w-1 h-1 overflow-hidden">
          <iframe
            id="gamervault-yt-player"
            width="200"
            height="200"
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&controls=0&enablejsapi=1&mute=${isMuted ? 1 : 0}`}
            title="Audio Theme Player"
            allow="autoplay"
          ></iframe>
        </div>
      )}

      {/* Elemento de áudio para arquivos diretos */}
      {isDirectAudio && (
        <audio ref={audioRef} src={themeUrl} loop />
      )}
    </div>
  );
}
