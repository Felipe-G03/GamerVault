const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

// Cache local persistente para evitar chamadas redundantes e economizar cota da API
const CACHE_KEY = 'gamervault_yt_themes_cache';

function getThemeCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveThemeCache(titleKey, url) {
  try {
    const cache = getThemeCache();
    cache[titleKey.toLowerCase().trim()] = url;
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('Erro ao salvar tema no cache local:', e);
  }
}

/**
 * Busca a música tema ou OST de um jogo no YouTube de forma automática e otimizada
 * @param {string} gameTitle - Nome do jogo (ex: "The Legend of Zelda: Link's Awakening")
 * @returns {Promise<string|null>} - Link do vídeo encontrado no YouTube ou null
 */
export async function searchGameTheme(gameTitle) {
  if (!gameTitle || typeof gameTitle !== 'string') return null;

  const normalizedTitle = gameTitle.trim().toLowerCase();

  // 1. Tenta recuperar do cache local primeiro
  const cache = getThemeCache();
  if (cache[normalizedTitle]) {
    return cache[normalizedTitle];
  }

  // 2. Se não houver chave configurada, retorna null
  if (!YOUTUBE_API_KEY) {
    console.warn('VITE_YOUTUBE_API_KEY não configurada no .env');
    return null;
  }

  try {
    // Termo de busca refinado para capturar temas oficiais ou trilhas marcantes
    const query = `${gameTitle} main theme ost`;
    const endpoint = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
      query
    )}&type=video&videoEmbeddable=true&maxResults=1&key=${YOUTUBE_API_KEY}`;

    const response = await fetch(endpoint);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn('YouTube API retornou status:', response.status, errorData);
      return null;
    }

    const data = await response.json();
    const items = data.items || [];

    if (items.length > 0 && items[0].id?.videoId) {
      const videoId = items[0].id.videoId;
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

      // Salva no cache local para nunca mais gastar cota com esse jogo
      saveThemeCache(normalizedTitle, videoUrl);

      return videoUrl;
    }

    return null;
  } catch (error) {
    console.error('Falha ao buscar tema do jogo na API do YouTube:', error);
    return null;
  }
}
