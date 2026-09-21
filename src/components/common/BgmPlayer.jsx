import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  Volume2,
  VolumeX,
  Disc3,
  Sliders,
  AlertCircle
} from 'lucide-react';
import { BGM_PLAYLIST } from '../../config/bgmPlaylist';

// Embaralha as faixas com Fisher-Yates
function shufflePlaylist(tracks) {
  const arr = [...tracks];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function BgmPlayer() {
  const [playlist, setPlaylist] = useState(() => shufflePlaylist(BGM_PLAYLIST));
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('gamervault_bgm_volume');
    return saved !== null ? Number(saved) : 0.15; // 15% por padrão
  });
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('gamervault_bgm_muted') === 'true';
  });

  const [showToast, setShowToast] = useState(false);
  const [toastTrack, setToastTrack] = useState(null);
  const [showMissingNotice, setShowMissingNotice] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const audioRef = useRef(null);
  const wasPlayingBeforeModal = useRef(false);
  const toastTimeoutRef = useRef(null);
  const volumeHoverTimeoutRef = useRef(null);
  const userManuallyPausedRef = useRef(false);
  const hasStartedRef = useRef(false);

  const currentTrack = playlist[currentTrackIndex] || playlist[0] || BGM_PLAYLIST[0];

  // Configura volume inicial no elemento de áudio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Autoplay da música ao iniciar o app (aguarda intro/splash terminar)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let cleanupListeners = () => {};

    const startPlayback = () => {
      if (userManuallyPausedRef.current || hasStartedRef.current) return;

      audio.volume = isMuted ? 0 : volume;
      audio
        .play()
        .then(() => {
          hasStartedRef.current = true;
          setIsPlaying(true);
          triggerNowPlayingToast(currentTrack);
        })
        .catch(() => {
          // Caso a política de autoplay do browser exija primeira interação
          const onFirstInteraction = () => {
            if (userManuallyPausedRef.current || hasStartedRef.current) return;
            audio
              .play()
              .then(() => {
                hasStartedRef.current = true;
                setIsPlaying(true);
                triggerNowPlayingToast(currentTrack);
              })
              .catch(() => {});
          };

          window.addEventListener('click', onFirstInteraction, { once: true });
          window.addEventListener('keydown', onFirstInteraction, { once: true });
          window.addEventListener('pointerdown', onFirstInteraction, { once: true });

          cleanupListeners = () => {
            window.removeEventListener('click', onFirstInteraction);
            window.removeEventListener('keydown', onFirstInteraction);
            window.removeEventListener('pointerdown', onFirstInteraction);
          };
        });
    };

    // Inicia assim que a intro/splash finalizar
    const handleSplashFinished = () => {
      startPlayback();
    };

    window.addEventListener('gamervault:splash-finished', handleSplashFinished, { once: true });

    // Fallback: caso a splash já tenha sido concluída ou pulada antes da montagem
    const initialTimer = setTimeout(() => {
      startPlayback();
    }, 500);

    return () => {
      clearTimeout(initialTimer);
      window.removeEventListener('gamervault:splash-finished', handleSplashFinished);
      cleanupListeners();
    };
  }, []);

  // Exibe a notificação estilo EA Trax quando uma faixa começa a tocar
  const triggerNowPlayingToast = (track) => {
    setToastTrack(track);
    setShowToast(true);

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setShowToast(false);
    }, 3800);
  };

  // Trata início e pausa da reprodução
  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      userManuallyPausedRef.current = true;
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      userManuallyPausedRef.current = false;
      audioRef.current
        .play()
        .then(() => {
          hasStartedRef.current = true;
          setIsPlaying(true);
          triggerNowPlayingToast(currentTrack);
        })
        .catch(() => {
          setIsPlaying(false);
          setShowMissingNotice(true);
          setTimeout(() => setShowMissingNotice(false), 5000);
        });
    }
  };

  // Pular para a próxima faixa (Loop na playlist embaralhada)
  const nextTrack = () => {
    let nextIndex = currentTrackIndex + 1;
    let currentPl = playlist;

    // Se chegou ao final da playlist embaralhada, gera um novo shuffle aleatório e recomeça
    if (nextIndex >= currentPl.length) {
      const reshuffled = shufflePlaylist(BGM_PLAYLIST);
      setPlaylist(reshuffled);
      currentPl = reshuffled;
      nextIndex = 0;
    }

    setCurrentTrackIndex(nextIndex);
    const nextTrk = currentPl[nextIndex];

    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
            triggerNowPlayingToast(nextTrk);
          })
          .catch(() => {
            setIsPlaying(false);
            setShowMissingNotice(true);
            setTimeout(() => setShowMissingNotice(false), 5000);
          });
      }
    }, 100);
  };

  // Quando a música atual chega ao final
  const handleTrackEnded = () => {
    nextTrack();
  };

  // Silencia erros 404 de áudio caso o usuário ainda não tenha colado os MP3s
  const handleAudioError = () => {
    setIsPlaying(false);
  };

  // Ajuste de Volume
  const handleVolumeChange = (e) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    localStorage.setItem('gamervault_bgm_volume', String(newVol));
    if (isMuted && newVol > 0) {
      setIsMuted(false);
      localStorage.setItem('gamervault_bgm_muted', 'false');
    }
  };

  // Alternar Mudo
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    localStorage.setItem('gamervault_bgm_muted', String(nextMuted));
  };

  // Handlers para hover suave do slider de volume com tolerância (debounce)
  const handleVolumeMouseEnter = () => {
    if (volumeHoverTimeoutRef.current) {
      clearTimeout(volumeHoverTimeoutRef.current);
      volumeHoverTimeoutRef.current = null;
    }
    setShowVolumeSlider(true);
  };

  const handleVolumeMouseLeave = () => {
    if (volumeHoverTimeoutRef.current) {
      clearTimeout(volumeHoverTimeoutRef.current);
    }
    volumeHoverTimeoutRef.current = setTimeout(() => {
      setShowVolumeSlider(false);
    }, 350);
  };

  // Limpa timeout ao desmontar
  useEffect(() => {
    return () => {
      if (volumeHoverTimeoutRef.current) {
        clearTimeout(volumeHoverTimeoutRef.current);
      }
    };
  }, []);

  // Escuta os eventos globais disparados quando o modal de tema do YouTube abre/fecha
  useEffect(() => {
    const handlePauseFromModal = () => {
      if (audioRef.current && isPlaying) {
        wasPlayingBeforeModal.current = true;
        audioRef.current.pause();
        setIsPlaying(false);
      }
    };

    const handleResumeFromModal = () => {
      if (audioRef.current && wasPlayingBeforeModal.current) {
        wasPlayingBeforeModal.current = false;
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {});
      }
    };

    window.addEventListener('gamervault:pause-bgm', handlePauseFromModal);
    window.addEventListener('gamervault:resume-bgm', handleResumeFromModal);

    return () => {
      window.removeEventListener('gamervault:pause-bgm', handlePauseFromModal);
      window.removeEventListener('gamervault:resume-bgm', handleResumeFromModal);
    };
  }, [isPlaying]);

  return (
    <>
      {/* Elemento de áudio invisível */}
      <audio
        ref={audioRef}
        src={currentTrack.src}
        onEnded={handleTrackEnded}
        onError={handleAudioError}
        preload="auto"
      />

      {/* Widget de Controle no Topo (Renderizado dentro do Navbar ou fixo) */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface/85 border border-border backdrop-blur-md select-none transition-colors">
        {/* Ícone de Disco Giratório / Equalizador */}
        <div
          className={`flex items-center justify-center w-6 h-6 rounded-md transition-colors ${
            isPlaying
              ? 'bg-accent-bright/20 text-accent-bright'
              : 'bg-surface-high text-gray-500'
          }`}
          title={isPlaying ? `Tocando: ${currentTrack.title}` : 'Trilha Sonora de Fundo'}
        >
          <Disc3
            className={`w-3.5 h-3.5 ${isPlaying ? 'animate-spin' : ''}`}
            style={{ animationDuration: '3s' }}
          />
        </div>

        {/* Botão Play / Pause */}
        <button
          onClick={togglePlay}
          className="p-1 rounded-md text-gray-300 hover:text-white hover:bg-surface-high transition-all active:scale-90"
          title={isPlaying ? 'Pausar Trilha de Fundo' : 'Tocar Trilha Sonora (FIFA Style)'}
        >
          {isPlaying ? (
            <Pause className="w-3.5 h-3.5 text-accent-bright fill-accent-bright" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-gray-300" />
          )}
        </button>

        {/* Botão Próxima Faixa */}
        <button
          onClick={nextTrack}
          className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-surface-high transition-all active:scale-90"
          title="Próxima Faixa"
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>

        {/* Botão Mudo / Slider de Volume */}
        <div
          className="relative flex items-center"
          onMouseEnter={handleVolumeMouseEnter}
          onMouseLeave={handleVolumeMouseLeave}
        >
          <button
            onClick={toggleMute}
            className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-surface-high transition-all active:scale-90"
            title={isMuted ? 'Desativar Mudo' : 'Silenciar'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-gray-300" />
            )}
          </button>

          {/* Slider flutuante de volume no hover (com ponte invisível de padding para não sumir ao descer o cursor) */}
          {showVolumeSlider && (
            <div
              className="absolute top-full right-0 pt-2 z-50 animate-in fade-in duration-150"
              onMouseEnter={handleVolumeMouseEnter}
              onMouseLeave={handleVolumeMouseLeave}
            >
              <div className="p-2 rounded-lg bg-[#12151f] border border-border/90 shadow-2xl flex items-center gap-2 backdrop-blur-xl">
                <input
                  type="range"
                  min="0"
                  max="0.6"
                  step="0.02"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-24 h-1.5 accent-accent-bright bg-surface-high rounded-lg cursor-pointer"
                  title={`Volume: ${Math.round(((isMuted ? 0 : volume) * 100) / 0.6)}%`}
                />
                <span className="font-mono text-[10px] text-gray-300 w-7 text-right">
                  {Math.round(((isMuted ? 0 : volume) * 100) / 0.6)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notificação Flutuante "Now Playing" (Estilo EA Trax do FIFA) */}
      {showToast && toastTrack && (
        <div className="fixed bottom-6 right-6 z-50 animate-ea-trax-in bg-surface-container/95 backdrop-blur-xl border border-accent-bright/40 shadow-[0_0_25px_rgba(0,0,0,0.8)] rounded-xl p-3 flex items-center gap-3.5 max-w-sm pointer-events-auto select-none">
          <div className="w-10 h-10 rounded-lg bg-accent-bright/15 border border-accent-bright/30 flex items-center justify-center flex-shrink-0">
            <Disc3
              className="w-5 h-5 text-accent-bright animate-spin"
              style={{ animationDuration: '4s' }}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <span className="text-[9px] font-mono uppercase tracking-widest text-accent-bright font-bold">
                EA Trax • Trilha Sonora
              </span>
              <div className="flex items-end gap-0.5 h-2.5">
                <span className="w-0.5 bg-accent-bright animate-eq-1" />
                <span className="w-0.5 bg-accent-bright animate-eq-2" />
                <span className="w-0.5 bg-accent-bright animate-eq-3" />
                <span className="w-0.5 bg-accent-bright animate-eq-4" />
              </div>
            </div>

            <p className="text-xs font-bold text-white truncate">
              {toastTrack.title}
            </p>
            <p className="text-[11px] text-gray-400 truncate">
              {toastTrack.artist}
            </p>
          </div>
        </div>
      )}

      {/* Aviso discreto caso os arquivos MP3 ainda não tenham sido adicionados */}
      {showMissingNotice && (
        <div className="fixed bottom-6 right-6 z-50 animate-ea-trax-in bg-[#1a1215]/95 backdrop-blur-xl border border-rose-500/40 shadow-2xl rounded-xl p-3 flex items-center gap-3 max-w-sm pointer-events-auto select-none">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-rose-200">Músicas não encontradas</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Adicione seus arquivos MP3 na pasta <span className="font-mono text-rose-300">public/bgm/</span>.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
