import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Image as ImageIcon,
  Music,
  Upload,
  Link as LinkIcon,
  ExternalLink,
  Check,
  Play,
  Pause,
  RefreshCw,
  Sparkles,
  Search
} from 'lucide-react';
import { searchRawgGames } from '../../config/rawg';
import { searchGameTheme } from '../../services/youtubeService';

export default function GameMediaModal({ game, onClose, onSave }) {
  const [imageUrl, setImageUrl] = useState(game?.imageUrl || '');
  const [themeUrl, setThemeUrl] = useState(game?.themeUrl || '');
  const [screenshots, setScreenshots] = useState(game?.screenshots || []);
  const [searchingRawg, setSearchingRawg] = useState(false);
  const [rawgSearchQuery, setRawgSearchQuery] = useState(game?.title || '');
  const [searchingTheme, setSearchingTheme] = useState(false);
  const [previewAudio, setPreviewAudio] = useState(false);
  const [saving, setSaving] = useState(false);

  // Se não tiver screenshots na inicialização, tenta buscar no RAWG usando o título do jogo
  useEffect(() => {
    if ((!screenshots || screenshots.length === 0) && game?.title) {
      setSearchingRawg(true);
      searchRawgGames(game.title, 1)
        .then((results) => {
          if (results && results.length > 0) {
            const top = results[0];
            const foundImgs = [
              top.imageUrl,
              ...(top.screenshots || [])
            ].filter(Boolean);
            const unique = Array.from(new Set(foundImgs));
            setScreenshots(unique);
          }
        })
        .catch(() => {})
        .finally(() => setSearchingRawg(false));
    }
  }, [game?.title]);

  if (!game) return null;
  if (typeof document === 'undefined') return null;

  // Busca manual no RAWG com outro termo
  const handleRawgSearch = async (e) => {
    e?.preventDefault();
    if (!rawgSearchQuery.trim()) return;
    setSearchingRawg(true);
    try {
      const results = await searchRawgGames(rawgSearchQuery.trim(), 1);
      if (results && results.length > 0) {
        const found = [];
        results.slice(0, 3).forEach(r => {
          if (r.imageUrl) found.push(r.imageUrl);
          if (r.screenshots) found.push(...r.screenshots);
        });
        setScreenshots(Array.from(new Set(found)));
      }
    } catch (err) {
      console.error('Erro ao buscar imagens no RAWG:', err);
    } finally {
      setSearchingRawg(false);
    }
  };

  // Selecionar imagem do computador nativamente via Electron
  const handlePickLocalImage = async () => {
    try {
      if (window.electronAPI?.selectFile && window.electronAPI?.readImageData) {
        const filePath = await window.electronAPI.selectFile({
          title: 'Selecione uma imagem para a capa do jogo',
          filters: [{ name: 'Imagens (*.jpg, *.png, *.webp)', extensions: ['jpg', 'jpeg', 'png', 'webp'] }]
        });
        if (filePath) {
          const dataUrl = await window.electronAPI.readImageData(filePath);
          if (dataUrl) {
            setImageUrl(dataUrl);
          }
        }
      } else {
        alert('A seleção de imagem local está disponível no app desktop.');
      }
    } catch (e) {
      console.error('Erro ao escolher arquivo local:', e);
    }
  };

  // Buscar trilha sonora automática no YouTube
  const handleAutoSearchTheme = async () => {
    setSearchingTheme(true);
    try {
      const foundUrl = await searchGameTheme(game.title);
      if (foundUrl) {
        setThemeUrl(foundUrl);
      } else {
        alert('Nenhuma trilha encontrada automaticamente. Você pode colar a URL do YouTube diretamente.');
      }
    } finally {
      setSearchingTheme(false);
    }
  };

  // Abrir o SteamGridDB para o usuário copiar artes feitas pela comunidade
  const openSteamGridDb = () => {
    const url = `https://www.steamgriddb.com/search/grids?term=${encodeURIComponent(game.title)}`;
    if (window.electronAPI) {
      window.open(url, '_blank');
    } else {
      window.open(url, '_blank');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        imageUrl: imageUrl.trim(),
        themeUrl: themeUrl.trim()
      });
      onClose();
    } catch (e) {
      console.error('Erro ao salvar personalização de mídia:', e);
    } finally {
      setSaving(false);
    }
  };

  // Extrai o ID do vídeo do YouTube para o player de preview
  const getYouTubeId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : null;
  };

  const videoId = getYouTubeId(themeUrl);

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-surface-container border border-border shadow-2xl text-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border/60 bg-surface/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-accent-bright/15 border border-accent-bright/30 text-accent-bright">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-gamer font-bold tracking-wide">
                Personalizar Capa & Trilha Sonora
              </h2>
              <p className="text-xs text-gray-400 truncate max-w-sm sm:max-w-md">
                {game.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto">
          {/* SEÇÃO 1: CAPA DO JOGO */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-accent-bright" />
                <span>Capa do Jogo:</span>
              </label>
              <button
                type="button"
                onClick={openSteamGridDb}
                className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                title="Abrir pesquisa de pôsteres no SteamGridDB"
              >
                <span>Buscar no SteamGridDB</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            {/* Preview da Capa e Opções Rápidas */}
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {/* Preview da Capa */}
              <div className="relative w-full sm:w-48 aspect-video sm:aspect-[16/10] rounded-xl overflow-hidden bg-surface border border-border shrink-0 shadow-inner">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/300x180?text=Imagem+Inválida';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 text-xs p-2 text-center">
                    <ImageIcon className="w-6 h-6 mb-1 text-gray-600" />
                    <span>Sem Capa</span>
                  </div>
                )}
              </div>

              {/* Controles de URL e Arquivo Local */}
              <div className="flex-1 w-full space-y-2.5">
                <div>
                  <span className="text-[11px] font-mono text-gray-400 block mb-1">URL da Imagem:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="Cole o link da imagem (URL direta jpg/png)..."
                      className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-white focus:outline-none focus:border-accent-bright font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handlePickLocalImage}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-high border border-border hover:border-accent-bright text-xs font-mono text-gray-300 hover:text-white transition-all active-press"
                  >
                    <Upload className="w-3.5 h-3.5 text-accent-bright" />
                    <span>Escolher Imagem do PC</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Galeria de Miniaturas Oficiais do RAWG */}
            <div className="pt-2 border-t border-border/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-gray-400">
                  Artes e Capturas Oficiais do Jogo (RAWG):
                </span>
                {searchingRawg && (
                  <span className="text-[11px] font-mono text-accent-bright flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Buscando artes...</span>
                  </span>
                )}
              </div>

              {screenshots.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-36 overflow-y-auto p-1 bg-surface/50 rounded-xl border border-border/40">
                  {screenshots.map((imgSrc, idx) => {
                    const isSelected = imageUrl === imgSrc;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setImageUrl(imgSrc)}
                        className={`relative aspect-video rounded-lg overflow-hidden border transition-all ${
                          isSelected
                            ? 'border-accent-bright ring-2 ring-accent-bright/50 scale-95 shadow-neon-green'
                            : 'border-border/60 hover:border-white/40 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={imgSrc}
                          alt={`Opção ${idx + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-accent-bright/20 flex items-center justify-center">
                            <div className="p-1 rounded-full bg-accent-bright text-surface-low">
                              <Check className="w-3 h-3" />
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-500 font-mono italic">
                  Nenhuma imagem alternativa disponível no momento.
                </p>
              )}
            </div>
          </div>

          {/* SEÇÃO 2: TRILHA SONORA / YOUTUBE */}
          <div className="space-y-3 pt-4 border-t border-border/60">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Music className="w-4 h-4 text-amber-400" />
                <span>Trilha Sonora / Tema do Jogo (YouTube):</span>
              </label>

              <button
                type="button"
                onClick={handleAutoSearchTheme}
                disabled={searchingTheme}
                className="text-[11px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${searchingTheme ? 'animate-spin' : ''}`} />
                <span>{searchingTheme ? 'Procurando...' : 'Buscar Automática'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={themeUrl}
                onChange={(e) => setThemeUrl(e.target.value)}
                placeholder="Cole o link do vídeo do YouTube (ex: https://youtube.com/watch?v=...)"
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
              />

              {videoId && (
                <button
                  type="button"
                  onClick={() => setPreviewAudio(!previewAudio)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold tracking-wide transition-all whitespace-nowrap active-press ${
                    previewAudio
                      ? 'bg-amber-400 text-surface-low shadow-[0_0_10px_rgba(251,191,36,0.5)]'
                      : 'bg-surface hover:bg-surface-high border border-border text-gray-300'
                  }`}
                  title="Testar áudio da trilha sonora"
                >
                  {previewAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  <span>{previewAudio ? 'Pausar' : 'Testar'}</span>
                </button>
              )}
            </div>

            {/* Player de Teste Embutido */}
            {previewAudio && videoId && (
              <div className="rounded-xl overflow-hidden border border-border bg-black aspect-video max-h-48 w-full animate-in fade-in duration-200">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1`}
                  title="Preview de Trilha Sonora"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border/60 bg-surface/80">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-high text-xs font-semibold text-gray-300 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-bright hover:bg-accent-bright/90 text-surface-low text-xs font-gamer font-bold tracking-wider shadow-neon-green transition-all active-press disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{saving ? 'Gravando...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
