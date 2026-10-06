import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { isFinished } from '../utils/gameUtils';

export const BANNER_THEMES = [
  {
    id: 'cyber-grid',
    name: 'Cyber Grid',
    gradient: 'from-[#05131a] via-[#092b33] to-[#041c1a]',
    accentColor: '#10b981',
    animationClass: 'bg-cyber-grid animate-pulse-slow'
  },
  {
    id: 'synthwave-sunset',
    name: 'Synthwave Sunset',
    gradient: 'from-[#180a29] via-[#35103b] to-[#150524]',
    accentColor: '#ec4899',
    animationClass: 'bg-gradient-to-r from-[#240e3f]/70 via-[#3a0d38]/50 to-[#120424]/90'
  },
  {
    id: 'matrix-rain',
    name: 'Matrix Stream',
    gradient: 'from-[#031408] via-[#082914] to-[#020d06]',
    accentColor: '#22c55e',
    animationClass: 'bg-gradient-to-br from-emerald-950/90 via-black to-emerald-900/50'
  },
  {
    id: 'aurora-borealis',
    name: 'Aurora Borealis',
    gradient: 'from-[#071926] via-[#093539] to-[#0d1f36]',
    accentColor: '#06b6d4',
    animationClass: 'bg-gradient-to-r from-cyan-950/80 via-teal-900/50 to-blue-950/80'
  },
  {
    id: 'crimson-void',
    name: 'Crimson Void',
    gradient: 'from-[#1c0608] via-[#380e12] to-[#150406]',
    accentColor: '#ef4444',
    animationClass: 'bg-gradient-to-r from-red-950/90 via-rose-950/50 to-zinc-950'
  },
  {
    id: 'midnight-gold',
    name: 'Midnight Gold',
    gradient: 'from-[#171306] via-[#2d2208] to-[#120f04]',
    accentColor: '#eab308',
    animationClass: 'bg-gradient-to-r from-amber-950/80 via-yellow-950/40 to-stone-950'
  }
];

/**
 * Obtém os dados de perfil do usuário (/profiles/{userId})
 */
export async function getProfile(userId) {
  if (!db || !userId) return null;
  const profileRef = doc(db, 'profiles', userId);
  const snap = await getDoc(profileRef);
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() };
  }
  return null;
}

/**
 * Cria ou garante que o perfil exista
 */
export async function ensureProfile(userId, email, defaultNickname = 'Piloto') {
  if (!db || !userId) return null;
  const profileRef = doc(db, 'profiles', userId);
  const snap = await getDoc(profileRef);
  if (!snap.exists()) {
    const newProfile = {
      email: email || '',
      nickname: defaultNickname,
      friends: []
    };
    await setDoc(profileRef, newProfile);
    return { id: userId, ...newProfile };
  }
  return { id: snap.id, ...snap.data() };
}

/**
 * Atualiza o nickname do usuário
 */
export async function updateNickname(userId, nickname) {
  if (!db || !userId) throw new Error('Usuário inválido');
  const profileRef = doc(db, 'profiles', userId);
  await updateDoc(profileRef, { nickname: nickname.trim() });
  return true;
}

/**
 * Adiciona um amigo pelo ID de Piloto (userId)
 */
export async function addFriend(userId, friendPilotId) {
  if (!db || !userId || !friendPilotId) throw new Error('Dados incompletos');
  const cleanId = friendPilotId.trim();
  if (cleanId === userId) {
    throw new Error('Você não pode adicionar seu próprio ID como amigo.');
  }

  // Verifica se o amigo existe
  const friendRef = doc(db, 'profiles', cleanId);
  const friendSnap = await getDoc(friendRef);
  if (!friendSnap.exists()) {
    throw new Error('Nenhum jogador encontrado com este ID de Piloto.');
  }

  // Adiciona ao array friends
  const userProfileRef = doc(db, 'profiles', userId);
  await updateDoc(userProfileRef, {
    friends: arrayUnion(cleanId)
  });

  return {
    id: cleanId,
    ...friendSnap.data()
  };
}

/**
 * Remove um amigo da lista
 */
