/**
 * Gamer's Vault - Serviço de Tradução Gratuita
 * Traduz textos e sinopses do RAWG para Português (PT-BR) de forma gratuita,
 * rápida e sem necessidade de chave de API.
 */

const MEMORY_TRANSLATION_CACHE = new Map();

/**
 * Fatie uma string longa em pedaços seguros para URL
 */
function splitIntoSafeChunks(text, maxLength = 1400) {
  if (text.length <= maxLength) return [text];

  const chunks = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Tenta quebrar em quebra de linha ou ponto
    let splitIdx = remaining.lastIndexOf('\n', maxLength);
    if (splitIdx === -1 || splitIdx < maxLength * 0.5) {
      splitIdx = remaining.lastIndexOf('. ', maxLength);
      if (splitIdx !== -1) splitIdx += 1;
    }
    if (splitIdx === -1 || splitIdx < maxLength * 0.5) {
      splitIdx = remaining.lastIndexOf(' ', maxLength);
    }
    if (splitIdx === -1) {
      splitIdx = maxLength;
    }

    chunks.push(remaining.slice(0, splitIdx).trim());
    remaining = remaining.slice(splitIdx).trim();
  }

  return chunks.filter(Boolean);
}

/**
 * Traduz um texto para o idioma desejado (padrão: pt)
 * @param {string} text Texto a traduzir
 * @param {string} targetLang Idioma de destino (default 'pt')
 * @returns {Promise<string>} Texto traduzido
 */
export async function translateText(text, targetLang = 'pt') {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();
  if (!trimmed) return '';

  // Cria chave de cache baseada nos primeiros e últimos caracteres + tamanho
  const cacheKey = `${targetLang}_${trimmed.length}_${trimmed.slice(0, 60)}`;

  if (MEMORY_TRANSLATION_CACHE.has(cacheKey)) {
    return MEMORY_TRANSLATION_CACHE.get(cacheKey);
  }

  // Tenta recuperar do localStorage para economizar requisições entre sessões
  try {
    const localSaved = localStorage.getItem(`gv_trans_${cacheKey.slice(0, 45)}`);
    if (localSaved) {
      MEMORY_TRANSLATION_CACHE.set(cacheKey, localSaved);
      return localSaved;
    }
  } catch (e) {
    // LocalStorage indisponível
  }

  try {
    const chunks = splitIntoSafeChunks(trimmed, 1400);
    const translatedChunks = [];

    for (const chunk of chunks) {
      if (!chunk.trim()) continue;

      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(chunk)}`;
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`Serviço de tradução indisponível (${res.status})`);
      }

      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const chunkResult = data[0]
          .map((segment) => (Array.isArray(segment) ? segment[0] || '' : ''))
          .join('');
        translatedChunks.push(chunkResult);
      } else {
        translatedChunks.push(chunk);
      }
    }

    const fullTranslation = translatedChunks.join(' ');
    MEMORY_TRANSLATION_CACHE.set(cacheKey, fullTranslation);

    try {
      localStorage.setItem(`gv_trans_${cacheKey.slice(0, 45)}`, fullTranslation);
    } catch (e) {
      // Limite de cota do localStorage atingido
    }

    return fullTranslation;
  } catch (err) {
    console.warn('Falha na tradução automática, mantendo texto original:', err);
    return text;
  }
}
