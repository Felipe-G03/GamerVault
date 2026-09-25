import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

/**
 * LADO DO TRANSMISSOR (BROADCASTER):
 * Gerencia a transmissão 1-para-Muitos (Multi-Viewer) via WebRTC.
 * Para cada espectador que solicita conexão no Firestore, cria um PeerConnection,
 * injeta as tracks de vídeo/áudio e estabelece a conexão direta.
 */
export function startBroadcastingWebRTC(castId, mediaStream, onViewerCountChange) {
  if (!db || !castId || !mediaStream) {
    return { stop: () => {}, updateStream: () => {} };
  }

  let currentStream = mediaStream;
  const viewersMap = new Map(); // key: viewerId -> { pc, unsubDoc, unsubCandidates }

  const viewersCollectionRef = collection(db, 'vaultcasts', castId, 'viewers');

  const notifyCount = () => {
    onViewerCountChange?.(viewersMap.size);
  };

  // Escuta novos espectadores entrando na sala
  const unsubViewers = onSnapshot(viewersCollectionRef, (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      const viewerId = change.doc.id;
      const data = change.doc.data();

      // Espectador solicitou conexão
      if (change.type === 'added' || change.type === 'modified') {
        if (data.status === 'requesting' && !viewersMap.has(viewerId)) {
          await setupViewerConnection(viewerId, change.doc.ref);
        }
      }

      // Espectador desconectou ou fechou a transmissão
      if (change.type === 'removed') {
        cleanupViewer(viewerId);
      }
    });
  }, (err) => {
    console.warn('Erro ao escutar espectadores no Firestore:', err);
  });

  // Configura a conexão WebRTC para um espectador específico
  async function setupViewerConnection(viewerId, viewerDocRef) {
    try {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      // Adiciona as tracks atuais (vídeo e áudio) para este espectador
      currentStream.getTracks().forEach((track) => {
        pc.addTrack(track, currentStream);
      });

      // Envia os candidatos ICE do transmissor para o Firestore
      const broadcasterCandidatesRef = collection(db, 'vaultcasts', castId, 'viewers', viewerId, 'broadcasterCandidates');
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(broadcasterCandidatesRef, {
            candidate: event.candidate.toJSON()
          }).catch(console.warn);
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          cleanupViewer(viewerId);
        }
      };

      // Cria a Oferta SDP para o espectador
      const offer = await pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false
      });
      await pc.setLocalDescription(offer);

      await updateDoc(viewerDocRef, {
        offer: { type: offer.type, sdp: offer.sdp },
        status: 'offered'
      });

      // Escuta a Resposta SDP (Answer) do espectador
      const unsubDoc = onSnapshot(viewerDocRef, async (docSnap) => {
        if (!docSnap.exists()) return;
        const d = docSnap.data();
        if (d.answer && !pc.currentRemoteDescription) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(d.answer));
          } catch (e) {
            console.warn('Erro ao definir remote description do espectador:', e);
          }
        }
      });

      // Escuta os candidatos ICE enviados pelo espectador
      const viewerCandidatesRef = collection(db, 'vaultcasts', castId, 'viewers', viewerId, 'viewerCandidates');
      const unsubCandidates = onSnapshot(viewerCandidatesRef, (cSnap) => {
        cSnap.docChanges().forEach(async (cChange) => {
          if (cChange.type === 'added') {
            const cData = cChange.doc.data();
            if (cData?.candidate) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(cData.candidate));
              } catch (e) {
                console.warn('Erro ao adicionar candidato ICE do espectador:', e);
              }
            }
          }
        });
      });

      viewersMap.set(viewerId, { pc, unsubDoc, unsubCandidates, viewerDocRef });
      notifyCount();
    } catch (err) {
      console.error(`Falha ao estabelecer conexão com espectador ${viewerId}:`, err);
    }
  }

  function cleanupViewer(viewerId) {
    if (!viewersMap.has(viewerId)) return;
    const entry = viewersMap.get(viewerId);
    entry.unsubDoc?.();
    entry.unsubCandidates?.();
    try {
      entry.pc?.close();
    } catch (_) {}
    viewersMap.delete(viewerId);
    notifyCount();
  }

  // Permite substituir as tracks de vídeo e áudio dinamicamente ao trocar de janela
  function updateStream(newStream) {
    currentStream = newStream;
    const newVideoTrack = newStream.getVideoTracks()?.[0];
    const newAudioTrack = newStream.getAudioTracks()?.[0];

    viewersMap.forEach(({ pc }) => {
      try {
        const senders = pc.getSenders();
        if (newVideoTrack) {
          const videoSender = senders.find(s => s.track && s.track.kind === 'video');
          if (videoSender && videoSender.track !== newVideoTrack) {
            videoSender.replaceTrack(newVideoTrack).catch(console.warn);
          }
        }
        if (newAudioTrack) {
          const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
          if (audioSender && audioSender.track !== newAudioTrack) {
            audioSender.replaceTrack(newAudioTrack).catch(console.warn);
          }
        }
      } catch (e) {
        console.warn('Erro ao substituir track para espectador:', e);
      }
    });
  }

  // Encerra todas as conexões
  function stop() {
    unsetViewers?.();
    viewersMap.forEach((_, viewerId) => cleanupViewer(viewerId));
    viewersMap.clear();
    notifyCount();
  }

  return { stop, updateStream };
}

