import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  Volume2,
  VolumeX,
  Disc3,
  ListMusic,
  AlertCircle
} from 'lucide-react';
import {
  getCachedLibrary,
  syncGitHubTracks,
  getPlayableAudioUrl,
  shuffleTracks
} from '../../services/bgmService';
import BgmFloatingCard from './BgmFloatingCard';

export default function BgmPlayer() {
  // Inicialização com cache local para zero delay
  const [library, setLibrary] = useState(() => {
    const cached = getCachedLibrary();
    if (cached && Array.isArray(cached.allTracks) && cached.allTracks.length > 0) {
      return cached;
    }
    return {
      collections: ['All'],
      tracksByCollection: { All: [] },
      allTracks: []
    };
  });

  const [selectedCollection, setSelectedCollection] = useState('All');
  const [isShuffle, setIsShuffle] = useState(true);
  const [playlist, setPlaylist] = useState(() => {
    const cached = getCachedLibrary();
    const initialList = (cached && Array.isArray(cached.allTracks) && cached.allTracks.length > 0) ? cached.allTracks : [];
    return shuffleTracks(initialList);
  });

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
  const [showFloatingCard, setShowFloatingCard] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [activeTrack, setActiveTrack] = useState(() => {
    const cached = getCachedLibrary();
    const initialList = (cached && Array.isArray(cached.allTracks) && cached.allTracks.length > 0) ? cached.allTracks : [];
    return initialList[0] || null;
  });

  const audioRef = useRef(null);
  const wasPlayingBeforeModal = useRef(false);
  const toastTimeoutRef = useRef(null);
  const volumeHoverTimeoutRef = useRef(null);
  const userManuallyPausedRef = useRef(false);
  const hasStartedRef = useRef(false);

  const currentTrack = activeTrack || playlist[currentTrackIndex] || playlist[0] || library.allTracks[0] || null;

  // Configura volume no elemento de áudio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Função centralizada para tocar qualquer faixa por índice sem conflitos de re-render
  const playTrackAtIndex = async (index, trackList = playlist) => {
    if (!trackList || trackList.length === 0) return;
    const clampedIndex = (index + trackList.length) % trackList.length;
    setCurrentTrackIndex(clampedIndex);
    const targetTrack = trackList[clampedIndex];
    if (!targetTrack) return;

    setActiveTrack(targetTrack);

    const url = await getPlayableAudioUrl(targetTrack);
    if (!url || !audioRef.current) return;

    if (audioRef.current.src !== url) {
      audioRef.current.src = url;
    }
    audioRef.current.volume = isMuted ? 0 : volume;

    try {
      await audioRef.current.play();
      hasStartedRef.current = true;
      setIsPlaying(true);
      triggerNowPlayingToast(targetTrack);
    } catch (err) {
      console.warn('Erro ao tocar faixa:', err);
    }
  };

  // Sincronização em segundo plano com o GitHub sem atrasar o início do som
  useEffect(() => {
    setIsSyncing(true);
    syncGitHubTracks()
      .then((updatedLib) => {
        if (updatedLib && Array.isArray(updatedLib.allTracks) && updatedLib.allTracks.length > 0) {
          setLibrary(updatedLib);
          if (selectedCollection === 'All') {
            const list = isShuffle ? shuffleTracks(updatedLib.allTracks) : updatedLib.allTracks;
            setPlaylist(list);
            if (!hasStartedRef.current && !userManuallyPausedRef.current && list.length > 0) {
              playTrackAtIndex(0, list);
            }
          } else if (updatedLib.tracksByCollection[selectedCollection]) {
            const list = updatedLib.tracksByCollection[selectedCollection];
            setPlaylist(isShuffle ? shuffleTracks(list) : list);
          }
        }
      })
      .catch((err) => {
        console.warn('Erro ao atualizar músicas do GitHub:', err);
      })
      .finally(() => {
        setIsSyncing(false);
      });
  }, []);

  // Autoplay da música ao iniciar o app (milissegundo zero / após splash)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let cleanupListeners = () => {};

    const startInitialPlayback = async () => {
      if (userManuallyPausedRef.current || hasStartedRef.current) return;

      const firstTrack = playlist[0] || library.allTracks[0] || null;
      if (!firstTrack) return;

      setActiveTrack(firstTrack);

      const url = await getPlayableAudioUrl(firstTrack);
      if (!url || !audioRef.current || userManuallyPausedRef.current) return;

      audioRef.current.src = url;
      audioRef.current.volume = isMuted ? 0 : volume;

      audioRef.current
        .play()
        .then(() => {
          hasStartedRef.current = true;
          setIsPlaying(true);
          triggerNowPlayingToast(firstTrack);
        })
        .catch(() => {
          const onFirstInteraction = () => {
            if (userManuallyPausedRef.current || hasStartedRef.current) return;
            setActiveTrack(firstTrack);
            audioRef.current
              ?.play()
              .then(() => {
                hasStartedRef.current = true;
                setIsPlaying(true);
                triggerNowPlayingToast(firstTrack);
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

    window.addEventListener('gamervault:splash-finished', startInitialPlayback, { once: true });

    const initialTimer = setTimeout(() => {
      startInitialPlayback();
    }, 400);

    return () => {
      clearTimeout(initialTimer);
      window.removeEventListener('gamervault:splash-finished', startInitialPlayback);
      cleanupListeners();
    };
  }, []);

  // Exibe a notificação estilo EA Trax quando uma faixa começa a tocar
  const triggerNowPlayingToast = (track) => {
    if (!track) return;
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
      if (!audioRef.current.src && currentTrack) {
        playTrackAtIndex(currentTrackIndex, playlist);
        return;
      }

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

  // Pular para a próxima faixa
  const nextTrack = () => {
    let nextIndex = currentTrackIndex + 1;
    let currentPl = playlist;

    if (nextIndex >= currentPl.length) {
      const activeList = library.tracksByCollection[selectedCollection] || library.allTracks;
      const reshuffled = isShuffle ? shuffleTracks(activeList) : activeList;
      setPlaylist(reshuffled);
      currentPl = reshuffled;
      nextIndex = 0;
    }

    playTrackAtIndex(nextIndex, currentPl);
  };

  // Tocar uma faixa específica escolhida no Card Flutuante (1 clique imediato)
  const handlePlaySpecificTrack = async (track) => {
    userManuallyPausedRef.current = false;

    // Se a faixa já for a que está tocando e estava pausada, apenas dá play
    if ((activeTrack?.id === track.id || activeTrack?.title === track.title) && audioRef.current?.src) {
      if (!isPlaying && audioRef.current) {
        audioRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
            triggerNowPlayingToast(track);
          })
          .catch(() => {});
        return;
      }
    }

    // Ao selecionar uma faixa, define a playlist baseada na coleção atualmente selecionada no card
    const colTracks =
      selectedCollection === 'All'
        ? library.allTracks
        : library.tracksByCollection[selectedCollection] || library.allTracks;

    const baseList = colTracks.length > 0 ? colTracks : [track];
    let newPl;
    if (isShuffle) {
      const rest = baseList.filter((t) => (t.id || t.title) !== (track.id || track.title));
      newPl = [track, ...shuffleTracks(rest)];
    } else {
      newPl = [...baseList];
    }

    const foundIdx = newPl.findIndex((t) => (t.id || t.title) === (track.id || track.title));
    const targetIdx = foundIdx >= 0 ? foundIdx : 0;

    setPlaylist(newPl);
    playTrackAtIndex(targetIdx, newPl);
  };

  // Troca de Coleção/Álbum (com "All" como padrão inicial)
  const handleSelectCollection = (collectionName) => {
    setSelectedCollection(collectionName);
    // NÃO toca automaticamente nem interrompe a faixa em reprodução.
    // Apenas a lista exibida no card muda para as faixas desta pasta.
  };

  // Alterna Modo Aleatório
  const handleToggleShuffle = () => {
    const nextShuffle = !isShuffle;
    setIsShuffle(nextShuffle);

    const activeList =
      selectedCollection === 'All'
        ? library.allTracks
        : library.tracksByCollection[selectedCollection] || library.allTracks;

    if (nextShuffle) {
      setPlaylist(shuffleTracks(activeList));
    } else {
      setPlaylist([...activeList]);
    }
  };

  // Sincronização manual com GitHub a partir do botão no card
  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const updatedLib = await syncGitHubTracks();
      if (updatedLib && updatedLib.allTracks?.length > 0) {
        setLibrary(updatedLib);
        const colList = updatedLib.tracksByCollection[selectedCollection] || updatedLib.allTracks;
        setPlaylist(isShuffle ? shuffleTracks(colList) : colList);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Volume Handlers
  const handleVolumeChange = (e) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    localStorage.setItem('gamervault_bgm_volume', String(newVol));
    if (isMuted && newVol > 0) {
      setIsMuted(false);
      localStorage.setItem('gamervault_bgm_muted', 'false');
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    localStorage.setItem('gamervault_bgm_muted', String(nextMuted));
  };

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

  // Escuta os eventos globais de pausa/retomada disparados por modais ou standby da bandeja
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

  const currentCollectionTracks =
    selectedCollection === 'All'
      ? library.allTracks
      : library.tracksByCollection[selectedCollection] || [];

  return (
    <>
      {/* Elemento de áudio invisível */}
      <audio
        ref={audioRef}
        onEnded={nextTrack}
        onError={() => setIsPlaying(false)}
        preload="auto"
      />

      {/* Widget de Controle no Topo */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface/85 border border-border backdrop-blur-md select-none transition-colors">
        {/* Ícone de Disco Giratório */}
        <div
          onClick={() => setShowFloatingCard(!showFloatingCard)}
          className={`flex items-center justify-center w-6 h-6 rounded-md cursor-pointer transition-all hover:scale-105 active:scale-95 ${
            isPlaying
              ? 'bg-accent-bright/20 text-accent-bright'
              : 'bg-surface-high text-gray-500'
          }`}
          title={isPlaying ? `Tocando: ${currentTrack?.title} (Clique para abrir lista)` : 'Abrir Coleções de Músicas'}
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

        {/* Botão Abrir Card Flutuante de Coleções */}
        <button
          onClick={() => setShowFloatingCard(!showFloatingCard)}
          className={`p-1 rounded-md transition-all active:scale-90 ${
            showFloatingCard
              ? 'bg-accent-bright/20 text-accent-bright'
              : 'text-gray-400 hover:text-white hover:bg-surface-high'
          }`}
          title="Abrir Lista e Coleções de Músicas"
        >
          <ListMusic className="w-3.5 h-3.5" />
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

          {/* Slider flutuante de volume */}
          {showVolumeSlider && (
            <div
              className="absolute top-full right-0 pt-2 z-50 animate-in fade-in duration-150"
              onMouseEnter={handleVolumeMouseEnter}
              onMouseLeave={handleVolumeMouseLeave}
            >
              <div className="p-2 rounded-lg bg-surface border border-border shadow-2xl flex items-center gap-2 backdrop-blur-xl">
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

      {/* Card Flutuante de Coleções de Músicas no Cantinho */}
      <BgmFloatingCard
        isOpen={showFloatingCard}
        onClose={() => setShowFloatingCard(false)}
        collections={library.collections}
        selectedCollection={selectedCollection}
        onSelectCollection={handleSelectCollection}
        tracks={currentCollectionTracks}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        isShuffle={isShuffle}
        onToggleShuffle={handleToggleShuffle}
        onPlayTrack={handlePlaySpecificTrack}
        onTogglePlay={togglePlay}
        onSyncGithub={handleManualSync}
        isSyncing={isSyncing}
      />

      {/* Notificação Flutuante "Now Playing" (Estilo EA Trax) */}
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
                EA Trax • {toastTrack.collection || 'Trilha Sonora'}
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

      {/* Aviso se nenhuma música for encontrada */}
      {showMissingNotice && (
        <div className="fixed bottom-6 right-6 z-50 animate-ea-trax-in bg-[#1a1215]/95 backdrop-blur-xl border border-rose-500/40 shadow-2xl rounded-xl p-3 flex items-center gap-3 max-w-sm pointer-events-auto select-none">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-rose-200">Músicas não encontradas</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Verifique sua conexão ou configure o repositório no arquivo .env.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
