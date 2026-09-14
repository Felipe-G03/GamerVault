/**
 * Cliente da API do RAWG
 */

export function getRawgApiKey() {
  const envKey = import.meta.env.VITE_RAWG_API_KEY;
  if (envKey && envKey !== 'your_rawg_api_key') return envKey;
  return localStorage.getItem('gamervault_rawg_key') || '';
}

export function saveRawgApiKey(key) {
  localStorage.setItem('gamervault_rawg_key', key.trim());
}

export async function searchRawgGames(query, page = 1) {
  const key = getRawgApiKey();
  if (!key) {
    throw new Error('Chave da API RAWG não configurada.');
  }

  const url = `https://api.rawg.io/api/games?key=${key}&search=${encodeURIComponent(query)}&page=${page}&page_size=16`;
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Erro na API RAWG (${res.status})`);
  }

  const data = await res.json();
  return data.results.map(g => ({
    id: g.id,
    title: g.name,
    imageUrl: g.background_image || '',
    metacritic: g.metacritic || null,
    released: g.released || '',
    genres: (g.genres || []).map(genre => genre.name).join(', '),
    genre_slugs: (g.genres || []).map(genre => genre.slug),
    tags: (g.tags || []).slice(0, 30).map(t => t.slug),
    rating: g.rating || 0
  }));
}

export async function getRawgGameDetails(id) {
  const key = getRawgApiKey();
  if (!key) throw new Error('Chave da API RAWG não configurada.');

  const url = `https://api.rawg.io/api/games/${id}?key=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao buscar detalhes do jogo (${res.status})`);

  const g = await res.json();
  return {
    id: g.id,
    title: g.name,
    imageUrl: g.background_image || '',
    description: g.description_raw || '',
    metacritic: g.metacritic || null,
    released: g.released || '',
    playtimeAverage: g.playtime || 0,
    genres: (g.genres || []).map(genre => genre.name).join(', '),
    genre_slugs: (g.genres || []).map(genre => genre.slug),
    tags: (g.tags || []).slice(0, 40).map(t => t.slug)
  };
}
