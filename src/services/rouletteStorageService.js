/**
 * Gamer's Vault - Serviço de Armazenamento da Roleta "Larga de Frescura"
 * Permite adicionar jogos a partir do L.Worder, do Hub, do Backlog ou da Busca.
 */

const ROULETTE_STORAGE_KEY = 'gamervault_larga_de_frescura_items';

export function getRouletteItems() {
  try {
    const raw = localStorage.getItem(ROULETTE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Erro ao ler itens da roleta:', err);
  }
  return [];
}

export function saveRouletteItems(items) {
  try {
    localStorage.setItem(ROULETTE_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('gamervault:roulette-updated', { detail: items }));
  } catch (err) {
    console.error('Erro ao salvar itens da roleta:', err);
  }
}

export function addRouletteItem(game) {
  if (!game || !game.title) return false;
  const current = getRouletteItems();
  const exists = current.some(
    g => (g.id && g.id === game.id) || g.title.toLowerCase().trim() === game.title.toLowerCase().trim()
  );

  if (!exists) {
    const updated = [
      ...current,
      {
        id: game.id || `game_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        title: game.title,
        imageUrl: game.imageUrl || game.background_image || '',
        platform: game.platform || game.platformName || 'PC',
        metacritic: game.metacritic || null,
        rating: game.rating || 0
      }
    ];
    saveRouletteItems(updated);
    return true;
  }
  return false;
}

export function removeRouletteItem(idOrTitle) {
  const current = getRouletteItems();
  const updated = current.filter(
    g => g.id !== idOrTitle && g.title.toLowerCase() !== String(idOrTitle).toLowerCase()
  );
  saveRouletteItems(updated);
}

export function clearRouletteItems() {
  saveRouletteItems([]);
}
