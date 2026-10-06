/**
 * Gamer's Vault - IsThereAnyDeal (ITAD) & Steam Specials Service
 * Rastreamento de preços, promoções reais e menor preço histórico no Brasil (BRL).
 */

const ITAD_API_BASE = 'https://api.isthereanydeal.com';
const ITAD_API_KEY = import.meta.env.VITE_ITAD_API_KEY || import.meta.env.ITAD_API_KEY || '73498c58b1fd26b07e02bbc980d73726e71304e6';

// Lojas Oficiais Autorizadas relevantes no Brasil
export const POPULAR_SHOPS = [
  { id: 'all', name: 'Todas as Lojas Autorizadas', color: 'bg-surface' },
  { id: 61, slug: 'steam', name: 'Steam', badgeColor: 'bg-sky-500/20 text-sky-400 border-sky-500/40' },
  { id: 50, slug: 'nuuvem', name: 'Nuuvem', badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
  { id: 16, slug: 'epic', name: 'Epic Game Store', badgeColor: 'bg-zinc-700/40 text-zinc-300 border-zinc-500/40' },
  { id: 36, slug: 'gmg', name: 'Green Man Gaming', badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
  { id: 62, slug: 'ubisoft', name: 'Ubisoft Store', badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { id: 48, slug: 'microsoft', name: 'Microsoft Store', badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40' },
  { id: 6, slug: 'fanatical', name: 'Fanatical', badgeColor: 'bg-orange-500/20 text-orange-400 border-orange-500/40' },
  { id: 35, slug: 'gog', name: 'GOG.com', badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  { id: 37, slug: 'humble', name: 'Humble Store', badgeColor: 'bg-red-500/20 text-red-400 border-red-500/40' },
];

// Palavras-chave de shovelware/DLC que poluem a loja
const SHOVELWARE_BLOCKLIST = [
  'ost', 'soundtrack', 'dlc', 'pack', 'skin', 'artbook', 'wallpaper',
  'fantasy grounds', 'rpg maker', 'train simulator', 'livery', 'add-on',
  'costume', 'season pass', 'expansion pack', 'avatar', 'content pack',
  'elearning', 'certification', 'course', 'masterclass', 'bundle',
  'hentai', 'sexy', 'waifu', 'puzzle 18+', 'playtest', 'demo version'
];

function isLegitGame(item) {
  if (!item || !item.title) return false;
  // Exige estritamente que seja jogo completo (bloqueia dlc, package, ost, demo, null)
  if (item.type !== 'game') return false;

  const titleLower = item.title.toLowerCase();
  for (const word of SHOVELWARE_BLOCKLIST) {
    if (titleLower.includes(word)) return false;
  }

  // Jogos comerciais relevantes no Brasil têm preço regular decente.
  // Ignora jogos de centavos (a menos que seja 100% grátis/giveaway oficial)
  const regular = item.deal?.regular?.amount ?? 0;
  const cut = item.deal?.cut ?? 0;
  if (cut < 100 && regular < 15) {
    return false;
  }

  return true;
}

function mapItadItemToDeal(item) {
  const deal = item.deal || {};
  const regularPrice = deal.regular?.amount || 0;
  const currentPrice = deal.price?.amount || 0;
  const cut = deal.cut || 0;
  const historyLowPrice = deal.historyLow?.amount || currentPrice;
  const isHistoricalLow = currentPrice <= historyLowPrice && cut > 0;

  const coverUrl = item.assets?.banner600 || 
                   item.assets?.banner400 || 
                   item.assets?.banner300 || 
                   item.assets?.boxart || 
                   '';

  return {
    id: item.id,
    slug: item.slug || item.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    title: item.title,
    type: 'game',
    coverUrl,
    currentPrice,
    regularPrice,
    cut,
    store: {
      id: deal.shop?.id,
      name: deal.shop?.name || 'Loja Oficial',
      url: deal.url || '#'
    },
    historyLow: {
      price: historyLowPrice,
      store: deal.historyLow?.shop?.name || deal.shop?.name || 'Loja',
      date: 'Histórico'
    },
    isHistoricalLow,
    storesComparison: [
      {
        name: deal.shop?.name || 'Oferta Principal',
        price: currentPrice,
        regularPrice,
        cut,
        url: deal.url || '#'
      }
    ]
  };
}

/**
 * Busca os grandes sucessos em promoção oficial da Steam (Red Dead 2, Cyberpunk, Skyrim, etc.)
 */
export async function fetchSteamSpecials() {
  try {
    const res = await fetch('https://store.steampowered.com/api/featuredcategories/?cc=br&l=brazilian');
    if (!res.ok) throw new Error('Steam specials API failed');

    const data = await res.json();
    const specials = data.specials?.items || [];
    const topSellers = (data.top_sellers?.items || []).filter(i => i.discount_percent > 0);

    const mergedMap = new Map();
    [...specials, ...topSellers].forEach(item => {
      if (!mergedMap.has(item.id)) {
        const currentPrice = (item.final_price || 0) / 100;
        const regularPrice = (item.original_price || item.final_price || 0) / 100;
        const cut = item.discount_percent || 0;

        mergedMap.set(item.id, {
          id: `steam-${item.id}`,
          slug: item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          title: item.name,
          type: 'game',
          coverUrl: item.header_image || item.large_capsule_image,
          currentPrice,
          regularPrice,
          cut,
          store: {
            id: 61,
            name: 'Steam',
            url: `https://store.steampowered.com/app/${item.id}/`
          },
          historyLow: {
            price: currentPrice,
            store: 'Steam',
            date: 'Hoje'
          },
          isHistoricalLow: cut >= 50,
          storesComparison: [
            {
              name: 'Steam',
              price: currentPrice,
              regularPrice,
              cut,
              url: `https://store.steampowered.com/app/${item.id}/`
            }
          ]
        });
      }
    });

    return Array.from(mergedMap.values());
  } catch (err) {
    console.warn('Erro ao buscar Steam specials:', err);
    return [];
  }
}

// Pool de dados em memória por filtro para garantir paginação contínua e ZERO DUPLICATAS
const dealsPool = new Map();

/**
 * Limpa o pool em memória quando filtros mudam
 */
export function clearDealsPool() {
  dealsPool.clear();
}

/**
 * Busca ofertas paginadas com pool cumulativo: NUNCA repete jogos entre páginas
 */
export async function fetchDeals({ 
  page = 1, 
  pageSize = 36, 
  sort = 'popular', 
  storeId = 'all',
  curated = true
} = {}) {
  const poolKey = `pool_${curated ? 'curated' : 'all'}_${sort}_${storeId}`;
  let entry = dealsPool.get(poolKey);

  if (!entry) {
    entry = {
      items: [],
      nextOffset: 0,
      hasMoreRemote: true,
      existingTitles: new Set()
    };
    dealsPool.set(poolKey, entry);
  }

  const neededCount = page * pageSize;

  // Busca mais jogos do backend até preencher a quantidade necessária para a página solicitada
  while (entry.items.length < neededCount && entry.hasMoreRemote) {
    try {
      // No modo curado (ou popular), carrega os specials consagrados da Steam se a loja for 'all' ou 'steam'
      if (entry.nextOffset === 0 && (storeId === 'all' || storeId === 61 || storeId === '61')) {
        const specials = await fetchSteamSpecials();
        specials.forEach(s => {
          const t = s.title.toLowerCase().trim();
          if (!entry.existingTitles.has(t)) {
            entry.existingTitles.add(t);
            entry.items.push(s);
          }
        });
      }

      const itadShops = (storeId && storeId !== 'all') ? storeId : '61,50,16,36,62,48,6,35,37';
      // No modo curado, usamos 'rank' (baseado nos jogos mais prestigiados e avaliados do mundo)
      let itadSort = 'rank';
      if (!curated) {
        itadSort = sort === 'popular' ? 'trending' : sort;
      }

      const fetchLimit = 100;
      const itadUrl = `${ITAD_API_BASE}/deals/v2?key=${ITAD_API_KEY}&country=BR&offset=${entry.nextOffset}&limit=${fetchLimit}&sort=${itadSort}&shops=${itadShops}&nondeals=false`;

      const response = await fetch(itadUrl);
      if (!response.ok) {
        entry.hasMoreRemote = false;
        break;
      }

      const json = await response.json();
      const rawList = json.list || [];
      entry.hasMoreRemote = json.hasMore ?? (rawList.length >= fetchLimit);
      entry.nextOffset = json.nextOffset || (entry.nextOffset + fetchLimit);

      // Filtra Shovelware / DLCs
      const cleanList = rawList
        .filter(isLegitGame)
        .map(mapItadItemToDeal);

      cleanList.forEach(item => {
        const t = item.title.toLowerCase().trim();
        if (!entry.existingTitles.has(t)) {
          entry.existingTitles.add(t);
          entry.items.push(item);
        }
      });

      // No modo curado, se o usuário selecionou menor preço ou maior desconto,
      // reordena a lista dos jogos consagrados para trazer as melhores pechinchas
      if (curated) {
        if (sort === '-cut') {
          entry.items.sort((a, b) => (b.cut || 0) - (a.cut || 0));
        } else if (sort === 'price') {
          entry.items.sort((a, b) => (a.currentPrice || 0) - (b.currentPrice || 0));
        }
      }

      if (rawList.length === 0) {
        entry.hasMoreRemote = false;
        break;
      }
    } catch (err) {
      console.warn('Erro ao carregar lote cumulativo de ofertas:', err);
      entry.hasMoreRemote = false;
      break;
    }
  }

  // Pega estritamente a fatia da página solicitada
  const startIndex = (page - 1) * pageSize;
  const pageDeals = entry.items.slice(startIndex, startIndex + pageSize);

  return {
    deals: pageDeals,
    hasMore: entry.items.length > (startIndex + pageSize) || entry.hasMoreRemote,
    totalLoaded: entry.items.length,
    page
  };
}

/**
 * Pesquisa promoções de QUALQUER jogo por termo/nome usando Steam Storefront + ITAD
 */
export async function searchGameDeals(query) {
  if (!query || query.trim().length === 0) return [];
  const normalizedQuery = query.toLowerCase().trim();
  const foundGames = [];
  const titlesSeen = new Set();

  try {
    // 1. Busca direta na Store da Steam (retorna franquias famosas na hora em R$)
    const steamSearchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(normalizedQuery)}&cc=br&l=brazilian`;
    const steamRes = await fetch(steamSearchUrl);
    if (steamRes.ok) {
      const steamData = await steamRes.json();
      (steamData.items || []).forEach(item => {
        const currentPrice = item.price ? item.price.final / 100 : 0;
        const regularPrice = item.price ? item.price.initial / 100 : currentPrice;
        const cut = regularPrice > 0 ? Math.round(((regularPrice - currentPrice) / regularPrice) * 100) : 0;

        titlesSeen.add(item.name.toLowerCase().trim());
        foundGames.push({
          id: `steam-${item.id}`,
          slug: item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          title: item.name,
          type: 'game',
          coverUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${item.id}/header.jpg`,
          currentPrice,
          regularPrice,
          cut,
          store: {
            id: 61,
            name: 'Steam',
            url: `https://store.steampowered.com/app/${item.id}/`
          },
          historyLow: {
            price: currentPrice,
            store: 'Steam',
            date: 'Hoje'
          },
          isHistoricalLow: cut >= 50,
          storesComparison: [
            {
              name: 'Steam',
              price: currentPrice,
              regularPrice,
              cut,
              url: `https://store.steampowered.com/app/${item.id}/`
            }
          ]
        });
      });
    }

    // 2. Complementa com a busca do ITAD para pegar Nuuvem, Epic, GMG, etc.
    try {
      const itadSearchUrl = `${ITAD_API_BASE}/games/search/v1?key=${ITAD_API_KEY}&title=${encodeURIComponent(normalizedQuery)}`;
      const itadRes = await fetch(itadSearchUrl);
      if (itadRes.ok) {
        const itadData = await itadRes.json();
        const topItad = (itadData || []).filter(isLegitGame).slice(0, 10);
        const ids = topItad.map(g => g.id);

        if (ids.length > 0) {
          const pricesUrl = `${ITAD_API_BASE}/games/prices/v2?key=${ITAD_API_KEY}&country=BR`;
          const pricesRes = await fetch(pricesUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ids)
          });

          if (pricesRes.ok) {
            const pricesData = await pricesRes.json();
            topItad.forEach(game => {
              if (titlesSeen.has(game.title.toLowerCase().trim())) return;

              const priceEntry = pricesData.find(p => p.id === game.id);
              const deals = priceEntry?.deals || [];
              deals.sort((a, b) => (a.price?.amount || 999999) - (b.price?.amount || 999999));
              const bestDeal = deals[0] || null;

              if (bestDeal) {
                const currentPrice = bestDeal.price?.amount ?? 0;
                const regularPrice = bestDeal.regular?.amount ?? currentPrice;
                const cut = bestDeal.cut ?? 0;
                const historyLowPrice = bestDeal.historyLow?.amount ?? currentPrice;

                foundGames.push({
                  id: game.id,
                  slug: game.slug,
                  title: game.title,
                  type: 'game',
                  coverUrl: game.assets?.banner600 || game.assets?.banner400 || '',
                  currentPrice,
                  regularPrice,
                  cut,
                  store: {
                    name: bestDeal.shop?.name || 'Loja Oficial',
                    url: bestDeal.url || '#'
                  },
                  historyLow: {
                    price: historyLowPrice,
                    store: bestDeal.shop?.name || 'Histórico',
                    date: 'Mínima Registrada'
                  },
                  isHistoricalLow: currentPrice <= historyLowPrice && cut > 0,
                  storesComparison: deals.map(d => ({
                    name: d.shop?.name || 'Loja',
                    price: d.price?.amount || 0,
                    regularPrice: d.regular?.amount || 0,
                    cut: d.cut || 0,
                    url: d.url || '#'
                  }))
                });
              }
            });
          }
        }
      }
    } catch (_) {}

    return foundGames;
  } catch (e) {
    console.warn('Erro na busca unificada:', e);
    return [];
  }
}

