import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { isWishlist, isFinished, isDropped } from '../utils/gameUtils';

/**
 * Busca a atividade recente e calcula métricas consolidadas e comparativas da Guilda
 */
export async function getGuildData(currentUserId, currentUserNickname, friendIds = []) {
  if (!db) {
    return { activities: [], leaderboard: [], stats: null };
  }

  // Lista de todos os membros da guilda (usuário logado + amigos)
  const allMemberIds = [
    { id: currentUserId, name: currentUserNickname || 'Você', isMe: true },
    ...friendIds.map(fId => ({ id: fId, name: 'Piloto', isMe: false }))
  ];

  const activities = [];
  const memberStatsMap = {};
  const genreCounts = {};
  let totalGuildHours = 0;
  let totalGuildRatingSum = 0;
  let totalGuildRatingCount = 0;
  let scoreDist = { over9: 0, between8and9: 0, between7and8: 0, under7: 0 };

  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  for (const member of allMemberIds) {
    try {
      let memberName = member.name;

      if (!member.isMe) {
        const profileSnap = await getDoc(doc(db, 'profiles', member.id));
        if (profileSnap.exists()) {
          memberName = profileSnap.data().nickname || 'Piloto';
        }
      }

      memberStatsMap[member.id] = {
        id: member.id,
        name: memberName,
        isMe: member.isMe,
        completedCount: 0,
        droppedCount: 0,
        totalHours: 0,
        totalScore: 0,
        ratedCount: 0,
        thisMonthCount: 0,
        latestDateFinished: null,
        longestGame: null,
        shortestGame: null,
        longestDroppedGame: null
      };

      // Busca jogos do membro
      const gamesRef = collection(db, 'users', member.id, 'games');
      const gamesSnap = await getDocs(gamesRef);

      gamesSnap.docs.forEach(docSnap => {
        const data = docSnap.data();
        const statusLower = (data.status || '').toLowerCase().trim();
        const isWish = isWishlist(data.status);

        // Auto-limpeza silenciosa se for backlog com data residual
        if (isWish && member.isMe && (data.dateFinished || data.rating > 0 || (data.playtime && data.playtime !== '0'))) {
          updateDoc(doc(db, 'users', member.id, 'games', docSnap.id), {
            dateFinished: '',
            rating: 0,
            playtime: '0'
          }).catch(() => {});
        }

        const isDrop = isDropped(data.status);

        // Jogo é concluído somente se NÃO for backlog/desejos, NÃO for dropado, NÃO for 'jogando',
        // e tiver status de finalizado/zerado ou for legado sem status mas com data
        const isCompleted = !isWish && !isDrop && statusLower !== 'jogando' && (
          isFinished(data.status) ||
          statusLower.includes('finalizado') ||
          statusLower.includes('zerado') ||
          statusLower.includes('conclu') ||
          (!data.status && Boolean(data.dateFinished))
        );

        if (isDrop) {
          const playtime = parseFloat(data.playtime) || 0;
          const dateDrop = data.dateFinished || (data.createdAt?.toDate ? data.createdAt.toDate().toISOString().split('T')[0] : '');

          memberStatsMap[member.id].droppedCount += 1;

          if (playtime > 0) {
            if (!memberStatsMap[member.id].longestDroppedGame || playtime > memberStatsMap[member.id].longestDroppedGame.hours) {
              memberStatsMap[member.id].longestDroppedGame = {
                title: data.title,
                hours: playtime,
                reason: data.dropReason || data.review || ''
              };
            }
          }

          // Feed de Atividade para Drops
          activities.push({
            id: `${member.id}_${docSnap.id}`,
            friendId: member.id,
            friendName: memberName,
            isMe: member.isMe,
            gameId: docSnap.id,
            gameTitle: data.title,
            isDropped: true,
            rating: 0,
            dateFinished: dateDrop || 'Recente',
            imageUrl: data.imageUrl,
            review: data.dropReason || data.review || '',
            dropReason: data.dropReason || data.review || '',
            playtime: data.playtime,
            genre: data.genre,
            themeUrl: data.themeUrl,
            screenshots: data.screenshots || []
          });
        } else if (isCompleted) {
          const rating = parseFloat(data.rating) || 0;
          const playtime = parseFloat(data.playtime) || 0;
          const dateFin = data.dateFinished || (data.createdAt?.toDate ? data.createdAt.toDate().toISOString().split('T')[0] : '');

          // Atualiza dados do membro
          memberStatsMap[member.id].completedCount += 1;
          memberStatsMap[member.id].totalHours += playtime;

          // Rastreia jogo mais longo e mais curto
          if (playtime > 0) {
            if (!memberStatsMap[member.id].longestGame || playtime > memberStatsMap[member.id].longestGame.hours) {
              memberStatsMap[member.id].longestGame = { title: data.title, hours: playtime };
            }
            if (!memberStatsMap[member.id].shortestGame || playtime < memberStatsMap[member.id].shortestGame.hours) {
              memberStatsMap[member.id].shortestGame = { title: data.title, hours: playtime };
            }
          }

          if (dateFin) {
            if (dateFin.startsWith(currentYearMonth)) {
              memberStatsMap[member.id].thisMonthCount += 1;
            }
            if (!memberStatsMap[member.id].latestDateFinished || dateFin > memberStatsMap[member.id].latestDateFinished) {
              memberStatsMap[member.id].latestDateFinished = dateFin;
            }
          }

          if (rating > 0) {
            memberStatsMap[member.id].totalScore += rating;
            memberStatsMap[member.id].ratedCount += 1;

            totalGuildRatingSum += rating;
            totalGuildRatingCount += 1;

            if (rating >= 9.0) scoreDist.over9 += 1;
            else if (rating >= 8.0) scoreDist.between8and9 += 1;
            else if (rating >= 7.0) scoreDist.between7and8 += 1;
            else scoreDist.under7 += 1;
          }

          totalGuildHours += playtime;

          // Gêneros
          if (data.genre) {
            data.genre.split(',').forEach(g => {
              const trimmed = g.trim();
              if (trimmed) genreCounts[trimmed] = (genreCounts[trimmed] || 0) + 1;
            });
          }

          // Feed de Atividade
          activities.push({
            id: `${member.id}_${docSnap.id}`,
            friendId: member.id,
            friendName: memberName,
            isMe: member.isMe,
            gameId: docSnap.id,
            gameTitle: data.title,
            isDropped: false,
            rating: data.rating,
            dateFinished: dateFin || 'Recente',
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
      console.warn(`Erro ao processar dados da guilda para o membro ${member.id}:`, err);
    }
  }

  // Ordena atividades pelas datas mais recentes
  activities.sort((a, b) => {
    const dateA = new Date(a.dateFinished || 0).getTime();
    const dateB = new Date(b.dateFinished || 0).getTime();
    return dateB - dateA;
  });

  // Processa dados avançados de leaderboard
  const nowTime = now.getTime();
  const leaderboard = Object.values(memberStatsMap).map(m => {
    const avgRating = m.ratedCount > 0 ? (m.totalScore / m.ratedCount).toFixed(1) : '-';
    const avgHoursPerGame = m.completedCount > 0 ? (m.totalHours / m.completedCount).toFixed(1) : '0';

    let daysSinceLastGame = 9999;
    if (m.latestDateFinished) {
      const lastTime = new Date(m.latestDateFinished).getTime();
      daysSinceLastGame = Math.max(0, Math.floor((nowTime - lastTime) / (1000 * 60 * 60 * 24)));
    }

    return {
      ...m,
      totalHours: Math.round(m.totalHours * 10) / 10,
      avgRating,
      avgHoursPerGame: Number(avgHoursPerGame),
      daysSinceLastGame
    };
  });

  // Gênero mais jogado
  const topGenreEntry = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0];
  const topGenre = topGenreEntry ? topGenreEntry[0] : 'Variados';
  const totalGenreGames = Object.values(genreCounts).reduce((acc, c) => acc + c, 0);
  const topGenrePercentage = totalGenreGames > 0 ? Math.round((topGenreEntry[1] / totalGenreGames) * 100) : 0;

  // Estatísticas consolidadas
  const totalJointGames = activities.length;
  const overallAvgRating = totalGuildRatingCount > 0 ? (totalGuildRatingSum / totalGuildRatingCount).toFixed(1) : '-';

  const stats = {
    totalJointGames,
    totalGuildHours: totalGuildHours.toFixed(0),
    overallAvgRating,
    topGenre: `${topGenre} (${topGenrePercentage}%)`,
    scoreDist,
    totalGuildRatingCount,
    percentOver7: totalGuildRatingCount > 0 ? Math.round(((scoreDist.over9 + scoreDist.between8and9 + scoreDist.between7and8) / totalGuildRatingCount) * 100) : 0
  };

  return { activities, leaderboard, stats };
}
