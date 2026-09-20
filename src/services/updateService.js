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
  if (!db) return null;

  try {
    const configRef = doc(db, 'config', 'app');
    const snap = await getDoc(configRef);

    if (!snap.exists()) {
      return null;
    }

    const data = snap.data();
    const latestVersion = data.latestVersion || data.version;
    const downloadUrl = data.downloadUrl;
    const changelog = data.changelog || '';
    const releaseDate = data.releaseDate || '';

    if (!latestVersion) {
      return null;
    }

    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;

    return {
      hasUpdate,
      latestVersion,
      currentVersion,
      downloadUrl,
      changelog,
      releaseDate
    };
  } catch (error) {
    console.warn('Não foi possível verificar atualizações no momento:', error);
    return null;
  }
}
