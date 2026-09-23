import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Maximize2,
  Ban,
  Trophy,
  Palette,
  Play,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import YouTubeThemePlayer from '../common/YouTubeThemePlayer';
import GameMediaModal from '../common/GameMediaModal';
import { parseScreenshotUrls } from '../../services/driveUtils';
import { searchGameTheme } from '../../services/youtubeService';
import { isDropped } from '../../utils/gameUtils';
import PlatformIcon from '../common/PlatformIcon';

export default function GameExpandedModal({ game, onClose, onEdit, onDelete, onLaunch, onFinish, onDrop }) {
  const isDrop = isDropped(game?.status);
  const [selectedScreenshotIndex, setSelectedScreenshotIndex] = useState(null);
  const [dominantColor, setDominantColor] = useState('61, 214, 155'); // Padrão verde neon
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [activeThemeUrl, setActiveThemeUrl] = useState(game?.themeUrl || null);

  const screenshotsList = parseScreenshotUrls(game?.screenshots);

  const handlePrevScreenshot = (e) => {
    if (e) e.stopPropagation();
    if (selectedScreenshotIndex === null || screenshotsList.length === 0) return;
    setSelectedScreenshotIndex((prev) => (prev > 0 ? prev - 1 : screenshotsList.length - 1));
  };

  const handleNextScreenshot = (e) => {
    if (e) e.stopPropagation();
    if (selectedScreenshotIndex === null || screenshotsList.length === 0) return;
    setSelectedScreenshotIndex((prev) => (prev < screenshotsList.length - 1 ? prev + 1 : 0));
  };

  // Travar o scroll do body da página enquanto o modal estiver visível
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Tecla ESC e Setas para navegar no lightbox ou fechar modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (selectedScreenshotIndex !== null) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handlePrevScreenshot();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleNextScreenshot();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setSelectedScreenshotIndex(null);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedScreenshotIndex, screenshotsList.length, onClose]);

  // Busca automática da trilha sonora tema caso o jogo não possua link gravado
  useEffect(() => {
    setActiveThemeUrl(game?.themeUrl || null);
    if (!game?.themeUrl && game?.title) {
      let isMounted = true;
      searchGameTheme(game.title).then((url) => {
        if (isMounted && url) {
          setActiveThemeUrl(url);
        }
      });
      return () => {
        isMounted = false;
      };
    }
  }, [game?.id, game?.themeUrl, game?.title]);

  if (!game) return null;
  if (typeof document === 'undefined') return null;

  // Extrai dinamicamente a cor predominante da capa do jogo
  useEffect(() => {
    if (!game.imageUrl) return;

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = game.imageUrl;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 30;
        canvas.height = 30;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 30, 30);
        const data = ctx.getImageData(0, 0, 30, 30).data;

        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const cr = data[i];
          const cg = data[i + 1];
          const cb = data[i + 2];
          // Ignora pixels excessivamente escuros ou excessivamente brancos
          const brightness = (cr + cg + cb) / 3;
          if (brightness > 35 && brightness < 225) {
            r += cr;
            g += cg;
            b += cb;
            count++;
          }
        }

        if (count > 0) {
          setDominantColor(`${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)}`);
        }
      } catch (err) {
        // Fallback sutil em caso de restrição CORS
        setDominantColor('61, 214, 155');
      }
    };
  }, [game.imageUrl]);

  const getRatingBadgeClass = (score) => {
    const num = Number(score);
    if (num >= 9.0) return 'bg-emerald-500 text-white shadow-neon-green';
    if (num >= 7.5) return 'bg-teal-500 text-white';
    if (num >= 6.0) return 'bg-amber-500 text-white';
    if (num > 0) return 'bg-rose-500 text-white';
    return 'bg-gray-700 text-gray-300';
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl overflow-y-auto"
      onClick={(e) => {
        // Fechar ao clicar no backdrop escuro fora do card
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Halo de Brilho & Vidro com a cor predominante do jogo */}
      <div
        className="fixed inset-0 pointer-events-none transition-all duration-700 opacity-30 blur-[100px]"
        style={{
          backgroundImage: game.imageUrl ? `url(${game.imageUrl})` : undefined,
          backgroundColor: `rgba(${dominantColor}, 0.25)`,
          backgroundPosition: 'center',
          backgroundSize: 'cover'
        }}
      />

      {/* Lightbox para Screenshot Expandida com Navegação */}
      {selectedScreenshotIndex !== null && screenshotsList[selectedScreenshotIndex] && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/95 p-4 sm:p-8 select-none animate-in fade-in duration-200"
          onClick={() => setSelectedScreenshotIndex(null)}
        >
          {/* Botão Fechar */}
          <button
            type="button"
            className="absolute top-4 right-4 p-2.5 rounded-full bg-surface text-white hover:bg-surface-high hover:text-accent-bright transition-all border border-white/20 shadow-xl z-30 cursor-pointer"
            onClick={() => setSelectedScreenshotIndex(null)}
            title="Fechar (Esc)"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Contador de Imagens */}
          {screenshotsList.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-black/70 border border-white/20 text-xs font-mono text-gray-200 backdrop-blur-md shadow-xl z-30">
              {selectedScreenshotIndex + 1} / {screenshotsList.length}
            </div>
          )}

          {/* Seta Esquerda (Anterior) */}
          {screenshotsList.length > 1 && (
            <button
              type="button"
              onClick={handlePrevScreenshot}
              className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 p-3 sm:p-3.5 rounded-full bg-black/70 hover:bg-surface text-white hover:text-accent-bright transition-all border border-white/20 hover:border-accent-bright/50 shadow-2xl z-30 cursor-pointer group active:scale-95"
              title="Foto anterior (Seta para a esquerda)"
            >
              <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
            </button>
          )}

          {/* Imagem Central */}
          <div
            className="relative max-w-full max-h-[85vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={screenshotsList[selectedScreenshotIndex]}
              alt={`Captura ${selectedScreenshotIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-xl border border-white/20 shadow-[0_0_60px_rgba(0,0,0,0.95)] animate-in zoom-in-95 duration-200"
            />
          </div>

          {/* Seta Direita (Próxima) */}
          {screenshotsList.length > 1 && (
            <button
              type="button"
              onClick={handleNextScreenshot}
              className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 p-3 sm:p-3.5 rounded-full bg-black/70 hover:bg-surface text-white hover:text-accent-bright transition-all border border-white/20 hover:border-accent-bright/50 shadow-2xl z-30 cursor-pointer group active:scale-95"
              title="Próxima foto (Seta para a direita)"
            >
              <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>
      )}

      {/* Janela Principal Modal - Centralizada, altura contida a 90vh com rolagem interna */}
      <div
        className="relative my-auto w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl z-10 transition-all"
        style={{
          background: `linear-gradient(155deg, rgba(${dominantColor}, 0.22) 0%, rgba(13, 15, 23, 0.95) 35%, rgba(7, 8, 14, 0.98) 100%)`,
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: `1px solid rgba(${dominantColor}, 0.35)`,
          boxShadow: `0 25px 70px -15px rgba(0, 0, 0, 0.95), 0 0 35px -5px rgba(${dominantColor}, 0.3)`
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner do Jogo */}
        <div className="relative h-44 sm:h-56 w-full overflow-hidden shrink-0 bg-black/40">
          {game.imageUrl && (
            <img
              src={game.imageUrl}
              alt={game.title}
              className="w-full h-full object-cover object-top filter brightness-85"
            />
          )}
          <div
            className="absolute inset-0 bg-gradient-to-t via-black/40 to-transparent"
            style={{
              backgroundImage: `linear-gradient(to top, rgba(7, 8, 14, 0.95) 0%, rgba(13, 15, 23, 0.5) 50%, transparent 100%)`
            }}
          />

          {/* Botão Fechar */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/60 hover:bg-black/90 text-gray-300 hover:text-white border border-white/15 backdrop-blur-md transition-all active:scale-95"
            title="Fechar (ESC)"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Dados no topo do banner */}
          <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {game.platform && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 border border-white/20 backdrop-blur-md shadow-sm">
                    <PlatformIcon platformId={game.platform} size="sm" />
                    <span className="text-[11px] font-mono font-bold uppercase text-gray-200">
                      {game.platform}
                    </span>
                  </div>
                )}
                {isDrop ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-950/80 border border-amber-500/70 text-amber-300 backdrop-blur-md shadow-sm">
                    <Ban className="w-3.5 h-3.5 text-amber-400" />
                    DROPADO / ABANDONADO
                  </span>
                ) : (
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-semibold backdrop-blur-md"
                    style={{
                      backgroundColor: `rgba(${dominantColor}, 0.25)`,
                      borderColor: `rgba(${dominantColor}, 0.5)`,
                      borderWidth: '1px',
                      color: '#ffffff'
                    }}
                  >
                    {game.status || 'Finalizado'}
                  </span>
                )}
                {game.genre && (
                  <span className="text-xs text-gray-200 font-mono drop-shadow">
                    {game.genre}
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-4xl font-gamer font-extrabold text-white tracking-wide drop-shadow-md">
                {game.title}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              {onLaunch && (game.launchTarget || game.platform) && (
                <button
                  onClick={() => {
                    onLaunch(game);
                    onClose();
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent-bright to-emerald-400 hover:from-accent-bright/90 hover:to-emerald-300 text-surface-low font-gamer font-extrabold text-xs sm:text-sm tracking-wider uppercase shadow-neon-green transition-all transform active:scale-95 hover:scale-105"
                  title="Iniciar Jogo no PC"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Jogar Agora</span>
                </button>
              )}

              {/* Badge de Nota em Destaque (apenas se não for dropado) */}
              {!isDrop && game.rating > 0 && (
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-mono uppercase text-gray-300 drop-shadow">Sua Nota</span>
                  <div
                    className={`w-12 sm:w-14 h-12 sm:h-14 rounded-full flex items-center justify-center font-extrabold text-lg sm:text-xl shadow-2xl ${getRatingBadgeClass(
                      game.rating
                    )}`}
                  >
                    {Number(game.rating).toFixed(1)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Corpo com Rolagem Interna Elegante */}
        <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-5">
          {/* Player de Trilha Sonora Tema In-App (Autoplay ao abrir o card) */}
          {activeThemeUrl && (
            <YouTubeThemePlayer themeUrl={activeThemeUrl} gameTitle={game.title} />
          )}

          {/* Métricas Rápidas (Tempo, Data, Metacritic) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-black/40 border border-white/10 backdrop-blur-md flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-500" />
              <div>
                <span className="text-[10px] font-mono uppercase text-gray-400">
                  {isDrop ? 'Jogado até o drop' : 'Tempo Jogado'}
                </span>
                <p className="text-sm font-bold text-white">{game.playtime ? `${game.playtime} horas` : 'Não registrado'}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/10 backdrop-blur-md flex items-center gap-3">
              <Calendar className="w-5 h-5 text-cyan-400" />
              <div>
                <span className="text-[10px] font-mono uppercase text-gray-400">
                  {isDrop ? 'Data do Drop' : 'Data de Conclusão'}
                </span>
                <p className="text-sm font-bold text-white">{game.dateFinished || (isDrop ? 'Data não informada' : 'Em andamento')}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/10 backdrop-blur-md flex items-center gap-3">
              <Star className="w-5 h-5 text-yellow-400" />
              <div>
                <span className="text-[10px] font-mono uppercase text-gray-400">Metacritic</span>
                <p className="text-sm font-bold text-white">{game.metacritic ? `${game.metacritic} / 100` : 'N/A'}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/10 backdrop-blur-md flex items-center gap-3">
              <Tag className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="text-[10px] font-mono uppercase text-gray-400">Gêneros</span>
                <p className="text-sm font-bold text-white truncate max-w-[120px]">{game.genre || 'Variados'}</p>
              </div>
            </div>
          </div>

          {/* Análise / Motivo do Drop */}
          {isDrop ? (
            <div className="p-5 rounded-xl bg-amber-950/20 border border-amber-800/40 backdrop-blur-md">
              <h4 className="text-xs font-mono uppercase tracking-wider mb-2 flex items-center gap-2 font-semibold text-amber-400">
                <Ban className="w-4 h-4 text-amber-400" />
                Motivo do Abandono / Por que Dropou
              </h4>
              {game.dropReason || game.review ? (
                <p className="text-sm text-amber-200/90 leading-relaxed whitespace-pre-line">
                  {game.dropReason || game.review}
                </p>
              ) : (
                <p className="text-xs text-gray-500 italic">
                  Nenhum motivo detalhado informado.
                </p>
              )}
            </div>
          ) : (
            <div className="p-5 rounded-xl bg-black/40 border border-white/10 backdrop-blur-md">
              <h4
                className="text-xs font-mono uppercase tracking-wider mb-2 flex items-center gap-2 font-semibold"
                style={{ color: `rgb(${dominantColor})` }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: `rgb(${dominantColor})` }}></span>
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
          )}

          {/* Galeria de Screenshots */}
          {screenshotsList.length > 0 && (
            <div>
              <h4 className="text-xs font-mono uppercase tracking-wider text-gray-300 mb-3 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                Screenshots & Memórias ({screenshotsList.length})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {screenshotsList.map((url, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedScreenshotIndex(idx)}
                    className="group relative aspect-video rounded-lg overflow-hidden bg-black/50 border border-white/10 hover:border-cyan-400/80 cursor-pointer shadow transition-all"
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
              <h4 className="text-[11px] font-mono uppercase tracking-wider text-gray-400 mb-2">Tags do RAWG</h4>
              <div className="flex flex-wrap gap-1.5">
                {game.tags.slice(0, 18).map((tag, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded bg-black/40 border border-white/10 text-[10px] font-mono text-gray-300"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Rodapé de Ações (Editar, Finalizar e Deletar) */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <button
              onClick={() => {
                if (window.confirm(`Tem certeza que deseja excluir "${game.title}" do seu Vault?`)) {
                  onDelete(game.id);
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-950/50 hover:bg-red-900/70 border border-red-800/60 text-red-300 text-xs font-medium transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Excluir do Vault</span>
            </button>

            <div className="flex items-center gap-2 flex-wrap">
              {onFinish && (
                <button
                  onClick={() => {
                    onClose();
                    onFinish(game);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-surface-low text-xs font-bold transition-all shadow-sm active-press"
                >
                  <Trophy className="w-4 h-4" />
                  <span>Finalizei</span>
                </button>
              )}

              {onDrop && !isDrop && (
                <button
                  onClick={() => {
                    onClose();
                    onDrop(game);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-high hover:bg-surface border border-rose-500/40 text-rose-300 hover:text-white text-xs font-medium transition-colors"
                >
                  <Ban className="w-4 h-4" />
                  <span>Dropei</span>
                </button>
              )}

              {isDrop && !onFinish && (
                <button
                  onClick={() => {
                    onClose();
                    onEdit({
                      ...game,
                      status: 'Finalizado',
                      rating: 8,
                      dateFinished: new Date().toISOString().split('T')[0]
                    });
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)] active:scale-95"
                >
                  <Trophy className="w-4 h-4" />
                  <span>Finalizei esse jogo!</span>
                </button>
              )}

              <button
                onClick={() => setShowMediaModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-high hover:bg-surface border border-accent-bright/40 text-accent-bright hover:text-white text-xs font-semibold transition-all backdrop-blur-md active-press"
                title="Trocar Capa e Trilha Sonora do Jogo"
              >
                <Palette className="w-4 h-4" />
                <span>Capa & Trilha</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onEdit(game);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold transition-colors backdrop-blur-md"
              >
                <Edit3 className="w-4 h-4" />
                <span>Editar Detalhes</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Personalizar Capa & Trilha */}
      {showMediaModal && (
        <GameMediaModal
          game={game}
          onClose={() => setShowMediaModal(false)}
          onSave={async (updatedMedia) => {
            if (onEdit) {
              await onEdit({
                ...game,
                ...updatedMedia
              });
            }
            setShowMediaModal(false);
          }}
        />
      )}
    </div>,
    document.body
  );
}
