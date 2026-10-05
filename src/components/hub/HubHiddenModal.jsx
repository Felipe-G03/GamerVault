import React from 'react';
import { createPortal } from 'react-dom';
import { X, Eye, EyeOff, RotateCcw, Sparkles } from 'lucide-react';
import PlatformIcon from '../common/PlatformIcon';

export default function HubHiddenModal({ hiddenGames = [], onUnhideGame, onClose }) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      <div
        className="relative w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl bg-surface-container border border-border/80 shadow-2xl text-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-5 border-b border-border/60 bg-surface/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
              <EyeOff className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-gamer font-bold tracking-wide flex items-center gap-2">
                Jogos Ocultados do Hub ({hiddenGames.length})
              </h2>
              <p className="text-xs text-gray-400 font-mono">
                Títulos que você removeu para não poluir sua biblioteca do Hub
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de Jogos Ocultados */}
        <div className="p-5 overflow-y-auto space-y-2.5 flex-1 custom-scrollbar">
          {hiddenGames.length === 0 ? (
            <div className="py-12 text-center text-xs font-mono text-gray-400 space-y-2">
              <Eye className="w-8 h-8 text-gray-600 mx-auto" />
              <p>Nenhum jogo está ocultado no Hub no momento.</p>
              <p className="text-[11px] text-gray-500">
                Passe o mouse sobre qualquer jogo no Hub e clique em "Ocultar" para removê-lo da sua visualização.
              </p>
            </div>
          ) : (
            hiddenGames.map((game) => (
              <div
                key={game.id || game.title}
                className="flex items-center justify-between p-3 rounded-xl bg-surface/60 border border-border/60 hover:border-border transition-colors gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-12 h-16 rounded-lg overflow-hidden bg-black/60 shrink-0 border border-white/10 relative">
                    {game.imageUrl ? (
                      <img src={game.imageUrl} alt={game.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                        🎮
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <PlatformIcon platformId={game.platformId} size="xs" />
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate" title={game.title}>
                        {game.title}
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400 mt-0.5 block uppercase">
                      {game.platformId || 'Jogo'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onUnhideGame(game)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold transition-all cursor-pointer shrink-0 active:scale-95"
                  title="Restaurar este jogo para o Hub"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar</span>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between p-4 border-t border-border/60 bg-surface/80">
          <span className="text-[11px] font-mono text-gray-500">
            Jogos restaurados reaparecem instantaneamente no Hub.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-high text-xs font-semibold text-gray-300 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
