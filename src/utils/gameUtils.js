/**
 * Utilitários centralizados para status e classificação de jogos
 */

/**
 * Retorna se o status corresponde à lista de desejos / backlog / quero jogar
 * @param {string} status 
 * @returns {boolean}
 */
export function isWishlist(status) {
  if (!status) return false;
  const s = String(status).toLowerCase().trim();
  return s.includes('desejo') || s.includes('quero') || s.includes('backlog');
}

/**
 * Retorna se o status corresponde a um jogo dropado / abandonado
 * @param {string} status 
 * @returns {boolean}
 */
export function isDropped(status) {
  if (!status) return false;
  const s = String(status).toLowerCase().trim();
  return s.includes('drop') || s.includes('abandon');
}

/**
 * Retorna se o status corresponde a um jogo finalizado/zerado
 * @param {string} status 
 * @param {string} [dateFinished]
 * @returns {boolean}
 */
export function isFinished(status, dateFinished = null) {
  if (!status) return Boolean(dateFinished);
  const s = String(status).toLowerCase().trim();
  if (isWishlist(s) || isDropped(s) || s === 'jogando') return false;
  return s.includes('finalizado') || s.includes('zerado') || s.includes('conclu');
}
