import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import VaultCastFloatingWindow from './VaultCastFloatingWindow';
import {
  Tv,
  Radio,
  Monitor,
  AppWindow,
  Copy,
  Check,
  Share2,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RefreshCw,
  X,
  Flame,
  Sparkles,
  Users,
  AlertCircle,
  Play,
  Square,
  Settings,
  ShieldAlert,
  ArrowRightLeft,
  Sliders,
  Sun,
  RotateCcw,
  Loader2,
  Eye,
  Zap,
  ExternalLink
} from 'lucide-react';
import {
  registerCastSession,
  endCastSession,
  listenToActiveCasts,
  generateDiscordInvite,
  notifyDiscordLiveStart
} from '../../services/vaultCastService';
import {
  startBroadcastingWebRTC,
  connectViewerWebRTC
} from '../../services/vaultCastWebRTC';
import {
  getLiveKitConfig,
  startLiveKitBroadcast,
  connectLiveKitViewer
} from '../../services/livekitService';
import {
  createProcessAudioTrack,
  stopProcessAudioTrack
} from '../../services/vaultCastAudioService';
import { openDetachedLiveWindow } from '../../services/detachedWindowService';

export default function VaultCastModal({
  user,
  profile,
  initialRoomId = null,
  onClose
}) {
  const [activeTab, setActiveTab] = useState(initialRoomId ? 'guild' : 'broadcast'); // 'broadcast' | 'guild'
  const [sources, setSources] = useState([]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [sourceType, setSourceType] = useState('window'); // 'window' | 'screen'
  const [selectedSource, setSelectedSource] = useState(null);

  // Mecanismo ativo do VaultCast (LiveKit SFU via .env ou WebRTC P2P)
  const [activeEngine, setActiveEngine] = useState('p2p'); // 'livekit' | 'p2p'

  // Configurações de stream
  const [streamTitle, setStreamTitle] = useState('');
  const [resolution, setResolution] = useState('1080'); // '720' | '1080'
  const [targetFps, setTargetFps] = useState('60'); // '30' | '60'
  const [audioMode, setAudioMode] = useState('window'); // 'window' | 'system' | 'none'

  // Estado da Transmissão Local
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isStartingBroadcast, setIsStartingBroadcast] = useState(false);
  const [castId, setCastId] = useState(null);
  const [broadcastStartTime, setBroadcastStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [copiedDiscord, setCopiedDiscord] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Recursos de Usabilidade Solicitados:
  // 1. Janela destacável própria no Windows (Always-on-top nativo estilo princípio-e-fim-dnd)
  const [isDetached, setIsDetached] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [detachedWindow, setDetachedWindow] = useState(null);
  const detachedWindowRef = useRef(null);
  const syncChannelRef = useRef(null);

  // 2. Troca de janela em tempo real sem encerrar a live
  const [isSwitchingSource, setIsSwitchingSource] = useState(false);
  // 3. Monitor de áudio (retorno) - mutado por padrão para evitar eco/microfonia
  const [monitorAudio, setMonitorAudio] = useState(false);
  // 4. Controles finos de imagem e gama (para neutralizar pretos esmagados da tela cheia)
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [showImageControls, setShowImageControls] = useState(false);

  const applyPreset = (type) => {
    if (type === 'fix_dark') {
      setBrightness(126);
      setContrast(82);
      setSaturation(90);
    } else if (type === 'night_vision') {
      setBrightness(145);
      setContrast(76);
      setSaturation(88);
    } else {
      // original
      setBrightness(100);
      setContrast(100);
      setSaturation(100);
    }
  };

  // String CSS de filtro aplicada ao vídeo em tempo real
  const videoFilterStyle = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

  // Transmissões ativas da guilda
  const [guildCasts, setGuildCasts] = useState([]);
  const [watchingCast, setWatchingCast] = useState(null);

  const localVideoRef = useRef(null);
  const streamRef = useRef(null);

  // WebRTC: Transmissor 1-para-Muitos e Espectador Conectado
  const broadcasterControllerRef = useRef(null);
  const [viewerCount, setViewerCount] = useState(0);

  const viewerControllerRef = useRef(null);
  const viewerVideoRef = useRef(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [viewerConnectionState, setViewerConnectionState] = useState('idle');

  // Lado do Espectador: Conecta via WebRTC P2P ou LiveKit SFU à transmissão do amigo selecionado
  useEffect(() => {
    if (!watchingCast) {
      if (viewerControllerRef.current) {
        viewerControllerRef.current.disconnect?.();
        viewerControllerRef.current = null;
      }
      setRemoteStream(null);
      setViewerConnectionState('idle');
      return;
    }

    setViewerConnectionState('connecting');

    const handleStream = (stream) => {
      setRemoteStream(stream);
      setViewerConnectionState('connected');
      if (viewerVideoRef.current) {
        viewerVideoRef.current.srcObject = stream;
        viewerVideoRef.current.play().catch(console.warn);
      }
    };

    let controller;
    if (watchingCast.engine === 'livekit') {
      controller = connectLiveKitViewer({
        castId: watchingCast.id,
        userId: user?.uid,
        onRemoteStream: handleStream,
        onConnectionStateChange: (state) => setViewerConnectionState(state)
      });
    } else {
      controller = connectViewerWebRTC({
        castId: watchingCast.id,
        userId: user?.uid,
        onRemoteStream: handleStream,
        onConnectionStateChange: (state) => setViewerConnectionState(state)
      });
    }

    viewerControllerRef.current = controller;

    return () => {
      controller?.disconnect?.();
      viewerControllerRef.current = null;
      setRemoteStream(null);
      setViewerConnectionState('idle');
    };
  }, [watchingCast, user]);

  // Carrega fontes de telas/janelas do Electron
  const loadSources = async () => {
    if (!window.electronAPI?.getVaultCastSources) return;
    setLoadingSources(true);
    try {
      const allSources = await window.electronAPI.getVaultCastSources();
      setSources(allSources || []);
      if (allSources?.length > 0 && !selectedSource) {
        // Seleciona a primeira janela disponível como padrão
        const firstWindow = allSources.find(s => !s.isScreen) || allSources[0];
        setSelectedSource(firstWindow);
        setStreamTitle(firstWindow.name || 'Minha Gameplay');
      }
    } catch (err) {
      console.error('Erro ao buscar fontes do VaultCast:', err);
    } finally {
      setLoadingSources(false);
    }
  };

  useEffect(() => {
    loadSources();
  }, []);

  // Escuta transmissões ativas da guilda
  useEffect(() => {
    const unsub = listenToActiveCasts((casts) => {
      setGuildCasts(casts);
      if (initialRoomId) {
        const found = casts.find(c => c.id === initialRoomId);
        if (found) {
          setWatchingCast(found);
          setActiveTab('guild');
          setIsMinimized(false);
        }
      }
    });

    return () => unsub();
  }, [initialRoomId]);

  // Timer da transmissão local
  useEffect(() => {
    let interval = null;
    if (isBroadcasting && broadcastStartTime) {
      interval = setInterval(() => {
        const diff = Math.floor((Date.now() - broadcastStartTime) / 1000);
        const hours = String(Math.floor(diff / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
        const seconds = String(diff % 60).padStart(2, '0');
        setElapsedTime(`${hours}:${minutes}:${seconds}`);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isBroadcasting, broadcastStartTime]);

  // Garante que o stream seja associado ao elemento video assim que ele for renderizado
  useEffect(() => {
    if (isBroadcasting && streamRef.current && localVideoRef.current) {
      localVideoRef.current.srcObject = streamRef.current;
      localVideoRef.current.play().catch(err => console.warn('Erro ao reproduzir stream:', err));
    }
  }, [isBroadcasting, isMinimized]);

  // Inicia captura e transmissão local
  // Inicia captura e transmissão local
  const handleStartBroadcast = async () => {
    if (isBroadcasting || isStartingBroadcast) return;
    if (!selectedSource) {
      alert('Selecione uma tela ou janela para transmitir.');
      return;
    }

    setIsStartingBroadcast(true);

    try {
      const height = resolution === '1080' ? 1080 : 720;
      const width = resolution === '1080' ? 1920 : 1280;

      // 1. Se o modo for 'window' e for uma janela, ativa o isolamento de áudio por processo (WASAPI Process Loopback)
      let processAudio = null;
      if (audioMode === 'window' && !selectedSource?.isScreen) {
        try {
          processAudio = await createProcessAudioTrack(selectedSource);
          if (!processAudio) {
            console.warn('Isolamento de áudio do processo não respondeu, usando áudio geral do sistema.');
          }
        } catch (pErr) {
          console.warn('Falha no isolamento de áudio por processo, usando áudio geral:', pErr);
        }
      }

      // Se temos áudio exclusivo do processo, desliga o áudio geral no getUserMedia
      const shouldCaptureSystemAudio = (audioMode === 'system') || (audioMode === 'window' && !processAudio);
      const constraints = {
        audio: shouldCaptureSystemAudio
          ? {
              mandatory: {
                chromeMediaSource: 'desktop'
              }
            }
          : false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: selectedSource.id,
            maxWidth: width,
            maxHeight: height,
            maxFrameRate: parseInt(targetFps, 10)
          }
        }
      };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (audioErr) {
        console.warn('Falha na captura com áudio desktop, alternando para vídeo puro:', audioErr);
        constraints.audio = false;
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      }

      // Se obtivemos o áudio exclusivo do processo, anexa ao stream
      if (processAudio?.track) {
        stream.addTrack(processAudio.track);
      }

      streamRef.current = stream;

      const videoTrack = stream.getVideoTracks()?.[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          handleStopBroadcast();
        };
      }

      const newCastId = `cast_${user?.uid || 'guest'}_${Date.now()}`;
      setCastId(newCastId);
      setIsBroadcasting(true);
      setBroadcastStartTime(Date.now());

      // Se for tela cheia, já aplica a correção de pretos por padrão
      if (selectedSource?.isScreen) {
        applyPreset('fix_dark');
      } else {
        applyPreset('original');
      }

      // Inicia a transmissão: Nuvem SFU (LiveKit) se configurado, ou WebRTC P2P Direto como fallback
      const currentLk = getLiveKitConfig();
      let engine = 'p2p';

      if (currentLk) {
        try {
          broadcasterControllerRef.current = await startLiveKitBroadcast({
            roomName: newCastId,
            identity: user?.uid || 'streamer',
            stream,
            onViewerCountChange: (count) => setViewerCount(count)
          });
          engine = 'livekit';
        } catch (lkErr) {
          console.warn('Falha no LiveKit SFU, alternando para WebRTC P2P:', lkErr);
          broadcasterControllerRef.current = startBroadcastingWebRTC(newCastId, stream, (count) => {
            setViewerCount(count);
          });
          engine = 'p2p';
        }
      } else {
        broadcasterControllerRef.current = startBroadcastingWebRTC(newCastId, stream, (count) => {
          setViewerCount(count);
        });
        engine = 'p2p';
      }

      setActiveEngine(engine);

      await registerCastSession({
        castId: newCastId,
        pilotId: user?.uid,
        pilotName: profile?.nickname || 'Piloto',
        gameTitle: streamTitle || selectedSource.name,
        resolution: `${resolution}p`,
        fps: targetFps,
        engine,
        livekitUrl: engine === 'livekit' ? currentLk?.url : null
      });

      // Dispara anúncio automático no Discord da guilda via Webhook (sem emojis e sem repetições)
      notifyDiscordLiveStart({
        castId: newCastId,
        pilotName: profile?.nickname || 'Piloto',
        gameTitle: streamTitle || selectedSource.name,
        resolution: `${resolution}p`,
        fps: targetFps
      }).catch(console.warn);
    } catch (err) {
      console.error('Falha ao iniciar transmissão:', err);
      alert('Não foi possível capturar esta janela. Verifique se o jogo/janela não está minimizado.');
    } finally {
      setIsStartingBroadcast(false);
    }
  };

  // Troca de janela em tempo real sem derrubar a live e sem cortar o áudio
  const handleSwitchSource = async (newSource) => {
    if (!newSource) return;

    try {
      const height = resolution === '1080' ? 1080 : 720;
      const width = resolution === '1080' ? 1920 : 1280;

      // 1. Obtém a nova fonte de vídeo da janela desejada
      const videoConstraints = {
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: newSource.id,
            maxWidth: width,
            maxHeight: height,
            maxFrameRate: parseInt(targetFps, 10)
          }
        }
      };

      const newStream = await navigator.mediaDevices.getUserMedia(videoConstraints);

      // 2. Se a nova janela for transmitida com isolamento de áudio, troca para o áudio exclusivo do novo processo
      let newProcessAudio = null;
      if (audioMode === 'window' && !newSource?.isScreen) {
        try {
          stopProcessAudioTrack();
          newProcessAudio = await createProcessAudioTrack(newSource);
        } catch (pErr) {
          console.warn('Falha ao obter áudio do novo processo:', pErr);
        }
      }

      if (newProcessAudio?.track) {
        newStream.addTrack(newProcessAudio.track);
      } else if (audioMode !== 'none') {
        // Fallback: Preserva o áudio atual se for compatível
        const existingAudioTrack = streamRef.current?.getAudioTracks()?.[0];
        if (existingAudioTrack && existingAudioTrack.readyState === 'live') {
          newStream.addTrack(existingAudioTrack);
        } else {
          try {
            const audioStream = await navigator.mediaDevices.getUserMedia({
              audio: { mandatory: { chromeMediaSource: 'desktop' } },
              video: false
            });
            const newAudioTrack = audioStream.getAudioTracks()?.[0];
            if (newAudioTrack) newStream.addTrack(newAudioTrack);
          } catch (audioErr) {
            console.warn('Falha ao obter nova faixa de áudio desktop:', audioErr);
          }
        }
      }

      // 3. Para APENAS a faixa antiga de vídeo (o áudio continua tocando sem corte)
      const oldVideoTracks = streamRef.current?.getVideoTracks() || [];
      oldVideoTracks.forEach(t => t.stop());

      // Se havia uma faixa de áudio antiga que não foi reaproveitada, encerra-a
      const oldAudioTracks = streamRef.current?.getAudioTracks() || [];
      oldAudioTracks.forEach(t => {
        if (!newStream.getAudioTracks().includes(t)) {
          t.stop();
        }
      });

      streamRef.current = newStream;
      setSelectedSource(newSource);
      setStreamTitle(newSource.name);

      const videoTrack = newStream.getVideoTracks()?.[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          handleStopBroadcast();
        };
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = newStream;
        localVideoRef.current.play().catch(console.warn);
      }

      setIsSwitchingSource(false);
      if (newSource?.isScreen) {
        applyPreset('fix_dark');
      } else {
        applyPreset('original');
      }

      // 4. Substitui as faixas em tempo real para todos os amigos conectados (SFU ou P2P)
      broadcasterControllerRef.current?.updateStream(newStream);

      // 5. Atualiza o Firestore com o novo título de jogo
      if (castId) {
        const currentLk = getLiveKitConfig();
        await registerCastSession({
          castId,
          pilotId: user?.uid,
          pilotName: profile?.nickname || 'Piloto',
          gameTitle: newSource.name,
          resolution: `${resolution}p`,
          fps: targetFps,
          engine: activeEngine,
          livekitUrl: activeEngine === 'livekit' ? currentLk?.url : null
        });
      }
    } catch (err) {
      console.error('Erro ao trocar janela transmitida:', err);
      alert('Não foi possível alternar para esta janela. Verifique se ela continua aberta.');
    }
  };

  // Encerra transmissão local
  const handleStopBroadcast = async () => {
    stopProcessAudioTrack();

    if (broadcasterControllerRef.current) {
      broadcasterControllerRef.current.stop();
      broadcasterControllerRef.current = null;
    }
    setViewerCount(0);
    setActiveEngine('p2p');

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    if (castId) {
      await endCastSession(castId);
    }

    setIsBroadcasting(false);
    setIsMinimized(false);
    setIsSwitchingSource(false);
    setCastId(null);
    setBroadcastStartTime(null);
    setElapsedTime('00:00:00');
  };

  // Destaca a live para uma janela própria nativa do Windows (Always-on-Top estilo princípio-e-fim-dnd)
  const handleDetachWindow = () => {
    try {
      // Se a janela já estiver aberta, foca nela
      if (detachedWindowRef.current && !detachedWindowRef.current.closed) {
        detachedWindowRef.current.focus();
        return;
      }

      const mode = isBroadcasting ? 'broadcaster' : 'viewer';
      const stream = isBroadcasting ? streamRef.current : remoteStream;

      // Disponibiliza streams e metadados na janela principal para a janela filha acessar via window.opener
      window.__VAULTCAST_STREAM__ = stream;
      window.__VAULTCAST_DATA__ = {
        mode,
        stream,
        streamTitle: streamTitle || selectedSource?.name || 'Gameplay',
        pilotName: isBroadcasting ? (profile?.nickname || 'Piloto') : (watchingCast?.pilotName || 'Amigo'),
        castId: isBroadcasting ? castId : watchingCast?.castId,
        elapsedTime,
        viewerCount,
        isBroadcasting,
        watchingCast,
        videoFilterStyle
      };

      const popoutUrl = `${window.location.origin}${window.location.pathname}?popout=vaultcast&mode=${mode}&t=${Date.now()}`;
      
      const popWin = window.open(
        popoutUrl,
        'VaultCast_Live_Detached',
        'width=720,height=480,menubar=no,toolbar=no,resizable=yes'
      );

      if (popWin) {
        detachedWindowRef.current = popWin;
        setIsDetached(true);
        setIsMinimized(false);
      }
    } catch (err) {
      console.error('Erro ao abrir janela popout do VaultCast:', err);
    }
  };

  // Garante que o stream seja limpo ao fechar modal ou minimiza para janela própria destacada
  const handleClose = async () => {
    if (isBroadcasting) {
      if (confirm('A transmissão do VaultCast está ativa. Deseja encerrar a live ou manter aberta em uma janela destacada no Windows? Clique OK para encerrar ou Cancelar para manter destacada.')) {
        handleStopBroadcast();
        try {
          syncChannelRef.current?.postMessage({ type: 'BROADCAST_ENDED' });
        } catch (_) {}
        if (detachedWindowRef.current && !detachedWindowRef.current.closed) {
          detachedWindowRef.current.close();
        }
        onClose();
      } else {
        handleDetachWindow();
      }
      return;
    }
    if (watchingCast) {
      handleDetachWindow();
      return;
    }
    if (detachedWindowRef.current && !detachedWindowRef.current.closed) {
      detachedWindowRef.current.close();
    }
    onClose();
  };

  // Sincronização bidirecional em tempo real com a janela destacada do Windows
  useEffect(() => {
    let channel = null;
    try {
      channel = new BroadcastChannel('vaultcast_sync');
      syncChannelRef.current = channel;

      channel.onmessage = (event) => {
        const { type, payload } = event.data || {};
        if (type === 'RESTORE_TO_APP') {
          setIsDetached(false);
          setIsMinimized(false);
          if (window.electronAPI?.focusMainWindow) {
            window.electronAPI.focusMainWindow();
          }
        } else if (type === 'STOP_BROADCAST') {
          setIsDetached(false);
          setIsMinimized(false);
          handleStopBroadcast();
        } else if (type === 'STOP_WATCHING') {
          setIsDetached(false);
          setIsMinimized(false);
          setWatchingCast(null);
        } else if (type === 'SWITCH_SOURCE') {
          setIsDetached(false);
          setIsMinimized(false);
          setIsSwitchingSource(true);
          loadSources();
          if (window.electronAPI?.focusMainWindow) {
            window.electronAPI.focusMainWindow();
          }
        } else if (type === 'STANDALONE_CLOSED') {
          setIsDetached(false);
        } else if (type === 'STANDALONE_READY') {
          channel.postMessage({
            type: 'TICK',
            payload: {
              elapsedTime,
              viewerCount,
              streamTitle: streamTitle || selectedSource?.name
            }
          });
        }
      };
    } catch (err) {
      console.warn('BroadcastChannel indisponível:', err);
    }

    return () => {
      try {
        channel?.close();
      } catch (_) {}
    };
  }, [elapsedTime, viewerCount, streamTitle, selectedSource]);

  // Sincroniza periodicamente tempo e contagem de espectadores com a janela destacada
  useEffect(() => {
    if (isDetached && syncChannelRef.current) {
      try {
        syncChannelRef.current.postMessage({
          type: 'TICK',
          payload: {
            elapsedTime,
            viewerCount,
            streamTitle: streamTitle || selectedSource?.name
          }
        });
      } catch (_) {}
    }
  }, [isDetached, elapsedTime, viewerCount, streamTitle, selectedSource]);

  // Copia convite formatado do Discord
  const handleCopyDiscordInvite = () => {
    if (!castId) return;
    const text = generateDiscordInvite({
      castId,
      pilotName: profile?.nickname || 'Piloto',
      gameTitle: streamTitle || selectedSource?.name || 'Gameplay'
    });

    navigator.clipboard.writeText(text);
    setCopiedDiscord(true);
    setTimeout(() => setCopiedDiscord(false), 3000);
  };

  // Copia link direto (compatível com Discord, WhatsApp e navegador)
  const handleCopyDirectLink = () => {
    if (!castId) return;
    const link = `https://gamer-vault-e667a.web.app/cast?room=${castId}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // Filtra as fontes entre Janelas e Telas inteiras
  const filteredSources = sources.filter(s =>
    sourceType === 'screen' ? s.isScreen : !s.isScreen
  );

  // ========================================================
  // MODO 1: JANELA DESTACADA NATIVA NO WINDOWS (POPOUT)
  // Permite navegar livremente pelo Gamer's Vault sem fechar a live
  // ========================================================
  if (isDetached && (isBroadcasting || watchingCast)) {
    return createPortal(
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#0c0f18]/95 border border-emerald-500/40 shadow-2xl backdrop-blur-md animate-fadeIn">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
          <span className="text-xs font-bold text-white">
            {isBroadcasting ? 'Live Destacada no Windows' : `Assistindo ${watchingCast?.pilotName || 'Amigo'}`}
          </span>
          <span className="text-[11px] font-mono text-gray-400">({elapsedTime})</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsDetached(false);
              try {
                if (detachedWindowRef.current && !detachedWindowRef.current.closed) {
                  detachedWindowRef.current.close();
                }
              } catch (_) {}
            }}
            className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
          >
            Voltar para o App
          </button>
          <button
            onClick={() => {
              if (isBroadcasting) handleStopBroadcast();
              else setWatchingCast(null);
              setIsDetached(false);
              try {
                if (detachedWindowRef.current && !detachedWindowRef.current.closed) {
                  detachedWindowRef.current.close();
                }
              } catch (_) {}
            }}
            className="p-1 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Encerrar"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>
      </div>,
      document.body
    );
  }
  if (isMinimized && (isBroadcasting || watchingCast)) {
    const isDetachedActive = !!(detachedWindow && !detachedWindow.closed);
    const portalTarget = isDetachedActive ? detachedWindow.document.body : document.body;

    return createPortal(
      <VaultCastFloatingWindow
        isDetached={isDetachedActive}
        detachedWindow={detachedWindow}
        mode={isBroadcasting ? 'broadcaster' : 'viewer'}
        stream={isBroadcasting ? streamRef.current : remoteStream}
        isBroadcasting={isBroadcasting}
        watchingCast={watchingCast}
        elapsedTime={elapsedTime}
        viewerCount={viewerCount}
        selectedSource={selectedSource}
        streamTitle={streamTitle}
        videoFilterStyle={videoFilterStyle}
        monitorAudio={monitorAudio}
        onToggleMonitorAudio={() => setMonitorAudio(!monitorAudio)}
        onCopyDiscord={handleCopyDiscordInvite}
        copiedDiscord={copiedDiscord}
        onCopyDirectLink={handleCopyDirectLink}
        copiedLink={copiedLink}
        onSwitchSource={() => {
          if (detachedWindow && !detachedWindow.closed) {
            detachedWindow.close();
            setDetachedWindow(null);
          }
          setIsMinimized(false);
          setIsSwitchingSource(true);
          loadSources();
        }}
        onStopBroadcast={() => {
          handleStopBroadcast();
          if (detachedWindow && !detachedWindow.closed) {
            detachedWindow.close();
            setDetachedWindow(null);
          }
        }}
        onStopWatching={() => {
          setWatchingCast(null);
          if (detachedWindow && !detachedWindow.closed) {
            detachedWindow.close();
            setDetachedWindow(null);
          }
        }}
        onExpandModal={() => {
          if (detachedWindow && !detachedWindow.closed) {
            detachedWindow.close();
            setDetachedWindow(null);
          }
          setIsMinimized(false);
        }}
        onClose={() => {
          if (detachedWindow && !detachedWindow.closed) {
            detachedWindow.close();
            setDetachedWindow(null);
          }
          setIsMinimized(false);
          if (isBroadcasting) {
            handleStopBroadcast();
          }
          if (watchingCast) {
            setWatchingCast(null);
          }
          onClose();
        }}
      />,
      portalTarget
    );
  }

  // ========================================================
  // MODO 2: MODAL COMPLETO (TELA EXPANDIDA)
  // ========================================================
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#0b0d14] border border-[#232738] rounded-2xl shadow-2xl overflow-hidden">
        
        {/* TOP BAR / HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1c2030] bg-[#0e111a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-gamer font-bold text-white tracking-wide">
                  VaultCast
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/70 border border-emerald-500/40 text-emerald-400 uppercase">
                  BETA // GUILDA
                </span>
                {isBroadcasting && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/80 border border-rose-500/50 text-rose-400 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]"></span>
                    AO VIVO ({elapsedTime})
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">
                Transmita suas janelas de jogos ou telas diretamente para a guilda com links rápidos para o Discord.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* TABS SELECTOR */}
            <div className="flex items-center bg-[#131622] p-1 rounded-xl border border-[#222738]">
              <button
                onClick={() => setActiveTab('broadcast')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'broadcast'
                    ? 'bg-emerald-500 text-black shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Minha Live</span>
              </button>

              <button
                onClick={() => setActiveTab('guild')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${
                  activeTab === 'guild'
                    ? 'bg-emerald-500 text-black shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Ao Vivo na Guilda</span>
                {guildCasts.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 absolute -top-0.5 -right-0.5 animate-pulse"></span>
                )}
              </button>
            </div>

            {/* BOTÃO DESTACAR EM JANELA DO WINDOWS */}
            {(isBroadcasting || watchingCast) && (
              <button
                onClick={handleDetachWindow}
                title="Destacar a live para uma janela própria no Windows (Always-On-Top, redimensionável)"
                className="px-3 py-1.5 rounded-xl text-emerald-400 bg-emerald-950/60 hover:bg-emerald-500 hover:text-black border border-emerald-500/50 transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm active:scale-95 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Destacar Janela</span>
              </button>
            )}

            <button
              onClick={handleClose}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#1a1e2c] border border-transparent hover:border-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CORPO DO MODAL */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* ==================================================== */}
          {/* TAB 1: MINHA TRANSMISSÃO / BROADCAST */}
          {/* ==================================================== */}
          {activeTab === 'broadcast' && (
            <div className="space-y-6">
              
              {/* SE ESTIVER TRANSMITINDO AO VIVO */}
              {isBroadcasting ? (
                <div className="space-y-4">
                  {/* MODAL / SELETOR DE TROCA RÁPIDA DE JANELA */}
                  {isSwitchingSource && (
                    <div className="p-4 rounded-2xl bg-[#121624] border border-cyan-500/40 shadow-xl space-y-3 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white flex items-center gap-2">
                          <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
                          <span>Selecione a nova janela ou tela para transmitir:</span>
                        </h4>
                        <button
                          onClick={() => setIsSwitchingSource(false)}
                          className="text-xs text-gray-400 hover:text-white"
                        >
                          Cancelar
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-48 overflow-y-auto pr-1">
                        {sources.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => handleSwitchSource(s)}
                            className="p-2 rounded-xl bg-[#0b0d14] border border-[#202538] hover:border-cyan-400 hover:bg-[#151a2a] cursor-pointer transition-all flex flex-col gap-1.5 group"
                          >
                            <div className="aspect-video w-full rounded bg-black/60 overflow-hidden">
                              {s.thumbnail ? (
                                <img src={s.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-600">
                                  <Monitor className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                            <span className="text-[11px] font-semibold text-gray-200 truncate group-hover:text-white">
                              {s.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* MONITOR DE TRANSMISSÃO */}
                  <div className="relative aspect-video w-full rounded-2xl bg-black border border-[#2d334a] overflow-hidden shadow-2xl flex items-center justify-center group">
                    <video
                      ref={(el) => {
                        localVideoRef.current = el;
                        if (el && streamRef.current && el.srcObject !== streamRef.current) {
                          el.srcObject = streamRef.current;
                          el.play().catch(e => console.warn('Erro ao dar play no preview:', e));
                        }
                      }}
                      autoPlay
                      playsInline
                      muted={!monitorAudio}
                      style={{ filter: videoFilterStyle }}
                      className="w-full h-full object-contain"
                    />

                    {/* OVERLAY DE STATUS DO STREAM */}
                    <div className="absolute top-4 left-4 flex items-center gap-2 pointer-events-none">
                      <div className="px-3 py-1.5 rounded-lg bg-black/75 backdrop-blur-md border border-rose-500/50 flex items-center gap-2 text-rose-400 font-bold text-xs">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                        <span>AO VIVO NO VAULTCAST</span>
                        <span className="text-gray-400 font-mono">| {elapsedTime}</span>
                      </div>

                      <div className="px-2.5 py-1.5 rounded-lg bg-black/75 backdrop-blur-md border border-gray-700 text-gray-300 font-mono text-xs">
                        {resolution}p @ {targetFps}fps
                      </div>

                      <div className="px-2.5 py-1.5 rounded-lg bg-black/75 backdrop-blur-md border border-gray-700 text-gray-300 font-mono text-xs flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{viewerCount} {viewerCount === 1 ? 'espectador' : 'espectadores'}</span>
                      </div>

                      {monitorAudio && (
                        <div className="px-2.5 py-1.5 rounded-lg bg-emerald-950/80 backdrop-blur-md border border-emerald-500/50 text-emerald-300 font-mono text-xs flex items-center gap-1">
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Retorno Ativo</span>
                        </div>
                      )}
                    </div>

                    {/* OVERLAY TÍTULO DA STREAM */}
                    <div className="absolute bottom-4 left-4 pointer-events-none">
                      <div className="px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-md border border-gray-800 text-white font-gamer font-bold text-sm">
                        {streamTitle || selectedSource?.name}
                      </div>
                    </div>
                  </div>

                  {/* BARRA DE AÇÕES & COMPARTILHAMENTO DISCORD */}
                  <div className="p-5 rounded-2xl bg-[#121522] border border-[#232738] flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-center md:text-left">
                      <h4 className="text-sm font-bold text-white flex items-center justify-center md:justify-start gap-2">
                        <Share2 className="w-4 h-4 text-indigo-400" />
                        Compartilhar Transmissão com a Comunidade
                      </h4>
                      <p className="text-xs text-gray-400">
                        Copie o convite formatado e envie no canal de texto ou voz do Discord da sua guilda.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* BOTÃO DISCORD EM DESTAQUE */}
                      <button
                        onClick={handleCopyDiscordInvite}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs tracking-wide transition-all shadow-lg active:scale-95"
                      >
                        {copiedDiscord ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-300" />
                            <span>Convite Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copiar Convite Discord</span>
                          </>
                        )}
                      </button>

                      {/* BOTÃO TROCAR JANELA */}
                      <button
                        onClick={() => {
                          setIsSwitchingSource(prev => !prev);
                          loadSources();
                        }}
                        className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#1c2030] hover:bg-[#252b40] border border-cyan-500/40 text-xs font-semibold text-cyan-300 hover:text-white transition-colors cursor-pointer"
                        title="Trocar janela sem derrubar a live"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        <span>Trocar Janela</span>
                      </button>

                      {/* BOTÃO MONITOR DE ÁUDIO */}
                      <button
                        onClick={() => setMonitorAudio(!monitorAudio)}
                        className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-colors ${
                          monitorAudio
                            ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-400'
                            : 'bg-[#1c2030] border-gray-700 text-gray-400 hover:text-white'
                        }`}
                        title={monitorAudio ? 'Desativar Retorno' : 'Ouvir Retorno (Use fones de ouvido)'}
                      >
                        {monitorAudio ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                        <span>{monitorAudio ? 'Retorno: ON' : 'Retorno: OFF'}</span>
                      </button>

                      {/* BOTÃO AJUSTES DE IMAGEM & BRILHO */}
                      <button
                        onClick={() => setShowImageControls(prev => !prev)}
                        className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-colors ${
                          showImageControls || brightness !== 100 || contrast !== 100
                            ? 'bg-amber-950/60 border-amber-500/70 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                            : 'bg-[#1c2030] border-gray-700 text-gray-400 hover:text-white'
                        }`}
                        title="Ajuste fino de brilho, contraste e pretos da tela"
                      >
                        <Sun className="w-3.5 h-3.5" />
                        <span>Ajustar Brilho {brightness !== 100 ? `(${brightness}%)` : ''}</span>
                      </button>

                      {/* BOTÃO LINK DIRETO */}
                      <button
                        onClick={handleCopyDirectLink}
                        className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#1c2030] hover:bg-[#252b40] border border-gray-700 text-xs font-semibold text-gray-300 hover:text-white transition-colors"
                        title="Copiar gamervault://cast link"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Link Direto</span>
                      </button>

                      {/* BOTÃO ENCERRAR */}
                      <button
                        onClick={handleStopBroadcast}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 border border-rose-500/50 text-rose-300 hover:text-white font-bold text-xs transition-all active:scale-95"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>Parar Live</span>
                      </button>
                    </div>
                  </div>

                  {/* PAINEL DE AJUSTE FINO DE IMAGEM (BRILHO, CONTRASTE, GAMA) */}
                  {showImageControls && (
                    <div className="p-4 rounded-2xl bg-[#101420] border border-amber-500/40 shadow-2xl space-y-4 animate-fadeIn">
                      <div className="flex items-center justify-between border-b border-[#1c2236] pb-2.5">
                        <div className="flex items-center gap-2">
                          <Sliders className="w-4 h-4 text-amber-400" />
                          <h4 className="text-xs font-bold text-white">
                            Ajuste de Imagem e Gama (Correção de Pretos Esmagados da Tela)
                          </h4>
                        </div>
                        <button
                          onClick={() => setShowImageControls(false)}
                          className="text-xs text-gray-400 hover:text-white"
                        >
                          Fechar
                        </button>
                      </div>

                      {/* PRESETS RÁPIDOS */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold text-gray-400">Presets com 1 clique:</span>
                        <button
                          onClick={() => applyPreset('fix_dark')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            brightness === 126 && contrast === 82
                              ? 'bg-amber-600 border-amber-400 text-black font-bold shadow-md'
                              : 'bg-[#161a29] border-[#293047] text-gray-300 hover:text-white hover:bg-[#1e2438]'
                          }`}
                        >
                          👁️ Corrigir Pretos Esmagados (Recomendado)
                        </button>
                        <button
                          onClick={() => applyPreset('night_vision')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            brightness === 145 && contrast === 76
                              ? 'bg-amber-600 border-amber-400 text-black font-bold shadow-md'
                              : 'bg-[#161a29] border-[#293047] text-gray-300 hover:text-white hover:bg-[#1e2438]'
                          }`}
                        >
                          💡 Super Iluminado / Jogos Escuros
                        </button>
                        <button
                          onClick={() => applyPreset('original')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 ${
                            brightness === 100 && contrast === 100
                              ? 'bg-gray-700 border-gray-500 text-white font-bold'
                              : 'bg-[#161a29] border-[#293047] text-gray-400 hover:text-white'
                          }`}
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Original (100%)</span>
                        </button>
                      </div>

                      {/* SLIDERS INTERATIVOS */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                        {/* BRILHO */}
                        <div className="space-y-1 bg-[#0b0e17] p-3 rounded-xl border border-[#1e2438]">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-gray-300">Brilho Geral:</span>
                            <span className="font-mono text-amber-300 font-bold">{brightness}%</span>
                          </div>
                          <input
                            type="range"
                            min="80"
                            max="180"
                            value={brightness}
                            onChange={(e) => setBrightness(Number(e.target.value))}
                            className="w-full accent-amber-500 cursor-pointer h-1.5 bg-[#1e2438] rounded-lg"
                          />
                        </div>

                        {/* CONTRASTE */}
                        <div className="space-y-1 bg-[#0b0e17] p-3 rounded-xl border border-[#1e2438]">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-gray-300">Contraste (Equilíbrio dos Pretos):</span>
                            <span className="font-mono text-amber-300 font-bold">{contrast}%</span>
                          </div>
                          <input
                            type="range"
                            min="60"
                            max="130"
                            value={contrast}
                            onChange={(e) => setContrast(Number(e.target.value))}
                            className="w-full accent-amber-500 cursor-pointer h-1.5 bg-[#1e2438] rounded-lg"
                          />
                        </div>

                        {/* SATURAÇÃO */}
                        <div className="space-y-1 bg-[#0b0e17] p-3 rounded-xl border border-[#1e2438]">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-gray-300">Saturação de Cores:</span>
                            <span className="font-mono text-amber-300 font-bold">{saturation}%</span>
                          </div>
                          <input
                            type="range"
                            min="60"
                            max="140"
                            value={saturation}
                            onChange={(e) => setSaturation(Number(e.target.value))}
                            className="w-full accent-amber-500 cursor-pointer h-1.5 bg-[#1e2438] rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* SE NÃO ESTIVER TRANSMITINDO: CONFIGURAÇÃO E SELEÇÃO DE JANELAS */
                <div className="space-y-6">
                  
                  {/* SELETOR DE MODO (JANELAS VS TELAS) E ATUALIZAR */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#1c2030] pb-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSourceType('window')}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                          sourceType === 'window'
                            ? 'bg-[#1b2234] border-emerald-500/60 text-white shadow-sm'
                            : 'bg-transparent border-transparent text-gray-400 hover:text-white hover:bg-[#121522]'
                        }`}
                      >
                        <AppWindow className="w-4 h-4 text-emerald-400" />
                        <span>Janelas de Jogos / Apps ({sources.filter(s => !s.isScreen).length})</span>
                      </button>

                      <button
                        onClick={() => setSourceType('screen')}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                          sourceType === 'screen'
                            ? 'bg-[#1b2234] border-emerald-500/60 text-white shadow-sm'
                            : 'bg-transparent border-transparent text-gray-400 hover:text-white hover:bg-[#121522]'
                        }`}
                      >
                        <Monitor className="w-4 h-4 text-cyan-400" />
                        <span>Telas Inteiras ({sources.filter(s => s.isScreen).length})</span>
                      </button>
                    </div>

                    <button
                      onClick={loadSources}
                      disabled={loadingSources}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141824] hover:bg-[#1c2233] border border-[#242b3d] text-xs text-gray-300 hover:text-white transition-all disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingSources ? 'animate-spin' : ''}`} />
                      <span>Atualizar Janelas</span>
                    </button>
                  </div>

                  {/* GRID DE MINIATURAS DAS JANELAS / TELAS DISPONÍVEIS */}
                  {loadingSources ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-3 text-gray-400">
                      <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                      <span className="text-xs font-mono">Buscando janelas e jogos ativos no Windows...</span>
                    </div>
                  ) : filteredSources.length === 0 ? (
                    <div className="py-16 text-center text-gray-400 space-y-2 border border-dashed border-[#232738] rounded-xl">
                      <AlertCircle className="w-8 h-8 mx-auto text-amber-400/80" />
                      <p className="text-sm font-semibold">Nenhuma janela encontrada</p>
                      <p className="text-xs text-gray-500">
                        Abra o jogo ou janela desejada e clique em "Atualizar Janelas".
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[360px] overflow-y-auto pr-1">
                      {filteredSources.map((source) => {
                        const isSelected = selectedSource?.id === source.id;
                        return (
                          <div
                            key={source.id}
                            onClick={() => {
                              setSelectedSource(source);
                              if (!streamTitle || streamTitle === selectedSource?.name) {
                                setStreamTitle(source.name);
                              }
                            }}
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col gap-2 group ${
                              isSelected
                                ? 'bg-[#142028] border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500'
                                : 'bg-[#0f121a] border-[#202538] hover:border-gray-600 hover:bg-[#131622]'
                            }`}
                          >
                            {/* THUMBNAIL DA JANELA */}
                            <div className="relative aspect-video w-full rounded-lg bg-black/60 overflow-hidden border border-[#202538]">
                              {source.thumbnail ? (
                                <img
                                  src={source.thumbnail}
                                  alt={source.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-600">
                                  <Monitor className="w-8 h-8" />
                                </div>
                              )}

                              {isSelected && (
                                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-lg font-bold">
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </div>
                              )}
                            </div>

                            {/* NOME E ÍCONE DO APP */}
                            <div className="flex items-center gap-2">
                              {source.appIcon && (
                                <img src={source.appIcon} alt="" className="w-4 h-4 flex-shrink-0" />
                              )}
                              <span className="text-xs font-semibold text-gray-200 truncate group-hover:text-white" title={source.name}>
                                {source.name}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* PARÂMETROS DA TRANSMISSÃO */}
                  <div className="p-5 rounded-2xl bg-[#0e111a] border border-[#232738] space-y-4">
                    <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                      <Settings className="w-3.5 h-3.5" />
                      Configurações do VaultCast
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* TÍTULO DA TRANSMISSÃO */}
                      <div className="md:col-span-1 space-y-1.5">
                        <label className="text-xs font-semibold text-gray-300">
                          Título da Transmissão:
                        </label>
                        <input
                          type="text"
                          value={streamTitle}
                          onChange={(e) => setStreamTitle(e.target.value)}
                          placeholder="Ex: The Witcher 3 - Caçada Noturna"
                          className="w-full px-3 py-2 bg-[#141824] border border-[#242b3d] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* RESOLUÇÃO E TAXA DE QUADROS */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-300">
                          Qualidade de Vídeo:
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={resolution}
                            onChange={(e) => setResolution(e.target.value)}
                            className="px-3 py-2 bg-[#141824] border border-[#242b3d] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                          >
                            <option value="1080">1080p (FHD)</option>
                            <option value="720">720p (HD)</option>
                          </select>

                          <select
                            value={targetFps}
                            onChange={(e) => setTargetFps(e.target.value)}
                            className="px-3 py-2 bg-[#141824] border border-[#242b3d] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                          >
                            <option value="60">60 FPS</option>
                            <option value="30">30 FPS</option>
                          </select>
                        </div>
                      </div>

                      {/* OPÇÃO DE ÁUDIO */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-300">
                          Áudio da Transmissão:
                        </label>
                        <div className="grid grid-cols-1 gap-2">
                          {!selectedSource?.isScreen && (
                            <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${audioMode === 'window' ? 'border-emerald-500 bg-emerald-500/10' : 'border-[#242b3d] bg-[#141824] hover:bg-[#1a1f30]'}`}>
                              <input
                                type="radio"
                                name="audioMode"
                                value="window"
                                checked={audioMode === 'window'}
                                onChange={() => setAudioMode('window')}
                                className="mt-0.5 accent-emerald-500 w-4 h-4 cursor-pointer"
                              />
                              <div className="flex flex-col">
                                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                                  Áudio Exclusivo desta Janela (Recomendado)
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  Isola apenas o som do jogo/janela. Sem eco do Discord nem sons do Windows.
                                </span>
                              </div>
                            </label>
                          )}

                          <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${audioMode === 'system' ? 'border-emerald-500 bg-emerald-500/10' : 'border-[#242b3d] bg-[#141824] hover:bg-[#1a1f30]'}`}>
                            <input
                              type="radio"
                              name="audioMode"
                              value="system"
                              checked={audioMode === 'system'}
                              onChange={() => setAudioMode('system')}
                              className="mt-0.5 accent-emerald-500 w-4 h-4 cursor-pointer"
                            />
                            <div className="flex flex-col">
                              <span className="text-xs text-white font-semibold flex items-center gap-1.5">
                                Áudio do Computador Inteiro
                              </span>
                              <span className="text-[10px] text-gray-400">
                                Transmite tudo o que você escuta nos fones (jogo, Discord, músicas, etc.).
                              </span>
                            </div>
                          </label>

                          <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${audioMode === 'none' ? 'border-emerald-500 bg-emerald-500/10' : 'border-[#242b3d] bg-[#141824] hover:bg-[#1a1f30]'}`}>
                            <input
                              type="radio"
                              name="audioMode"
                              value="none"
                              checked={audioMode === 'none'}
                              onChange={() => setAudioMode('none')}
                              className="mt-0.5 accent-emerald-500 w-4 h-4 cursor-pointer"
                            />
                            <div className="flex flex-col">
                              <span className="text-xs text-gray-400 font-semibold flex items-center gap-1.5">
                                Sem Áudio (Mutado)
                              </span>
                              <span className="text-[10px] text-gray-500">
                                Transmite apenas a imagem do jogo sem emitir som.
                              </span>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* BOTÃO DISPARAR TRANSMISSÃO */}
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={handleStartBroadcast}
                        disabled={!selectedSource || isStartingBroadcast}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-gamer font-bold text-sm tracking-wide transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                      >
                        <Play className={`w-4 h-4 fill-current ${isStartingBroadcast ? 'animate-spin' : ''}`} />
                        <span>{isStartingBroadcast ? 'Iniciando Live...' : 'Iniciar VaultCast Agora'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 2: AO VIVO NA GUILDA / TRANSMISSÕES DE AMIGOS */}
          {/* ==================================================== */}
          {activeTab === 'guild' && (
            <div className="space-y-4">
              {watchingCast ? (
                /* VISUALIZADOR DA STREAM DE UM AMIGO */
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <button
                      onClick={() => setWatchingCast(null)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141824] hover:bg-[#1c2233] border border-[#242b3d] text-xs font-semibold text-gray-300 hover:text-white transition-all shadow-sm w-fit"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Ver Outras Transmissões</span>
                    </button>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                        <span className="text-xs font-bold text-rose-400 uppercase">
                          Assistindo {watchingCast.pilotName}
                        </span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          watchingCast.engine === 'livekit'
                            ? 'bg-cyan-950/70 border-cyan-500/40 text-cyan-300'
                            : 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                        }`}>
                          {watchingCast.engine === 'livekit' ? '☁️ SFU Nuvem' : '⚡ P2P Direto'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleDetachWindow}
                          title="Destacar live para uma janela própria no Windows (Always-On-Top)"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Destacar Janela</span>
                        </button>

                        <button
                          onClick={() => setWatchingCast(null)}
                          title="Encerrar visualização e desconectar"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 border border-rose-500/50 text-rose-300 hover:text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                        >
                          <Square className="w-3 h-3 fill-current" />
                          <span>Parar de Assistir</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="relative aspect-video w-full rounded-2xl bg-black border border-[#2d334a] overflow-hidden shadow-2xl flex items-center justify-center group">
                    {/* Botões rápidos flutuando no topo direito do vídeo */}
                    <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                      <button
                        onClick={handleDetachWindow}
                        title="Destacar para janela própria no Windows"
                        className="p-2 rounded-xl bg-black/80 hover:bg-emerald-500 hover:text-black border border-gray-700/80 hover:border-emerald-400 text-gray-300 backdrop-blur-md transition-all shadow-lg cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setWatchingCast(null)}
                        title="Parar de assistir e fechar player"
                        className="p-2 rounded-xl bg-black/80 hover:bg-rose-600 border border-gray-700/80 hover:border-rose-500 text-gray-300 hover:text-white backdrop-blur-md transition-all shadow-lg cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {remoteStream ? (
                      <video
                        ref={(el) => {
                          viewerVideoRef.current = el;
                          if (el && remoteStream && el.srcObject !== remoteStream) {
                            el.srcObject = remoteStream;
                            el.play().catch(e => console.warn('Erro ao reproduzir stream do amigo:', e));
                          }
                        }}
                        autoPlay
                        playsInline
                        controls
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                        <Loader2 className="w-10 h-10 animate-spin text-emerald-400" />
                        <div>
                          <h4 className="text-sm font-bold text-white">
                            Conectando à transmissão de {watchingCast.pilotName}...
                          </h4>
                          <p className="text-xs text-gray-400 mt-1">
                            {watchingCast.engine === 'livekit'
                              ? 'Conectando ao servidor de mídia LiveKit SFU (ultrabaixo consumo)...'
                              : 'Estabelecendo conexão P2P de baixa latência via WebRTC.'}
                          </p>
                        </div>
                        <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-[#141824] border border-[#242b3d] text-gray-400">
                          Status: {viewerConnectionState === 'connected' ? '🟢 Conectado' : viewerConnectionState === 'connecting' ? '🟡 Sincronizando...' : viewerConnectionState}
                        </span>
                      </div>
                    )}

                    {/* OVERLAY TÍTULO E STATUS QUANDO CONECTADO */}
                    {remoteStream && (
                      <>
                        <div className="absolute top-4 left-4 flex items-center gap-2 pointer-events-none">
                          <div className="px-3 py-1.5 rounded-lg bg-black/75 backdrop-blur-md border border-rose-500/50 flex items-center gap-2 text-rose-400 font-bold text-xs">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                            <span>AO VIVO: {watchingCast.pilotName}</span>
                          </div>
                        </div>

                        <div className="absolute bottom-4 left-4 pointer-events-none">
                          <div className="px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-md border border-gray-800 text-white font-gamer font-bold text-sm">
                            {watchingCast.gameTitle}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : guildCasts.length === 0 ? (
                /* ESTADO VAZIO: NINGUÉM TRANSMITINDO */
                <div className="py-20 text-center space-y-4 border border-dashed border-[#232738] rounded-2xl">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-[#141824] border border-[#242b3d] flex items-center justify-center text-gray-500">
                    <Tv className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">
                      Nenhum membro transmitindo no momento
                    </h4>
                    <p className="text-xs text-gray-400 max-w-sm mx-auto">
                      Seja o primeiro a transmitir para a guilda! Clique na aba "Minha Live" e compartilhe o link no Discord.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('broadcast')}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-colors"
                  >
                    Iniciar Minha Live
                  </button>
                </div>
              ) : (
                /* LISTA DE LIVES ATIVAS NA GUILDA */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {guildCasts.map((cast) => (
                    <div
                      key={cast.id}
                      className="p-4 rounded-xl bg-[#0f121a] border border-[#232738] hover:border-emerald-500/50 transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                          <span className="text-xs font-bold text-white">
                            {cast.pilotName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {cast.engine === 'livekit' && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/70 text-cyan-400 border border-cyan-800/50">
                              ☁️ SFU
                            </span>
                          )}
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                            {cast.resolution}
                          </span>
                        </div>
                      </div>

                      <div className="text-sm font-gamer font-bold text-gray-200">
                        {cast.gameTitle}
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={() => setWatchingCast(cast)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-colors"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Assistir</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>,
    document.body
  );
}
