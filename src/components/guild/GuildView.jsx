import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Trophy,
  Star,
  Clock,
  Swords,
  Search,
  MessageSquare,
  Sparkles,
  ArrowRight,
  UserPlus,
  Loader2,
  Hourglass,
  Calendar,
  Flame,
  Award,
  Ban,
  AlertOctagon,
  Tv,
  Radio,
  Crown,
  Medal
} from 'lucide-react';
import { getGuildData } from '../../services/guildService';
import { listenToActiveCasts } from '../../services/vaultCastService';
import FriendProfileModal from '../profile/FriendProfileModal';
import GameExpandedModal from '../vault/GameExpandedModal';

function getMemberMetric(member, rankingFilter) {
  if (!member) return { value: '-', subtext: '', badge: '' };
  switch (rankingFilter) {
    case 'longest':
      return {
        value: `${member.longestGame?.hours || 0}h`,
        subtext: member.longestGame?.title || 'Sem registros',
        badge: 'Mais Longo'
      };
    case 'shortest':
      return {
        value: `${member.shortestGame?.hours || 0}h`,
        subtext: member.shortestGame?.title || 'Sem registros',
        badge: 'Mais Rápido'
      };
    case 'month':
      return {
        value: `${member.thisMonthCount || 0} j.`,
        subtext: 'Este mês',
        badge: 'No Mês'
      };
    case 'highestScore':
      return {
        value: member.avgRating ? `${member.avgRating}★` : '0★',
        subtext: `${member.completedCount || 0} avaliados`,
        badge: 'Nota Média'
      };
    case 'fasting':
      return {
        value: (member.daysSinceLastGame >= 9999 || member.daysSinceLastGame == null) ? '-' : `${member.daysSinceLastGame}d`,
        subtext: member.daysSinceLastGame >= 9999 ? 'Sem campanhas' : 'Dias sem zerar',
        badge: 'Em Jejum'
      };
    case 'drops':
      return {
        value: `${member.droppedCount || 0}`,
        subtext: 'abandonados',
        badge: 'Drops'
      };
    case 'longestDrop':
      return {
        value: `${member.longestDroppedGame?.hours || 0}h`,
        subtext: member.longestDroppedGame?.title || 'Sem drops',
        badge: 'Drop Longo'
      };
    case 'count':
    default:
      return {
        value: `${member.completedCount || 0}`,
        subtext: `${member.totalHours || 0}h registradas`,
        badge: 'Zerados'
      };
  }
}