export async function removeFriend(userId, friendPilotId) {
  if (!db || !userId || !friendPilotId) throw new Error('Dados incompletos');
  const userProfileRef = doc(db, 'profiles', userId);
  await updateDoc(userProfileRef, {
    friends: arrayRemove(friendPilotId)
  });
  return true;
}

/**
 * Obtém os perfis dos amigos
 */
export async function getFriendsDetails(friendIds = []) {
  if (!db || !friendIds || friendIds.length === 0) return [];
  const profiles = [];
  for (const fId of friendIds) {
    try {
      const snap = await getDoc(doc(db, 'profiles', fId));
      if (snap.exists()) {
        profiles.push({ id: snap.id, ...snap.data() });
      } else {
        profiles.push({ id: fId, nickname: 'Piloto Desconhecido', email: fId });
      }
    } catch (e) {
      console.warn(`Erro ao carregar perfil do amigo ${fId}:`, e);
    }
  }
  return profiles;
}

/**
 * Atualiza todos os dados de personalização do perfil
 */
export async function updateFullProfile(userId, { nickname, avatar, customAvatarUrl, bannerTheme, customBannerUrl, bio, showcases, accentColor }) {
  if (!db || !userId) throw new Error('Usuário inválido');
  const profileRef = doc(db, 'profiles', userId);

  const payload = {
    updatedAt: new Date().toISOString()
  };

  if (nickname !== undefined) payload.nickname = nickname.trim();
  if (avatar !== undefined) payload.avatar = avatar;
  if (customAvatarUrl !== undefined) payload.customAvatarUrl = customAvatarUrl.trim();
  if (bannerTheme !== undefined) payload.bannerTheme = bannerTheme;
  if (customBannerUrl !== undefined) payload.customBannerUrl = customBannerUrl.trim();
  if (bio !== undefined) payload.bio = bio.trim();
  if (showcases !== undefined) payload.showcases = showcases;
  if (accentColor !== undefined) payload.accentColor = accentColor.trim();

  await updateDoc(profileRef, payload);
  return true;
}

/**
 * Carrega perfil completo e jogos zerados de um amigo
 */
export async function getFriendProfileWithGames(friendId) {
  if (!db || !friendId) return null;

  try {
    const profileSnap = await getDoc(doc(db, 'profiles', friendId));
    let profileData = null;

    if (profileSnap.exists()) {
      profileData = { id: profileSnap.id, ...profileSnap.data() };
    } else {
      // Tenta buscar da coleção /users caso ainda não tenha salvo o perfil novo
      try {
        const userSnap = await getDoc(doc(db, 'users', friendId));
        if (userSnap.exists()) {
          const udata = userSnap.data();
          profileData = {
            id: friendId,
            nickname: udata.displayName || udata.name || 'Piloto da Guilda',
            avatar: udata.photoURL || null,
            bannerTheme: 'cyber-grid',
            bio: '',
            showcases: []
          };
        }
      } catch (_) {}

      if (!profileData) {
        profileData = {
          id: friendId,
          nickname: 'Piloto da Guilda',
          bannerTheme: 'cyber-grid',
          bio: '',
          showcases: []
        };
      }
    }

    // Busca jogos zerados do amigo
    let completedGames = [];
    try {
      const gamesRef = collection(db, 'users', friendId, 'games');
      const gamesSnap = await getDocs(gamesRef);

      gamesSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (isFinished(data.status)) {
          completedGames.push({
            id: docSnap.id,
            ...data
          });
        }
      });

      // Ordena os jogos zerados por data de conclusão descrescente
      completedGames.sort((a, b) => {
        const dateA = a.dateFinished || a.yearFinished || '';
        const dateB = b.dateFinished || b.yearFinished || '';
        return String(dateB).localeCompare(String(dateA));
      });
    } catch (e) {
      console.warn('Erro ao carregar jogos zerados do amigo:', e);
    }

    return {
      profile: profileData,
      completedGames
    };
  } catch (err) {
    console.error('Erro ao buscar perfil com jogos do amigo:', err);
    throw err;
  }
}
