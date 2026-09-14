import React, { useState } from 'react';
import {
  X,
  Clock,
  Calendar,
  Star,
  ExternalLink,
  Trash2,
  Edit3,
  Image as ImageIcon,
  Tag,
  Maximize2
} from 'lucide-react';
import YouTubeThemePlayer from '../common/YouTubeThemePlayer';
import { parseScreenshotUrls } from '../../services/driveUtils';

export default function GameExpandedModal({ game, onClose, onEdit, onDelete }) {
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);

  if (!game) return null;

  const screenshotsList = parseScreenshotUrls(game.screenshots);

  const getRatingBadgeClass = (score) => {
    const num = Number(score);
    if (num >= 9.0) return 'bg-emerald-500 text-white shadow-neon-green';
    if (num >= 7.5) return 'bg-teal-500 text-white';
    if (num >= 6.0) return 'bg-amber-500 text-white';
    if (num > 0) return 'bg-rose-500 text-white';
    return 'bg-gray-700 text-gray-300';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      {/* Lightbox para Screenshot Expandida */}
      {selectedScreenshot && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/95 p-4"
          onClick={() => setSelectedScreenshot(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-surface text-white hover:bg-surface-high transition-colors"
            onClick={() => setSelectedScreenshot(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={selectedScreenshot}
            alt="Screenshot expandida"
            className="max-w-full max-h-[90vh] object-contain rounded-lg border border-border shadow-2xl"
          />
        </div>
      )}

      {/* Janela Principal Modal */}
      <div className="relative w-full max-w-4xl bg-[#0e1017] border border-border rounded-2xl overflow-hidden shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Banner do Jogo */}
        <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-surface-container">
          {game.imageUrl && (
            <img
              src={game.imageUrl}
              alt={game.title}
              className="w-full h-full object-cover object-top filter brightness-75"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e1017] via-[#0e1017]/50 to-transparent" />

          {/* Botão Fechar */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/60 hover:bg-black/80 text-gray-300 hover:text-white border border-white/10 backdrop-blur-md transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Dados no topo do banner */}
          <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full bg-accent/20 border border-accent/40 text-accent-bright text-xs font-semibold">
                  {game.status || 'Finalizado'}
                </span>
                {game.genre && (
                  <span className="text-xs text-gray-300 font-mono">
                    {game.genre}
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-4xl font-gamer font-extrabold text-white tracking-wide">
                {game.title}
              </h2>
            </div>

            {/* Badge de Nota em Destaque */}
            {game.rating > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-mono uppercase text-gray-400">Sua Nota</span>
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center font-extrabold text-xl ${getRatingBadgeClass(
                      game.rating
                    )}`}
                  >
                    {Number(game.rating).toFixed(1)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Player de Trilha Sonora Tema In-App (Se houver themeUrl) */}
        {game.themeUrl && (
          <div className="px-6 pt-4">
            <YouTubeThemePlayer themeUrl={game.themeUrl} gameTitle={game.title} />
          </div>
        )}

        {/* Conteúdo Detalhado */}
        <div className="p-6 space-y-6">
          {/* Métricas Rápidas (Tempo, Data, Metacritic) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-surface-container border border-border flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-500" />
              <div>
                <span className="text-[10px] font-mono uppercase text-gray-400">Tempo Jogado</span>
                <p className="text-sm font-bold text-white">{game.playtime ? `${game.playtime} horas` : 'Não registrado'}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface-container border border-border flex items-center gap-3">
              <Calendar className="w-5 h-5 text-cyan-400" />
              <div>
                <span className="text-[10px] font-mono uppercase text-gray-400">Data de Conclusão</span>
                <p className="text-sm font-bold text-white">{game.dateFinished || 'Em andamento'}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface-container border border-border flex items-center gap-3">
              <Star className="w-5 h-5 text-yellow-400" />
              <div>
                <span className="text-[10px] font-mono uppercase text-gray-400">Metacritic</span>
                <p className="text-sm font-bold text-white">{game.metacritic ? `${game.metacritic} / 100` : 'N/A'}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface-container border border-border flex items-center gap-3">
              <Tag className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="text-[10px] font-mono uppercase text-gray-400">Gêneros</span>
                <p className="text-sm font-bold text-white truncate max-w-[120px]">{game.genre || 'Variados'}</p>
              </div>
            </div>
          </div>

          {/* Análise / Review Crítica */}
          <div className="p-5 rounded-xl bg-surface-container/60 border border-border">
            <h4 className="text-xs font-mono uppercase tracking-wider text-accent-bright mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent-bright"></span>
              Sua Análise Crítica
            </h4>
            {game.review && game.review.trim() ? (
              <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-line">
                {game.review}
              </p>
            ) : (
              <p className="text-xs text-gray-500 italic">
                Nenhuma análise escrita para este jogo ainda.
              </p>
            )}
          </div>

          {/* Galeria de Screenshots */}
          {screenshotsList.length > 0 && (
            <div>
              <h4 className="text-xs font-mono uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                Screenshots & Memórias ({screenshotsList.length})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {screenshotsList.map((url, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedScreenshot(url)}
                    className="group relative aspect-video rounded-lg overflow-hidden bg-surface-high border border-border hover:border-accent-bright/60 cursor-pointer shadow transition-all"
                  >
                    <img
                      src={url}
                      alt={`Captura ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Maximize2 className="w-5 h-5 text-white" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags do Jogo */}
          {Array.isArray(game.tags) && game.tags.length > 0 && (
            <div className="pt-2">
              <h4 className="text-[11px] font-mono uppercase tracking-wider text-gray-500 mb-2">Tags do RAWG</h4>
              <div className="flex flex-wrap gap-1.5">
                {game.tags.slice(0, 18).map((tag, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded bg-surface border border-border text-[10px] font-mono text-gray-400"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Rodapé de Ações (Editar e Deletar) */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <button
              onClick={() => {
                if (window.confirm(`Tem certeza que deseja excluir "${game.title}" do seu Vault?`)) {
                  onDelete(game.id);
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-red-300 text-xs font-medium transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Excluir do Vault</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onEdit(game);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-high hover:bg-surface-higher border border-border text-white text-xs font-semibold transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              <span>Editar Detalhes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
