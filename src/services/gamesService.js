import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { isWishlist, isFinished } from '../utils/gameUtils';

/**
 * Retorna todos os jogos de um usuário (/users/{userId}/games)
 */
export async function getUserGames(userId) {
  if (!db || !userId) return [];
  try {
    const gamesRef = collection(db, 'users', userId, 'games');
    const snapshot = await getDocs(gamesRef);
    const games = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      const isWish = isWishlist(data.status);

      // Auto-higienização: se for backlog/desejo mas possuir data de conclusão residual, limpa no Firestore
      if (isWish && (data.dateFinished || data.rating > 0 || (data.playtime && data.playtime !== '0'))) {
        updateDoc(doc(db, 'users', userId, 'games', docSnap.id), {
          dateFinished: '',
          rating: 0,
          playtime: '0'
        }).catch(err => console.warn('Erro ao higienizar jogo de backlog:', err));

        return {
          id: docSnap.id,
          ...data,
          dateFinished: '',
          rating: 0,
          playtime: '0'
        };
      }

      return {
        id: docSnap.id,
        ...data
      };
    });

    return games;
  } catch (error) {
    console.error('Erro ao buscar jogos do usuário:', error);
    throw error;
  }
}

/**
 * Adiciona um novo jogo para o usuário mantendo o formato exato
 */
export async function addGame(userId, gameData) {
  if (!db || !userId) throw new Error('Banco de dados ou usuário não inicializado.');

  const isWish = isWishlist(gameData.status);
  const isFin = isFinished(gameData.status);

  const docPayload = {
    title: gameData.title || 'Sem título',
    status: gameData.status || 'Finalizado',
    rating: isWish ? 0 : (Number(gameData.rating) || 0),
    playtime: isWish ? '0' : String(gameData.playtime || '0'),
    dateFinished: isWish ? '' : (gameData.dateFinished || (isFin ? new Date().toISOString().split('T')[0] : '')),
    review: isWish ? '' : (gameData.review || ''),
    imageUrl: gameData.imageUrl || '',
    metacritic: gameData.metacritic ? Number(gameData.metacritic) : null,
    genre: gameData.genre || '',
    genre_slugs: Array.isArray(gameData.genre_slugs) ? gameData.genre_slugs : [],
    tags: Array.isArray(gameData.tags) ? gameData.tags : [],
    screenshots: Array.isArray(gameData.screenshots) ? gameData.screenshots : [],
    themeUrl: gameData.themeUrl ? String(gameData.themeUrl).trim() : null,
    createdAt: serverTimestamp()
  };

  const gamesRef = collection(db, 'users', userId, 'games');
  const newDoc = await addDoc(gamesRef, docPayload);
  return { id: newDoc.id, ...docPayload };
}

/**
 * Atualiza um jogo existente
 */
export async function updateGame(userId, gameId, gameData) {
  if (!db || !userId || !gameId) throw new Error('Parâmetros inválidos.');

  const isWish = isWishlist(gameData.status);

  const gameRef = doc(db, 'users', userId, 'games', gameId);
  const updatePayload = {
    title: gameData.title,
    status: gameData.status,
    rating: isWish ? 0 : (Number(gameData.rating) || 0),
    playtime: isWish ? '0' : String(gameData.playtime || '0'),
    dateFinished: isWish ? '' : (gameData.dateFinished || ''),
    review: isWish ? '' : (gameData.review || ''),
    imageUrl: gameData.imageUrl || '',
    metacritic: gameData.metacritic ? Number(gameData.metacritic) : null,
    genre: gameData.genre || '',
    genre_slugs: Array.isArray(gameData.genre_slugs) ? gameData.genre_slugs : [],
    tags: Array.isArray(gameData.tags) ? gameData.tags : [],
    screenshots: Array.isArray(gameData.screenshots) ? gameData.screenshots : [],
    themeUrl: gameData.themeUrl ? String(gameData.themeUrl).trim() : null
  };

  await updateDoc(gameRef, updatePayload);
  return { id: gameId, ...updatePayload };
}

/**
 * Remove um jogo da coleção
 */
export async function deleteGame(userId, gameId) {
  if (!db || !userId || !gameId) throw new Error('Parâmetros inválidos.');
  const gameRef = doc(db, 'users', userId, 'games', gameId);
  await deleteDoc(gameRef);
  return true;
}
