import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Gamepad2, Loader2, ArrowRight } from 'lucide-react';
import { getGuildActivities } from '../../services/guildService';
import FriendVaultModal from './FriendVaultModal';

export default function GuildView({ profile, onGoToProfile }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState(null);

  useEffect(() => {
    async function fetchActivities() {
      if (!profile?.friends || profile.friends.length === 0) {
        setActivities([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const feed = await getGuildActivities(profile.friends);
        setActivities(feed);
      } catch (err) {
        console.error('Erro ao carregar feed da guilda:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchActivities();
  }, [profile]);

  const getRatingBadgeClass = (score) => {
    const num = Number(score);
    if (num >= 8) return 'bg-emerald-500 text-white shadow-neon-green';
    if (num >= 6) return 'bg-amber-500 text-white';
    return 'bg-rose-500 text-white';
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Título da Seção com Barra Laranja (Fiel à captura 4) */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-6 bg-orange-500 rounded-full shadow-[0_0_10px_#ea580c]"></div>
          <h2 className="text-xl font-gamer font-bold text-white tracking-wide">
            Atividade da Guilda
          </h2>
        </div>

        <button
          onClick={onGoToProfile}
          className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span>Gerenciar Amigos ({profile?.friends?.length || 0})</span>
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <span className="text-xs font-mono">Sincronizando atividades dos amigos...</span>
        </div>
      ) : activities.length > 0 ? (
        <div className="space-y-3">
          {activities.map((item) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#0e1017] border border-[#232738] hover:border-orange-500/50 transition-all shadow-md group"
            >
              <div className="flex items-center gap-3.5">
                {/* Thumbnail do Jogo */}
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-black shrink-0 border border-border">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.gameTitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-500">
                      N/A
                    </div>
                  )}
                </div>

                {/* Texto: [Nome] finalizou [Jogo] */}
                <div className="space-y-1">
                  <div className="text-sm text-gray-200 leading-snug">
                    <button
                      onClick={() => setSelectedFriend({ id: item.friendId, nickname: item.friendName })}
                      className="font-bold text-cyan-400 hover:underline inline mr-1.5"
                    >
                      {item.friendName}
                    </button>
                    <span>finalizou</span>{' '}
                    <span className="font-bold text-white ml-1">{item.gameTitle}</span>
                  </div>

                  {/* Detalhes rápidos da nota */}
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>Nota:</span>
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${getRatingBadgeClass(
                        item.rating
                      )}`}
                    >
                      {Number(item.rating).toFixed(0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Data & Botão para Inspecionar Amigo */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-border/50 pt-2 sm:pt-0">
                <span className="text-[11px] font-mono text-gray-400">
                  {item.dateFinished}
                </span>

                <button
                  onClick={() => setSelectedFriend({ id: item.friendId, nickname: item.friendName })}
                  className="mt-1 flex items-center gap-1 text-[11px] text-gray-400 hover:text-white font-medium transition-colors"
                >
                  <span>Ver Vault</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Estado vazio da guilda */
        <div className="py-16 text-center rounded-2xl bg-surface-container/40 border border-dashed border-border/80 p-8 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-surface-high flex items-center justify-center text-gray-500">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Nenhuma atividade recente na Guilda</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
              {!profile?.friends || profile.friends.length === 0
                ? 'Você ainda não possui amigos adicionados à sua Guilda. Compartilhe seu ID de Piloto ou adicione seus amigos pelo ID!'
                : 'Seus amigos ainda não finalizaram jogos recentemente.'}
            </p>
          </div>
          <button
            onClick={onGoToProfile}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-neon-cyan"
          >
            <UserPlus className="w-4 h-4" />
            Adicionar Amigos
          </button>
        </div>
      )}

      {/* Modal para Inspecionar o Vault do Amigo Selecionado */}
      {selectedFriend && (
        <FriendVaultModal
          friend={selectedFriend}
          onClose={() => setSelectedFriend(null)}
        />
      )}
    </div>
  );
}
