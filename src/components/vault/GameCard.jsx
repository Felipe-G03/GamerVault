import React from 'react';
import { Clock, Star, Play, Sparkles, Calendar, Ban } from 'lucide-react';
import { isDropped, isWishlist } from '../../utils/gameUtils';

export default function GameCard({ game, onClick }) {
  const isDrop = isDropped(game.status);
  const isWish = isWishlist(game.status);

  // Cor dinâmica da badge de nota baseada no valor
  const getRatingBadgeClass = (score) => {
    const num = Number(score);
    if (num >= 9.0) return 'bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.5)]';
    if (num >= 7.5) return 'bg-teal-500 text-white shadow-[0_0_10px_rgba(20,184,166,0.4)]';
    if (num >= 6.0) return 'bg-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.4)]';
    if (num > 0) return 'bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.4)]';
    return 'bg-gray-700 text-gray-300';
  };

  // Formata a data (YYYY-MM-DD -> DD/MM/AAAA ou createdAt)
  const formatCardDate = (dateStr, createdAt) => {
    if (dateStr) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    }
    if (createdAt?.toDate) {
      const d = createdAt.toDate();
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${day}/${month}/${d.getFullYear()}`;
    }
    return null;
  };

  const formattedRating = Number(game.rating) ? Number(game.rating).toFixed(1) : '-';
  const cardDate = formatCardDate(game.dateFinished, game.createdAt);

  return (
    <div
      onClick={() => onClick(game)}
      className="group relative flex flex-col rounded-2xl overflow-hidden bg-surface border border-border/80 hover:border-accent-bright/60 transition-all duration-300 cursor-pointer shadow-md hover:shadow-[0_12px_30px_-5px_rgba(0,0,0,0.8),0_0_20px_-5px_var(--accent-glow)] hover:-translate-y-1 select-none active-press"
    >
      {/* Imagem de Capa do Jogo com Aspect Ratio 16:9 / 3:2 */}
      <div className="relative aspect-video sm:aspect-[16/10] w-full overflow-hidden bg-surface-container">
        {game.imageUrl ? (
          <img
            src={game.imageUrl}
            alt={game.title}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-surface-container text-zinc-500 font-mono text-xs">
            Sem Imagem
          </div>
        )}

        {/* Gradiente escuro no fundo da imagem para legibilidade */}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/10 to-black/40 pointer-events-none" />

        {/* Badge de Nota com Estilo de Troféu Tático (Top Right) */}
        {!isDrop && !isWish && game.rating > 0 && (
          <div className="absolute top-2.5 right-2.5 z-10">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-black text-xs tracking-tight transition-transform duration-200 group-hover:scale-110 shadow-lg border border-white/20 backdrop-blur-md ${getRatingBadgeClass(
                game.rating
              )}`}
            >
              {formattedRating}
            </div>
          </div>
        )}

        {/* Badge de Dropado (Top Right) */}
        {isDrop && (
          <div className="absolute top-2.5 right-2.5 z-10">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-950/90 border border-amber-500/60 text-[10px] font-mono font-bold text-amber-300 shadow-md backdrop-blur-md">
              <Ban className="w-3 h-3 text-amber-400" />
              DROPADO
            </span>
          </div>
        )}

        {/* Status Pill (se não for finalizado nem dropado) */}
        {game.status && game.status !== 'Finalizado' && !isDrop && (
          <div className="absolute top-2.5 left-2.5 z-10">
            <span className="px-2 py-0.5 rounded-lg bg-surface/90 backdrop-blur-md border border-cyan-500/40 text-[10px] font-mono font-semibold text-cyan-300 shadow-sm">
              {game.status}
            </span>
          </div>
        )}

        {/* Ícone de Trilha Sonora Tema se houver */}
        {game.themeUrl && (
          <div className="absolute bottom-2 left-2.5 z-10 opacity-80 group-hover:opacity-100 transition-opacity">
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[9px] font-mono font-bold text-accent-bright border border-accent/40 shadow-sm">
              <Play className="w-2.5 h-2.5 fill-current" />
              TEMA
            </span>
          </div>
        )}
      </div>

      {/* Conteúdo Inferior */}
      <div className="p-3.5 flex flex-col justify-between flex-1">
        {/* Título do Jogo */}
        <h3 className="text-xs sm:text-sm font-gamer font-bold text-white group-hover:text-accent-bright transition-colors line-clamp-1 leading-snug">
          {game.title}
        </h3>

        {/* Informações adicionais (Tempo de Jogo, Data e Metacritic) */}
        <div className="mt-2.5 flex items-center justify-between text-xs text-zinc-400 font-medium border-t border-white/5 pt-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-amber-400" title="Tempo de jogo">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-zinc-200 font-mono text-[11px] font-semibold">
                {game.playtime ? `${String(game.playtime).replace(/h$/i, '').trim()}h` : '0h'}
              </span>
            </div>

            {cardDate && (
              <div className="flex items-center gap-1 text-cyan-400" title="Data do jogo">
                <Calendar className="w-3 h-3 text-cyan-400" />
                <span className="text-zinc-300 font-mono text-[10px]">
                  {cardDate}
                </span>
              </div>
            )}
          </div>

          {game.metacritic && (
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded font-black border border-amber-400/40 text-amber-300 bg-amber-400/10"
              title="Metacritic Score"
            >
              MC {game.metacritic}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
