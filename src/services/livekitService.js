import { Room, RoomEvent, Track } from 'livekit-client';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';

const STORAGE_KEY = 'gamervault_livekit_config';

/**
 * Obtém credenciais do LiveKit (do .env ou de configurações salvas no app)
 */
export function getLiveKitConfig() {
  const envConfig = {
    url: import.meta.env.VITE_LIVEKIT_URL,
    apiKey: import.meta.env.VITE_LIVEKIT_API_KEY,
    apiSecret: import.meta.env.VITE_LIVEKIT_API_SECRET
  };

  if (envConfig.url && envConfig.apiKey && envConfig.apiSecret) {
    return envConfig;
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.url && parsed.apiKey && parsed.apiSecret) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Erro ao ler configuração do LiveKit:', e);
  }

  return null;
}

/**
 * Salva credenciais do LiveKit no armazenamento local
 */
export function saveLiveKitConfig(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    return true;
  } catch (e) {
    console.error('Erro ao salvar configuração do LiveKit:', e);
    return false;
  }
}

/**
 * Remove credenciais do LiveKit do armazenamento local (retornando ao modo P2P)
 */
export function clearLiveKitConfig() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (e) {
    console.error('Erro ao remover configuração do LiveKit:', e);
    return false;
  }
}

/**
 * TRANSMISSOR (BROADCASTER) VIA LIVEKIT SFU:
 * Envia APENAS 1 fluxo de vídeo/áudio para o servidor de mídia LiveKit na nuvem.
 * O LiveKit redistribui para 10, 50 ou 100+ espectadores sem sobrecarregar a internet do streamer.
 */
export async function startLiveKitBroadcast({
  roomName,
  identity,
  stream,
  onViewerCountChange
}) {
  const config = getLiveKitConfig();
  if (!config) throw new Error('LiveKit não configurado.');

  // Gera o token de acesso assinado via Electron IPC
  const tokenRes = await window.electronAPI.generateLiveKitToken({
    apiKey: config.apiKey,
    apiSecret: config.apiSecret,
    roomName,
    identity: identity || 'streamer',
    isPublisher: true
  });

  if (!tokenRes.success) {
    throw new Error(tokenRes.error || 'Falha ao gerar token do LiveKit.');
  }

  const room = new Room({
    adaptiveStream: true,
    dynacast: true
  });

  await room.connect(config.url, tokenRes.token);

  let currentVideoTrack = stream.getVideoTracks()?.[0];
  let currentAudioTrack = stream.getAudioTracks()?.[0];
  let videoPub = null;
  let audioPub = null;

  if (currentVideoTrack) {
    videoPub = await room.localParticipant.publishTrack(currentVideoTrack, {
      name: 'vaultcast-video',
      source: Track.Source.ScreenShare
    });
  }

  if (currentAudioTrack) {
    audioPub = await room.localParticipant.publishTrack(currentAudioTrack, {
      name: 'vaultcast-audio',
      source: Track.Source.ScreenShareAudio
    });
  }

  const updateViewerCount = () => {
    onViewerCountChange?.(room.remoteParticipants.size);
  };

  room.on(RoomEvent.ParticipantConnected, updateViewerCount);
  room.on(RoomEvent.ParticipantDisconnected, updateViewerCount);
  updateViewerCount();

  // Escuta espectadores entrando pelo Firestore e distribui tokens assinados do LiveKit
  let unsubFirestoreViewers = null;
  if (db && roomName) {
    try {
      const viewersCol = collection(db, 'vaultcasts', roomName, 'viewers');
      unsubFirestoreViewers = onSnapshot(viewersCol, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added' || change.type === 'modified') {
            const viewerId = change.doc.id;
            const data = change.doc.data();
            if (data.status === 'requesting' && !data.livekitToken) {
              try {
                const tRes = await window.electronAPI.generateLiveKitToken({
                  apiKey: config.apiKey,
                  apiSecret: config.apiSecret,
                  roomName,
                  identity: viewerId,
                  isPublisher: false
                });
                if (tRes?.success) {
                  await updateDoc(change.doc.ref, {
                    livekitToken: tRes.token,
                    livekitUrl: config.url,
                    status: 'livekit_ready'
                  });
                }
              } catch (err) {
                console.warn('Erro ao gerar token LiveKit para espectador:', err);
              }
            }
          }
        });
      }, (err) => console.warn('Erro ao escutar espectadores LiveKit:', err));
    } catch (fsErr) {
      console.warn('Falha ao inicializar listener de espectadores:', fsErr);
    }
  }

  // Troca de janela em tempo real via SFU
  async function updateStream(newStream) {
    const newVideo = newStream.getVideoTracks()?.[0];
    if (newVideo && videoPub) {
      try {
        await room.localParticipant.unpublishTrack(currentVideoTrack);
        currentVideoTrack = newVideo;
        videoPub = await room.localParticipant.publishTrack(newVideo, {
          name: 'vaultcast-video',
          source: Track.Source.ScreenShare
        });
      } catch (err) {
        console.warn('Erro ao atualizar track de vídeo no LiveKit:', err);
      }
    }
  }

  // Encerra a transmissão no LiveKit
  async function stop() {
    unsubFirestoreViewers?.();
    try {
      await room.disconnect();
    } catch (_) {}
  }

  return { stop, updateStream };
}

