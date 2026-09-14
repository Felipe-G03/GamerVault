import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '../config/firebase';

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
