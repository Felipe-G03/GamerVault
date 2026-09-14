/**
 * Utilitário para converter links do Google Drive e outros provedores de imagem
 * em URLs diretas renderizáveis em tags <img> sem bloqueios.
 */

export function convertDriveUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();

  // Se já for uma URL normal de imagem direta ou RAWG
  if (!trimmed.includes('drive.google.com') && !trimmed.includes('drive.usercontent.google.com')) {
    return trimmed;
  }

  // Padrão 1: /file/d/FILE_ID/view ou similar
  const matchFileD = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFileD && matchFileD[1]) {
    return `https://lh3.googleusercontent.com/d/${matchFileD[1]}`;
  }

  // Padrão 2: id=FILE_ID
  const matchId = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) {
    return `https://lh3.googleusercontent.com/d/${matchId[1]}`;
  }

  return trimmed;
}

/**
 * Converte múltiplas linhas de texto com links em um array de URLs convertidas
 */
export function parseScreenshotUrls(text) {
  if (!text) return [];
  if (Array.isArray(text)) {
    return text.map(url => convertDriveUrl(url)).filter(Boolean);
  }
  return text
    .split(/[\n,]+/)
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(url => convertDriveUrl(url));
}
