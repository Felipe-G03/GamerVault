import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './config/firebase';
import { getUserGames, addGame, updateGame, deleteGame } from './services/gamesService';
import { getProfile, ensureProfile } from './services/profileService';
import { checkAppUpdate } from './services/updateService';

import TitleBar from './components/layout/TitleBar';
import Navbar from './components/layout/Navbar';
import VaultView from './components/vault/VaultView';
import HubView from './components/hub/HubView';
import AddGameView from './components/add-game/AddGameView';
import GuildView from './components/guild/GuildView';
import StatsView from './components/stats/StatsView';
import ProfileView from './components/profile/ProfileView';
import DiscoverView from './components/discover/DiscoverView';
import DealsRadarView from './components/deals/DealsRadarView';
import AuthModal from './components/auth/AuthModal';
import UpdateModal from './components/common/UpdateModal';
import SettingsModal from './components/layout/SettingsModal';
import VaultCastModal from './components/vaultcast/VaultCastModal';
import PatchNotesModal from './components/common/PatchNotesModal';
import StartupSplash from './components/common/StartupSplash';
import LargaDeFrescuraView from './components/roulette/LargaDeFrescuraView';
import DealsAppealCard from './components/deals/DealsAppealCard';
import { listenToActiveCasts, endCastSession } from './services/vaultCastService';
import { Loader2, Sparkles } from 'lucide-react';

