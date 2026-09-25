import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

const CASTS_COLLECTION = 'vaultcasts';

/**
 * Cria ou atualiza uma sessão de transmissão ativa no VaultCast
 */
export async function registerCastSession({ castId, pilotId, pilotName, gameTitle, resolution, fps, engine = 'p2p', livekitUrl = null }) {
  if (!db) return null;

  try {
    const docRef = doc(db, CASTS_COLLECTION, castId);
    await setDoc(docRef, {
      id: castId,
      pilotId: pilotId || 'unknown',
      pilotName: pilotName || 'Piloto',
      gameTitle: gameTitle || 'Gameplay',
      resolution: resolution || '1080p',
      fps: fps || 60,
      engine: engine || 'p2p',
      livekitUrl: livekitUrl || null,
      status: 'live',
      startedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return castId;
  } catch (err) {
    console.error('Erro ao registrar sessão do VaultCast no Firestore:', err);
    return null;
  }
}

/**
 * Encerra uma sessão do VaultCast
 */
export async function endCastSession(castId) {
  if (!db || !castId) return;

  try {
    const docRef = doc(db, CASTS_COLLECTION, castId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Erro ao encerrar sessão do VaultCast:', err);
  }
}

/**
 * Escuta transmissões ativas em tempo real na Guilda
 */
export function listenToActiveCasts(callback) {
  if (!db) {
    callback([]);
    return () => {};
  }

  try {
    const q = query(
      collection(db, CASTS_COLLECTION),
      where('status', '==', 'live')
    );

    return onSnapshot(q, (snapshot) => {
      const casts = [];
      snapshot.forEach(docSnap => {
        casts.push({ id: docSnap.id, ...docSnap.data() });
      });
      callback(casts);
    }, (err) => {
      console.warn('Erro ao escutar sessões ativas do VaultCast:', err);
      callback([]);
    });
  } catch (err) {
    console.error('Falha ao configurar listener do VaultCast:', err);
    callback([]);
    return () => {};
  }
}

/**
 * Formata o texto do convite pronto para ser colado no Discord (sem emojis, tipografia limpa)
 */
export function generateDiscordInvite({ castId, pilotName, gameTitle }) {
  const webLink = `https://gamer-vault-e667a.web.app/cast?room=${castId}`;
  
  return `**VaultCast | Gamer's Vault**
**${pilotName}** está transmitindo **${gameTitle}** agora na guilda.
Assistir no aplicativo: ${webLink}

*(O link abrirá a live diretamente no Gamer's Vault no seu PC)*`;
}

/**
 * Envia notificação automática estilizada para o canal do Discord via Webhook (sem emojis)
 */
export async function notifyDiscordLiveStart({ castId, pilotName, gameTitle, resolution, fps }) {
  const webhookUrl = import.meta.env.VITE_DISCORD_WEBHOOK_URL || import.meta.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return null;

  const webLink = `https://gamer-vault-e667a.web.app/cast?room=${castId}`;

  const payload = {
    username: "VaultCast",
    content: "**VaultCast** // Nova transmissão iniciada na guilda:",
    embeds: [
      {
        title: `${pilotName} está ao vivo`,
        description: `Transmitindo **${gameTitle}** para a guilda.\n\n[**Assistir no Gamer's Vault**](${webLink})`,
        url: webLink,
        color: 1097857, // #10B981 Verde Esmeralda
        fields: [
          { name: "Piloto", value: pilotName || "Membro", inline: true },
          { name: "Jogo", value: gameTitle || "Gameplay", inline: true },
          { name: "Qualidade", value: `${resolution} @ ${fps} FPS`, inline: true }
        ],
        footer: {
          text: "Gamer's Vault • Rede da Guilda"
        },
        timestamp: new Date().toISOString()
      }
    ]
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (err) {
    console.warn("Erro ao enviar webhook para o Discord:", err);
    return false;
  }
}

/**
 * Envia aviso de encerramento da transmissão no Discord (sem emojis)
 */
export async function notifyDiscordLiveEnd({ pilotName, gameTitle, duration }) {
  const webhookUrl = import.meta.env.VITE_DISCORD_WEBHOOK_URL || import.meta.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return null;

  const payload = {
    username: "VaultCast",
    embeds: [
      {
        title: `Transmissão encerrada: ${pilotName}`,
        description: `A transmissão de **${gameTitle}** foi finalizada.`,
        color: 3424072, // Neutro escuro
        fields: duration ? [{ name: "Duração", value: duration, inline: true }] : [],
        footer: {
          text: "Gamer's Vault • Rede da Guilda"
        },
        timestamp: new Date().toISOString()
      }
    ]
  };

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.warn("Erro ao enviar encerramento para o Discord:", err);
  }
}

