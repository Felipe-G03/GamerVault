import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Busca a atividade recente dos amigos da Guilda
 */
export async function getGuildActivities(friendIds = []) {
  if (!db || !friendIds || friendIds.length === 0) return [];

  const activities = [];

  // Itera sobre os amigos para buscar seus jogos finalizados
  for (const friendId of friendIds) {
    try {
      // 1. Busca perfil do amigo
      const profileSnap = await getDoc(doc(db, 'profiles', friendId));
      const friendName = profileSnap.exists() ? profileSnap.data().nickname || 'Amigo' : 'Piloto';

      // 2. Busca jogos do amigo
      const gamesRef = collection(db, 'users', friendId, 'games');
      const gamesSnap = await getDocs(gamesRef);

      gamesSnap.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (data.status === 'Finalizado') {
          activities.push({
            id: `${friendId}_${docSnap.id}`,
            friendId,
            friendName,
            gameId: docSnap.id,
            gameTitle: data.title,
            rating: data.rating,
            dateFinished: data.dateFinished || (data.createdAt?.toDate ? data.createdAt.toDate().toISOString().split('T')[0] : 'Recente'),
            imageUrl: data.imageUrl,
            review: data.review,
            playtime: data.playtime,
            genre: data.genre,
            themeUrl: data.themeUrl,
            screenshots: data.screenshots || []
          });
        }
      });
    } catch (err) {
      console.warn(`Erro ao carregar atividades do amigo ${friendId}:`, err);
    }
  }

  // Ordena pelas datas mais recentes
  activities.sort((a, b) => {
    const dateA = new Date(a.dateFinished || 0).getTime();
    const dateB = new Date(b.dateFinished || 0).getTime();
    return dateB - dateA;
  });

  return activities;
}