export default function App() {
  const [splashFinished, setSplashFinished] = useState(false);
  const [activeTab, setActiveTab] = useState('vault');
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [games, setGames] = useState([]);
  const [editingGame, setEditingGame] = useState(null);

  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingGames, setLoadingGames] = useState(false);

  // Informações de atualização de versão do sistema
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isPatchNotesOpen, setIsPatchNotesOpen] = useState(false);

  // VaultCast: Transmissão ao vivo na Guilda e Deep Linking
  const [isVaultCastModalOpen, setIsVaultCastModalOpen] = useState(false);
  const [vaultCastRoomId, setVaultCastRoomId] = useState(null);
  const [vaultCastAutoStart, setVaultCastAutoStart] = useState(null);
  const [activeUserCast, setActiveUserCast] = useState(null);

  // Escuta gatilhos do In-Game Overlay para iniciar live diretamente
  useEffect(() => {
    const handleTriggerLive = (game) => {
      setVaultCastAutoStart(game || true);
      setIsVaultCastModalOpen(true);
    };

    const unsubIpc = window.electronAPI?.onTriggerStartLive?.(handleTriggerLive);

    let bc = null;
    try {
      bc = new BroadcastChannel('vaultcast_sync');
      bc.onmessage = (e) => {
        if (e.data?.type === 'TRIGGER_START_LIVE') {
          handleTriggerLive(e.data.game);
        }
      };
    } catch (_) {}

    return () => {
      unsubIpc?.();
      bc?.close();
    };
  }, []);

  // Escuta se o próprio usuário tem uma live ativa para exibir indicador global e botão de encerramento
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = listenToActiveCasts((casts) => {
      const myLive = casts.find(c => c.pilotId === user.uid || c.id?.includes(user.uid));
      setActiveUserCast(myLive || null);
    });
    return unsub;
  }, [user]);

  const handleStopActiveCast = async () => {
    if (activeUserCast?.id) {
      await endCastSession(activeUserCast.id);
      setActiveUserCast(null);
    }
  };

  // Ouvintes de Ciclo de Vida do Electron (Bandeja / Standby / Configurações / Deep Links)
  useEffect(() => {
    if (window.electronAPI) {
      // Abre o modal de configurações se chamado via menu de contexto da bandeja
      const unsubSettings = window.electronAPI.onOpenSettingsModal?.(() => {
        setIsSettingsModalOpen(true);
      });

      // Pausa BGM/áudio quando a janela é oculta para a bandeja (standby total)
      const unsubStandby = window.electronAPI.onAppStandby?.(() => {
        window.dispatchEvent(new CustomEvent('gamervault:pause-bgm'));
      });

      // Retoma quando a janela é restaurada da bandeja
      const unsubResume = window.electronAPI.onAppResume?.(() => {
        window.dispatchEvent(new CustomEvent('gamervault:resume-bgm'));
      });

      // Quando puxar pelo atalho global do teclado, abre direto na aba Gamers Hub
      const unsubShortcut = window.electronAPI.onShortcutOpen?.(() => {
        setEditingGame(null);
        setActiveTab('hub');
      });

      // Ouvinte de Deep Linking clicado no Discord ou Navegador (gamervault://cast?room=XYZ)
      const unsubDeepLink = window.electronAPI.onDeepLinkReceived?.((url) => {
        if (typeof url === 'string' && url.startsWith('gamervault://cast')) {
          try {
            const urlObj = new URL(url.replace('gamervault://', 'http://gamervault.local/'));
            const roomId = urlObj.searchParams.get('room');
            setVaultCastRoomId(roomId);
            setIsVaultCastModalOpen(true);
            setActiveTab('guilda');
          } catch (e) {
            console.error('Erro ao interpretar deep link do VaultCast:', e);
          }
        }
      });

      return () => {
        unsubSettings?.();
        unsubStandby?.();
        unsubResume?.();
        unsubShortcut?.();
        unsubDeepLink?.();
      };
    }
  }, []);

  // Monitora o estado de autenticação
  useEffect(() => {
    let unsubscribe = () => {};
    if (auth) {
      unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          await loadUserProfile(currentUser.uid, currentUser.email);
        } else {
          // Verifica se há login por Pilot ID local salvo
          const savedPilotId = localStorage.getItem('gamervault_custom_pilot_id');
          if (savedPilotId) {
            const customUser = { uid: savedPilotId, email: `${savedPilotId}@gamervault.local` };
            setUser(customUser);
            await loadUserProfile(savedPilotId, customUser.email);
          } else {
            setUser(null);
            setProfile(null);
            setGames([]);
          }
        }
        setLoadingAuth(false);
      });
    } else {
      setLoadingAuth(false);
    }

    return () => unsubscribe();
  }, []);

  // Checa se há atualização disponível no Firestore
  const handleCheckUpdate = async () => {
    const currentVer = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.0.0';
    try {
      const info = await checkAppUpdate(currentVer);
      if (info?.hasUpdate) {
        setUpdateInfo(info);
        setIsUpdateModalOpen(true);
      }
      return info;
    } catch (err) {
      console.error('Erro na verificação manual de atualização:', err);
      return null;
    }
  };

  useEffect(() => {
    handleCheckUpdate();
  }, []);

  // Carrega perfil e jogos
  const loadUserProfile = async (uid, email) => {
    try {
      const userProfile = await ensureProfile(uid, email, 'Piloto');
      setProfile(userProfile);
      await loadGames(uid);
    } catch (e) {
      console.error('Erro ao carregar perfil do usuário:', e);
    }
  };

  const loadGames = async (uid) => {
    setLoadingGames(true);
    try {
      const list = await getUserGames(uid);
      setGames(list);
    } catch (e) {
      console.error('Erro ao carregar jogos:', e);
    } finally {
      setLoadingGames(false);
    }
  };

  // Sucesso de autenticação
  const handleAuthSuccess = async (authUser, authProfile) => {
    setUser(authUser);
    setProfile(authProfile);
    if (authUser.isCustomPilotId) {
      localStorage.setItem('gamervault_custom_pilot_id', authUser.uid);
    }
    await loadGames(authUser.uid);
  };

  // Logout
  const handleLogout = async () => {
    localStorage.removeItem('gamervault_custom_pilot_id');
    if (auth) {
      try {
        await signOut(auth);
      } catch (e) {
        console.error('Erro ao deslogar:', e);
      }
    }
    setUser(null);
    setProfile(null);
    setGames([]);
  };

  // Salvar ou atualizar jogo
  const handleGameSaved = async (gamePayload, editId) => {
    if (!user?.uid) return;

    if (editId) {
      const updated = await updateGame(user.uid, editId, gamePayload);
      setGames((prev) => prev.map((g) => (g.id === editId ? { ...g, ...updated } : g)));
    } else {
      const added = await addGame(user.uid, gamePayload);
      setGames((prev) => [added, ...prev]);
    }

    setEditingGame(null);
    setActiveTab('vault');
  };

  // Deletar jogo
  const handleDeleteGame = async (gameId) => {
    if (!user?.uid) return;
    try {
      await deleteGame(user.uid, gameId);
      setGames((prev) => prev.filter((g) => g.id !== gameId));
    } catch (e) {
      console.error('Erro ao deletar jogo:', e);
    }
  };

  // Editar jogo
  const handleEditGame = (game) => {
    setEditingGame(game);
    setActiveTab('adicionar');
  };

  // Adicionar diretamente à Lista de Desejos a partir da aba Explorar
  const handleDirectAddWishlist = async (gameData) => {
    if (!user?.uid) return;
    try {
      const added = await addGame(user.uid, gameData);
      setGames((prev) => [added, ...prev]);
    } catch (e) {
      console.error('Erro ao adicionar à lista de desejos:', e);
      throw e;
    }
  };

  // Selecionar jogo da aba Explorar para registrar com formulário completo
  const handleSelectGameToRegister = (rawgGame) => {
    setEditingGame({
      title: rawgGame.title,
      imageUrl: rawgGame.imageUrl || '',
      metacritic: rawgGame.metacritic || null,
      genre: rawgGame.genres || '',
      genre_slugs: rawgGame.genre_slugs || [],
      tags: rawgGame.tags || [],
      status: 'Finalizado',
      dateFinished: new Date().toISOString().split('T')[0],
      playtime: '',
      rating: 8,
      review: '',
      screenshotsText: '',
      themeUrl: ''
    });
    setActiveTab('adicionar');
  };

  // Handlers para o Gamer's Hub
  const handleHubAddGame = async (gameData) => {
    if (!user?.uid) return;
    try {
      const added = await addGame(user.uid, gameData);
      setGames((prev) => [added, ...prev]);
      return added;
    } catch (e) {
      console.error('Erro ao adicionar jogo via Hub:', e);
      throw e;
    }
  };

  const handleHubUpdateGame = async (gameId, gameData) => {
    if (!user?.uid) return;
    try {
      const updated = await updateGame(user.uid, gameId, gameData);
      setGames((prev) => prev.map((g) => (g.id === gameId ? { ...g, ...updated } : g)));
      return updated;
    } catch (e) {
      console.error('Erro ao atualizar jogo via Hub:', e);
      throw e;
    }
  };

  return (
    <div className="min-h-screen bg-background text-white flex flex-col selection:bg-accent-bright selection:text-black relative overflow-x-hidden">
      {/* Vídeo de Introdução / Splash Screen em Tela Cheia */}
      {!splashFinished && (
        <StartupSplash onFinish={() => setSplashFinished(true)} />
      )}

      {/* Brilho Atmosférico Superior do Tema */}
      <div 
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[400px] pointer-events-none opacity-30 blur-[130px] transition-all duration-700 -z-0"
        style={{
          background: 'radial-gradient(ellipse at center, var(--accent-glow) 0%, transparent 70%)'
        }}
      />
      {/* Brilho Atmosférico Secundário Flutuante */}
      <div 
        className="fixed bottom-0 right-0 w-[600px] h-[400px] pointer-events-none opacity-15 blur-[140px] transition-all duration-700 -z-0"
        style={{
          background: 'radial-gradient(circle at bottom right, rgba(6, 182, 212, 0.25) 0%, transparent 70%)'
        }}
      />

      {/* Barra de Título Superior Nativa/Electron */}
      <TitleBar 
        updateInfo={updateInfo}
        activeCast={activeUserCast}
        onStopActiveCast={handleStopActiveCast}
        onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onCheckUpdate={handleCheckUpdate}
      />

      {/* Modal de Configurações do Sistema */}
      {isSettingsModalOpen && (
        <SettingsModal 
          onClose={() => setIsSettingsModalOpen(false)}
          onCheckUpdate={handleCheckUpdate}
          updateInfo={updateInfo}
        />
      )}

      {/* Modal do VaultCast (Transmissão de Jogos/Janelas na Guilda) */}
      {isVaultCastModalOpen && (
        <VaultCastModal
          user={user}
          profile={profile}
          initialRoomId={vaultCastRoomId}
          autoStartGame={vaultCastAutoStart}
          onClose={() => {
            setIsVaultCastModalOpen(false);
            setVaultCastRoomId(null);
            setVaultCastAutoStart(null);
          }}
        />
      )}

      {/* Modal de Atualização de Versão */}
      {isUpdateModalOpen && updateInfo && (
        <UpdateModal
          updateInfo={updateInfo}
          onClose={() => setIsUpdateModalOpen(false)}
        />
      )}

      {/* Modal do Patch Notes / O que há de novo */}
      {isPatchNotesOpen && (
        <PatchNotesModal
          onClose={() => setIsPatchNotesOpen(false)}
        />
      )}

      {/* Conteúdo Principal ou Modal de Login */}
      {loadingAuth ? (
        <div className="flex-1 flex flex-col items-center justify-center text-accent-bright font-mono gap-3 min-h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-accent-bright" />
          <span className="text-sm tracking-widest uppercase">Iniciando Gamer's Vault...</span>
        </div>
      ) : !user ? (
        <AuthModal
          onAuthSuccess={handleAuthSuccess}
        />
      ) : (
        <>
          {/* Navegação Principal */}
          <Navbar
            activeTab={activeTab}
            setActiveTab={(tab) => {
              if (tab !== 'adicionar') setEditingGame(null);
              setActiveTab(tab);
            }}
            profile={profile}
            onLogout={handleLogout}
          />

          {/* Área de Visualização das Abas */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
            {loadingGames && games.length === 0 ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-accent-bright" />
                <span className="text-xs font-mono">Carregando acervo do Vault...</span>
              </div>
            ) : (
              <div key={activeTab} className="animate-page-enter w-full">
                {activeTab === 'vault' && (
                  <VaultView
                    games={games}
                    onAddGameClick={() => {
                      setEditingGame(null);
                      setActiveTab('adicionar');
                    }}
                    onEditGame={handleEditGame}
                    onDeleteGame={handleDeleteGame}
                  />
                )}

                {activeTab === 'hub' && (
                  <HubView
                    games={games}
                    userId={user?.uid}
                    onAddGame={handleHubAddGame}
                    onUpdateGame={handleHubUpdateGame}
                  />
                )}

                {activeTab === 'roleta' && (
                  <LargaDeFrescuraView
                    games={games}
                    onDirectAddWishlist={handleDirectAddWishlist}
                  />
                )}

                {activeTab === 'explorar' && (
                  <DiscoverView
                    games={games}
                    onDirectAddWishlist={handleDirectAddWishlist}
                    onSelectGameToRegister={handleSelectGameToRegister}
                  />
                )}

                {activeTab === 'ofertas' && (
                  <DealsRadarView
                    user={user}
                    wishlistGames={games.filter(g => g.status === 'Quero Jogar')}
                  />
                )}

                {activeTab === 'adicionar' && (
                  <AddGameView
                    editingGame={editingGame}
                    onGameAdded={handleGameSaved}
                    onCancelEdit={() => {
                      setEditingGame(null);
                      setActiveTab('vault');
                    }}
                  />
                )}

                {activeTab === 'guilda' && (
                  <GuildView
                    user={user}
                    profile={profile}
                    onGoToProfile={() => setActiveTab('perfil')}
                    onAddNewGame={() => {
                      setEditingGame(null);
                      setActiveTab('adicionar');
                    }}
                    onOpenVaultCast={(roomId) => {
                      setVaultCastRoomId(roomId || null);
                      setIsVaultCastModalOpen(true);
                    }}
                  />
                )}

                {activeTab === 'estatisticas' && (
                  <StatsView games={games} />
                )}

                {activeTab === 'perfil' && (
                  <ProfileView
                    user={user}
                    profile={profile}
                    games={games}
                    onProfileUpdated={() => loadUserProfile(user.uid, user.email)}
                  />
                )}
              </div>
            )}
          </main>

          {/* Botão Flutuante: O que há de novo? (Patch Notes) */}
          <button
            type="button"
            onClick={() => setIsPatchNotesOpen(true)}
            className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-[#0c101a]/90 hover:bg-[#141a2a] border border-cyan-500/40 hover:border-cyan-400 text-cyan-400 hover:text-cyan-300 shadow-[0_4px_24px_rgba(6,182,212,0.25)] backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 group cursor-pointer"
            title="Ver novidades e o que há de novo no GamerVault"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-12 transition-transform" />
            <span className="text-xs font-gamer font-bold tracking-wide">
              O que há de novo?
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              v2.4.2
            </span>
          </button>

          {/* Card Flutuante de Apelo da Loja de Ofertas (Vault, HUB e Guilda) */}
          <DealsAppealCard
            activeTab={activeTab}
            onNavigateToDeals={() => setActiveTab('ofertas')}
          />
        </>
      )}
    </div>
  );
}