/**
 * ESPECTADOR (VIEWER) VIA LIVEKIT SFU:
 * Conecta-se à sala do LiveKit e recebe as faixas de áudio e vídeo com latência ultrabaixa.
 * Se o espectador não tiver chaves locais, recebe o token do transmissor via Firestore.
 */
export function connectLiveKitViewer({
  castId,
  userId,
  onRemoteStream,
  onConnectionStateChange
}) {
  const viewerId = userId || `viewer_${Math.random().toString(36).substring(2, 7)}`;
  let room = null;
  let unsubDoc = null;
  const mediaStream = new MediaStream();
  let isCleanedUp = false;

  async function connectWithToken(url, token) {
    if (isCleanedUp) return;
    try {
      room = new Room({
        adaptiveStream: true,
        dynacast: true
      });

      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        onConnectionStateChange?.(state);
      });

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.mediaStreamTrack) {
          // Remove tracks anteriores do mesmo tipo se houver
          const existing = mediaStream.getTracks().filter(t => t.kind === track.mediaStreamTrack.kind);
          existing.forEach(t => mediaStream.removeTrack(t));

          mediaStream.addTrack(track.mediaStreamTrack);
          onRemoteStream?.(mediaStream);
        }
      });

      await room.connect(url, token);
      onConnectionStateChange?.('connected');

      // Se houver tracks que já estavam publicadas
      room.remoteParticipants.forEach((participant) => {
        participant.trackPublications.forEach((pub) => {
          if (pub.isSubscribed && pub.track?.mediaStreamTrack) {
            mediaStream.addTrack(pub.track.mediaStreamTrack);
          }
        });
      });

      if (mediaStream.getTracks().length > 0) {
        onRemoteStream?.(mediaStream);
      }
    } catch (err) {
      console.error('Falha ao conectar espectador no LiveKit:', err);
      onConnectionStateChange?.('failed');
    }
  }

  const localConfig = getLiveKitConfig();

  if (localConfig && window.electronAPI?.generateLiveKitToken) {
    // Caso 1: Usuário possui chaves locais
    window.electronAPI.generateLiveKitToken({
      apiKey: localConfig.apiKey,
      apiSecret: localConfig.apiSecret,
      roomName: castId,
      identity: viewerId,
      isPublisher: false
    }).then((res) => {
      if (res?.success) {
        connectWithToken(localConfig.url, res.token);
      } else {
        throw new Error(res?.error || 'Falha ao gerar token');
      }
    }).catch((err) => {
      console.warn('Falha com chaves locais, tentando handshake Firestore:', err);
      startFirestoreHandshake();
    });
  } else {
    // Caso 2: Espectador não possui chaves locais, obtém token do streamer via Firestore
    startFirestoreHandshake();
  }

  function startFirestoreHandshake() {
    if (!db || !castId) return;
    const viewerDocRef = doc(db, 'vaultcasts', castId, 'viewers', viewerId);

    setDoc(viewerDocRef, {
      id: viewerId,
      status: 'requesting',
      requestedAt: Date.now()
    }).catch(console.warn);

    unsubDoc = onSnapshot(viewerDocRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.livekitToken && data.livekitUrl && !room) {
        connectWithToken(data.livekitUrl, data.livekitToken);
      }
    });
  }

  function disconnect() {
    isCleanedUp = true;
    unsubDoc?.();
    if (db && castId) {
      const viewerDocRef = doc(db, 'vaultcasts', castId, 'viewers', viewerId);
      deleteDoc(viewerDocRef).catch(() => {});
    }
    try {
      room?.disconnect();
    } catch (_) {}
  }

  return { disconnect };
}
