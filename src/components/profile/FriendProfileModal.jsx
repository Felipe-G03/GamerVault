import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Trophy,
  Copy,
  Check,
  Star,
  Clock,
  Sparkles,
  Gamepad2,
  Calendar,
  AlertTriangle,
  Loader2,
  Flame,
  Layers
} from 'lucide-react';
import { getFriendProfileWithGames, BANNER_THEMES } from '../../services/profileService';

export default function FriendProfileModal({ friendId, onClose, onSelectGame }) {
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [completedGames, setCompletedGames] = useState([]);
  const [activeTab, setActiveTab] = useState('vitrines'); // 'vitrines' | 'zerados'
  const [copiedId, setCopiedId] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!friendId) return;
    loadData();
  }, [friendId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getFriendProfileWithGames(friendId);
      if (res && res.profile) {
        setProfileData(res.profile);
        setCompletedGames(res.completedGames || []);
      } else {
        // Fallback para exibir ao menos os jogos zerados mesmo se não tiver perfil customizado
        setProfileData({
          nickname: 'Piloto da Guilda',
          bannerTheme: 'cyber-grid',
          bio: '',
          showcases: []
        });
        setCompletedGames(res?.completedGames || []);
      }
    } catch (err) {
      console.error('Erro ao carregar perfil do amigo:', err);
      setError('Não foi possível carregar os dados deste jogador.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyId = () => {
    if (!friendId) return;
    navigator.clipboard.writeText(friendId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Resolução do banner com fallback ultra-seguro
  const defaultBanner = BANNER_THEMES?.[0] || {
    id: 'cyber-grid',
    name: 'Cyber Grid',
    gradient: 'from-[#05131a] via-[#092b33] to-[#041c1a]',
    accentColor: '#10b981',
    animationClass: 'bg-cyber-grid animate-pulse-slow'
  };
  const bannerTheme = BANNER_THEMES?.find(b => b.id === profileData?.bannerTheme) || defaultBanner;

  const showcases = profileData?.showcases || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#0c0e14] border border-[#232738] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Botão Fechar no Topo */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-black/60 hover:bg-black/90 border border-white/10 text-gray-300 hover:text-white transition-all backdrop-blur-md"
          title="Fechar perfil"
        >
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-accent-bright" />
            <span className="font-mono text-xs">Carregando perfil do jogador...</span>
          </div>
        ) : error ? (
          <div className="p-12 text-center space-y-4">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
            <p className="text-sm font-mono text-gray-300">{error}</p>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-surface-high hover:bg-surface-mid border border-border text-white text-xs font-mono"
            >
              Fechar
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            
            {/* BANNER ANIMADO & CABEÇALHO DO PERFIL */}
            <div className="relative h-44 w-full overflow-hidden flex items-end p-6 border-b border-white/10">
              {profileData?.customBannerUrl ? (
                <img
                  src={profileData.customBannerUrl}
                  alt="Banner"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className={`absolute inset-0 bg-gradient-to-r ${bannerTheme.gradient} ${bannerTheme.animationClass}`} />
              )}
              
              {/* Overlay de gradiente para contraste suave */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c0e14] via-[#0c0e14]/50 to-transparent" />

              {/* Informações Básicas do Piloto */}
              <div className="relative z-10 flex items-end gap-5">
                {/* Avatar */}
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black/80 flex items-center justify-center text-3xl shrink-0">
                  {profileData?.customAvatarUrl || (profileData?.avatar && profileData.avatar.startsWith('http')) ? (
                    <img
                      src={profileData.customAvatarUrl || profileData.avatar}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-surface-high font-gamer font-bold text-white text-2xl">
                      {profileData?.nickname?.[0]?.toUpperCase() || 'P'}
                    </div>
                  )}
                </div>

                {/* Nickname, Bio e ID */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-gamer font-bold text-white tracking-wide">
                      {profileData?.nickname || 'Piloto da Guilda'}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-accent-bright/15 text-accent-bright border border-accent-bright/30">
                      MEMBRO DA GUILDA
                    </span>
                  </div>

                  {profileData?.bio && (
                    <p className="text-xs text-gray-300 font-sans max-w-xl italic line-clamp-2">
                      "{profileData.bio}"
                    </p>
                  )}

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={handleCopyId}
                      className="flex items-center gap-1.5 text-[10px] font-mono text-gray-400 hover:text-white bg-black/40 hover:bg-black/60 px-2.5 py-1 rounded-lg border border-white/10 transition-colors"
                      title="Copiar ID de Piloto"
                    >
                      {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>ID: {friendId.slice(0, 10)}...</span>
                    </button>

                    <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                      <Trophy className="w-3 h-3" />
                      <span>{completedGames.length} jogos zerados</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* BARRA DE NAVEGAÇÃO INTERNA DO PERFIL */}
            <div className="px-6 border-b border-[#1b1e2c] bg-[#0f111a] flex items-center gap-6">
              <button
                onClick={() => setActiveTab('vitrines')}
                className={`py-3.5 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === 'vitrines'
                    ? 'border-accent-bright text-accent-bright'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Vitrines Personalizadas ({showcases.length})
              </button>

              <button
                onClick={() => setActiveTab('zerados')}
                className={`py-3.5 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === 'zerados'
                    ? 'border-accent-bright text-accent-bright'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <Gamepad2 className="w-3.5 h-3.5" />
                Jogos Zerados ({completedGames.length})
              </button>
            </div>

            {/* CONTEÚDO DAS ABAS */}
            <div className="p-6">
              
              {/* ABA 1: VITRINES / COLEÇÕES PERSONALIZADAS */}
              {activeTab === 'vitrines' && (
                <div className="space-y-6">
                  {showcases.length === 0 ? (
                    <div className="py-12 text-center space-y-2 bg-[#10131d] rounded-2xl border border-dashed border-border/80">
                      <Layers className="w-8 h-8 text-gray-600 mx-auto" />
                      <p className="text-sm font-gamer font-semibold text-gray-400">
                        Nenhuma vitrine criada por este jogador ainda.
                      </p>
                      <p className="text-xs font-mono text-gray-500">
                        Ele ainda não organizou coleções personalizadas no perfil.
                      </p>
                    </div>
                  ) : (
                    showcases.map((showcase) => (
                      <div
                        key={showcase.id}
                        className="p-5 rounded-2xl bg-[#111420] border border-[#212638] shadow-lg space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-base font-gamer font-bold text-white flex items-center gap-2">
                              <Flame className="w-4 h-4 text-amber-400" />
                              {showcase.title}
                            </h3>
                            {showcase.description && (
                              <p className="text-xs font-mono text-gray-400 mt-0.5">
                                {showcase.description}
                              </p>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-gray-500">
                            {showcase.games?.length || 0} jogos
                          </span>
                        </div>

                        {/* Cards de Jogos na Vitrine */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
                          {showcase.games?.map((g, idx) => (
                            <div
                              key={idx}
                              onClick={() => onSelectGame?.(g)}
                              className="group relative rounded-xl overflow-hidden bg-[#161928] border border-white/5 hover:border-accent-bright/50 transition-all cursor-pointer shadow-md hover:-translate-y-1"
                            >
                              <div className="aspect-[3/4] w-full overflow-hidden bg-black/60 relative">
                                {g.coverUrl || g.imageUrl ? (
                                  <img
                                    src={g.coverUrl || g.imageUrl}
                                    alt={g.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center p-2 text-center text-xs font-mono text-gray-500">
                                    {g.title}
                                  </div>
                                )}
                                
                                {g.rating && (
                                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold flex items-center gap-0.5">
                                    <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                    <span>{g.rating}</span>
                                  </div>
                                )}
                              </div>

                              <div className="p-2 text-center">
                                <h4 className="text-xs font-gamer font-bold text-white truncate" title={g.title}>
                                  {g.title}
                                </h4>
                                {g.note && (
                                  <p className="text-[10px] font-mono text-gray-400 truncate mt-0.5">
                                    "{g.note}"
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ABA 2: JOGOS ZERADOS */}
              {activeTab === 'zerados' && (
                <div>
                  {completedGames.length === 0 ? (
                    <div className="py-12 text-center space-y-2 bg-[#10131d] rounded-2xl border border-dashed border-border/80">
                      <Gamepad2 className="w-8 h-8 text-gray-600 mx-auto" />
                      <p className="text-sm font-gamer font-semibold text-gray-400">
                        Nenhum jogo zerado registrado.
                      </p>
                      <p className="text-xs font-mono text-gray-500">
                        Este piloto ainda não registrou conclusões no Gamer's Vault.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {completedGames.map((game) => (
                        <div
                          key={game.id}
                          onClick={() => onSelectGame?.(game)}
                          className="group rounded-xl overflow-hidden bg-[#131623] border border-[#212638] hover:border-emerald-500/50 transition-all cursor-pointer shadow-md hover:-translate-y-1"
                        >
                          <div className="aspect-[3/4] w-full overflow-hidden bg-black/60 relative">
                            {game.coverUrl || game.imageUrl ? (
                              <img
                                src={game.coverUrl || game.imageUrl}
                                alt={game.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center p-2 text-center text-xs font-mono text-gray-500">
                                {game.title}
                              </div>
                            )}

                            {/* Badge de Nota */}
                            {game.rating > 0 && (
                              <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold flex items-center gap-0.5">
                                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                <span>{game.rating}</span>
                              </div>
                            )}
                          </div>

                          <div className="p-2.5 space-y-1">
                            <h4 className="text-xs font-gamer font-bold text-white truncate" title={game.title}>
                              {game.title}
                            </h4>
                            <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
                              <span className="flex items-center gap-1 text-emerald-400">
                                <Clock className="w-2.5 h-2.5" />
                                {game.playtime || 0}h
                              </span>
                              {game.dateFinished && (
                                <span className="flex items-center gap-1 text-gray-500">
                                  <Calendar className="w-2.5 h-2.5" />
                                  {game.dateFinished.slice(0, 4)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
