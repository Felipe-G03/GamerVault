import { searchRawgGames } from '../config/rawg';

/**
 * Definição das plataformas suportadas pelo Hub
 */
export const HUB_PLATFORMS = [
  {
    id: 'steam',
    name: 'Steam',
    subtitle: 'Jogos oficiais da Valve',
    defaultPath: 'C:\\Program Files (x86)\\Steam',
    iconPath: '/platforms/steam.png',
    accentColor: '#38bdf8', // Sky blue
    badgeClass: 'bg-sky-500/10 border-sky-500/30 text-sky-400'
  },
  {
    id: 'epic',
    name: 'Epic Games',
    subtitle: 'Epic Games Launcher',
    defaultPath: 'C:\\ProgramData\\Epic\\EpicGamesLauncher\\Data\\Manifests',
    iconPath: '/platforms/epic.png',
    accentColor: '#cbd5e1', // Slate
    badgeClass: 'bg-slate-500/10 border-slate-500/30 text-slate-300'
  },
  {
    id: 'gamepass',
    name: 'Xbox / Game Pass',
    subtitle: 'Jogos do ecossistema Xbox PC',
    defaultPath: 'C:\\XboxGames',
    iconPath: '/platforms/gamepass.png',
    accentColor: '#22c55e', // Xbox Green
    badgeClass: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
  },
  {
    id: 'ea',
    name: 'EA App',
    subtitle: 'Jogos da Electronic Arts',
    defaultPath: 'C:\\Program Files\\EA Games',
    iconPath: '/platforms/ea.png',
    accentColor: '#ef4444', // Red
    badgeClass: 'bg-red-500/10 border-red-500/30 text-red-400'
  },
  {
    id: 'ubisoft',
    name: 'Ubisoft Connect',
    subtitle: 'Jogos da Ubisoft',
    defaultPath: 'C:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher\\games',
    iconPath: '/platforms/ubisoft.png',
    accentColor: '#06b6d4', // Cyan
    badgeClass: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
  },
  {
    id: 'suspeitos',
    name: 'Suspeitos',
    subtitle: 'Repacks, Standalones & Jogos Manuais',
    defaultPath: 'D:\\Jogos',
    iconPath: '/platforms/suspeitos.png',
    accentColor: '#a855f7', // Neon Purple
    badgeClass: 'bg-purple-500/10 border-purple-500/30 text-purple-400'
  }
];

const PATHS_STORAGE_KEY = 'gamervault_hub_paths';
const COLLAPSE_STORAGE_KEY = 'gamervault_hub_collapses';
const RAWG_CACHE_KEY = 'gamervault_hub_rawg_cache';
const GAMES_STORAGE_PREFIX = 'gamervault_hub_games_';

/**
 * Retorna todos os caminhos configurados pelo usuário
 */
