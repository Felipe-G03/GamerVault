import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Calendar,
  Clock,
  Star,
  Bookmark,
  Plus,
  Play,
  Tv,
  Loader2,
  ExternalLink,
  Layers,
  Image as ImageIcon,
  Check,
  Languages
} from 'lucide-react';
import { getRawgGameDetails, getRawgGameTrailers } from '../../config/rawg';
import { searchGameTrailer } from '../../services/youtubeService';
import { extractYouTubeId } from '../common/YouTubeThemePlayer';
import { translateText } from '../../services/translationService';

// Cache em memória para detalhes de jogos consultados durante a sessão
const DETAILS_CACHE = new Map();

export default function DiscoverGameModal({
  game,
  isOwned,
  isWishlist,
  onClose,
  onAddToWishlist,
  onRegisterFull
}) {
  const [details, setDetails] = useState(DETAILS_CACHE.get(game?.id) || null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(!DETAILS_CACHE.has(game?.id));
  const [trailerUrl, setTrailerUrl] = useState(null);
  const [nativeTrailer, setNativeTrailer] = useState(null);
  const [isLoadingTrailer, setIsLoadingTrailer] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);
  const [dominantColor, setDominantColor] = useState('61, 214, 155');

  // Estados de Tradução Automática da Sinopse (Gratuita)
  const [translatedDescription, setTranslatedDescription] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  // Trava scroll da página enquanto o modal estiver aberto
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // ESC para fechar modal ou screenshot
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (selectedScreenshot) {
          setSelectedScreenshot(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedScreenshot, onClose]);

  // Extração de cor dominante da imagem do jogo
  useEffect(() => {
    if (!game?.imageUrl) return;
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
          const cr = data[i], cg = data[i + 1], cb = data[i + 2];
          const brightness = (cr + cg + cb) / 3;
          if (brightness > 35 && brightness < 225) {
            r += cr; g += cg; b += cb; count++;
          }
        }
        if (count > 0) {
          setDominantColor(`${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)}`);
        }
      } catch (err) {
        setDominantColor('61, 214, 155');
      }
    };
  }, [game?.imageUrl]);

  // Carrega detalhes sob demanda com economia de cota e cache
  useEffect(() => {
    if (!game?.id) return;

    if (DETAILS_CACHE.has(game.id)) {
      setDetails(DETAILS_CACHE.get(game.id));
      setIsLoadingDetails(false);
      return;
    }

    let isMounted = true;
    setIsLoadingDetails(true);

    getRawgGameDetails(game.id)
      .then((data) => {
        if (isMounted) {
          DETAILS_CACHE.set(game.id, data);
          setDetails(data);
        }
      })
      .catch((err) => {
        console.warn('Não foi possível carregar sinopse detalhada do RAWG:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingDetails(false);
      });

    // Tenta obter trailer oficial nativo do RAWG (sem custo no YouTube)
    getRawgGameTrailers(game.id).then((trailers) => {
      if (isMounted && trailers && trailers.length > 0) {
        setNativeTrailer(trailers[0]);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [game?.id]);

  // Busca de trailer no YouTube sob demanda
  const handleLoadYouTubeTrailer = async () => {
    if (trailerUrl || isLoadingTrailer) return;
    setIsLoadingTrailer(true);
    try {
      const url = await searchGameTrailer(game.title);
      if (url) {
        setTrailerUrl(url);
      }
    } catch (e) {
      console.warn('Erro ao buscar trailer:', e);
    } finally {
      setIsLoadingTrailer(false);
    }
  };

  // Tradução automática gratuita da sinopse para PT-BR
  useEffect(() => {
    const rawDesc = details?.description;
    if (!rawDesc) {
      setTranslatedDescription(null);
      return;
    }

    let isMounted = true;
    setIsTranslating(true);

    translateText(rawDesc, 'pt')
      .then((translated) => {
        if (isMounted) {
          setTranslatedDescription(translated);
        }
      })
      .catch((err) => {
        console.warn('Erro ao traduzir sinopse:', err);
      })
      .finally(() => {
        if (isMounted) {
          setIsTranslating(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [details?.description]);

  if (!game) return null;
  if (typeof document === 'undefined') return null;

  const screenshots = game.screenshots || [];
  const platforms = details?.platforms || game.platforms || '';
  const description = details?.description || '';
  const ytVideoId = trailerUrl ? extractYouTubeId(trailerUrl) : null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Halo de fundo com cor predominante */}
      <div
        className="fixed inset-0 pointer-events-none transition-all duration-700 opacity-25 blur-[100px]"
        style={{
          backgroundImage: game.imageUrl ? `url(${game.imageUrl})` : undefined,
          backgroundColor: `rgba(${dominantColor}, 0.25)`,
          backgroundPosition: 'center',
          backgroundSize: 'cover'
        }}
      />

      {/* Lightbox para Screenshot Expandida */}
      {selectedScreenshot && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/95 p-4"
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

      {/* Modal Card */}
      <div
        className="relative my-auto w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl z-10 transition-all bg-surface border border-border"
        style={{
          boxShadow: `0 25px 70px -15px rgba(0, 0, 0, 0.9), 0 0 30px -5px rgba(${dominantColor}, 0.25)`
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner do Jogo */}
        <div className="relative h-44 sm:h-56 w-full overflow-hidden shrink-0 bg-black/50">
          {game.imageUrl && (
            <img
              src={game.imageUrl}
              alt={game.title}
              className="w-full h-full object-cover object-top filter brightness-85"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />

          {/* Botão Fechar */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md transition-all active:scale-95 cursor-pointer"
            title="Fechar (ESC)"
          >
            <X className="w-5 h-5 text-white keep-white" />
          </button>

          {/* Dados no topo do banner */}
          <div className="absolute bottom-4 left-5 right-5 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-accent/20 text-accent-bright border border-accent/40 backdrop-blur-md">
                  Sugestão RAWG
                </span>
                {game.genres && (
                  <span className="text-xs text-gray-200 keep-white font-mono drop-shadow">
                    {game.genres}
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-gamer font-extrabold text-white keep-white tracking-wide drop-shadow-md">
                {game.title}
              </h2>
            </div>

            {/* Metacritic & Rating */}
            <div className="flex items-center gap-2 shrink-0">
              {game.metacritic && (
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-mono uppercase text-gray-300">Metascore</span>
                  <div
                    className={`px-2.5 py-1 rounded-lg font-mono font-extrabold text-sm border ${
                      game.metacritic >= 85
                        ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60 shadow-neon-green'
                        : game.metacritic >= 75
                        ? 'bg-amber-950/90 text-amber-300 border-amber-500/60'
                        : 'bg-rose-950/90 text-rose-300 border-rose-500/60'
                    }`}
                  >
                    {game.metacritic}
                  </div>
                </div>
              )}
              {game.rating > 0 && (
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-mono uppercase text-gray-300">Avaliação</span>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-high border border-border font-mono font-bold text-xs text-amber-400">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{Number(game.rating).toFixed(1)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Corpo com Rolagem Interna */}
        <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-5">
          {/* Métricas Rápidas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-surface-container border border-border">
              <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1 font-mono">
                <Calendar className="w-3.5 h-3.5 text-accent-bright" />
                <span>Lançamento</span>
              </div>
              <div className="text-xs sm:text-sm font-semibold text-white">
                {game.released || 'Não informado'}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface-container border border-border">
              <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1 font-mono">
                <Clock className="w-3.5 h-3.5 text-accent-bright" />
                <span>Tempo Médio</span>
              </div>
              <div className="text-xs sm:text-sm font-semibold text-white">
                {game.playtime ? `${game.playtime} horas` : 'Variável'}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface-container border border-border col-span-2">
              <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1 font-mono">
                <Layers className="w-3.5 h-3.5 text-accent-bright" />
                <span>Plataformas</span>
              </div>
              <div className="text-xs font-medium text-white truncate" title={platforms || 'Multiplataforma'}>
                {platforms || 'Multiplataforma'}
              </div>
            </div>
          </div>

          {/* Sinopse / Sobre o Jogo com Tradução Inteligente */}
          <div className="p-4 rounded-xl bg-surface-container/60 border border-border space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-accent-bright flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5" />
                <span>Sinopse & Visão Geral</span>
              </h3>

              {/* Controles de Tradução (Português / Original) */}
              {description && (
                <div className="flex items-center gap-2">
                  {isTranslating ? (
                    <span className="flex items-center gap-1.5 text-[10px] font-mono text-accent-bright bg-accent/10 px-2.5 py-0.5 rounded-full border border-accent/20">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Traduzindo para Português...</span>
                    </span>
                  ) : translatedDescription && translatedDescription !== description ? (
                    <button
                      type="button"
                      onClick={() => setShowOriginal(!showOriginal)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono bg-surface-high hover:bg-surface-higher border border-border/80 text-gray-300 hover:text-white transition-all active:scale-95 cursor-pointer shadow-sm"
                      title={showOriginal ? 'Voltar para a tradução em Português' : 'Ver o texto original no idioma original'}
                    >
                      <Languages className="w-3 h-3 text-accent-bright" />
                      <span>{showOriginal ? 'Ver em Português' : 'Ver Original'}</span>
                    </button>
                  ) : null}

                  {translatedDescription && !showOriginal && (
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-700/50 px-2 py-0.5 rounded-full hidden sm:inline">
                      PT-BR
                    </span>
                  )}
                </div>
              )}
            </div>

            {isLoadingDetails ? (
              <div className="flex items-center gap-2 py-4 text-xs text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin text-accent-bright" />
                <span>Carregando detalhes completos do jogo...</span>
              </div>
            ) : description ? (
              <div className="space-y-1.5">
                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-h-52 overflow-y-auto pr-1 whitespace-pre-line select-text">
                  {showOriginal || !translatedDescription ? description : translatedDescription}
                </p>
                {translatedDescription && !showOriginal && (
                  <span className="block text-[10px] font-mono text-gray-500 italic">
                    * Tradução automática gerada para o Português.
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">
                Nenhuma sinopse detalhada fornecida para este título.
              </p>
            )}
          </div>

          {/* Seção de Trailer (RAWG Nativo ou YouTube Sob Demanda) */}
          <div className="p-4 rounded-xl bg-surface-container/60 border border-border space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-accent-bright flex items-center gap-1.5">
                <Tv className="w-4 h-4" />
                <span>Trailer Oficial</span>
              </h3>
              {!nativeTrailer && !trailerUrl && (
                <button
                  type="button"
                  onClick={handleLoadYouTubeTrailer}
                  disabled={isLoadingTrailer}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-400 hover:text-red-300 text-xs font-mono transition-all cursor-pointer disabled:opacity-50"
                >
                  {isLoadingTrailer ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Play className="w-3 h-3 fill-current" />
                  )}
                  <span>{isLoadingTrailer ? 'Consultando...' : 'Buscar no YouTube'}</span>
                </button>
              )}
            </div>

            {/* Caso haja trailer nativo do RAWG */}
            {nativeTrailer && (
              <div className="aspect-video w-full rounded-lg overflow-hidden bg-black border border-border shadow-lg">
                <video
                  src={nativeTrailer.data?.max || nativeTrailer.data?.[480]}
                  poster={nativeTrailer.preview}
                  controls
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {/* Caso haja trailer via YouTube */}
            {!nativeTrailer && ytVideoId && (
              <div className="aspect-video w-full rounded-lg overflow-hidden bg-black border border-border shadow-lg">
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube-nocookie.com/embed/${ytVideoId}?autoplay=0&rel=0`}
                  title="Game Trailer"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}

            {!nativeTrailer && !trailerUrl && !isLoadingTrailer && (
              <div className="text-xs text-gray-400 italic py-1">
                Clique no botão acima para carregar o trailer oficial sob demanda sem desperdício de dados.
              </div>
            )}
          </div>

          {/* Galeria de Screenshots */}
          {screenshots.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-accent-bright flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4" />
                <span>Capturas de Tela ({screenshots.length})</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {screenshots.map((shot, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedScreenshot(shot)}
                    className="relative aspect-video rounded-lg overflow-hidden border border-border hover:border-accent-bright transition-all group cursor-pointer"
                  >
                    <img
                      src={shot}
                      alt={`Screenshot ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com Ações de Integração ao Acervo */}
        <div className="p-4 sm:p-5 border-t border-border bg-surface-container flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs font-mono text-gray-400">
            {isOwned ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <Check className="w-4 h-4" /> Já registrado no seu acervo
              </span>
            ) : isWishlist ? (
              <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                <Bookmark className="w-4 h-4" /> Presente na sua lista de desejos
              </span>
            ) : (
              <span>Gostou deste título? Adicione com 1 clique.</span>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {!isOwned && (
              <>
                {!isWishlist && (
                  <button
                    type="button"
                    onClick={() => {
                      onAddToWishlist(game);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-high hover:bg-cyan-950/40 text-gray-300 hover:text-cyan-300 border border-border hover:border-cyan-500/50 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Lista de Desejos</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onRegisterFull(game);
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-accent-bright hover:bg-accent text-black text-xs font-bold transition-all shadow-neon-green active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Registrar no Acervo</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-lg bg-surface-high hover:bg-surface-higher text-gray-300 text-xs font-mono transition-all cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
