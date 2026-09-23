import React, { useState, useEffect, useMemo } from 'react';
import {
  Gamepad2,
  FolderOpen,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  Plus,
  Settings,
  Zap,
  Flame,
  Skull,
  Compass,
  LayoutGrid,
  Layers,
  Globe
} from 'lucide-react';
import {
  HUB_PLATFORMS,
  getHubConfiguredPaths,
  getHubCollapsedState,
  saveHubCollapsedState,
  getCachedPlatformGames,
  scanAndEnrichPlatform,
  launchGame,
  enrichGameWithRawg,
  setCachedPlatformGames,
  updatePlatformGameMedia
} from '../../services/hubService';
import HubCard from './HubCard';
import HubFolderModal from './HubFolderModal';
import HubFinishModal from './HubFinishModal';
import GameExpandedModal from '../vault/GameExpandedModal';
import GameMediaModal from '../common/GameMediaModal';
import PlatformIcon from '../common/PlatformIcon';

export default function HubView({ games = [], onAddGame, onUpdateGame, userId }) {
  // Configurações de caminhos de cada plataforma
  const [platformPaths, setPlatformPaths] = useState(getHubConfiguredPaths());

  // Estados de sanfona (aberta / fechada) por plataforma
  const [collapsedMap, setCollapsedMap] = useState(getHubCollapsedState());

  // Jogos escaneados agrupados por plataforma
  const [platformGames, setPlatformGames] = useState({});

  // Estados de carregamento / escaneamento
  const [scanningMap, setScanningMap] = useState({});
  const [globalScanning, setGlobalScanning] = useState(false);
  const [scanProgressText, setScanProgressText] = useState('');

  // Busca e Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' (padrão inicial) | 'accordions'

  // Modais
  const [folderModalPlatform, setFolderModalPlatform] = useState(null);
  const [finishModalGame, setFinishModalGame] = useState(null);
  const [selectedExpandedGame, setSelectedExpandedGame] = useState(null);
  const [customizingMediaGame, setCustomizingMediaGame] = useState(null);

  // Salva alteração de capa e/ou música personalizada
  const handleSaveMedia = async (mediaData = {}) => {
    const imageUrl = mediaData?.imageUrl;
    const themeUrl = mediaData?.themeUrl;
    const targetGame = mediaData?.game || customizingMediaGame?.game || selectedExpandedGame;
    const targetVaultGame =
      mediaData?.vaultGame ||
      customizingMediaGame?.vaultGame ||
      (targetGame?.title ? vaultGamesByTitle[(targetGame.title || '').trim().toLowerCase()] : null);

    if (!targetGame) return;

    const gameId = targetGame.hubId || targetGame.id;
    const gameTitle = targetGame.title;
    const platform = targetGame.platform;

    // 1. Atualiza no cache do Hub e no estado React para a plataforma
    if (platform) {
      const updatedList = updatePlatformGameMedia(platform, gameId, { imageUrl, themeUrl }, gameTitle);
      setPlatformGames(prev => ({ ...prev, [platform]: updatedList }));
    } else {
      // Se não houver plataforma identificada, atualiza em todas que tiverem o jogo
      setPlatformGames(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(pId => {
          next[pId] = updatePlatformGameMedia(pId, gameId, { imageUrl, themeUrl }, gameTitle);
        });
        return next;
      });
    }

    // 2. Se o jogo já estiver no Vault do usuário, atualiza no Firestore
    if (targetVaultGame?.id && onUpdateGame) {
      await onUpdateGame(targetVaultGame.id, {
        ...(imageUrl !== undefined ? { imageUrl } : {}),
        ...(themeUrl !== undefined ? { themeUrl } : {})
      });
    }

    // 3. Atualiza o modal expandido se estiver com ele aberto
    setSelectedExpandedGame(prev => {
      if (!prev) return null;
      return {
        ...prev,
        imageUrl: imageUrl !== undefined ? imageUrl : prev.imageUrl,
        themeUrl: themeUrl !== undefined ? themeUrl : prev.themeUrl
      };
    });

    setCustomizingMediaGame(null);
  };

  // Carrega os jogos do cache local de cada plataforma ao abrir a tela
  useEffect(() => {
    const initialGames = {};
    HUB_PLATFORMS.forEach(p => {
      initialGames[p.id] = getCachedPlatformGames(p.id);
    });
    setPlatformGames(initialGames);

    // Se estiver tudo vazio (primeira vez que abre o Hub), dispara escaneamento inicial
    const totalCached = Object.values(initialGames).reduce((acc, list) => acc + (list?.length || 0), 0);
    if (totalCached === 0 && window.electronAPI?.scanPlatform) {
      handleScanAll();
    }
  }, []);

  // Alterna o estado de abertura/fechamento da sanfona
  const toggleCollapse = (platformId) => {
    const nextState = !collapsedMap[platformId];
    const updated = { ...collapsedMap, [platformId]: nextState };
    setCollapsedMap(updated);
    saveHubCollapsedState(platformId, nextState);
  };

  // Escaneia uma plataforma específica
  const handleScanPlatform = async (platformId) => {
    if (scanningMap[platformId]) return;
    setScanningMap(prev => ({ ...prev, [platformId]: true }));

    const folderPath = platformPaths[platformId];
    try {
      const results = await scanAndEnrichPlatform(platformId, folderPath, (current, total, title) => {
        setScanProgressText(`${current}/${total}: ${title}`);
      });
      setPlatformGames(prev => ({ ...prev, [platformId]: results }));
    } catch (err) {
      console.error(`Erro ao escanear ${platformId}:`, err);
    } finally {
      setScanningMap(prev => ({ ...prev, [platformId]: false }));
      setScanProgressText('');
    }
  };

  // Escaneia todas as plataformas em sequência
  const handleScanAll = async () => {
    if (globalScanning) return;
    setGlobalScanning(true);

    try {
      for (const platform of HUB_PLATFORMS) {
        setScanningMap(prev => ({ ...prev, [platform.id]: true }));
        const folderPath = platformPaths[platform.id];
        try {
          const results = await scanAndEnrichPlatform(platform.id, folderPath, (cur, tot, t) => {
            setScanProgressText(`[${platform.name}] ${cur}/${tot}: ${t}`);
          });
          setPlatformGames(prev => ({ ...prev, [platform.id]: results }));
        } catch (e) {
          console.warn(`Erro no escaneamento de ${platform.id}:`, e);
        } finally {
          setScanningMap(prev => ({ ...prev, [platform.id]: false }));
        }
      }
    } finally {
      setGlobalScanning(false);
      setScanProgressText('');
    }
  };

  // Adicionar um jogo individual manualmente ("Suspeitos" / .exe)
  const handleAddManualGame = async () => {
    try {
      if (window.electronAPI?.selectFile) {
        const filePath = await window.electronAPI.selectFile();
        if (filePath) {
          const fileName = filePath.split(/[\\/]/).pop().replace(/\.exe$/i, '');
          const rawGame = {
            id: `suspeitos_manual_${Date.now()}`,
            title: fileName,
            platform: 'suspeitos',
            launchType: 'exe',
            launchTarget: filePath
          };

          const enriched = await enrichGameWithRawg(rawGame);
          const currentSuspeitos = platformGames['suspeitos'] || [];
          const updated = [enriched, ...currentSuspeitos];
          setPlatformGames(prev => ({ ...prev, suspeitos: updated }));
          setCachedPlatformGames('suspeitos', updated);
        }
      } else {
        alert('Disponível no app Desktop para selecionar executáveis (.exe).');
      }
    } catch (e) {
      console.error('Erro ao adicionar executável manual:', e);
    }
  };

  // Atualização do caminho de uma plataforma
  const handlePathUpdated = (platformId, newPath) => {
    setPlatformPaths(prev => ({ ...prev, [platformId]: newPath }));
    handleScanPlatform(platformId);
  };

  // Disparo do jogo: pausa música de fundo e minimiza a janela
  const handleLaunchGame = async (game) => {
    // 1. Pausa a música de trilha sonora de fundo do GamerVault
    window.dispatchEvent(new CustomEvent('gamervault:pause-bgm'));

    // 2. Dispara o jogo
    const res = await launchGame(game);
    if (!res?.success && res?.error) {
      alert(`Não foi possível iniciar o jogo: ${res.error}`);
      return;
    }

    // 3. Minimiza o aplicativo Electron para o jogo ficar em tela cheia/foco
    if (window.electronAPI?.minimizeWindow) {
      window.electronAPI.minimizeWindow();
    }
  };

  // Mapeamento rápido dos jogos existentes no Vault do usuário pelo título normalizado
  const vaultGamesByTitle = useMemo(() => {
    const map = {};
    games.forEach(g => {
      if (g.title) {
        const norm = g.title.trim().toLowerCase();
        map[norm] = g;
      }
    });
    return map;
  }, [games]);

  // Ação de Finalizei: abre modal de nota/horas
  const handleFinishClick = (game, vaultGame) => {
    setFinishModalGame({ game, vaultGame });
  };

  // Confirmação de Finalizei
  const handleConfirmFinish = async (payload, existingId) => {
    if (existingId && onUpdateGame) {
      await onUpdateGame(existingId, payload);
    } else if (onAddGame) {
      await onAddGame(payload);
    }
  };

  // Ação de Dropei direto
  const handleDropClick = async (game, vaultGame) => {
    if (confirm(`Deseja marcar "${game.title}" como Dropado / Abandonado no Vault?`)) {
      const payload = {
        title: game.title,
        status: 'Dropado',
        imageUrl: game.imageUrl || vaultGame?.imageUrl || '',
        genres: game.genres || vaultGame?.genres || '',
        platform: game.platform ? game.platform.toUpperCase() : (vaultGame?.platform || 'PC'),
        notes: vaultGame?.notes || 'Abandonado pelo Hub'
      };

      if (vaultGame?.id && onUpdateGame) {
        await onUpdateGame(vaultGame.id, payload);
      } else if (onAddGame) {
        await onAddGame(payload);
      }
    }
  };

  // Total de jogos somados em todas as plataformas
  const totalGamesCount = useMemo(() => {
    return Object.values(platformGames).reduce((acc, list) => acc + (list?.length || 0), 0);
  }, [platformGames]);

  // Lista unificada de todos os jogos para o modo "Grade Unificada"
  const allUnifiedGames = useMemo(() => {
    const list = [];
    HUB_PLATFORMS.forEach(p => {
      if (selectedPlatformFilter === 'all' || selectedPlatformFilter === p.id) {
        const gList = platformGames[p.id] || [];
        list.push(...gList);
      }
    });

    if (searchTerm) {
      return list.filter(g => g.title?.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return list;
  }, [platformGames, selectedPlatformFilter, searchTerm]);

  // Plataformas a serem renderizadas no modo sanfona
  const visiblePlatforms = useMemo(() => {
    if (selectedPlatformFilter === 'all') return HUB_PLATFORMS;
    return HUB_PLATFORMS.filter(p => p.id === selectedPlatformFilter);
  }, [selectedPlatformFilter]);



  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-in fade-in duration-300">
      {/* Top Banner / Header do Hub */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-surface-container via-surface to-surface-low border border-border/80 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-32 bg-accent-bright/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent-bright/15 border border-accent-bright/30 text-accent-bright shadow-[0_0_15px_rgba(61,214,155,0.3)]">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-gamer font-extrabold tracking-wider text-white flex items-center gap-3">
                <span>Gamer's Hub</span>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-accent-bright/20 border border-accent-bright/40 text-accent-bright">
                  v2.2.1
                </span>
              </h1>
              <p className="text-xs text-gray-400 font-sans">
                Seu centro unificado de lançamento e rastreamento de jogos no PC
              </p>
            </div>
          </div>
        </div>

        {/* Ações Globais: Escanear Tudo & Adicionar Manual */}
        <div className="flex items-center gap-2.5 z-10 flex-wrap">
          <button
            onClick={handleAddManualGame}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-high hover:bg-surface border border-border hover:border-purple-500/60 text-xs font-gamer font-bold text-white tracking-wide transition-all shadow-sm active-press"
            title="Selecionar um executável (.exe) de jogo independente ou repack"
          >
            <Plus className="w-4 h-4 text-purple-400" />
            <span>+ Jogo Manual (.exe)</span>
          </button>

          <button
            onClick={handleScanAll}
            disabled={globalScanning}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-accent-bright hover:bg-accent-bright/90 text-surface-low text-xs font-gamer font-bold tracking-wider shadow-neon-green transition-all active-press disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${globalScanning ? 'animate-spin' : ''}`} />
            <span>{globalScanning ? 'Escaneando PC...' : 'Escanear Todas'}</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros de Plataforma (Pills no Topo) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none select-none">
        <button
          onClick={() => setSelectedPlatformFilter('all')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-gamer font-bold tracking-wide transition-all whitespace-nowrap active-press ${
            selectedPlatformFilter === 'all'
              ? 'bg-accent-bright text-surface-low shadow-neon-green'
              : 'bg-surface hover:bg-surface-high border border-border text-gray-300'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Todas ({totalGamesCount})</span>
        </button>

        {HUB_PLATFORMS.map((platform) => {
          const count = platformGames[platform.id]?.length || 0;
          const isSelected = selectedPlatformFilter === platform.id;

          return (
            <button
              key={platform.id}
              onClick={() => setSelectedPlatformFilter(platform.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-gamer font-bold tracking-wide transition-all whitespace-nowrap active-press border ${
                isSelected
                  ? 'bg-surface-high border-accent-bright text-white shadow-sm'
                  : 'bg-surface hover:bg-surface-high border-border text-gray-300'
              }`}
            >
              <PlatformIcon platformId={platform.id} size="sm" />
              <span>{platform.name}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-gray-400">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Controles: Busca, Alternador de Modo (Sanfona vs Grade) e Total */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Campo de Busca */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar jogo no Hub..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface border border-border text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent-bright transition-all"
          />
        </div>

        {/* Alternador de Modo de Exibição */}
        <div className="flex items-center gap-3">
          {scanProgressText && (
            <span className="text-xs font-mono text-accent-bright truncate max-w-xs animate-pulse">
              {scanProgressText}
            </span>
          )}

          <div className="flex items-center gap-1 p-1 rounded-xl bg-surface border border-border">
            <button
              onClick={() => setViewMode('accordions')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                viewMode === 'accordions'
                  ? 'bg-accent-bright/20 border border-accent-bright/40 text-accent-bright font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Organizar em Coleções Retráteis"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Coleções</span>
            </button>

            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                viewMode === 'grid'
                  ? 'bg-accent-bright/20 border border-accent-bright/40 text-accent-bright font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Mostrar todos os jogos em Grade Unificada"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Grade Todos</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODO 1: GRADE UNIFICADA (Tudo em uma só tela) */}
      {viewMode === 'grid' ? (
        <section className="space-y-4">
          {allUnifiedGames.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 sm:gap-5 animate-in fade-in duration-200">
              {allUnifiedGames.map((game) => {
                const normTitle = (game.title || '').trim().toLowerCase();
                const vaultGame = vaultGamesByTitle[normTitle];

                return (
                  <HubCard
                    key={game.id}
                    game={game}
                    vaultGame={vaultGame}
                    onLaunch={handleLaunchGame}
                    onCustomizeMedia={(g, vg) => {
                      setCustomizingMediaGame({ game: g, vaultGame: vg });
                    }}
                    onCardClick={(g, vg) => {
                      setSelectedExpandedGame({
                        ...g,
                        ...vg,
                        id: vg?.id || g.id,
                        hubId: g.id,
                        platform: g.platform || vg?.platform,
                        title: g.title,
                        imageUrl: g.imageUrl || vg?.imageUrl || '',
                        themeUrl: vg?.themeUrl || g.themeUrl || null,
                        rating: vg ? Number(vg.rating) || 0 : 0
                      });
                    }}
                  />
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center text-gray-400 text-xs font-mono">
              Nenhum jogo encontrado com os filtros atuais.
            </div>
          )}
        </section>
      ) : (
        /* MODO 2: COLEÇÕES EM SANFONA RETRÁTIL (Estilo 2025/2026) */
        <div className="space-y-5">
          {visiblePlatforms.map((platform) => {
            const isCollapsed = collapsedMap[platform.id] || false;
            const isScanning = scanningMap[platform.id] || false;
            const gamesList = platformGames[platform.id] || [];

            const filteredGames = gamesList.filter(g =>
              !searchTerm || g.title?.toLowerCase().includes(searchTerm.toLowerCase())
            );

            return (
              <section
                key={platform.id}
                className="rounded-2xl border border-border bg-surface-low/50 overflow-hidden shadow-sm transition-all"
              >
                {/* Cabeçalho da Sanfona */}
                <div
                  onClick={() => toggleCollapse(platform.id)}
                  className="flex items-center justify-between p-3.5 bg-gradient-to-r from-surface-container via-surface to-surface-low hover:bg-surface-high/60 border-b border-border/60 cursor-pointer select-none transition-colors group"
                >
                  {/* Esquerda: Linha colorida + Ícone + Título + Contagem */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-1.5 h-7 rounded-full shadow-sm shrink-0"
                      style={{ backgroundColor: platform.accentColor }}
                    ></div>

                    <PlatformIcon platformId={platform.id} size="lg" />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-sm sm:text-base font-gamer font-bold text-white tracking-wide group-hover:text-accent-bright transition-colors">
                          {platform.name}
                        </h2>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${platform.badgeClass}`}>
                          {filteredGames.length} {filteredGames.length === 1 ? 'jogo' : 'jogos'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Direita: Botões de Configurar, Escanear e Seta */}
                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setFolderModalPlatform(platform)}
                      className="p-1.5 rounded-lg bg-surface hover:bg-surface-high border border-border hover:border-accent-bright/60 text-gray-400 hover:text-white transition-all active-press"
                      title="Configurar pasta de jogos desta coleção"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleScanPlatform(platform.id)}
                      disabled={isScanning}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-high border border-border hover:border-accent-bright/60 text-[11px] font-mono text-gray-300 hover:text-white transition-all active-press disabled:opacity-50"
                      title="Escanear apenas esta pasta"
                    >
                      <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin text-accent-bright' : ''}`} />
                      <span className="hidden sm:inline">{isScanning ? 'Lendo...' : 'Escanear'}</span>
                    </button>

                    <button
                      onClick={() => toggleCollapse(platform.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-white transition-colors"
                    >
                      {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Grade de Cards Densos (Visível quando expandido) */}
                {!isCollapsed && (
                  <div className="p-3.5 sm:p-5">
                    {filteredGames.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 sm:gap-5 animate-in fade-in duration-200">
                        {filteredGames.map((game) => {
                          const normTitle = (game.title || '').trim().toLowerCase();
                          const vaultGame = vaultGamesByTitle[normTitle];

                          return (
                            <HubCard
                              key={game.id}
                              game={game}
                              vaultGame={vaultGame}
                              onLaunch={handleLaunchGame}
                              onCustomizeMedia={(g, vg) => {
                                setCustomizingMediaGame({ game: g, vaultGame: vg });
                              }}
                              onCardClick={(g, vg) => {
                                setSelectedExpandedGame({
                                  ...g,
                                  ...vg,
                                  id: vg?.id || g.id,
                                  hubId: g.id,
                                  platform: g.platform || vg?.platform,
                                  title: g.title,
                                  imageUrl: g.imageUrl || vg?.imageUrl || '',
                                  themeUrl: vg?.themeUrl || g.themeUrl || null,
                                  rating: vg ? Number(vg.rating) || 0 : 0
                                });
                              }}
                            />
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-6 rounded-xl border border-dashed border-border/80 text-center space-y-2.5 bg-surface/30">
                        <FolderOpen className="w-8 h-8 text-gray-500" />
                        <div className="space-y-0.5">
                          <p className="text-xs font-gamer font-bold text-gray-300">
                            Nenhum jogo encontrado em {platform.name}
                          </p>
                          <p className="text-[11px] text-gray-400 font-sans max-w-md">
                            Certifique-se de que a pasta configurada está correta ou aponte outro diretório.
                          </p>
                        </div>
                        <button
                          onClick={() => setFolderModalPlatform(platform)}
                          className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-high border border-border hover:border-accent-bright text-[11px] font-gamer font-bold text-accent-bright transition-all"
                        >
                          Configurar Pasta
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Modal de Configurar Pasta */}
      {folderModalPlatform && (
        <HubFolderModal
          platform={folderModalPlatform}
          currentPath={platformPaths[folderModalPlatform.id]}
          onClose={() => setFolderModalPlatform(null)}
          onPathUpdated={handlePathUpdated}
        />
      )}

      {/* Modal de Concluir / Finalizei Jogo */}
      {finishModalGame && (
        <HubFinishModal
          game={finishModalGame.game}
          existingVaultGame={finishModalGame.vaultGame}
          onClose={() => setFinishModalGame(null)}
          onConfirm={handleConfirmFinish}
        />
      )}

      {/* Modal de Detalhes Expandidos (Com Trilha Sonora do YouTube e Ações Completas) */}
      {selectedExpandedGame && (
        <GameExpandedModal
          game={selectedExpandedGame}
          onClose={() => setSelectedExpandedGame(null)}
          onLaunch={handleLaunchGame}
          onFinish={(g) => {
            const norm = (g.title || '').trim().toLowerCase();
            const vg = vaultGamesByTitle[norm];
            handleFinishClick(g, vg);
          }}
          onDrop={(g) => {
            const norm = (g.title || '').trim().toLowerCase();
            const vg = vaultGamesByTitle[norm];
            handleDropClick(g, vg);
          }}
          onEdit={async (updated) => {
            const norm = (updated.title || '').trim().toLowerCase();
            const vg = vaultGamesByTitle[norm];
            await handleSaveMedia({
              imageUrl: updated.imageUrl,
              themeUrl: updated.themeUrl,
              game: updated,
              vaultGame: vg
            });
            setSelectedExpandedGame(prev => ({
              ...prev,
              ...updated
            }));
          }}
          onDelete={() => {}}
        />
      )}

      {/* Modal de Personalizar Capa & Trilha Sonora */}
      {customizingMediaGame && (
        <GameMediaModal
          game={{
            ...customizingMediaGame.game,
            ...customizingMediaGame.vaultGame,
            imageUrl: customizingMediaGame.game.imageUrl || customizingMediaGame.vaultGame?.imageUrl || '',
            themeUrl: customizingMediaGame.vaultGame?.themeUrl || customizingMediaGame.game.themeUrl || ''
          }}
          onClose={() => setCustomizingMediaGame(null)}
          onSave={handleSaveMedia}
        />
      )}
    </div>
  );
}
