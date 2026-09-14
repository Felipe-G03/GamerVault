import React, { useState, useEffect } from 'react';
import { X, Clock, Star, Gamepad2, Loader2, ArrowLeft } from 'lucide-react';
import { getUserGames } from '../../services/gamesService';
import GameExpandedModal from '../vault/GameExpandedModal';

export default function FriendVaultModal({ friend, onClose }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState(null);

  useEffect(() => {
    async function load() {
      if (!friend?.id) return;
      setLoading(true);
      try {
        const friendGames = await getUserGames(friend.id);
        setGames(friendGames);
      } catch (e) {
        console.error('Erro ao carregar vault do amigo:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [friend]);

  const finishedGames = games.filter(g => g.status === 'Finalizado');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-[#0d0f16] border border-border rounded-2xl overflow-hidden shadow-2xl">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-container">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center font-bold text-cyan-400">
              {friend.nickname?.[0]?.toUpperCase() || 'P'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase text-gray-400">Vault de Jogos de</span>
                <span className="text-xs font-mono px-2 py-0.2 rounded bg-surface border border-border text-cyan-400">
                  {friend.id}
                </span>
              </div>
              <h2 className="text-lg font-gamer font-bold text-white">
                {friend.nickname}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-surface hover:bg-surface-high text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de Jogos do Amigo */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
              <span className="text-xs font-mono">Carregando jogos de {friend.nickname}...</span>
            </div>
          ) : games.length === 0 ? (
            <div className="py-20 text-center text-gray-500 font-mono text-sm">
              Este jogador ainda não cadastrou jogos no Vault.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-mono text-gray-400">
                <span>Total de {games.length} jogos ({finishedGames.length} finalizados)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {games.map(game => (
                  <div
                    key={game.id}
                    onClick={() => setSelectedGame(game)}
                    className="group flex flex-col rounded-xl overflow-hidden bg-[#131520] border border-border hover:border-cyan-400/60 cursor-pointer transition-all shadow hover:-translate-y-0.5"
                  >
                    <div className="relative aspect-video w-full overflow-hidden bg-black">
                      {game.imageUrl && (
                        <img
                          src={game.imageUrl}
                          alt={game.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      )}
                      {game.rating > 0 && (
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-500 font-bold text-xs text-white shadow">
                          {Number(game.rating).toFixed(1)}
                        </div>
                      )}
                    </div>
                    <div className="p-3 flex flex-col justify-between flex-1">
                      <h4 className="text-sm font-bold text-white group-hover:text-cyan-400 truncate">
                        {game.title}
                      </h4>
                      <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                        <span className="text-[11px] font-mono text-gray-400">{game.status}</span>
                        <span className="text-[11px] font-mono text-amber-500">{game.playtime}h</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal expandido se o usuário clicar em um jogo do amigo */}
      {selectedGame && (
        <GameExpandedModal
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
          onEdit={() => {}} // Somente leitura
          onDelete={() => {}} // Somente leitura
        />
      )}
    </div>
  );
}