/**
 * LADO DO ESPECTADOR (VIEWER):
 * Conecta-se à transmissão ativa de um amigo e reproduz o stream em tempo real.
 */
export function connectViewerWebRTC({ castId, userId, onRemoteStream, onConnectionStateChange }) {
  if (!db || !castId) {
    return { disconnect: () => {} };
  }

  const viewerId = `viewer_${userId || 'guest'}_${Math.random().toString(36).substring(2, 9)}`;
  const viewerDocRef = doc(db, 'vaultcasts', castId, 'viewers', viewerId);
  const pc = new RTCPeerConnection(ICE_SERVERS);

  let unsubDoc = null;
  let unsubBroadcasterCandidates = null;
  let isCleanedUp = false;

  // Recebe a faixa de vídeo e áudio do transmissor
  pc.ontrack = (event) => {
    if (event.streams && event.streams[0]) {
      onRemoteStream?.(event.streams[0]);
    }
  };

  pc.onconnectionstatechange = () => {
    onConnectionStateChange?.(pc.connectionState);
  };

  // Envia candidatos ICE do espectador
  const viewerCandidatesRef = collection(db, 'vaultcasts', castId, 'viewers', viewerId, 'viewerCandidates');
  pc.onicecandidate = (event) => {
    if (event.candidate && !isCleanedUp) {
      addDoc(viewerCandidatesRef, {
        candidate: event.candidate.toJSON()
      }).catch(console.warn);
    }
  };

  // Inicializa o registro do espectador no Firestore
  setDoc(viewerDocRef, {
    id: viewerId,
    status: 'requesting',
    createdAt: serverTimestamp()
  }).catch(err => {
    console.error('Erro ao registrar solicitação de espectador:', err);
  });

  // Escuta a Oferta SDP enviada pelo transmissor
  unsubDoc = onSnapshot(viewerDocRef, async (docSnap) => {
    if (!docSnap.exists() || isCleanedUp) return;
    const data = docSnap.data();

    if (data.offer && !pc.currentRemoteDescription) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await updateDoc(viewerDocRef, {
          answer: { type: answer.type, sdp: answer.sdp },
          status: 'connected'
        });
      } catch (err) {
        console.error('Erro ao processar oferta e gerar resposta do espectador:', err);
      }
    }
  });

  // Escuta os candidatos ICE enviados pelo transmissor
  const broadcasterCandidatesRef = collection(db, 'vaultcasts', castId, 'viewers', viewerId, 'broadcasterCandidates');
  unsubBroadcasterCandidates = onSnapshot(broadcasterCandidatesRef, (snapshot) => {
    if (isCleanedUp) return;
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === 'added') {
        const cData = change.doc.data();
        if (cData?.candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cData.candidate));
          } catch (e) {
            console.warn('Erro ao aplicar candidato ICE no espectador:', e);
          }
        }
      }
    });
  });

  function disconnect() {
    isCleanedUp = true;
    unsubDoc?.();
    unsubBroadcasterCandidates?.();
    try {
      pc.close();
    } catch (_) {}
    deleteDoc(viewerDocRef).catch(() => {});
  }

  return { disconnect };
}
