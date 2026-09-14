import React, { useMemo } from 'react';
import {
  Clock,
  Trophy,
  Star,
  Gamepad2,
  Bookmark,
  TrendingUp,
  BarChart2,
  Flame
} from 'lucide-react';

export default function StatsView({ games = [] }) {
  const stats = useMemo(() => {
    let totalHours = 0;
    let finishedCount = 0;
    let wantToPlayCount = 0;
    let playingCount = 0;
    let totalRatingSum = 0;
    let ratedGamesCount = 0;
    let bestGame = null;

    const genreCounts = {};

    games.forEach((g) => {
      // Horas jogadas
      const hours = parseFloat(g.playtime) || 0;
      totalHours += hours;

      // Status
      if (g.status === 'Finalizado') finishedCount++;
      else if (g.status === 'Quero Jogar') wantToPlayCount++;
      else if (g.status === 'Jogando') playingCount++;

      // Notas
      const rating = parseFloat(g.rating) || 0;
      if (rating > 0) {
        totalRatingSum += rating;
        ratedGamesCount++;
        if (!bestGame || rating > bestGame.rating) {
          bestGame = g;
        }
      }

      // Gêneros
      if (g.genre) {
        const parts = g.genre.split(',').map((p) => p.trim());
        parts.forEach((genre) => {
          if (genre) {
            genreCounts[genre] = (genreCounts[genre] || 0) + 1;
          }
        });
      }
    });

    const averageRating = ratedGamesCount > 0 ? (totalRatingSum / ratedGamesCount).toFixed(1) : '-';

    const sortedGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    return {
      totalHours: totalHours.toFixed(0),
      finishedCount,
      wantToPlayCount,
      playingCount,
      averageRating,
      bestGame,
      sortedGenres,
      totalGames: games.length
    };
  }, [games]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Título com Barra Neon */}
      <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
        <div className="w-1.5 h-6 bg-accent-bright rounded-full shadow-[0_0_10px_#3dd69b]"></div>
        <h2 className="text-xl font-gamer font-bold text-white tracking-wide">
          Estatísticas & Insights Gamer
        </h2>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0e1017] border border-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-500 mb-2">
            <Clock className="w-5 h-5" />
            <span className="text-[10px] font-mono uppercase text-gray-500">Playtime</span>
          </div>
          <span className="text-2xl font-gamer font-extrabold text-white">
            {stats.totalHours}h
          </span>
          <span className="text-xs text-gray-400 mt-0.5">Tempo total jogado</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0e1017] border border-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <Trophy className="w-5 h-5" />
            <span className="text-[10px] font-mono uppercase text-gray-500">Zerados</span>
          </div>
          <span className="text-2xl font-gamer font-extrabold text-white">
            {stats.finishedCount}
          </span>
          <span className="text-xs text-gray-400 mt-0.5">Jogos finalizados</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0e1017] border border-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-cyan-400 mb-2">
            <Bookmark className="w-5 h-5" />
            <span className="text-[10px] font-mono uppercase text-gray-500">Backlog</span>
          </div>
          <span className="text-2xl font-gamer font-extrabold text-white">
            {stats.wantToPlayCount}
          </span>
          <span className="text-xs text-gray-400 mt-0.5">Quero jogar</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0e1017] border border-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-yellow-400 mb-2">
            <Star className="w-5 h-5" />
            <span className="text-[10px] font-mono uppercase text-gray-500">Média</span>
          </div>
          <span className="text-2xl font-gamer font-extrabold text-white">
            {stats.averageRating}
          </span>
          <span className="text-xs text-gray-400 mt-0.5">Nota média pessoal</span>
        </div>
      </div>

      {/* Destaques: Jogo Favorito & Gêneros Mais Jogados */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Jogo */}
        <div className="p-5 rounded-xl bg-[#0e1017] border border-border flex flex-col justify-between">
          <h3 className="text-xs font-mono uppercase tracking-wider text-accent-bright mb-3 flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-orange-500" />
            Jogo Mais Bem Avaliado
          </h3>
          {stats.bestGame ? (
            <div className="flex gap-4 items-center">
              <div className="w-20 h-24 rounded-lg overflow-hidden bg-black shrink-0 border border-border">
                {stats.bestGame.imageUrl && (
                  <img
                    src={stats.bestGame.imageUrl}
                    alt={stats.bestGame.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">{stats.bestGame.title}</h4>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold text-xs">
                    ★ {stats.bestGame.rating}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">
                    {stats.bestGame.playtime}h jogadas
                  </span>
                </div>
                {stats.bestGame.genre && (
                  <span className="text-xs text-gray-400 block">{stats.bestGame.genre}</span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-500 italic py-6 text-center">
              Avalie seus jogos para ver o seu título destaque aqui.
            </div>
          )}
        </div>

        {/* Gêneros Favoritos */}
        <div className="p-5 rounded-xl bg-[#0e1017] border border-border">
          <h3 className="text-xs font-mono uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4" />
            Top Gêneros na Biblioteca
          </h3>
          {stats.sortedGenres.length > 0 ? (
            <div className="space-y-2.5">
              {stats.sortedGenres.map(([genre, count]) => {
                const percentage = Math.round((count / stats.totalGames) * 100);
                return (
                  <div key={genre} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-gray-300">{genre}</span>
                      <span className="font-mono text-gray-400">{count} jogos ({percentage}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-high rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-accent-bright rounded-full"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-gray-500 italic py-6 text-center">
              Nenhum dado de gênero registrado ainda.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
