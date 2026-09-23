/**
 * Serviço de Trilha Sonora / BGM do Gamer's Vault
 * Sincroniza dinamicamente com repositório privado do GitHub (pastas como álbuns)
 * Suporta cache local instantâneo, streaming autenticado e modo offline
 */

const STORAGE_CACHE_KEY = 'gamervault_bgm_library_cache';
const CACHE_NAME = 'gamervault_audio_blob_cache_v1';

// Embaralha faixas com Fisher-Yates
export function shuffleTracks(tracks) {
  const arr = [...tracks];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Limpa nome de arquivo para exibição amigável como título
export function formatTrackTitle(filename) {
  return filename
    .replace(/\.[^/.]+$/, '') // remove extensão
    .replace(/^\d+[-._\s]*/, '') // remove prefixos numéricos (ex: 01., 1-01.)
    .replace(/[._]/g, ' ')
    .trim();
}

/**
 * Retorna as configurações do GitHub a partir das variáveis de ambiente
 */
export function getGitHubConfig() {
  const repo = (import.meta.env.VITE_GITHUB_TRACKS_REPO || '').trim();
  const token = (import.meta.env.VITE_GITHUB_TRACKS_TOKEN || '').trim();
  return { repo, token };
}

/**
 * Carrega a biblioteca de músicas salva no cache local para reprodução imediata (zero delay)
 */
export function getCachedLibrary() {
  try {
    const saved = localStorage.getItem(STORAGE_CACHE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.allTracks) && parsed.allTracks.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Erro ao ler cache de BGM:', e);
  }

  // Fallback padrão inicial
  return {
    collections: ['All'],
    tracksByCollection: {
      All: []
    },
    allTracks: []
  };
}

/**
 * Salva a biblioteca no cache local
 */
export function saveCachedLibrary(libraryData) {
  try {
    localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(libraryData));
  } catch (e) {
    console.error('Erro ao salvar cache de BGM:', e);
  }
}

/**
 * Faz fetch autenticado no GitHub para listar conteúdo de uma pasta
 */
async function fetchGitHubContents(repo, path = '', token = '') {
  const cleanRepo = repo.replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
  const url = `https://api.github.com/repos/${cleanRepo}/contents/${path}`;

  const headers = {
    Accept: 'application/vnd.github.v3+json'
  };

  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`GitHub API erro ${res.status}: ${res.statusText}`);
  }

  return await res.json();
}

/**
 * Escaneia o repositório do GitHub e monta as coleções com base nas pastas
 */
export async function syncGitHubTracks() {
  const { repo, token } = getGitHubConfig();
  if (!repo) {
    return getCachedLibrary();
  }

  try {
    const rootItems = await fetchGitHubContents(repo, '', token);
    if (!Array.isArray(rootItems)) return getCachedLibrary();

    const collections = ['All'];
    const tracksByCollection = { All: [] };
    const allTracks = [];
    let idCounter = 1;

    // Função auxiliar para processar arquivos de áudio
    const isAudioFile = (name) => /\.(mp3|m4a|aac|ogg|wav|webm|opus)$/i.test(name);

    for (const item of rootItems) {
      if (item.type === 'dir') {
        const folderName = item.name.trim();
        const folderDisplayName = folderName.charAt(0).toUpperCase() + folderName.slice(1);

        try {
          const files = await fetchGitHubContents(repo, item.path, token);
          if (Array.isArray(files)) {
            const folderTracks = [];

            for (const file of files) {
              if (file.type === 'file' && isAudioFile(file.name)) {
                const trackObj = {
                  id: idCounter++,
                  title: formatTrackTitle(file.name),
                  artist: folderDisplayName,
                  collection: folderDisplayName,
                  rawName: file.name,
                  downloadUrl: file.download_url,
                  apiUrl: file.url,
                  gitUrl: file.git_url
                };

                folderTracks.push(trackObj);
                allTracks.push(trackObj);
              }
            }

            if (folderTracks.length > 0) {
              if (!collections.includes(folderDisplayName)) {
                collections.push(folderDisplayName);
              }
              tracksByCollection[folderDisplayName] = folderTracks;
            }
          }
        } catch (subErr) {
          console.warn(`Erro ao ler pasta ${item.path}:`, subErr);
        }
      } else if (item.type === 'file' && isAudioFile(item.name)) {
        // Arquivo solto na raiz do repositório (vai direto para All)
        const trackObj = {
          id: idCounter++,
          title: formatTrackTitle(item.name),
          artist: 'GamerVault',
          collection: 'All',
          rawName: item.name,
          downloadUrl: item.download_url,
          apiUrl: item.url,
          gitUrl: item.git_url
        };
        allTracks.push(trackObj);
      }
    }

    tracksByCollection['All'] = allTracks;

    const libraryData = {
      collections,
      tracksByCollection,
      allTracks
    };

    saveCachedLibrary(libraryData);
    return libraryData;
  } catch (err) {
    console.warn('Erro ao sincronizar músicas do GitHub, usando cache local:', err);
    return getCachedLibrary();
  }
}

/**
 * Obtém URL reproduzível para o áudio:
 * 1. Verifica se já está no Cache do navegador (zero download)
 * 2. Se não estiver, baixa autenticado pelo token e salva no cache
 */
export async function getPlayableAudioUrl(track) {
  if (!track) return null;

  // Se for caminho local simples
  if (track.src) return track.src;

  const { token } = getGitHubConfig();
  const trackKey = track.downloadUrl || track.apiUrl;

  if (!trackKey) return null;

  try {
    // 1. Tenta carregar do Cache API do navegador
    if (typeof caches !== 'undefined') {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(trackKey);
      if (cachedResponse) {
        const blob = await cachedResponse.blob();
        return URL.createObjectURL(blob);
      }
    }

    // 2. Faz o download autenticado se for repositório privado
    const headers = {};
    let requestUrl = track.downloadUrl;

    if (token) {
      // Para repositórios privados, a API direta com accept: application/vnd.github.v3.raw baixa o binário autenticado
      if (track.apiUrl) {
        requestUrl = track.apiUrl;
        headers['Authorization'] = `token ${token}`;
        headers['Accept'] = 'application/vnd.github.v3.raw';
      } else {
        headers['Authorization'] = `token ${token}`;
      }
    }

    const response = await fetch(requestUrl, { headers });
    if (!response.ok) {
      throw new Error(`Falha ao obter áudio: ${response.status}`);
    }

    // Clona e salva no cache para as próximas vezes
    if (typeof caches !== 'undefined') {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(trackKey, response.clone());
      } catch (_) {}
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (err) {
    console.error(`Erro ao carregar áudio ${track.title}:`, err);
    // Fallback para URL direta
    return track.downloadUrl || null;
  }
}