export default function GuildView({ user, profile, onGoToProfile, onAddNewGame, onOpenVaultCast }) {
  const [data, setData] = useState({ activities: [], leaderboard: [], stats: null });
  const [loading, setLoading] = useState(true);
  const [activeCasts, setActiveCasts] = useState([]);

  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'highScore', 'reviewed'
  const [rankingFilter, setRankingFilter] = useState('count'); // 'count', 'longest', 'month', 'highestScore', 'fasting'
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedFriend, setSelectedFriend] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await getGuildData(
          user?.uid,
          profile?.nickname || 'Você',
          profile?.friends || [],
          profile
        );
        setData(res);
      } catch (err) {
        console.error('Erro ao carregar dados da guilda:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, profile]);

  // Escuta transmissões ativas do VaultCast na guilda
  useEffect(() => {
    const unsub = listenToActiveCasts((casts) => {
      setActiveCasts(casts || []);
    });
    return () => unsub();
  }, []);

  // Filtra as atividades do feed
  const filteredActivities = useMemo(() => {
    return data.activities.filter(item => {
      if (activeFilter === 'drops' && !item.isDropped) return false;
      if (activeFilter === 'highScore' && (item.isDropped || Number(item.rating) < 9.0)) return false;
      if (activeFilter === 'reviewed' && (!item.review || item.review.trim().length === 0)) return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchGame = item.gameTitle?.toLowerCase().includes(term);
        const matchMember = item.friendName?.toLowerCase().includes(term);
        const matchGenre = item.genre?.toLowerCase().includes(term);
        return matchGame || matchMember || matchGenre;
      }
      return true;
    });
  }, [data.activities, activeFilter, searchTerm]);

  // Ranking dinâmico dos jogadores
  const sortedLeaderboard = useMemo(() => {
    const list = [...data.leaderboard];

    return list.sort((a, b) => {
      if (rankingFilter === 'longest') {
        const hoursA = a.longestGame?.hours || 0;
        const hoursB = b.longestGame?.hours || 0;
        return hoursB - hoursA;
      }
      if (rankingFilter === 'shortest') {
        const hoursA = a.shortestGame?.hours || 9999;
        const hoursB = b.shortestGame?.hours || 9999;
        return hoursA - hoursB;
      }
      if (rankingFilter === 'month') {
        return (b.thisMonthCount || 0) - (a.thisMonthCount || 0);
      }
      if (rankingFilter === 'highestScore') {
        return (parseFloat(b.avgRating) || 0) - (parseFloat(a.avgRating) || 0);
      }
      if (rankingFilter === 'fasting') {
        return (b.daysSinceLastGame || 0) - (a.daysSinceLastGame || 0);
      }
      if (rankingFilter === 'drops') {
        return (b.droppedCount || 0) - (a.droppedCount || 0);
      }
      if (rankingFilter === 'longestDrop') {
        const hoursA = a.longestDroppedGame?.hours || 0;
        const hoursB = b.longestDroppedGame?.hours || 0;
        return hoursB - hoursA;
      }
      // Padrão 'count' (mais jogos)
      return (b.completedCount || 0) - (a.completedCount || 0);
    });
  }, [data.leaderboard, rankingFilter]);

  const rankingOptions = [
    { id: 'count', label: 'Mais Zerados', icon: Trophy, desc: 'Campanhas finalizadas no total' },
    { id: 'longest', label: 'Mais Longo', icon: Flame, desc: 'Campanha individual com mais horas' },
    { id: 'shortest', label: 'Mais Rápido', icon: Clock, desc: 'Campanha finalizada mais rapidamente' },
    { id: 'month', label: 'No Mês', icon: Calendar, desc: 'Jogos finalizados este mês' },
    { id: 'highestScore', label: 'Maior Nota', icon: Star, desc: 'Média de avaliação dos jogos' },
    { id: 'fasting', label: 'Em Jejum', icon: Hourglass, desc: 'Dias corridos sem zerar' },
    { id: 'drops', label: 'Mais Drops', icon: Ban, desc: 'Total de jogos abandonados' },
    { id: 'longestDrop', label: 'Drop Mais Longe', icon: AlertOctagon, desc: 'Mais horas investidas antes de dropar' }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. TOP SYSTEM BAR (Fiel ao Stitch) */}
      <div className="w-full bg-[#0a0c10] border border-border/80 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row justify-between items-center text-[11px] font-mono tracking-tight text-gray-400 gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent-bright shadow-[0_0_8px_#3dd69b]"></span>
          <span className="text-gray-300 font-semibold tracking-wider uppercase">
            FEED EM TEMPO REAL // REDE DA GUILDA
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-accent-bright font-bold">
            <Trophy className="w-3.5 h-3.5" />
            {data.stats?.totalJointGames || 0} Jogos Zerados em Conjunto
          </span>
          <span className="px-2 py-0.5 rounded bg-accent/20 border border-accent/40 text-accent-bright text-[10px] font-semibold">
            SINCRONIZADO
          </span>
        </div>
      </div>

      {/* 2. HEADER DA GUILDA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <span className="text-[10px] font-mono tracking-widest text-accent-bright uppercase block mb-1">
            REGISTRO DE CAMPANHAS // V2.0 LOG
          </span>
          <h2 className="text-2xl sm:text-3xl font-gamer font-extrabold text-white tracking-wide">
            Atividade da Guilda
          </h2>
          <p className="text-xs text-gray-400 mt-1 max-w-xl">
            Linha do tempo ao vivo de campanhas finalizadas, platinas e resenhas críticas dos membros da sua guilda.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* BOTÃO VAULTCAST */}
          <button
            onClick={() => onOpenVaultCast?.()}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border font-bold text-xs tracking-wide transition-all shadow-md active:scale-95 ${
              activeCasts.length > 0
                ? 'bg-rose-950/50 border-rose-500/60 text-rose-300 hover:bg-rose-900/60 hover:border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.25)]'
                : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50 hover:border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
            }`}
          >
            {activeCasts.length > 0 ? (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                <Radio className="w-4 h-4 text-rose-400" />
                <span>VaultCast ({activeCasts.length} AO VIVO)</span>
              </>
            ) : (
              <>
                <Tv className="w-4 h-4 text-emerald-400" />
                <span>VaultCast</span>
              </>
            )}
          </button>

          <button
            onClick={onAddNewGame}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black hover:bg-gray-200 font-bold text-xs tracking-wide transition-all shadow-md active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-orange-600" />
            <span>Compartilhar Feito</span>
          </button>
          <button
            onClick={onGoToProfile}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-surface hover:bg-surface-high border border-border text-xs font-semibold text-gray-300 hover:text-white transition-colors"
          >
            <UserPlus className="w-4 h-4 text-cyan-400" />
            <span>Amigos</span>
          </button>
        </div>
      </div>

      {/* BANNER DE VAULTCAST AO VIVO NA GUILDA */}
      {activeCasts.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/60 via-[#121522] to-emerald-950/30 border border-rose-500/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 animate-pulse flex-shrink-0">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500 text-white uppercase">
                  AO VIVO NA GUILDA
                </span>
                <span className="text-xs text-gray-200 font-bold">
                  {activeCasts[0].pilotName} está transmitindo "{activeCasts[0].gameTitle}"
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Transmissão aberta no VaultCast. Clique para assistir junto com os membros ou entrar na call.
              </p>
            </div>
          </div>

          <button
            onClick={() => onOpenVaultCast?.(activeCasts[0].id)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shadow-lg active:scale-95 whitespace-nowrap"
          >
            <Tv className="w-4 h-4" />
            <span>Assistir VaultCast</span>
          </button>
        </div>
      )}

      {/* 3. BARRA DE FILTROS & BUSCA RÁPIDA */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeFilter === 'all'
                ? 'bg-surface-high text-white border border-border-bright'
                : 'text-gray-400 hover:text-white hover:bg-surface'
            }`}
          >
            Todos os Membros
          </button>
          <button
            onClick={() => setActiveFilter('highScore')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeFilter === 'highScore'
                ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-700/60'
                : 'text-gray-400 hover:text-white hover:bg-surface'
            }`}
          >
            Notas 9.0+
          </button>
          <button
            onClick={() => setActiveFilter('reviewed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeFilter === 'reviewed'
                ? 'bg-cyan-950/50 text-cyan-300 border border-cyan-700/60'
                : 'text-gray-400 hover:text-white hover:bg-surface'
            }`}
          >
            Comentados
          </button>
          <button
            onClick={() => setActiveFilter('drops')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeFilter === 'drops'
                ? 'bg-amber-950/50 text-amber-300 border border-amber-700/60'
                : 'text-gray-400 hover:text-white hover:bg-surface'
            }`}
          >
            Dropados
          </button>
        </div>

        <div className="relative sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar jogo, membro ou tag..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-[#12141c] border border-border rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent-bright transition-colors"
          />
        </div>
      </div>

      {/* 4. LAYOUT PRINCIPAL: FEED (ESQUERDA) + ESTATÍSTICAS E COMPARAÇÃO (DIREITA) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* COLUNA ESQUERDA: FEED DE ATIVIDADES */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-accent-bright" />
              <span className="text-xs font-mono">Carregando feed da Guilda...</span>
            </div>
          ) : filteredActivities.length > 0 ? (
            filteredActivities.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-[#0e1017] border border-[#232738] hover:border-white/20 transition-all shadow-lg group space-y-3 relative overflow-hidden"
              >
                {/* Borda atmosférica na cor do membro */}
                <div
                  className="absolute top-0 left-0 bottom-0 w-1 pointer-events-none transition-opacity opacity-75 group-hover:opacity-100"
                  style={{ backgroundColor: item.friendColor || '#10b981' }}
                />

                {/* Header do Card: Membro + Badge de Nota/Drop */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedFriend({ id: item.friendId, nickname: item.friendName })}
                      className="relative w-8 h-8 rounded-xl overflow-hidden border-2 flex items-center justify-center shrink-0 transition-transform hover:scale-105 cursor-pointer shadow-sm bg-black/60"
                      style={{
                        borderColor: item.friendColor || '#10b981',
                        boxShadow: `0 0 10px ${(item.friendColor || '#10b981')}30`
                      }}
                      title={`Ver perfil de ${item.friendName}`}
                    >
                      {item.friendAvatar ? (
                        <img
                          src={item.friendAvatar}
                          alt={item.friendName}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <span className="font-gamer font-bold text-xs text-white">
                          {item.friendName?.[0]?.toUpperCase() || 'P'}
                        </span>
                      )}
                    </button>
                    <div className="text-xs">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedFriend({ id: item.friendId, nickname: item.friendName })}
                          className="font-bold text-white hover:text-cyan-300 transition-colors cursor-pointer"
                        >
                          {item.friendName}
                        </button>
                        {item.isMe && (
                          <span className="text-[9px] font-mono px-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            Você
                          </span>
                        )}
                        {item.isDropped ? (
                          <span className="text-amber-400 font-semibold ml-0.5">dropou um jogo</span>
                        ) : (
                          <span className="text-gray-400 ml-0.5">finalizou</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {item.isDropped ? (
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs font-mono">
                      <Ban className="w-3.5 h-3.5" />
                      <span>DROPADO</span>
                    </div>
                  ) : item.rating > 0 ? (
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs font-mono">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{Number(item.rating).toFixed(1)}</span>
                    </div>
                  ) : null}
                </div>

                {/* Corpo do Card: Capa + Detalhes + Análise/Motivo */}
                <div className="flex gap-4 items-start">
                  <div className="w-24 sm:w-28 aspect-[16/10] rounded-xl overflow-hidden bg-black shrink-0 border border-border">
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

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <h3 className="text-base font-bold text-white group-hover:text-accent-bright transition-colors truncate">
                      {item.gameTitle}
                    </h3>

                    <div className="flex items-center gap-3 text-xs text-gray-400 font-mono">
                      <span>📅 {item.dateFinished}</span>
                      {item.playtime && (
                        <span>
                          ⏱️ {item.playtime}h {item.isDropped ? 'antes do drop' : 'registradas'}
                        </span>
                      )}
                    </div>

                    {/* Resenha Crítica ou Motivo do Drop em Destaque */}
                    {item.isDropped ? (
                      item.dropReason || item.review ? (
                        <p className="text-xs text-amber-200/90 italic line-clamp-2 pt-1 border-t border-amber-900/30">
                          "Motivo: {item.dropReason || item.review}"
                        </p>
                      ) : (
                        <p className="text-[11px] text-gray-500 italic pt-1">
                          Jogo abandonado e arquivado no Vault.
                        </p>
                      )
                    ) : item.review ? (
                      <p className="text-xs text-gray-300 italic line-clamp-2 pt-1 border-t border-border/40">
                        "{item.review}"
                      </p>
                    ) : (
                      <p className="text-[11px] text-gray-500 italic pt-1">
                        Campanha concluída e arquivada no Vault.
                      </p>
                    )}
                  </div>
                </div>

                {/* Rodapé do Card: Ação Ver Detalhes */}
                <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                  <span className="text-[11px] font-mono text-gray-500">
                    {item.genre || 'Variados'}
                  </span>
                  <button
                    onClick={() =>
                      setSelectedGame({
                        id: item.gameId,
                        title: item.gameTitle,
                        rating: item.rating,
                        playtime: item.playtime,
                        dateFinished: item.dateFinished,
                        review: item.review,
                        dropReason: item.dropReason || item.review,
                        imageUrl: item.imageUrl,
                        genre: item.genre,
                        themeUrl: item.themeUrl,
                        screenshots: item.screenshots,
                        status: item.isDropped ? 'Dropado' : 'Finalizado'
                      })
                    }
                    className="flex items-center gap-1 font-semibold text-accent-bright hover:underline"
                  >
                    <span>{item.isDropped ? 'Ver Motivo' : 'Ver Análise'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-16 text-center rounded-2xl bg-surface-container/40 border border-dashed border-border p-8 space-y-3">
              <Users className="w-10 h-10 mx-auto text-gray-500" />
              <h3 className="text-base font-bold text-white">Nenhuma atividade encontrada</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Adicione amigos pelo ID de Piloto ou finalize jogos para alimentar o feed da Guilda!
              </p>
            </div>
          )}
        </div>

        {/* COLUNA DIREITA: ESTATÍSTICAS DA GUILDA & COMPARAÇÃO */}
        <div className="space-y-6">
          {/* CARD 1: PÓDIO E TOP JOGADORES DA GUILDA */}
          <div className="p-5 rounded-3xl bg-[#0e1017] border border-[#232738] shadow-2xl space-y-4 relative overflow-hidden">
            {/* Header do Ranking */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-sm">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-gamer font-bold text-white tracking-wide">
                    Hall da Fama // Ranking
                  </h3>
                  <p className="text-[10px] font-mono text-gray-400">
                    Pódio e estatísticas competitivas da guilda
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 font-bold uppercase">
                AO VIVO
              </span>
            </div>

            {/* Abas de Filtro de Categoria com Rolagem Suave */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 custom-scrollbar border-b border-white/5">
              {rankingOptions.map(opt => {
                const Icon = opt.icon;
                const isActive = rankingFilter === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setRankingFilter(opt.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-mono whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? 'bg-accent-bright/20 border border-accent-bright/60 text-accent-bright font-bold shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                        : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Descrição do Critério Ativo */}
            <div className="flex items-center justify-between text-[11px] font-mono bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
              <span className="flex items-center gap-2 text-gray-300 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-bright shrink-0" />
                <span className="truncate">
                  {rankingOptions.find(o => o.id === rankingFilter)?.desc || 'Classificação da guilda'}
                </span>
              </span>
              <span className="text-[10px] text-gray-500 shrink-0 ml-2">
                {sortedLeaderboard.length} pilotos
              </span>
            </div>

            {/* PÓDIO VISUAL TOP 3 */}
            {sortedLeaderboard.length > 0 ? (
              <div className="space-y-4">
                {/* Grid do Pódio (Top 3) */}
                <div className="grid grid-cols-3 gap-2 sm:gap-2.5 items-end pt-2 pb-1">
                  
                  {/* 2º LUGAR (PRATA) */}
                  {sortedLeaderboard[1] ? (
                    <div
                      onClick={() => setSelectedFriend({ id: sortedLeaderboard[1].id, nickname: sortedLeaderboard[1].name })}
                      className="flex flex-col items-center p-3 rounded-2xl bg-gradient-to-b from-slate-400/10 via-[#12141f] to-[#0c0e15] border border-slate-400/30 hover:border-slate-300 transition-all cursor-pointer shadow-lg hover:-translate-y-1 group relative overflow-hidden"
                    >
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-400/20 text-slate-300 text-[10px] font-mono font-bold">
                        <Medal className="w-3 h-3 text-slate-300" />
                        <span>2º</span>
                      </div>

                      {/* Avatar com aura */}
                      <div
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden border-2 bg-black/70 flex items-center justify-center font-gamer font-bold text-white text-sm sm:text-base shadow-md mt-3 transition-transform group-hover:scale-105"
                        style={{
                          borderColor: sortedLeaderboard[1].accentColor || '#94a3b8',
                          boxShadow: `0 0 12px ${(sortedLeaderboard[1].accentColor || '#94a3b8')}40`
                        }}
                      >
                        {sortedLeaderboard[1].avatar ? (
                          <img src={sortedLeaderboard[1].avatar} alt={sortedLeaderboard[1].name} className="w-full h-full object-cover" />
                        ) : (
                          sortedLeaderboard[1].name?.[0]?.toUpperCase() || 'P'
                        )}
                      </div>

                      <span className="text-xs font-gamer font-bold text-white mt-2 truncate max-w-full text-center group-hover:text-cyan-300 transition-colors" title={sortedLeaderboard[1].name}>
                        {sortedLeaderboard[1].name}
                      </span>
                      {sortedLeaderboard[1].isMe && (
                        <span className="text-[9px] font-mono px-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          VOCÊ
                        </span>
                      )}

                      <div className="mt-2 text-center w-full">
                        <span className="text-sm font-mono font-bold text-slate-200 block truncate">
                          {getMemberMetric(sortedLeaderboard[1], rankingFilter).value}
                        </span>
                        <span className="text-[9px] font-mono text-gray-400 block truncate max-w-[85px] mx-auto">
                          {getMemberMetric(sortedLeaderboard[1], rankingFilter).subtext}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/5 p-3 flex flex-col items-center justify-center text-gray-600 text-[10px] font-mono h-28">
                      -
                    </div>
                  )}

                  {/* 1º LUGAR (OURO / MVP) - CENTRAL & ELEVADO */}
                  {sortedLeaderboard[0] && (
                    <div
                      onClick={() => setSelectedFriend({ id: sortedLeaderboard[0].id, nickname: sortedLeaderboard[0].name })}
                      className="flex flex-col items-center p-3.5 rounded-2xl bg-gradient-to-b from-amber-500/20 via-[#151724] to-[#0c0e15] border-2 border-amber-400/60 hover:border-amber-300 transition-all cursor-pointer shadow-xl hover:-translate-y-1.5 group relative overflow-hidden -mt-3 ring-2 ring-amber-400/20"
                    >
                      {/* Brilho dourado no topo */}
                      <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-amber-400/20 to-transparent pointer-events-none" />
                      
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/25 border border-amber-400/50 text-amber-300 text-[10px] font-mono font-bold shadow-sm">
                        <Crown className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>1º MVP</span>
                      </div>

                      {/* Avatar com aura */}
                      <div
                        className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl overflow-hidden border-2 bg-black/80 flex items-center justify-center font-gamer font-bold text-white text-base sm:text-lg shadow-lg mt-2 transition-transform group-hover:scale-105"
                        style={{
                          borderColor: sortedLeaderboard[0].accentColor || '#f59e0b',
                          boxShadow: `0 0 16px ${(sortedLeaderboard[0].accentColor || '#f59e0b')}60`
                        }}
                      >
                        {sortedLeaderboard[0].avatar ? (
                          <img src={sortedLeaderboard[0].avatar} alt={sortedLeaderboard[0].name} className="w-full h-full object-cover" />
                        ) : (
                          sortedLeaderboard[0].name?.[0]?.toUpperCase() || 'P'
                        )}
                      </div>

                      <span className="text-xs font-gamer font-bold text-white mt-2 truncate max-w-full text-center group-hover:text-amber-300 transition-colors" title={sortedLeaderboard[0].name}>
                        {sortedLeaderboard[0].name}
                      </span>
                      {sortedLeaderboard[0].isMe && (
                        <span className="text-[9px] font-mono px-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          VOCÊ
                        </span>
                      )}

                      <div className="mt-2 text-center w-full">
                        <span className="text-base font-mono font-bold text-amber-300 block truncate">
                          {getMemberMetric(sortedLeaderboard[0], rankingFilter).value}
                        </span>
                        <span className="text-[10px] font-mono text-gray-300 block truncate max-w-[95px] mx-auto">
                          {getMemberMetric(sortedLeaderboard[0], rankingFilter).subtext}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 3º LUGAR (BRONZE) */}
                  {sortedLeaderboard[2] ? (
                    <div
                      onClick={() => setSelectedFriend({ id: sortedLeaderboard[2].id, nickname: sortedLeaderboard[2].name })}
                      className="flex flex-col items-center p-3 rounded-2xl bg-gradient-to-b from-amber-800/15 via-[#12141f] to-[#0c0e15] border border-amber-800/40 hover:border-amber-700 transition-all cursor-pointer shadow-lg hover:-translate-y-1 group relative overflow-hidden"
                    >
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-800/30 text-amber-400 text-[10px] font-mono font-bold">
                        <Medal className="w-3 h-3 text-amber-500" />
                        <span>3º</span>
                      </div>

                      {/* Avatar com aura */}
                      <div
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden border-2 bg-black/70 flex items-center justify-center font-gamer font-bold text-white text-sm sm:text-base shadow-md mt-3 transition-transform group-hover:scale-105"
                        style={{
                          borderColor: sortedLeaderboard[2].accentColor || '#b45309',
                          boxShadow: `0 0 12px ${(sortedLeaderboard[2].accentColor || '#b45309')}40`
                        }}
                      >
                        {sortedLeaderboard[2].avatar ? (
                          <img src={sortedLeaderboard[2].avatar} alt={sortedLeaderboard[2].name} className="w-full h-full object-cover" />
                        ) : (
                          sortedLeaderboard[2].name?.[0]?.toUpperCase() || 'P'
                        )}
                      </div>

                      <span className="text-xs font-gamer font-bold text-white mt-2 truncate max-w-full text-center group-hover:text-cyan-300 transition-colors" title={sortedLeaderboard[2].name}>
                        {sortedLeaderboard[2].name}
                      </span>
                      {sortedLeaderboard[2].isMe && (
                        <span className="text-[9px] font-mono px-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          VOCÊ
                        </span>
                      )}

                      <div className="mt-2 text-center w-full">
                        <span className="text-sm font-mono font-bold text-amber-400 block truncate">
                          {getMemberMetric(sortedLeaderboard[2], rankingFilter).value}
                        </span>
                        <span className="text-[9px] font-mono text-gray-400 block truncate max-w-[85px] mx-auto">
                          {getMemberMetric(sortedLeaderboard[2], rankingFilter).subtext}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/5 p-3 flex flex-col items-center justify-center text-gray-600 text-[10px] font-mono h-28">
                      -
                    </div>
                  )}
                </div>

                {/* LISTA COMPACTA: 4º LUGAR EM DIANTE */}
                {sortedLeaderboard.length > 3 && (
                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block px-1">
                      Demais Membros na Classificação:
                    </span>
                    {sortedLeaderboard.slice(3).map((member, index) => {
                      const position = index + 4;
                      const metric = getMemberMetric(member, rankingFilter);
                      return (
                        <div
                          key={member.id}
                          onClick={() => setSelectedFriend({ id: member.id, nickname: member.name })}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-[#141620] border border-border hover:border-white/20 cursor-pointer transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-lg bg-surface text-gray-400 flex items-center justify-center font-mono font-bold text-xs">
                              {position}
                            </span>

                            <div
                              className="w-7 h-7 rounded-lg overflow-hidden border flex items-center justify-center font-gamer font-bold text-white text-xs bg-black/50 shrink-0"
                              style={{ borderColor: member.accentColor || '#10b981' }}
                            >
                              {member.avatar ? (
                                <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                              ) : (
                                member.name?.[0]?.toUpperCase() || 'P'
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                                  {member.name}
                                </span>
                                {member.isMe && (
                                  <span className="text-[9px] font-mono px-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                    Você
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-gray-400 font-mono block truncate max-w-[150px]">
                                {metric.subtext}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-mono font-bold text-emerald-400">
                              {metric.value}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-gray-500 font-mono py-8 text-center bg-black/20 rounded-xl border border-dashed border-white/5">
                Nenhum registro para o ranking ainda.
              </div>
            )}
          </div>

          {/* CARD 2: ESTATÍSTICAS CONSOLIDADAS DA GUILDA */}
          <div className="p-5 rounded-2xl bg-[#0e1017] border border-border shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-gamer font-bold text-white flex items-center gap-2">
                <Swords className="w-4 h-4 text-cyan-400" />
                Estatísticas da Guilda
              </h3>
              <span className="text-[10px] font-mono text-gray-400 uppercase">CONSOLIDADO</span>
            </div>

            {data.stats ? (
              <div className="space-y-3.5">
                {/* Média Geral de Notas */}
                <div className="p-3 rounded-xl bg-[#141620] border border-border flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-gray-400 block">
                      Média Geral de Notas
                    </span>
                    <span className="text-base font-bold text-white font-mono">
                      {data.stats.overallAvgRating} <span className="text-gray-500 text-xs">/ 10</span>
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Star className="w-4 h-4 fill-current" />
                  </div>
                </div>

                {/* Gênero Mais Jogado */}
                <div className="p-3 rounded-xl bg-[#141620] border border-border flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-gray-400 block">
                      Gênero Mais Jogado
                    </span>
                    <span className="text-sm font-bold text-white">
                      {data.stats.topGenre}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                    <Swords className="w-4 h-4" />
                  </div>
                </div>

                {/* Horas Somadas da Guilda */}
                <div className="p-3 rounded-xl bg-[#141620] border border-border flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-gray-400 block">
                      Horas Somadas da Guilda
                    </span>
                    <span className="text-base font-bold text-white font-mono">
                      {data.stats.totalGuildHours}h jogadas
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>

                {/* Barra de Distribuição de Notas */}
                <div className="pt-2 space-y-2">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-gray-400">Distribuição de Notas</span>
                    <span className="text-emerald-400 font-bold">{data.stats.percentOver7}% &gt; 7.0</span>
                  </div>
                  <div className="w-full h-2 bg-[#1b1e2a] rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${(data.stats.scoreDist.over9 / (data.stats.totalGuildRatingCount || 1)) * 100}%` }}
                      className="bg-emerald-400 h-full"
                      title="9.0+"
                    />
                    <div
                      style={{ width: `${(data.stats.scoreDist.between8and9 / (data.stats.totalGuildRatingCount || 1)) * 100}%` }}
                      className="bg-teal-400 h-full"
                      title="8.0 - 8.9"
                    />
                    <div
                      style={{ width: `${(data.stats.scoreDist.between7and8 / (data.stats.totalGuildRatingCount || 1)) * 100}%` }}
                      className="bg-amber-400 h-full"
                      title="7.0 - 7.9"
                    />
                    <div
                      style={{ width: `${(data.stats.scoreDist.under7 / (data.stats.totalGuildRatingCount || 1)) * 100}%` }}
                      className="bg-rose-500 h-full"
                      title="< 7.0"
                    />
                  </div>
                  <div className="flex justify-between text-[9px] font-mono text-gray-500 pt-1">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> 9+</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span> 8-8.9</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> 7-7.9</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> &lt;7</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Modal de Detalhes do Jogo (ao clicar em Ver Análise) */}
      {selectedGame && (
        <GameExpandedModal
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      )}

      {/* Modal para Inspecionar o Perfil Completo do Amigo */}
      {selectedFriend && (
        <FriendProfileModal
          friendId={selectedFriend.id}
          onClose={() => setSelectedFriend(null)}
          onSelectGame={(g) => setSelectedGame(g)}
        />
      )}
    </div>
  );
}
