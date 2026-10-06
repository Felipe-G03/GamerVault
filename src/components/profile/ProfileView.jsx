import React, { useState, useEffect } from 'react';
import {
  User,
  Copy,
  Check,
  UserPlus,
  Trash2,
  Loader2,
  Shield,
  Gamepad2,
  AlertCircle,
  Sparkles,
  Flame,
  Star,
  Clock,
  Calendar,
  Layers,
  Edit3,
  Camera,
  Palette,
  ExternalLink,
  Plus
} from 'lucide-react';
import {
  updateFullProfile,
  addFriend,
  removeFriend,
  getFriendsDetails,
  BANNER_THEMES
} from '../../services/profileService';
import { isFinished } from '../../utils/gameUtils';
import ShowcaseEditModal from './ShowcaseEditModal';
import FriendProfileModal from './FriendProfileModal';

const ACCENT_PRESETS = [
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Violet', hex: '#8b5cf6' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Crimson', hex: '#ef4444' }
];

export default function ProfileView({ user, profile, games = [], onProfileUpdated }) {
  // Dados Básicos
  const [nickname, setNickname] = useState(profile?.nickname || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatar, setAvatar] = useState(profile?.avatar || 'cyber-samurai');
  const [customAvatarUrl, setCustomAvatarUrl] = useState(profile?.customAvatarUrl || '');
  const [bannerTheme, setBannerTheme] = useState(profile?.bannerTheme || 'cyber-grid');
  const [customBannerUrl, setCustomBannerUrl] = useState(profile?.customBannerUrl || '');
  const [accentColor, setAccentColor] = useState(profile?.accentColor || '#10b981');
  
  // Vitrines Personalizadas
  const [showcases, setShowcases] = useState(profile?.showcases || []);
  const [editingShowcase, setEditingShowcase] = useState(null);
  const [isCreatingShowcase, setIsCreatingShowcase] = useState(false);

  // Estados de UI
  const [activeTab, setActiveTab] = useState('vitrines'); // 'vitrines' | 'zerados' | 'amigos' | 'customizacao'
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedPilotId, setCopiedPilotId] = useState(false);

  // Amigos
  const [friendPilotId, setFriendPilotId] = useState('');
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [friendError, setFriendError] = useState(null);
  const [friendSuccess, setFriendSuccess] = useState(null);
  const [friendsList, setFriendsList] = useState([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);

  // Visualização de Perfil de Amigo selecionado
  const [selectedFriendId, setSelectedFriendId] = useState(null);

  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname || '');
      setBio(profile.bio || '');
      setAvatar(profile.avatar || 'cyber-samurai');
      setCustomAvatarUrl(profile.customAvatarUrl || '');
      setBannerTheme(profile.bannerTheme || 'cyber-grid');
      setCustomBannerUrl(profile.customBannerUrl || '');
      setAccentColor(profile.accentColor || '#10b981');
      setShowcases(profile.showcases || []);
    }
    loadFriends();
  }, [profile]);

  const loadFriends = async () => {
    if (!profile?.friends || profile.friends.length === 0) {
      setFriendsList([]);
      return;
    }
    setIsLoadingFriends(true);
    try {
      const details = await getFriendsDetails(profile.friends);
      setFriendsList(details);
    } catch (e) {
      console.error('Erro ao buscar lista de amigos:', e);
    } finally {
      setIsLoadingFriends(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e?.preventDefault();
    if (!nickname.trim() || !user?.uid) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await updateFullProfile(user.uid, {
        nickname: nickname.trim(),
        bio: bio.trim(),
        avatar,
        customAvatarUrl: customAvatarUrl.trim(),
        bannerTheme,
        customBannerUrl: customBannerUrl.trim(),
        showcases,
        accentColor
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      onProfileUpdated?.();
    } catch (e) {
      console.error('Erro ao salvar personalização do perfil:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyPilotId = () => {
    if (!user?.uid) return;
    navigator.clipboard.writeText(user.uid);
    setCopiedPilotId(true);
    setTimeout(() => setCopiedPilotId(false), 2500);
  };

  const handleAddFriend = async (e) => {
    e.preventDefault();
    if (!friendPilotId.trim() || !user?.uid) return;
    setIsAddingFriend(true);
    setFriendError(null);
    setFriendSuccess(null);
    try {
      await addFriend(user.uid, friendPilotId.trim());
      setFriendSuccess('Amigo adicionado com sucesso à Guilda!');
      setFriendPilotId('');
      onProfileUpdated?.();
      loadFriends();
    } catch (err) {
      setFriendError(err.message || 'Erro ao adicionar amigo.');
    } finally {
      setIsAddingFriend(false);
    }
  };

  const handleRemoveFriend = async (friendId) => {
    if (!window.confirm('Deseja realmente remover este amigo da sua Guilda?')) return;
    try {
      await removeFriend(user.uid, friendId);
      onProfileUpdated?.();
      loadFriends();
    } catch (err) {
      console.error('Erro ao remover amigo:', err);
    }
  };

  // Salvar vitrine criada ou editada
  const handleSaveShowcase = async (showcaseData) => {
    let updatedShowcases;
    if (editingShowcase) {
      updatedShowcases = showcases.map(s => s.id === showcaseData.id ? showcaseData : s);
    } else {
      updatedShowcases = [...showcases, showcaseData];
    }
    setShowcases(updatedShowcases);
    setEditingShowcase(null);
    setIsCreatingShowcase(false);

    if (user?.uid) {
      try {
        await updateFullProfile(user.uid, { showcases: updatedShowcases });
        onProfileUpdated?.();
      } catch (e) {
        console.error('Erro ao salvar vitrines no Firestore:', e);
      }
    }
  };

  const handleDeleteShowcase = async (showcaseId) => {
    if (!window.confirm('Deseja realmente excluir esta vitrine do seu perfil?')) return;
    const updated = showcases.filter(s => s.id !== showcaseId);
    setShowcases(updated);
    if (user?.uid) {
      try {
        await updateFullProfile(user.uid, { showcases: updated });
        onProfileUpdated?.();
      } catch (e) {
        console.error('Erro ao excluir vitrine:', e);
      }
    }
  };

  // Jogos finalizados do próprio usuário
  const myCompletedGames = games.filter(g => isFinished(g.status));
  myCompletedGames.sort((a, b) => {
    const dateA = a.dateFinished || a.yearFinished || '';
    const dateB = b.dateFinished || b.yearFinished || '';
    return String(dateB).localeCompare(String(dateA));
  });

  const currentTheme = BANNER_THEMES.find(b => b.id === bannerTheme) || BANNER_THEMES[0];

  return (
    <div className="max-w-5xl mx-auto space-y-6 select-none animate-fade-in pb-12">
      
      {/* ========================================================
          CABEÇALHO / BANNER ANIMADO DO PERFIL DO USUÁRIO
          ======================================================== */}
      <div className="relative rounded-3xl overflow-hidden border border-border shadow-2xl bg-[#0b0d14]">
        
        {/* Banner com Gradiente Animado ou Imagem Customizada */}
        <div className="relative h-48 sm:h-56 w-full overflow-hidden flex items-end p-6">
          {customBannerUrl ? (
            <img
              src={customBannerUrl}
              alt="Banner de perfil"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-r ${currentTheme.gradient} ${currentTheme.animationClass}`} />
          )}

          {/* Sombra de leitura suave e aura de cor */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0d14] via-[#0b0d14]/60 to-transparent" />
          <div
            className="absolute inset-0 pointer-events-none transition-all duration-500"
            style={{ background: `radial-gradient(ellipse at top, ${accentColor}25 0%, transparent 70%)` }}
          />

          {/* Botão de Atalho para Customizar Banner */}
          <button
            onClick={() => setActiveTab('customizacao')}
            className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/90 text-gray-300 hover:text-white border border-white/10 text-xs font-mono backdrop-blur-md transition-all cursor-pointer shadow-lg"
            title="Personalizar avatar, cor, banner e bio"
          >
            <Palette className="w-3.5 h-3.5" style={{ color: accentColor }} />
            <span>Editar Perfil</span>
          </button>

          {/* Identidade do Jogador */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-end gap-5 w-full">
            
            {/* Avatar com Borda e Brilho na cor customizada */}
            <div 
              className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 shadow-2xl bg-black/80 flex items-center justify-center text-4xl shrink-0 group transition-all duration-300"
              style={{ borderColor: accentColor, boxShadow: `0 0 25px ${accentColor}40` }}
            >
              {customAvatarUrl ? (
                <img
                  src={customAvatarUrl}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-surface-high font-gamer font-bold text-white text-3xl">
                  {nickname?.[0]?.toUpperCase() || 'P'}
                </div>
              )}
            </div>

            {/* Informações de Perfil */}
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-gamer font-bold text-white tracking-wide">
                  {nickname || 'Piloto'}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-accent-bright/15 text-accent-bright border border-accent-bright/30">
                  SEU PERFIL
                </span>
              </div>

              {bio ? (
                <p className="text-xs text-gray-300 font-sans italic max-w-2xl line-clamp-2">
                  "{bio}"
                </p>
              ) : (
                <p className="text-xs text-gray-500 font-sans italic">
                  Nenhuma biografia definida. Clique em "Editar Perfil" para personalizar.
                </p>
              )}

              {/* Pilot ID & Estatísticas Rápidas */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleCopyPilotId}
                  className="flex items-center gap-1.5 text-[10px] font-mono text-gray-300 hover:text-white bg-black/40 hover:bg-black/70 px-3 py-1 rounded-lg border border-white/10 transition-colors"
                  title="Copiar ID de Piloto para compartilhar com amigos"
                >
                  {copiedPilotId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>ID: {user?.uid ? `${user.uid.slice(0, 10)}...` : 'Offline'}</span>
                </button>

                <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                  <Gamepad2 className="w-3.5 h-3.5" />
                  <span>{myCompletedGames.length} zerados</span>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-mono text-cyan-400">
                  <Shield className="w-3.5 h-3.5" />
                  <span>{friendsList.length} amigos na Guilda</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* NAVEGAÇÃO DE ABAS */}
        <div className="px-6 border-t border-[#1a1d2b] bg-[#0d0f17] flex items-center justify-between overflow-x-auto">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab('vitrines')}
              className={`py-3.5 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'vitrines'
                  ? 'border-accent-bright text-accent-bright'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Vitrines Personalizadas ({showcases.length})
            </button>

            <button
              onClick={() => setActiveTab('zerados')}
              className={`py-3.5 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'zerados'
                  ? 'border-accent-bright text-accent-bright'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
              Jogos Zerados ({myCompletedGames.length})
            </button>

            <button
              onClick={() => setActiveTab('amigos')}
              className={`py-3.5 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'amigos'
                  ? 'border-accent-bright text-accent-bright'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Shield className="w-4 h-4" />
              Guilda & Amigos ({friendsList.length})
            </button>

            <button
              onClick={() => setActiveTab('customizacao')}
              className={`py-3.5 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'customizacao'
                  ? 'border-accent-bright text-accent-bright'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Palette className="w-4 h-4" />
              Personalizar
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================
          CONTEÚDO DA ABA SELECIONADA
          ======================================================== */}

      {/* ABA 1: VITRINES / COLEÇÕES PERSONALIZADAS */}
      {activeTab === 'vitrines' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-gamer font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent-bright" />
                Vitrines em Destaque no seu Perfil
              </h2>
              <p className="text-xs font-mono text-gray-400 mt-0.5">
                Crie coleções personalizadas (ex: "Top 5 Obras de Arte", "Nunca jogue esses jogos") para exibir aos amigos da Guilda.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingShowcase(null);
                setIsCreatingShowcase(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-bright hover:bg-emerald-400 text-black font-gamer font-bold text-xs transition-all shadow-neon-green cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Coleção</span>
            </button>
          </div>

          {showcases.length === 0 ? (
            <div className="p-12 text-center space-y-3 bg-[#0e1017] rounded-2xl border border-dashed border-border/80">
              <Layers className="w-10 h-10 text-gray-600 mx-auto" />
              <h3 className="text-base font-gamer font-bold text-white">
                Você ainda não criou nenhuma vitrine
              </h3>
              <p className="text-xs font-mono text-gray-400 max-w-md mx-auto">
                Destaque seus jogos favoritos, listas de avisos ("nunca jogue isso"), melhores histórias ou platinas difíceis para quem visitar seu perfil.
              </p>
              <button
                onClick={() => {
                  setEditingShowcase(null);
                  setIsCreatingShowcase(true);
                }}
                className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-bright hover:bg-emerald-400 text-black font-gamer font-bold text-xs transition-all shadow-neon-green cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Criar Primeira Coleção
              </button>
            </div>
          ) : (
            showcases.map((showcase) => (
              <div
                key={showcase.id}
                className="p-6 rounded-2xl bg-[#0e1017] border border-border shadow-xl space-y-4"
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

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingShowcase(showcase);
                        setIsCreatingShowcase(true);
                      }}
                      className="p-2 rounded-lg bg-surface-high hover:bg-surface-mid text-gray-300 hover:text-white transition-colors"
                      title="Editar Vitrine"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteShowcase(showcase.id)}
                      className="p-2 rounded-lg bg-red-950/30 hover:bg-red-900/50 text-red-400 transition-colors"
                      title="Excluir Vitrine"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Cards de Jogos na Vitrine */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5">
                  {showcase.games?.map((g, idx) => (
                    <div
                      key={idx}
                      className="group rounded-xl overflow-hidden bg-[#141724] border border-[#23273a] hover:border-accent-bright/50 transition-all shadow-md hover:-translate-y-1"
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

      {/* ABA 2: JOGOS ZERADOS DO JOGADOR */}
      {activeTab === 'zerados' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-gamer font-bold text-white flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-accent-bright" />
              Seus Jogos Zerados ({myCompletedGames.length})
            </h2>
            <span className="text-xs font-mono text-gray-400">
              Total de horas registradas: {myCompletedGames.reduce((acc, g) => acc + (parseFloat(g.playtime) || 0), 0)}h
            </span>
          </div>

          {myCompletedGames.length === 0 ? (
            <div className="py-16 text-center space-y-2 bg-[#0e1017] rounded-2xl border border-dashed border-border/80">
              <Gamepad2 className="w-10 h-10 text-gray-600 mx-auto" />
              <h3 className="text-base font-gamer font-bold text-white">
                Nenhum jogo finalizado ainda
              </h3>
              <p className="text-xs font-mono text-gray-400">
                Adicione jogos concluídos na aba "Sala de Recordações" para compor seu histórico de conquistas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {myCompletedGames.map((game) => (
                <div
                  key={game.id}
                  className="group rounded-xl overflow-hidden bg-[#111420] border border-[#212638] hover:border-emerald-500/50 transition-all shadow-md hover:-translate-y-1"
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

      {/* ABA 3: GERIR AMIGOS & GUILDA */}
      {activeTab === 'amigos' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#0e1017] border border-border shadow-xl space-y-5">
            <h2 className="text-lg font-gamer font-bold text-white tracking-wide flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              Adicionar Amigo à Guilda
            </h2>

            <form onSubmit={handleAddFriend} className="space-y-1.5">
              <label className="text-xs font-mono uppercase text-gray-300 font-semibold">
                ID de Piloto do Amigo:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Cole a ID de Piloto do seu amigo aqui..."
                  value={friendPilotId}
                  onChange={(e) => setFriendPilotId(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 bg-[#151722] border border-[#272a3b] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-bright transition-colors"
                />
                <button
                  type="submit"
                  disabled={isAddingFriend}
                  className="px-6 py-2.5 rounded-xl bg-accent-bright hover:bg-emerald-400 text-black font-gamer font-bold text-xs transition-all shadow-neon-green disabled:opacity-50 cursor-pointer"
                >
                  {isAddingFriend ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Adicionar'}
                </button>
              </div>

              {friendError && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-950/30 border border-red-800/40 text-red-300 text-xs mt-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{friendError}</span>
                </div>
              )}

              {friendSuccess && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-xs mt-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{friendSuccess}</span>
                </div>
              )}
            </form>
          </div>

          {/* Lista de Amigos com Botão de "Ver Perfil" */}
          <div className="p-6 rounded-2xl bg-[#0e1017] border border-border shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-gamer font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-accent-bright" />
                Sua Lista de Amigos ({friendsList.length})
              </h3>
              <span className="text-xs font-mono text-gray-500">
                Clique no amigo para explorar as vitrines e jogos zerados dele
              </span>
            </div>

            {isLoadingFriends ? (
              <div className="py-8 flex items-center justify-center text-gray-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-accent-bright" />
                <span className="text-xs font-mono">Carregando amigos da Guilda...</span>
              </div>
            ) : friendsList.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {friendsList.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-[#141622] border border-[#23273a] hover:border-accent-bright/40 transition-colors"
                  >
                    <div
                      onClick={() => setSelectedFriendId(f.id)}
                      className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                    >
                      <div className="w-10 h-10 rounded-xl bg-surface-high border border-border flex items-center justify-center font-bold text-sm text-white shrink-0">
                        {f.nickname?.[0]?.toUpperCase() || 'P'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-white truncate hover:text-accent-bright transition-colors">
                          {f.nickname || 'Piloto'}
                        </h4>
                        <span className="text-[10px] font-mono text-gray-400 block truncate">
                          ID: {f.id.slice(0, 12)}...
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedFriendId(f.id)}
                        className="px-3 py-1.5 rounded-lg bg-surface-high hover:bg-surface-mid border border-border text-white text-xs font-mono flex items-center gap-1 cursor-pointer"
                        title="Ver Perfil Completo"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Ver Perfil</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveFriend(f.id)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer"
                        title="Remover Amigo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs font-mono text-gray-500 bg-[#12141c] rounded-xl border border-dashed border-border">
                Você ainda não adicionou nenhum amigo à Guilda. Compartilhe sua ID de Piloto!
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 4: CUSTOMIZAÇÃO DO PERFIL (AVATAR, BANNER, BIO) */}
      {activeTab === 'customizacao' && (
        <form onSubmit={handleSaveProfile} className="p-6 rounded-2xl bg-[#0e1017] border border-border shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-border/80 pb-4">
            <div>
              <h2 className="text-lg font-gamer font-bold text-white flex items-center gap-2">
                <Palette className="w-5 h-5 text-accent-bright" />
                Personalizar seu Perfil Gamer
              </h2>
              <p className="text-xs font-mono text-gray-400 mt-0.5">
                Escolha seu avatar temático, banner dinâmico e escreva sua bio de piloto.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-accent-bright hover:bg-emerald-400 text-black font-gamer font-bold text-xs transition-all shadow-neon-green disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>Salvar Alterações</span>
            </button>
          </div>

          {saveSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs font-mono">
              <Check className="w-4 h-4" />
              <span>Perfil salvo e atualizado com sucesso na Guilda!</span>
            </div>
          )}

          {/* Nickname & Bio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase text-gray-300 font-semibold block">
                Seu Nickname:
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Ex: Felipão"
                className="w-full px-3.5 py-2.5 bg-[#151722] border border-[#272a3b] rounded-xl text-sm text-white focus:outline-none focus:border-accent-bright"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase text-gray-300 font-semibold block">
                Bio / Frase de Piloto:
              </label>
              <input
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Ex: Zombando de backlogs desde 2012"
                className="w-full px-3.5 py-2.5 bg-[#151722] border border-[#272a3b] rounded-xl text-xs text-white focus:outline-none focus:border-accent-bright"
              />
            </div>
          </div>

          {/* Foto de Perfil (Avatar por URL) */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-mono uppercase text-gray-300 font-semibold block">
              Foto de Perfil (Avatar por Link):
            </label>
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#141624] border border-[#23273a]">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/20 bg-black/60 flex items-center justify-center shrink-0 text-2xl font-bold font-gamer text-white shadow-md">
                {customAvatarUrl ? (
                  <img
                    src={customAvatarUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <span>{nickname?.[0]?.toUpperCase() || 'P'}</span>
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                <input
                  type="url"
                  value={customAvatarUrl}
                  onChange={(e) => {
                    setCustomAvatarUrl(e.target.value);
                    setAvatar(e.target.value);
                  }}
                  placeholder="https://exemplo.com/minha-foto.png (ou GIF, JPG, WebP)"
                  className="w-full px-3.5 py-2.5 bg-[#0e1017] border border-[#272a3b] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent-bright"
                />
                <p className="text-[11px] font-mono text-gray-500">
                  Cole o link direto da imagem que deseja usar no seu avatar (deixe em branco para usar sua inicial).
                </p>
              </div>
            </div>
          </div>

          {/* Seleção de Banner Animado ou URL Customizada */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-mono uppercase text-gray-300 font-semibold block">
              Tema do Banner Animado:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {BANNER_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => {
                    setBannerTheme(theme.id);
                    setCustomBannerUrl('');
                  }}
                  className={`h-20 rounded-2xl border p-3 flex flex-col justify-end relative overflow-hidden transition-all text-left cursor-pointer ${
                    bannerTheme === theme.id && !customBannerUrl
                      ? 'border-accent-bright ring-2 ring-accent-bright/50'
                      : 'border-[#23273a] hover:border-white/20'
                  }`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-r ${theme.gradient} ${theme.animationClass}`} />
                  <div className="absolute inset-0 bg-black/40" />
                  <div className="relative z-10">
                    <span className="text-xs font-gamer font-bold text-white block">
                      {theme.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* URL Customizada de Banner / GIF */}
            <div className="pt-2 space-y-1">
              <label className="text-[11px] font-mono text-gray-400 block">
                Ou insira a URL de um banner ou GIF animado próprio:
              </label>
              <input
                type="url"
                value={customBannerUrl}
                onChange={(e) => setCustomBannerUrl(e.target.value)}
                placeholder="https://exemplo.com/banner-animado.gif"
                className="w-full px-3.5 py-2 bg-[#151722] border border-[#272a3b] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent-bright"
              />
            </div>
          </div>

          {/* ========================================================
              AURA & COR DE DESTAQUE DO PERFIL (CUSTOM COLOR PICKER)
              ======================================================== */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono uppercase text-gray-300 font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: accentColor }} />
                <span>Aura e Cor do Perfil:</span>
              </label>
              <span
                className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-white/5 border border-white/10"
                style={{ color: accentColor }}
              >
                {accentColor.toUpperCase()}
              </span>
            </div>
            <p className="text-[11px] font-mono text-gray-400">
              Personalize a cor da sua aura gamer. Ela iluminará o fundo e os destaques quando seus amigos visualizarem você na Guilda.
            </p>

            <div className="p-4 rounded-2xl bg-[#141624] border border-[#23273a] space-y-4">
              {/* Seletor Livre + Input Hex */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <label className="relative cursor-pointer group flex items-center gap-2.5">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="sr-only"
                    />
                    <div
                      className="w-10 h-10 rounded-xl border-2 shadow-lg transition-transform group-hover:scale-105 flex items-center justify-center cursor-pointer"
                      style={{
                        backgroundColor: accentColor,
                        borderColor: 'rgba(255, 255, 255, 0.4)',
                        boxShadow: `0 0 15px ${accentColor}60`
                      }}
                    >
                      <Palette className="w-4 h-4 text-black mix-blend-difference" />
                    </div>
                    <span className="text-xs font-mono text-gray-300 group-hover:text-white transition-colors">
                      Abrir Seletor de Cor Livre
                    </span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-400">HEX:</span>
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.startsWith('#') || val.length <= 7) {
                        setAccentColor(val);
                      }
                    }}
                    placeholder="#10b981"
                    maxLength={7}
                    className="w-28 px-2.5 py-1.5 bg-[#0e1017] border border-[#272a3b] rounded-lg text-xs font-mono text-white text-center focus:outline-none focus:border-white/40"
                  />
                </div>
              </div>

              {/* Paletas Gamer Rápidas */}
              <div className="space-y-1.5 pt-1 border-t border-white/5">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">
                  Cores Rápidas da Guilda:
                </span>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {ACCENT_PRESETS.map((preset) => {
                    const isSelected = accentColor.toLowerCase() === preset.hex.toLowerCase();
                    return (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={() => setAccentColor(preset.hex)}
                        className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-white/60 bg-white/10 scale-105 shadow-md'
                            : 'border-white/5 hover:border-white/20 hover:bg-white/5'
                        }`}
                      >
                        <div
                          className="w-6 h-6 rounded-lg transition-transform shadow"
                          style={{
                            backgroundColor: preset.hex,
                            boxShadow: isSelected ? `0 0 10px ${preset.hex}` : 'none'
                          }}
                        />
                        <span className="text-[9px] font-mono text-gray-300 text-center leading-tight truncate w-full">
                          {preset.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mini Prévia da Aura na Guilda */}
              <div
                className="p-3.5 rounded-xl border border-white/10 flex items-center justify-between overflow-hidden relative"
                style={{
                  background: `radial-gradient(ellipse at left, ${accentColor}25 0%, rgba(14, 16, 23, 0.95) 70%)`
                }}
              >
                <div className="flex items-center gap-3 relative z-10">
                  <div
                    className="w-10 h-10 rounded-xl overflow-hidden border-2 flex items-center justify-center font-gamer font-bold text-white text-base bg-black/60 shadow-md"
                    style={{ borderColor: accentColor, boxShadow: `0 0 12px ${accentColor}50` }}
                  >
                    {customAvatarUrl ? (
                      <img src={customAvatarUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      nickname?.[0]?.toUpperCase() || 'P'
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-gamer font-bold text-white block">
                      {nickname || 'Seu Nickname'}
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: accentColor }}>
                      Prévia do seu brilho na Guilda
                    </span>
                  </div>
                </div>
                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded border relative z-10"
                  style={{
                    backgroundColor: `${accentColor}20`,
                    borderColor: `${accentColor}50`,
                    color: accentColor
                  }}
                >
                  AURA ATIVA
                </span>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Modal de Criação / Edição de Vitrine */}
      {isCreatingShowcase && (
        <ShowcaseEditModal
          showcase={editingShowcase}
          userGames={games}
          onSave={handleSaveShowcase}
          onClose={() => {
            setIsCreatingShowcase(false);
            setEditingShowcase(null);
          }}
        />
      )}

      {/* Modal de Visualização de Perfil de Amigo da Guilda */}
      {selectedFriendId && (
        <FriendProfileModal
          friendId={selectedFriendId}
          onClose={() => setSelectedFriendId(null)}
        />
      )}

    </div>
  );
}
