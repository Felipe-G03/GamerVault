import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './config/firebase';
import { getUserGames, addGame, updateGame, deleteGame } from './services/gamesService';
import { getProfile, ensureProfile } from './services/profileService';

import TitleBar from './components/layout/TitleBar';
import Navbar from './components/layout/Navbar';
import VaultView from './components/vault/VaultView';
import AddGameView from './components/add-game/AddGameView';
import GuildView from './components/guild/GuildView';
import StatsView from './components/stats/StatsView';
import ProfileView from './components/profile/ProfileView';
import AuthModal from './components/auth/AuthModal';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('vault');
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [games, setGames] = useState([]);
  const [editingGame, setEditingGame] = useState(null);

  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingGames, setLoadingGames] = useState(false);

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

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-[#07080c] flex flex-col items-center justify-center text-accent-bright font-mono gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-accent-bright" />
        <span className="text-sm tracking-widest uppercase">Iniciando Gamer's Vault...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080c] text-white flex flex-col selection:bg-accent-bright selection:text-black">
      {/* Barra de Título Superior Nativa/Electron */}
      <TitleBar />

      {/* Conteúdo Principal ou Modal de Login */}
      {!user ? (
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
              <>
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
                  />
                )}

                {activeTab === 'estatisticas' && (
                  <StatsView games={games} />
                )}

                {activeTab === 'perfil' && (
                  <ProfileView
                    user={user}
                    profile={profile}
                    onProfileUpdated={() => loadUserProfile(user.uid, user.email)}
                  />
                )}
              </>
            )}
          </main>
        </>
      )}
    </div>
  );
}
