/**
 * Gamer's Vault - Serviço de Tradução Resiliente e Gratuita
 * Traduz textos e sinopses do RAWG para Português (PT-BR) de forma gratuita,
 * rápida e sem necessidade de chave de API, utilizando cascata de fallbacks.
 */

const MEMORY_TRANSLATION_CACHE = new Map();

/**
 * Fatie uma string longa em pedaços seguros para URL
 */
function splitIntoSafeChunks(text, maxLength = 1000) {
  if (text.length <= maxLength) return [text];

  const chunks = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Tenta quebrar em quebra dupla de linha, quebra simples ou ponto
    let splitIdx = remaining.lastIndexOf('\n\n', maxLength);
    if (splitIdx === -1 || splitIdx < maxLength * 0.4) {
      splitIdx = remaining.lastIndexOf('\n', maxLength);
    }
    if (splitIdx === -1 || splitIdx < maxLength * 0.4) {
      splitIdx = remaining.lastIndexOf('. ', maxLength);
      if (splitIdx !== -1) splitIdx += 1;
    }
    if (splitIdx === -1 || splitIdx < maxLength * 0.4) {
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
 * Valida se o texto retornado é uma tradução válida e não um erro em HTML
 */
function isValidTranslation(result, original) {
  if (!result || typeof result !== 'string') return false;
  const trimmed = result.trim();
  if (!trimmed) return false;
  if (trimmed.includes('<html') || trimmed.includes('<!DOCTYPE') || trimmed.includes('<title>Sorry')) {
    return false;
  }
  // Se for idêntico ao original (e tiver mais de 15 caracteres), provavelmente não traduziu
  if (original && original.length > 15 && trimmed.toLowerCase() === original.trim().toLowerCase()) {
    return false;
  }
  return true;
}

/**
 * Traduz um único pedaço de texto usando cascata de provedores gratuitos
 */
async function translateChunkWithCascade(chunk, targetLang = 'pt') {
  const trimmed = chunk.trim();
  if (!trimmed) return '';

  // 1. Provedor Primário: Google Client dict-chrome-ex (altíssima taxa de sucesso e sem bloqueio 429 gtx)
  try {
    const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=${targetLang}&q=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        let textResult = '';
        if (typeof data[0] === 'string') {
          textResult = data[0];
        } else if (Array.isArray(data[0]) && typeof data[0][0] === 'string') {
          textResult = data[0][0];
        }
        if (isValidTranslation(textResult, trimmed)) {
          return textResult;
        }
      }
    }
  } catch (e) {
    // Falha silenciosa, segue para próximo fallback
  }

  // 2. Provedor Secundário: MyMemory API Pública
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=auto|${targetLang}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.responseStatus === 200 && data.responseData?.translatedText) {
        const textResult = data.responseData.translatedText;
        if (isValidTranslation(textResult, trimmed)) {
          return textResult;
        }
      }
    }
  } catch (e) {
    // Falha silenciosa
  }

  // 3. Provedor Terciário: Google GTX clássico
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const textResult = data[0]
          .map((seg) => (Array.isArray(seg) ? seg[0] || '' : ''))
          .join('');
        if (isValidTranslation(textResult, trimmed)) {
          return textResult;
        }
      }
    }
  } catch (e) {
    // Falha silenciosa
  }

  return null;
}

/**
 * Traduz um texto para o idioma desejado (padrão: pt)
 * @param {string} text Texto a traduzir
 * @param {string} targetLang Idioma de destino (default 'pt')
 * @returns {Promise<string|null>} Texto traduzido ou null em caso de falha completa
 */
export async function translateText(text, targetLang = 'pt') {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Cria chave de cache estável
  const cacheKey = `${targetLang}_${trimmed.length}_${trimmed.slice(0, 60)}`;

  // 1. Verifica cache em memória
  if (MEMORY_TRANSLATION_CACHE.has(cacheKey)) {
    const cached = MEMORY_TRANSLATION_CACHE.get(cacheKey);
    if (isValidTranslation(cached, trimmed)) {
      return cached;
    }
    MEMORY_TRANSLATION_CACHE.delete(cacheKey);
  }

  // 2. Verifica localStorage com validação de integridade
  const storageKey = `gv_trans_${cacheKey.slice(0, 45)}`;
  try {
    const localSaved = localStorage.getItem(storageKey);
    if (localSaved) {
      if (isValidTranslation(localSaved, trimmed)) {
        MEMORY_TRANSLATION_CACHE.set(cacheKey, localSaved);
        return localSaved;
      }
      // Se era lixo de cache anterior (ex: texto em inglês salvo por erro), remove
      localStorage.removeItem(storageKey);
    }
  } catch (e) {
    // LocalStorage indisponível
  }

  try {
    const chunks = splitIntoSafeChunks(trimmed, 1000);
    const translatedChunks = [];

    for (const chunk of chunks) {
      if (!chunk.trim()) continue;
      const chunkResult = await translateChunkWithCascade(chunk, targetLang);
      if (chunkResult) {
        translatedChunks.push(chunkResult);
      } else {
        // Se um pedaço falhou, usa o original para manter a coerência geral
        translatedChunks.push(chunk);
      }
    }

    const fullTranslation = translatedChunks.join('\n\n');

    // Só considera sucesso se o texto resultante for de fato diferente do original
    if (isValidTranslation(fullTranslation, trimmed)) {
      MEMORY_TRANSLATION_CACHE.set(cacheKey, fullTranslation);

      try {
        localStorage.setItem(storageKey, fullTranslation);
      } catch (e) {
        // Cota de localStorage cheia
      }

      return fullTranslation;
    }

    return null;
  } catch (err) {
    console.warn('Falha na tradução automática:', err);
    return null;
  }
}

/**
 * Limpa todo o cache de traduções do localStorage
 */
export function clearTranslationCache() {
  MEMORY_TRANSLATION_CACHE.clear();
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('gv_trans_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (e) {}
}
