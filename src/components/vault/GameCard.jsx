import React from 'react';
import { Clock, Star, Play, Sparkles } from 'lucide-react';

export default function GameCard({ game, onClick }) {
  // Cor dinâmica da badge de nota baseada no valor
  const getRatingBadgeClass = (score) => {
    const num = Number(score);
    if (num >= 9.0) return 'bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.5)]';
    if (num >= 7.5) return 'bg-teal-500 text-white shadow-[0_0_10px_rgba(20,184,166,0.4)]';
    if (num >= 6.0) return 'bg-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.4)]';
    if (num > 0) return 'bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.4)]';
    return 'bg-gray-700 text-gray-300';
  };

  const formattedRating = Number(game.rating) ? Number(game.rating).toFixed(1) : '-';

  return (
    <div
      onClick={() => onClick(game)}
      className="group relative flex flex-col rounded-xl overflow-hidden bg-[#11131a] border border-[#232738] hover:border-accent-bright/60 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-neon-green hover:-translate-y-1 select-none"
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
          <div className="w-full h-full flex items-center justify-center bg-[#151722] text-gray-500 text-xs">
            Sem Imagem
          </div>
        )}

        {/* Gradiente escuro no fundo da imagem para legibilidade */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#11131a] via-transparent to-black/30 pointer-events-none" />

        {/* Badge Circular de Nota (Top Right) */}
        {game.rating > 0 && (
          <div className="absolute top-2.5 right-2.5 z-10">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs tracking-tight transition-transform group-hover:scale-110 ${getRatingBadgeClass(
                game.rating
              )}`}
            >
              {formattedRating}
            </div>
          </div>
        )}

        {/* Status Pill (se não for finalizado) */}
        {game.status && game.status !== 'Finalizado' && (
          <div className="absolute top-2.5 left-2.5 z-10">
            <span className="px-2 py-0.5 rounded bg-surface/80 backdrop-blur-sm border border-border text-[10px] font-semibold text-cyan-400">
              {game.status}
            </span>
          </div>
        )}

        {/* Ícone de Trilha Sonora Tema se houver */}
        {game.themeUrl && (
          <div className="absolute bottom-2 left-2.5 z-10 opacity-75 group-hover:opacity-100 transition-opacity">
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md text-[9px] font-mono text-accent-bright border border-accent/30">
              <Play className="w-2.5 h-2.5 fill-current" />
              TEMA
            </span>
          </div>
        )}
      </div>

      {/* Conteúdo Inferior */}
      <div className="p-3.5 flex flex-col justify-between flex-1">
        {/* Título do Jogo */}
        <h3 className="text-sm font-bold text-white group-hover:text-accent-bright transition-colors line-clamp-1 leading-snug">
          {game.title}
        </h3>

        {/* Informações adicionais (Tempo de Jogo e Gênero) */}
        <div className="mt-2 flex items-center justify-between text-xs text-gray-400 font-medium">
          <div className="flex items-center gap-1.5 text-amber-500">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-gray-300 font-mono text-[11px]">
              {game.playtime ? `${game.playtime}h` : '0h'}
            </span>
          </div>

          {game.metacritic && (
            <span
              className="text-[10px] font-mono px-1.5 py-0.2 rounded border border-yellow-500/30 text-yellow-400 bg-yellow-500/10"
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