export function getHubConfiguredPaths() {
  try {
    const raw = localStorage.getItem(PATHS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const result = {};
    HUB_PLATFORMS.forEach(p => {
      result[p.id] = parsed[p.id] || p.defaultPath;
    });
    return result;
  } catch (_) {
    const fallback = {};
    HUB_PLATFORMS.forEach(p => {
      fallback[p.id] = p.defaultPath;
    });
    return fallback;
  }
}

/**
 * Salva o caminho customizado de uma plataforma
 */
export function saveHubPlatformPath(platformId, newPath) {
  try {
    const current = getHubConfiguredPaths();
    current[platformId] = newPath;
    localStorage.setItem(PATHS_STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Erro ao salvar caminho do Hub:', e);
  }
}

/**
 * Restaura o caminho padrão de uma plataforma
 */
export function resetHubPlatformPath(platformId) {
  const platform = HUB_PLATFORMS.find(p => p.id === platformId);
  if (platform) {
    saveHubPlatformPath(platformId, platform.defaultPath);
    return platform.defaultPath;
  }
  return '';
}

/**
 * Retorna o estado de recolhimento (sanfona) das coleções
 */
export function getHubCollapsedState() {
  try {
    const raw = localStorage.getItem(COLLAPSE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

/**
 * Salva o estado de recolhimento de uma coleção
 */
export function saveHubCollapsedState(platformId, isCollapsed) {
  try {
    const current = getHubCollapsedState();
    current[platformId] = isCollapsed;
    localStorage.setItem(COLLAPSE_STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Erro ao salvar estado colapsado do Hub:', e);
  }
}

/**
 * Carrega os jogos cacheados localmente para uma plataforma
 */
export function getCachedPlatformGames(platformId) {
  try {
    const raw = localStorage.getItem(GAMES_STORAGE_PREFIX + platformId);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

/**
 * Salva os jogos escaneados de uma plataforma no cache local
 */
export function setCachedPlatformGames(platformId, games) {
  try {
    localStorage.setItem(GAMES_STORAGE_PREFIX + platformId, JSON.stringify(games));
  } catch (e) {
    console.error('Erro ao salvar cache de jogos do Hub:', e);
  }
}

/**
 * Cache de metadados do RAWG para evitar requisições desnecessárias
 */
function getRawgCache() {
  try {
    const raw = localStorage.getItem(RAWG_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

function saveRawgCache(cache) {
  try {
    localStorage.setItem(RAWG_CACHE_KEY, JSON.stringify(cache));
  } catch (_) {}
}

/**
 * Enriquece o jogo com imagem HD e dados do RAWG
 */
export async function enrichGameWithRawg(game) {
  const cache = getRawgCache();
  const cacheKey = (game.title || '').trim().toLowerCase();

  if (cache[cacheKey]) {
    return {
      ...game,
      ...cache[cacheKey],
      imageUrl: cache[cacheKey].imageUrl || game.headerUrl || ''
    };
  }

  // Tenta buscar no RAWG se tiver título
  if (game.title) {
    try {
      const results = await searchRawgGames(game.title, 1);
      if (results && results.length > 0) {
        const topMatch = results[0];
        const enriched = {
          imageUrl: topMatch.imageUrl || game.headerUrl || '',
          screenshots: topMatch.screenshots || (game.headerUrl ? [game.headerUrl] : []),
          genres: topMatch.genres || '',
          rawgRating: topMatch.rating || 0,
          rating: 0,
          metacritic: topMatch.metacritic || null,
          released: topMatch.released || '',
          rawgId: topMatch.id
        };

        cache[cacheKey] = enriched;
        saveRawgCache(cache);

        return {
          ...game,
          ...enriched
        };
      }
    } catch (e) {
      // Ignora erro se não tiver chave RAWG ou estiver sem internet
    }
  }

  // Fallback: se não achou no RAWG mas tem header da Steam
  return {
    ...game,
    imageUrl: game.headerUrl || '',
    screenshots: game.headerUrl ? [game.headerUrl] : [],
    genres: '',
    rawgRating: 0,
    rating: 0,
    metacritic: null
  };
}

/**
 * Executa o escaneamento nativo via Electron e enriquece os jogos encontrados
 */
export async function scanAndEnrichPlatform(platformId, folderPath, onProgress) {
  if (typeof window === 'undefined' || !window.electronAPI?.scanPlatform) {
    console.warn('Electron API indisponível (modo navegador). Retornando cache.');
    return getCachedPlatformGames(platformId);
  }

  // 1. Escaneamento nativo rápido
  const rawGames = await window.electronAPI.scanPlatform({
    platformId,
    folderPath
  });

  if (!rawGames || !Array.isArray(rawGames)) {
    return [];
  }

  // 2. Enriquecimento progressivo com RAWG
  const enrichedGames = [];
  for (let i = 0; i < rawGames.length; i++) {
    const raw = rawGames[i];
    if (onProgress) {
      onProgress(i + 1, rawGames.length, raw.title);
    }
    const full = await enrichGameWithRawg(raw);
    enrichedGames.push(full);
  }

  // Salva no cache local para carregamento instantâneo posterior
  setCachedPlatformGames(platformId, enrichedGames);
  return enrichedGames;
}

/**
 * Dispara o jogo através do Electron
 */
export async function launchGame(game) {
  if (typeof window === 'undefined' || !window.electronAPI?.launchGame) {
    alert(`Modo navegador: comando de iniciar disparado para [${game.title}]`);
    return { success: true };
  }

  return await window.electronAPI.launchGame({
    launchType: game.launchType,
    launchTarget: game.launchTarget
  });
}

/**
 * Atualiza a capa (imageUrl) e/ou trilha sonora (themeUrl) de um jogo no cache do Hub
 */
export function updatePlatformGameMedia(platformId, gameId, { imageUrl, themeUrl }, gameTitle) {
  try {
    const games = getCachedPlatformGames(platformId);
    const targetTitleNorm = (gameTitle || '').trim().toLowerCase();

    let foundTargetTitle = gameTitle || null;

    const updated = games.map(g => {
      const matchId = (gameId && (g.id === gameId || g.hubId === gameId));
      const matchTitle = (targetTitleNorm && g.title?.trim().toLowerCase() === targetTitleNorm);

      if (matchId || matchTitle) {
        if (!foundTargetTitle && g.title) {
          foundTargetTitle = g.title;
        }
        return {
          ...g,
          imageUrl: imageUrl !== undefined ? imageUrl : g.imageUrl,
          themeUrl: themeUrl !== undefined ? themeUrl : g.themeUrl
        };
      }
      return g;
    });

    setCachedPlatformGames(platformId, updated);

    // Também atualiza ou insere no cache geral por título
    const effectiveTitle = foundTargetTitle || gameTitle;
    if (effectiveTitle) {
      const cache = getRawgCache();
      const cacheKey = effectiveTitle.trim().toLowerCase();
      if (!cache[cacheKey]) {
        cache[cacheKey] = {
          imageUrl: imageUrl || '',
          themeUrl: themeUrl || null
        };
      } else {
        if (imageUrl !== undefined) cache[cacheKey].imageUrl = imageUrl;
        if (themeUrl !== undefined) cache[cacheKey].themeUrl = themeUrl;
      }
      saveRawgCache(cache);
    }

    return updated;
  } catch (e) {
    console.error('Erro ao atualizar mídia do jogo no Hub:', e);
    return [];
  }
}

/**
 * Retorna todos os jogos de todas as plataformas instaladas/escaneadas no Hub
 */
export function getAllHubGames() {
  const all = [];
  HUB_PLATFORMS.forEach(p => {
    const list = getCachedPlatformGames(p.id);
    list.forEach(g => {
      all.push({
        ...g,
        platformId: p.id,
        platformName: p.name,
        platformIcon: p.iconPath,
        accentColor: p.accentColor
      });
    });
  });
  return all;
}


