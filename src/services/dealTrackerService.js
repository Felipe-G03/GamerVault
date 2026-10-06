/**
 * Gamer's Vault - Deal Tracker Service
 * Gerencia o monitoramento e lista de desejos de preços rastreados pelo usuário.
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const STORAGE_KEY = 'gamervault_tracked_deals';

export function getLocalTrackedDeals() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

export function saveLocalTrackedDeals(deals) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(deals));
  } catch (_) {}
}

/**
 * Obtém todos os jogos rastreados (local com sync no Firestore)
 */
export async function getTrackedDeals(userId) {
  const local = getLocalTrackedDeals();
  if (!db || !userId) return local;

  try {
    const docRef = doc(db, 'users', userId, 'config', 'trackedDeals');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const remoteDeals = snap.data().deals || [];
      // Mescla priorizando o mais recente
      const mergedMap = new Map();
      local.forEach(d => mergedMap.set(d.id, d));
      remoteDeals.forEach(d => mergedMap.set(d.id, { ...mergedMap.get(d.id), ...d }));
      const merged = Array.from(mergedMap.values());
      saveLocalTrackedDeals(merged);
      return merged;
    }
  } catch (err) {
    console.warn('Erro ao carregar jogos rastreados do Firestore:', err);
  }

  return local;
}

/**
 * Adiciona um jogo ao monitoramento de preços
 */
export async function trackGameDeal(deal, targetPrice = null, userId = null) {
  const current = getLocalTrackedDeals();
  const exists = current.find(d => d.id === deal.id || d.title.toLowerCase() === deal.title.toLowerCase());

  const newEntry = {
    id: deal.id || `tracked-${Date.now()}`,
    title: deal.title,
    coverUrl: deal.coverUrl || deal.imageUrl || '',
    currentPrice: deal.currentPrice || 0,
    regularPrice: deal.regularPrice || 0,
    targetPrice: targetPrice ? Number(targetPrice) : null,
    initialPrice: deal.currentPrice || 0,
    store: deal.store || { name: 'Steam' },
    historyLow: deal.historyLow || null,
    trackedAt: new Date().toISOString(),
    storesComparison: deal.storesComparison || []
  };

  let updated;
  if (exists) {
    updated = current.map(d => (d.id === exists.id ? { ...d, ...newEntry } : d));
  } else {
    updated = [newEntry, ...current];
  }

  saveLocalTrackedDeals(updated);

  if (db && userId) {
    try {
      const docRef = doc(db, 'users', userId, 'config', 'trackedDeals');
      await setDoc(docRef, { deals: updated, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (e) {
      console.warn('Erro ao sincronizar rastreamento no Firestore:', e);
    }
  }

  return updated;
}

/**
 * Remove um jogo do monitoramento
 */
export async function untrackGameDeal(dealId, userId = null) {
  const current = getLocalTrackedDeals();
  const updated = current.filter(d => d.id !== dealId);
  saveLocalTrackedDeals(updated);

  if (db && userId) {
    try {
      const docRef = doc(db, 'users', userId, 'config', 'trackedDeals');
      await setDoc(docRef, { deals: updated, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (e) {
      console.warn('Erro ao sincronizar remoção no Firestore:', e);
    }
  }

  return updated;
}

/**
 * Verifica se um jogo está sendo rastreado
 */
export function isDealTracked(dealId, dealTitle = '') {
  const current = getLocalTrackedDeals();
  return current.some(d => d.id === dealId || (dealTitle && d.title?.toLowerCase() === dealTitle.toLowerCase()));
}
