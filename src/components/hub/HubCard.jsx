import React, { useState } from 'react';
import { Play, Loader2 } from 'lucide-react';
import PlatformIcon from '../common/PlatformIcon';

export default function HubCard({
  game,
  vaultGame,
  onLaunch,
  onCardClick
}) {
  const [launching, setLaunching] = useState(false);

  const handleLaunchClick = async (e) => {
    e.stopPropagation();
    setLaunching(true);
    try {
      await onLaunch(game);
    } finally {
      setTimeout(() => setLaunching(false), 2000);
    }
  };

  // Badge da plataforma
  const getPlatformLabel = (platform) => {
    switch (platform) {
      case 'steam': return 'Steam';
      case 'epic': return 'Epic';
      case 'gamepass': return 'Game Pass';
      case 'ea': return 'EA App';
      case 'ubisoft': return 'Ubisoft';
      case 'suspeitos': return 'Suspeito';
      default: return platform?.toUpperCase() || 'PC';
    }
  };

  return (
    <div
      onClick={() => onCardClick(game, vaultGame)}
      className="group relative flex flex-col rounded-xl overflow-hidden bg-surface border border-border/80 hover:border-accent-bright transition-all duration-300 cursor-pointer shadow-md hover:shadow-neon-green hover:-translate-y-1 select-none active-press"
    >
      {/* Imagem de Capa do Jogo (100% LIMPA em repouso) */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface-high">
        {game.imageUrl ? (
          <img
            src={game.imageUrl}
            alt={game.title}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-surface-high to-surface text-gray-500 text-xs p-2 text-center">
            <Play className="w-8 h-8 text-gray-600 mb-1" />
            <span className="font-gamer font-bold text-gray-400 text-xs truncate max-w-full px-2">{game.title}</span>
          </div>
        )}

        {/* Gradiente sutil escuro */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-50 group-hover:opacity-20 transition-opacity pointer-events-none"></div>

        {/* Único Botão de Jogar no Hover (Centralizado com efeito neon) */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/45 backdrop-blur-[2px]">
          <button
            onClick={handleLaunchClick}
            disabled={launching}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-bright hover:bg-accent-bright/90 text-surface-low font-gamer font-extrabold text-xs tracking-wider uppercase shadow-neon-green transition-all transform hover:scale-105 active:scale-95"
            title="Iniciar Jogo no PC"
          >
            {launching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Iniciando...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Jogar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Rodapé Limpo (Fora da Imagem): Título e Plataforma */}
      <div className="p-2 sm:p-2.5 flex items-center justify-between gap-2 border-t border-border/40 bg-surface">
        <div className="min-w-0 flex-1">
          <h3 className="font-gamer font-bold text-xs text-white group-hover:text-accent-bright transition-colors truncate" title={game.title}>
            {game.title}
          </h3>
          <p className="text-[10px] text-gray-400 truncate mt-0.5 font-sans">
            {game.genres || 'Jogo de PC'}
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-high border border-border/70 shrink-0">
          <PlatformIcon platformId={game.platform} size="sm" />
          <span className="text-[9px] font-mono text-gray-300 font-bold uppercase">
            {getPlatformLabel(game.platform)}
          </span>
        </div>
      </div>
    </div>
  );
}
