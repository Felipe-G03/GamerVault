import React, { useState } from 'react';
import {
  X,
  Disc3,
  Play,
  Pause,
  Shuffle,
  Search,
  Music2,
  Folder,
  Volume2,
  Sparkles,
  RefreshCw
} from 'lucide-react';

export default function BgmFloatingCard({
  isOpen,
  onClose,
  collections = ['All'],
  selectedCollection = 'All',
  onSelectCollection,
  tracks = [],
  currentTrack,
  isPlaying,
  isShuffle,
  onToggleShuffle,
  onPlayTrack,
  onTogglePlay,
  onSyncGithub,
  isSyncing
}) {
  const [searchFilter, setSearchFilter] = useState('');

  if (!isOpen) return null;

  const filteredTracks = tracks.filter((t) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      t.title?.toLowerCase().includes(term) ||
      t.artist?.toLowerCase().includes(term) ||
      t.collection?.toLowerCase().includes(term)
    );
  });

  return (
    <div
      className="fixed top-12 right-4 sm:right-6 z-[9999] w-[340px] sm:w-[380px] max-h-[80vh] flex flex-col rounded-2xl bg-surface-container/95 border border-border/80 shadow-[0_20px_50px_rgba(0,0,0,0.85),_0_0_20px_rgba(61,214,155,0.15)] backdrop-blur-xl text-white select-none animate-in fade-in slide-in-from-top-3 duration-250 overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Header do Card */}
      <div className="p-3.5 border-b border-border/60 bg-surface/90 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-accent-bright/15 text-accent-bright border border-accent-bright/30">
            <Music2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-gamer font-bold text-xs tracking-wider text-white flex items-center gap-1.5">
              <span>Trilhas Sonoras</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-surface-high border border-border text-accent-bright font-normal">
                EA Trax
              </span>
            </h3>
            <p className="text-[10px] text-gray-400 font-mono">
              {tracks.length} {tracks.length === 1 ? 'música' : 'músicas'} disponíveis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Botão de Shuffle / Aleatório */}
          <button
            onClick={onToggleShuffle}
            className={`p-1.5 rounded-lg transition-all active:scale-90 ${
              isShuffle
                ? 'bg-accent-bright/20 border border-accent-bright/50 text-accent-bright shadow-neon-green'
                : 'text-gray-400 hover:text-white hover:bg-surface'
            }`}
            title={isShuffle ? 'Modo Aleatório: ATIVADO' : 'Modo Aleatório: DESATIVADO'}
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>

          {/* Sincronizar com GitHub */}
          {onSyncGithub && (
            <button
              onClick={onSyncGithub}
              disabled={isSyncing}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface transition-all active:scale-90 disabled:opacity-50"
              title="Sincronizar músicas do GitHub agora"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-accent-bright' : ''}`} />
            </button>
          )}

          {/* Fechar */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface transition-colors"
            title="Fechar Lista"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Faixa Atual em Destaque */}
      {currentTrack && (
        <div className="p-3 bg-gradient-to-r from-accent-bright/10 via-surface to-surface border-b border-border/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              onClick={onTogglePlay}
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 cursor-pointer transition-transform hover:scale-105 active:scale-95 ${
                isPlaying
                  ? 'bg-accent-bright text-surface-low shadow-neon-green'
                  : 'bg-surface-high border border-border text-gray-400'
              }`}
              title={isPlaying ? 'Pausar' : 'Tocar'}
            >
              {isPlaying ? (
                <Disc3 className="w-4 h-4 animate-spin" style={{ animationDuration: '3s' }} />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono text-accent-bright font-bold uppercase tracking-wider">
                  Tocando Agora
                </span>
                {isPlaying && (
                  <div className="flex items-end gap-0.5 h-2">
                    <span className="w-0.5 bg-accent-bright animate-eq-1" />
                    <span className="w-0.5 bg-accent-bright animate-eq-2" />
                    <span className="w-0.5 bg-accent-bright animate-eq-3" />
                  </div>
                )}
              </div>
              <h4 className="text-xs font-gamer font-bold text-white truncate" title={currentTrack.title}>
                {currentTrack.title}
              </h4>
              <p className="text-[10px] text-gray-400 truncate">
                {currentTrack.artist || currentTrack.collection}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Abas de Coleções / Álbuns (Horizontal Scroll) */}
      <div className="px-3 pt-2.5 pb-2 border-b border-border/40 bg-surface/50">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {collections.map((col) => {
            const isSelected = selectedCollection === col;
            return (
              <button
                key={col}
                onClick={() => onSelectCollection(col)}
                className={`px-3 py-1 rounded-full text-xs font-mono font-semibold whitespace-nowrap transition-all active:scale-95 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-accent-bright text-surface-low shadow-neon-green font-bold'
                    : 'bg-surface hover:bg-surface-high border border-border text-gray-300 hover:text-white'
                }`}
              >
                {col === 'All' ? (
                  <Sparkles className="w-3 h-3" />
                ) : (
                  <Folder className="w-3 h-3 opacity-70" />
                )}
                <span>{col === 'All' ? 'All (Todas)' : col}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Campo de Busca de Músicas */}
      <div className="p-2.5 border-b border-border/30 bg-surface/30">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder={`Buscar em ${selectedCollection}...`}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent-bright font-mono transition-colors"
          />
          {searchFilter && (
            <button
              onClick={() => setSearchFilter('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs font-mono"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Lista Interativa de Faixas */}
      <div className="flex-1 overflow-y-auto max-h-[320px] p-2 space-y-1 divide-y divide-border/20">
        {filteredTracks.length > 0 ? (
          filteredTracks.map((track, idx) => {
            const isThisTrackCurrent = currentTrack?.id === track.id || currentTrack?.title === track.title;

            return (
              <button
                key={track.id || idx}
                onClick={() => onPlayTrack(track)}
                className={`w-full text-left p-2 rounded-xl flex items-center justify-between gap-2.5 transition-all group active:scale-[0.98] ${
                  isThisTrackCurrent
                    ? 'bg-accent-bright/15 border border-accent-bright/40 shadow-sm'
                    : 'hover:bg-surface-high/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-xs font-mono font-bold ${
                      isThisTrackCurrent
                        ? 'bg-accent-bright text-surface-low'
                        : 'bg-surface text-gray-400 group-hover:text-white group-hover:bg-accent-bright/20'
                    }`}
                  >
                    {isThisTrackCurrent && isPlaying ? (
                      <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-gamer font-semibold truncate transition-colors ${
                        isThisTrackCurrent
                          ? 'text-accent-bright'
                          : 'text-white group-hover:text-accent-bright'
                      }`}
                      title={track.title}
                    >
                      {track.title}
                    </p>
                    <p className="text-[10px] text-gray-400 font-sans truncate">
                      {track.artist || track.collection}
                    </p>
                  </div>
                </div>

                {isThisTrackCurrent && (
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-accent-bright/20 text-accent-bright border border-accent-bright/30 shrink-0">
                    {isPlaying ? 'TOCANDO' : 'PAUSADO'}
                  </span>
                )}
              </button>
            );
          })
        ) : (
          <div className="py-8 text-center text-xs text-gray-500 font-mono">
            Nenhuma música encontrada.
          </div>
        )}
      </div>

      {/* Rodapé Informativo */}
      <div className="p-2.5 border-t border-border/50 bg-surface/80 flex items-center justify-between text-[10px] font-mono text-gray-400">
        <span>Modo: {isShuffle ? 'Aleatório (Shuffle)' : 'Sequencial'}</span>
        <span className="text-accent-bright font-bold">Início Padrão: All</span>
      </div>
    </div>
  );
}
