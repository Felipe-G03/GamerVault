import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Trophy, Star, Clock, Calendar, Check, Flame } from 'lucide-react';

export default function HubFinishModal({ game, existingVaultGame, onClose, onConfirm }) {
  const [rating, setRating] = useState(existingVaultGame?.rating || 8.5);
  const [playtime, setPlaytime] = useState(existingVaultGame?.playtime || '');
  const [dateFinished, setDateFinished] = useState(
    existingVaultGame?.dateFinished || new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState(existingVaultGame?.notes || '');
  const [saving, setSaving] = useState(false);

  if (!game) return null;
  if (typeof document === 'undefined') return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: game.title,
        status: 'Finalizado',
        rating: Number(rating) || 0,
        playtime: String(playtime || '0'),
        dateFinished: dateFinished,
        notes: notes,
        imageUrl: game.imageUrl || existingVaultGame?.imageUrl || '',
        genres: game.genres || existingVaultGame?.genres || '',
        platform: game.platform ? game.platform.toUpperCase() : (existingVaultGame?.platform || 'PC'),
        metacritic: game.metacritic || existingVaultGame?.metacritic || null,
        themeUrl: game.themeUrl || existingVaultGame?.themeUrl || null
      };

      await onConfirm(payload, existingVaultGame?.id);
      onClose();
    } catch (err) {
      console.error('Erro ao registrar finalização do jogo:', err);
    } finally {
      setSaving(false);
    }
  };

  // Cores dinâmicas para a nota
  const getRatingColor = (score) => {
    const s = Number(score);
    if (s >= 9.0) return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
    if (s >= 7.5) return 'text-teal-400 border-teal-500/40 bg-teal-500/10';
    if (s >= 6.0) return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/40 bg-rose-500/10';
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md rounded-2xl bg-surface-container border border-border shadow-2xl p-6 text-white space-y-6 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow de fundo */}
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-accent-bright/15 rounded-full blur-3xl pointer-events-none"></div>

        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-gamer font-bold tracking-wide">
                Registrar Conquista
              </h2>
              <p className="text-xs text-gray-400">Mover para jogos Finalizados no Vault</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info do Jogo */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border/60">
          {game.imageUrl ? (
            <img
              src={game.imageUrl}
              alt={game.title}
              className="w-16 h-12 object-cover rounded-lg border border-border shrink-0"
            />
          ) : (
            <div className="w-16 h-12 rounded-lg bg-surface-high border border-border flex items-center justify-center text-xs text-gray-500 shrink-0">
              Capa
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white truncate">{game.title}</h3>
            <span className="text-[11px] font-mono text-accent-bright uppercase tracking-wider">
              {game.platform || 'PC'}
            </span>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nota (1 a 10) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-mono text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-400" />
                <span>Sua Nota:</span>
              </label>
              <span className={`text-sm font-bold px-2 py-0.5 rounded-md border ${getRatingColor(rating)}`}>
                {Number(rating).toFixed(1)} / 10
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="0.5"
              value={rating}
              onChange={(e) => setRating(parseFloat(e.target.value))}
              className="w-full h-2 bg-surface-high rounded-lg appearance-none cursor-pointer accent-accent-bright"
            />
          </div>

          {/* Horas Jogadas & Data */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-gray-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Horas:</span>
              </label>
              <input
                type="number"
                step="0.5"
                placeholder="Ex: 35"
                value={playtime}
                onChange={(e) => setPlaytime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm text-white focus:outline-none focus:border-accent-bright"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-gray-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-cyan-400" />
                <span>Data:</span>
              </label>
              <input
                type="date"
                value={dateFinished}
                onChange={(e) => setDateFinished(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-white focus:outline-none focus:border-accent-bright"
              />
            </div>
          </div>

          {/* Comentário / Review Curta */}
          <div>
            <label className="block text-xs font-mono text-gray-300 uppercase tracking-wider mb-1">
              Opinião Rápida / Resenha (Opcional):
            </label>
            <textarea
              rows={2}
              placeholder="O que achou da experiência?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent-bright resize-none"
            />
          </div>

          {/* Botões */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-high text-xs font-semibold text-gray-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-surface-low text-xs font-gamer font-bold tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all active-press"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'Gravando...' : 'Salvar no Vault'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
