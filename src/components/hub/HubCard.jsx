import React, { useState } from 'react';
import { Play, Loader2, Palette, EyeOff, Clock } from 'lucide-react';
import PlatformIcon from '../common/PlatformIcon';

export default function HubCard({
  game,
  vaultGame,
  playtimeSeconds = 0,
  onLaunch,
  onCardClick,
  onCustomizeMedia,
  onHideGame
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

  const handleCustomizeClick = (e) => {
    e.stopPropagation();
    if (onCustomizeMedia) {
      onCustomizeMedia(game, vaultGame);
    } else {
      onCardClick(game, vaultGame);
    }
  };

  // Badge da plataforma
  const getPlatformLabel = (platform) => {
    switch (platform) {
      case 'steam': return 'Steam';
      case 'epic': return 'Epic';
      case 'gamepass': return 'Game Pass';
      case 'ea': return 'EA';
      case 'ubisoft': return 'Ubisoft';
      case 'suspeitos': return 'Suspeito';
      default: return platform?.toUpperCase() || 'PC';
    }
  };

  // Tempo de jogo no Hub ou no Vault
  let effectivePlaytimeSeconds = Number(playtimeSeconds) || 0;
  if (!effectivePlaytimeSeconds && vaultGame?.playtime) {
    const vaultHours = parseFloat(String(vaultGame.playtime).replace(/h$/i, '').trim());
    if (!isNaN(vaultHours) && vaultHours > 0) {
      effectivePlaytimeSeconds = Math.round(vaultHours * 3600);
    }
  }

  const formatCardPlaytime = (seconds) => {
    if (!seconds || seconds <= 0) return null;
    if (seconds < 3600) {
      const m = Math.max(1, Math.floor(seconds / 60));
      return `${m}m`;
    }
    const h = seconds / 3600;
    return h % 1 === 0 ? `${h.toFixed(0)}h` : `${h.toFixed(1)}h`;
  };

  const formattedPlaytime = formatCardPlaytime(effectivePlaytimeSeconds);

  // Avaliação pessoal do usuário no Vault (apenas se o usuário realmente avaliou o jogo)
  const userVaultRating = vaultGame?.rating && Number(vaultGame.rating) > 0 ? Number(vaultGame.rating) : null;
  const formattedRating = userVaultRating
    ? (userVaultRating % 1 === 0 ? userVaultRating.toFixed(0) : userVaultRating.toFixed(1))
    : null;

  // Status no Vault
  const isFinished = vaultGame?.status === 'Finalizado';
  const isDropped = vaultGame?.status === 'Dropado';

  return (
    <div
      onClick={() => onCardClick(game, vaultGame)}
      className="group relative flex flex-col aspect-[2/3] rounded-2xl overflow-hidden bg-surface-container border border-white/5 hover:border-accent-bright/60 shadow-[0_12px_28px_-6px_rgba(0,0,0,0.75)] hover:shadow-[0_24px_50px_-10px_rgba(0,0,0,0.92),_0_0_22px_rgba(61,214,155,0.32)] transition-all duration-300 ease-out hover:-translate-y-2.5 hover:scale-[1.04] cursor-pointer select-none active-press"
    >
      {/* Imagem de Capa do Pôster Vertical */}
      <div className="absolute inset-0 w-full h-full overflow-hidden bg-surface-high">
        {game.imageUrl ? (
          <img
            src={game.imageUrl}
            alt={game.title}
            className="w-full h-full object-cover object-center group-hover:scale-108 transition-transform duration-500 ease-out"
            loading="lazy"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80';
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-surface-high to-surface-low text-gray-400 p-4 text-center">
            <Play className="w-10 h-10 text-gray-600 mb-2" />
            <span className="font-gamer font-bold text-xs line-clamp-3 text-gray-300">{game.title}</span>
          </div>
        )}
      </div>

      {/* Gradiente escuro no terço inferior do pôster para legibilidade cristalina */}
      <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none" />

      {/* Brilho de borda interno sutil estilo console glassmorphism */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none ring-1 ring-inset ring-white/10 group-hover:ring-accent-bright/35 transition-all" />

      {/* BADGES NO TOPO */}
      <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between z-10 pointer-events-none">
        {/* Lado Esquerdo: Tag de Status do Vault (Zerado / Dropado) e Playtime */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {isFinished && (
            <span className="px-2 py-0.5 rounded bg-emerald-500 text-black text-[9px] font-gamer font-extrabold uppercase tracking-wider shadow-sm">
              Zerado
            </span>
          )}
          {isDropped && (
            <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[9px] font-gamer font-extrabold uppercase tracking-wider shadow-sm">
              Dropado
            </span>
          )}
          {formattedPlaytime && (
            <span
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-md border border-emerald-500/35 text-emerald-400 text-[9px] font-mono font-bold tracking-tight shadow-sm"
              title={`Tempo total de jogo: ${formattedPlaytime}`}
            >
              <Clock className="w-2.5 h-2.5 text-emerald-400" />
              <span>{formattedPlaytime}</span>
            </span>
          )}
        </div>

        {/* Lado Direito: Badge Glassmorphism da Plataforma */}
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/65 backdrop-blur-md border border-white/10 text-white shadow-md">
          <PlatformIcon platformId={game.platform} size="xs" />
          <span className="text-[9px] font-mono text-gray-200 font-bold tracking-tight uppercase">
            {getPlatformLabel(game.platform)}
          </span>
        </div>
      </div>

      {/* OVERLAY DE AÇÕES NO HOVER (Estilo Big Picture) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-250 bg-black/55 backdrop-blur-[3px] z-20 p-4">
        {formattedPlaytime && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/80 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono mb-2 shadow-sm">
            <Clock className="w-3 h-3 text-emerald-400" />
            <span>{formattedPlaytime} jogadas</span>
          </div>
        )}

        {/* Botão Principal: Iniciar / Jogar */}
        <button
          onClick={handleLaunchClick}
          disabled={launching}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-bright hover:bg-accent-bright/90 text-surface-low font-gamer font-extrabold text-xs tracking-wider uppercase shadow-neon-green transition-all transform hover:scale-108 active:scale-95 mb-3"
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

        <div className="flex items-center gap-1.5 w-full justify-center">
          {/* Atalho Secundário: Trocar Capa / Mídia */}
          <button
            onClick={handleCustomizeClick}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white text-[10px] font-mono backdrop-blur-md transition-all hover:scale-105 active:scale-95"
            title="Trocar Capa e Trilha Sonora"
          >
            <Palette className="w-3 h-3 text-accent-bright" />
            <span>Mídia</span>
          </button>

          {/* Ocultar do Hub */}
          {onHideGame && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onHideGame(game);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 text-[10px] font-mono backdrop-blur-md transition-all hover:scale-105 active:scale-95"
              title="Ocultar este jogo do Hub"
            >
              <EyeOff className="w-3 h-3 text-rose-400" />
              <span>Ocultar</span>
            </button>
          )}
        </div>
      </div>

      {/* BASE DO PÔSTER: TÍTULO, DETALHES E BADGE CIRCULAR (Estilo Big Picture) */}
      <div className="absolute inset-x-0 bottom-0 p-3 flex flex-col justify-end z-10 pointer-events-none">
        <div className="flex items-end justify-between gap-2">
          {/* Título e Gênero */}
          <div className="min-w-0 flex-1">
            <h3
              className="font-gamer font-bold text-xs sm:text-sm text-white group-hover:text-accent-bright transition-colors line-clamp-2 leading-snug drop-shadow-md"
              title={game.title}
            >
              {game.title}
            </h3>
            <div className="flex items-center gap-1 text-[10px] text-gray-300/80 truncate mt-0.5 font-sans">
              {formattedPlaytime && (
                <>
                  <span className="text-emerald-400 font-mono font-bold shrink-0">{formattedPlaytime}</span>
                  <span className="text-gray-500 shrink-0">•</span>
                </>
              )}
              <span className="truncate">{game.genres || 'Jogo de PC'}</span>
            </div>
          </div>

          {/* Badge Circular Translúcida (Exibida exclusivamente quando o usuário avaliou o jogo no Vault) */}
          {formattedRating && (
            <div
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 bg-black/75 backdrop-blur-md border border-white/20 text-white shadow-lg text-[10px] sm:text-[11px] font-mono font-bold tracking-tight"
              title={`Sua nota: ${formattedRating}/10`}
            >
              {formattedRating}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