/**
 * Busca a comparação completa de preços em TODAS as lojas oficiais (com desconto ou preço normal)
 */
export async function fetchGamePriceComparison(deal) {
  if (!deal) return [];

  try {
    let itadId = deal.id;

    // Se o ID for sintético da Steam (ex: steam-1234), pesquisa pelo título na ITAD para obter o UUID
    if (!itadId || itadId.startsWith('steam-')) {
      const cleanTitle = deal.title?.replace(/[^\w\s-]/g, '').trim();
      const searchRes = await fetch(`${ITAD_API_BASE}/games/search/v1?key=${ITAD_API_KEY}&title=${encodeURIComponent(cleanTitle || deal.title)}`);
      if (searchRes.ok) {
        const searchList = await searchRes.json();
        if (searchList && searchList.length > 0) {
          itadId = searchList[0].id;
        }
      }
    }

    if (!itadId || itadId.startsWith('steam-')) {
      return deal.storesComparison || [{
        name: deal.store?.name || 'Steam',
        price: deal.currentPrice,
        regularPrice: deal.regularPrice,
        cut: deal.cut,
        url: deal.store?.url || '#'
      }];
    }

    // Consulta preços de TODAS as plataformas com nondeals=true (inclui lojas mesmo se estiver a preço cheio)
    const pricesRes = await fetch(`${ITAD_API_BASE}/games/prices/v2?key=${ITAD_API_KEY}&country=BR&nondeals=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([itadId])
    });

    if (!pricesRes.ok) {
      return deal.storesComparison || [];
    }

    const pricesData = await pricesRes.json();
    const rawDeals = pricesData[0]?.deals || [];

    // Deduplica lojas mantendo o melhor preço por plataforma
    const shopMap = new Map();
    rawDeals.forEach(d => {
      const sName = d.shop?.name;
      if (!sName) return;
      const price = d.price?.amount ?? 0;
      const regularPrice = d.regular?.amount ?? price;
      const cut = d.cut ?? 0;
      const url = d.url || '#';

      if (!shopMap.has(sName) || shopMap.get(sName).price > price) {
        shopMap.set(sName, {
          name: sName,
          price,
          regularPrice,
          cut,
          url
        });
      }
    });

    // Se a loja original do deal não estiver listada por algum motivo, adiciona
    if (deal.store?.name && !shopMap.has(deal.store.name)) {
      shopMap.set(deal.store.name, {
        name: deal.store.name,
        price: deal.currentPrice,
        regularPrice: deal.regularPrice,
        cut: deal.cut,
        url: deal.store.url || '#'
      });
    }

    // Ordena do menor preço para o maior
    return Array.from(shopMap.values()).sort((a, b) => a.price - b.price);
  } catch (err) {
    console.warn('Erro ao buscar comparativo completo de lojas:', err);
    return deal.storesComparison || [];
  }
}

/**
 * Formata moeda para padrão Real Brasileiro (R$ XX,XX)
 */
export function formatBRL(value) {
  if (typeof value !== 'number' || isNaN(value)) return 'R$ --';
  if (value === 0) return 'GRÁTIS';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
