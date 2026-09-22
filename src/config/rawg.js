/**
 * Cliente da API do RAWG
 */

export function getRawgApiKey() {
  const envKey = import.meta.env.VITE_RAWG_API_KEY;
  if (envKey && envKey !== 'your_rawg_api_key') return envKey;
  return localStorage.getItem('gamervault_rawg_key') || '';
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

/**
 * Busca jogos para a aba Explorar/Sugestões com filtros curados
 * @param {'best_year' | 'popular_year' | 'top_250'} category 
 * @param {object} options { year: number, page: number, pageSize: number }
 */
export async function getRawgDiscoverGames(category = 'best_year', { year = new Date().getFullYear(), page = 1, pageSize = 25 } = {}) {
  const key = getRawgApiKey();
  if (!key) {
    throw new Error('Chave da API RAWG não configurada.');
  }

  // Busca uma quantidade maior na API para podermos filtrar shovelware e projetos caseiros sem comunidade
  const fetchSize = category === 'top_250' ? pageSize : Math.min(pageSize * 2, 50);
  let queryParams = `key=${key}&page=${page}&page_size=${fetchSize}`;

  if (category === 'best_year') {
    queryParams += `&dates=${year}-01-01,${year}-12-31&ordering=-rating`;
  } else if (category === 'popular_year') {
    queryParams += `&dates=${year}-01-01,${year}-12-31&ordering=-added`;
  } else if (category === 'top_250') {
    queryParams += `&ordering=-metacritic&metacritic=80,100`;
  }

  const url = `https://api.rawg.io/api/games?${queryParams}`;
  const res = await fetch(url);

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Erro na API RAWG (${res.status})`);
  }

  const data = await res.json();
  const rawResults = data.results || [];

  // Filtro de Qualidade:
  // 1. Deve ter imagem de capa real (elimina a maioria dos asset flips e cadastros incompletos)
  // 2. Em categorias anuais, exige um engajamento mínimo na RAWG (added >= 30) para evitar jogos com apenas 1 voto 5 estrelas
  const filtered = rawResults.filter(g => {
    if (!g.background_image) return false;
    if (category === 'best_year' && (g.added || 0) < 30) return false;
    return true;
  });

  return {
    count: data.count || 0,
    results: filtered.slice(0, pageSize).map(g => ({
      id: g.id,
      title: g.name,
      imageUrl: g.background_image || '',
      metacritic: g.metacritic || null,
      released: g.released || '',
      genres: (g.genres || []).map(genre => genre.name).join(', '),
      genre_slugs: (g.genres || []).map(genre => genre.slug),
      tags: (g.tags || []).slice(0, 30).map(t => t.slug),
      rating: g.rating || 0,
      playtime: g.playtime || 0,
      added: g.added || 0,
      platforms: (g.platforms || []).map(p => p.platform?.name).filter(Boolean).join(', '),
      screenshots: (g.short_screenshots || []).map(s => s.image).filter(Boolean)
    }))
  };
}

/**
 * Busca trailers oficiais de um jogo fornecidos na base do RAWG (sem consumir YouTube API)
 * @param {number|string} id 
 * @returns {Promise<Array<{ id: number, name: string, preview: string, data: { 480: string, max: string } }>>}
 */
export async function getRawgGameTrailers(id) {
  const key = getRawgApiKey();
  if (!key || !id) return [];

  try {
    const url = `https://api.rawg.io/api/games/${id}/movies?key=${key}`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    return data.results || [];
  } catch (e) {
    console.warn('Erro ao buscar trailers no RAWG:', e);
    return [];
  }
}

