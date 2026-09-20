import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Compara duas versões semânticas (ex: "2.1.0" > "2.0.0")
 * Retorna:
 *  1 se v1 > v2
 * -1 se v1 < v2
 *  0 se v1 === v2
 */
export function compareVersions(v1, v2) {
  if (!v1 || !v2) return 0;
  
  // Limpa prefixos como "v" (ex: "v2.1.0" -> "2.1.0")
  const clean1 = String(v1).replace(/^v/i, '').trim();
  const clean2 = String(v2).replace(/^v/i, '').trim();

  const parts1 = clean1.split('.').map(p => parseInt(p, 10) || 0);
  const parts2 = clean2.split('.').map(p => parseInt(p, 10) || 0);

  const maxLen = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  return 0;
}

/**
 * Checa no Firestore se existe uma versão mais recente cadastrada em /config/app
 * @param {string} currentVersion - Versão atual rodando no app (ex: "2.0.0")
 * @returns {Promise<{ hasUpdate: boolean, latestVersion: string, downloadUrl: string, changelog: string, releaseDate: string } | null>}
 */
export async function checkAppUpdate(currentVersion = '2.0.0') {
  if (!db) {
    console.warn('[UpdateChecker] Firebase DB não inicializado.');
    return null;
  }

  try {
    console.log(`[UpdateChecker] Verificando se há atualizações para a versão atual: v${currentVersion}...`);
    const configRef = doc(db, 'config', 'app');
    const snap = await getDoc(configRef);

    if (!snap.exists()) {
      console.warn('[UpdateChecker] Documento config/app não foi encontrado no Firestore.');
      return null;
    }

    const data = snap.data();
    const latestVersion = data.latestVersion || data.version;
    const downloadUrl = data.downloadUrl;
    const changelog = data.changelog || '';
    const releaseDate = data.releaseDate || '';

    console.log('[UpdateChecker] Dados encontrados no Firestore:', { latestVersion, downloadUrl });

    if (!latestVersion) {
      console.warn('[UpdateChecker] Campo latestVersion vazio no documento config/app.');
      return null;
    }

    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;
    console.log(`[UpdateChecker] Comparação: latest(${latestVersion}) > current(${currentVersion})? -> ${hasUpdate}`);

    return {
      hasUpdate,
      latestVersion,
      currentVersion,
      downloadUrl,
      changelog,
      releaseDate
    };
  } catch (error) {
    console.error('[UpdateChecker] Erro ao buscar documento config/app no Firestore:', error);
    return null;
  }
}
