import React, { useState, useEffect } from 'react';
import {
  Search,
  CheckCircle,
  ArrowLeft,
  Clock,
  Calendar,
  Star,
  Music,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { searchRawgGames, getRawgApiKey } from '../../config/rawg';
import { parseScreenshotUrls } from '../../services/driveUtils';
import { searchGameTheme } from '../../services/youtubeService';
import RatingCalculator from './RatingCalculator';

export default function AddGameView({ onGameAdded, editingGame, onCancelEdit }) {
  const [step, setStep] = useState(editingGame ? 2 : 1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [isFetchingTheme, setIsFetchingTheme] = useState(false);
  const [showRatingCalculator, setShowRatingCalculator] = useState(false);

  // Estado do formulário no Passo 2
  const [selectedGame, setSelectedGame] = useState(
    editingGame || {
      title: '',
      imageUrl: '',
      metacritic: null,
      genre: '',
      genre_slugs: [],
      tags: [],
      status: 'Finalizado',
      dateFinished: new Date().toISOString().split('T')[0],
      playtime: '',
      rating: 8,
      review: '',
      screenshotsText: '',
      themeUrl: ''
    }
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Inicializa caso esteja editando
  useEffect(() => {
    if (editingGame) {
      setSelectedGame({
        ...editingGame,
        screenshotsText: Array.isArray(editingGame.screenshots)
          ? editingGame.screenshots.join('\n')
          : ''
      });
      setStep(2);
    }
  }, [editingGame]);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    const apiKey = getRawgApiKey();
    if (!apiKey) {
      setSearchError('Por favor, configure sua chave da API RAWG nas Configurações.');
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    try {
      const results = await searchRawgGames(searchQuery.trim());
      setSearchResults(results);
      if (results.length === 0) {
        setSearchError('Nenhum jogo encontrado com esse título.');
      }
    } catch (err) {
      setSearchError(err.message || 'Erro ao conectar à API RAWG.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectGame = (game) => {
    setSelectedGame({
      title: game.title,
      imageUrl: game.imageUrl,
      metacritic: game.metacritic,
      genre: game.genres,
      genre_slugs: game.genre_slugs,
      tags: game.tags,
      status: 'Finalizado',
      dateFinished: new Date().toISOString().split('T')[0],
      playtime: '',
      rating: 8,
      review: '',
      screenshotsText: '',
      themeUrl: ''
    });
    setStep(2);

    // Busca automaticamente a música tema na API do YouTube v3
    setIsFetchingTheme(true);
    searchGameTheme(game.title)
      .then((url) => {
        if (url) {
          setSelectedGame((prev) => ({ ...prev, themeUrl: url }));
        }
      })
      .finally(() => {
        setIsFetchingTheme(false);
      });
  };

  const handleSearchThemeManual = async () => {
    if (!selectedGame.title || isFetchingTheme) return;
    setIsFetchingTheme(true);
    try {
      const url = await searchGameTheme(selectedGame.title);
      if (url) {
        setSelectedGame((prev) => ({ ...prev, themeUrl: url }));
      }
    } finally {
      setIsFetchingTheme(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const gamePayload = {
        title: selectedGame.title,
        status: selectedGame.status,
        rating: Number(selectedGame.rating) || 0,
        playtime: String(selectedGame.playtime || '0'),
        dateFinished: selectedGame.dateFinished || '',
        review: selectedGame.review || '',
        imageUrl: selectedGame.imageUrl || '',
        metacritic: selectedGame.metacritic ? Number(selectedGame.metacritic) : null,
        genre: selectedGame.genre || '',
        genre_slugs: selectedGame.genre_slugs || [],
        tags: selectedGame.tags || [],
        screenshots: editingGame?.screenshots || selectedGame?.screenshots || [],
        themeUrl: selectedGame.themeUrl ? selectedGame.themeUrl.trim() : null
      };

      await onGameAdded(gamePayload, editingGame?.id);
    } catch (err) {
      setSaveError(err.message || 'Erro ao salvar jogo no Firestore.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Indicador de Passos */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-surface-container border border-border">
        <div className="flex items-center gap-3">
          <span
            className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
              step === 1
                ? 'bg-cyan-500 text-black shadow-neon-cyan'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
            }`}
          >
            1
          </span>
          <span className={`text-xs font-semibold ${step === 1 ? 'text-white' : 'text-gray-400'}`}>
            Encontre seu Jogo (RAWG)
          </span>
        </div>

        <div className="h-0.5 w-12 bg-border"></div>

        <div className="flex items-center gap-3">
          <span
            className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
              step === 2
                ? 'bg-orange-500 text-white shadow-neon-orange'
                : 'bg-surface text-gray-500 border border-border'
            }`}
          >
            2
          </span>
          <span className={`text-xs font-semibold ${step === 2 ? 'text-white' : 'text-gray-400'}`}>
            Adicione seus Detalhes
          </span>
        </div>
      </div>

      {/* PASSO 1: Encontre seu Jogo (Fiel à captura 2) */}
      {step === 1 && (
        <div className="p-6 rounded-2xl bg-[#0e1017] border border-border shadow-xl space-y-6">
          <h2 className="text-lg font-gamer font-bold text-white tracking-wide">
            Passo 1: Encontre seu Jogo
          </h2>

          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Digite o título do jogo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 bg-[#151722] border border-[#272a3b] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 transition-colors"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm transition-all shadow-neon-cyan disabled:opacity-50"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Buscar</span>
            </button>
          </form>

          {searchError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/30 border border-red-800/40 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{searchError}</span>
            </div>
          )}

          {/* Resultados da Busca RAWG */}
          {searchResults.length > 0 && (
            <div className="space-y-3 pt-2">
              <span className="text-xs font-mono uppercase text-gray-400">
                Selecione o jogo correspondente ({searchResults.length} resultados)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
                {searchResults.map((game) => (
                  <div
                    key={game.id}
                    onClick={() => handleSelectGame(game)}
                    className="flex gap-3 p-2.5 rounded-xl bg-[#141620] border border-border hover:border-cyan-400/70 hover:bg-[#1a1d2c] cursor-pointer transition-all group"
                  >
                    <div className="w-20 h-16 rounded-lg overflow-hidden bg-black shrink-0">
                      {game.imageUrl ? (
                        <img
                          src={game.imageUrl}
                          alt={game.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-500">
                          Sem Capa
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col justify-center min-w-0">
                      <h4 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors truncate">
                        {game.title}
                      </h4>
                      <span className="text-[11px] text-gray-400 truncate">
                        {game.genres || 'Gênero não informado'}
                      </span>
                      {game.metacritic && (
                        <span className="text-[10px] font-mono text-yellow-400 mt-0.5">
                          Metacritic: {game.metacritic}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PASSO 2: Adicione seus Detalhes (Fiel à captura 3) */}
      {step === 2 && (
        <form onSubmit={handleSave} className="p-6 rounded-2xl bg-[#0e1017] border border-border shadow-xl space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-gamer font-bold text-white tracking-wide">
              Passo 2: Adicione seus Detalhes
            </h2>
            {!editingGame && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Trocar Jogo
              </button>
            )}
          </div>

          {/* Card do Jogo Selecionado */}
          <div className="flex items-center gap-3.5 p-3 rounded-xl bg-[#141620] border border-border">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-black shrink-0">
              {selectedGame.imageUrl ? (
                <img
                  src={selectedGame.imageUrl}
                  alt={selectedGame.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                  N/A
                </div>
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{selectedGame.title}</h3>
              {selectedGame.genre && (
                <span className="text-xs text-gray-400 font-mono">{selectedGame.genre}</span>
              )}
            </div>
          </div>

          {/* STATUS */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase text-gray-300 font-semibold">
              STATUS
            </label>
            <select
              value={selectedGame.status}
              onChange={(e) => setSelectedGame({ ...selectedGame, status: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-[#151722] border border-[#272a3b] rounded-xl text-sm text-white focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="Finalizado">Finalizado</option>
              <option value="Quero Jogar">Quero Jogar (Backlog / Desejo)</option>
            </select>
          </div>

          {/* CAMPOS ESPECÍFICOS DE JOGO FINALIZADO */}
          {selectedGame.status === 'Finalizado' ? (
            <>
              {/* DATA DE CONCLUSÃO */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase text-gray-300 font-semibold">
                  DATA DE CONCLUSÃO
                </label>
                <input
                  type="date"
                  value={selectedGame.dateFinished}
                  onChange={(e) => setSelectedGame({ ...selectedGame, dateFinished: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#151722] border border-[#272a3b] rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* TEMPO DE JOGO */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase text-gray-300 font-semibold">
                  TEMPO DE JOGO (EM HORAS)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 85"
                  value={selectedGame.playtime}
                  onChange={(e) => setSelectedGame({ ...selectedGame, playtime: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#151722] border border-[#272a3b] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* SUA NOTA (1-10) */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-mono uppercase text-gray-300 font-semibold">
                    SUA NOTA (1-10)
                  </label>
                  <span className="text-sm font-bold text-accent-bright font-mono">
                    {selectedGame.rating} / 10
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.1"
                  value={selectedGame.rating || 8}
                  onChange={(e) => setSelectedGame({ ...selectedGame, rating: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-surface-high rounded-lg appearance-none cursor-pointer accent-accent-bright"
                />

                {/* Botão Chamativo: Não sabe que nota dar? */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowRatingCalculator(!showRatingCalculator)}
                    className={`w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-mono font-semibold transition-all ${
                      showRatingCalculator
                        ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                        : 'bg-[#151722] hover:bg-[#1a1e2d] border-border hover:border-cyan-500/50 text-gray-300 hover:text-cyan-400'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <span>
                      {showRatingCalculator 
                        ? 'Ocultar Calculadora de Nota' 
                        : 'Não sabe que nota dar? Calcular nota sugerida por critérios'}
                    </span>
                  </button>
                </div>

                {/* Painel Expansível da Calculadora de Notas */}
                {showRatingCalculator && (
                  <div className="pt-1">
                    <RatingCalculator
                      currentRating={selectedGame.rating}
                      onApplyRating={(newRating) => setSelectedGame((prev) => ({ ...prev, rating: newRating }))}
                      onAppendReview={(text) => setSelectedGame((prev) => ({ ...prev, review: (prev.review ? prev.review.trim() + text : text.trim()) }))}
                      onClose={() => setShowRatingCalculator(false)}
                    />
                  </div>
                )}
              </div>

              {/* SUA ANÁLISE */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase text-gray-300 font-semibold">
                  SUA ANÁLISE
                </label>
                <textarea
                  rows={4}
                  placeholder="Escreva sua opinião crítica sobre o jogo..."
                  value={selectedGame.review}
                  onChange={(e) => setSelectedGame({ ...selectedGame, review: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#151722] border border-[#272a3b] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 resize-y"
                ></textarea>
              </div>
            </>
          ) : (
            /* MODO QUERO JOGAR (Campos simplificados) */
            <div className="p-4 rounded-xl bg-surface-container/60 border border-border/80 space-y-4">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono">
                <CheckCircle className="w-4 h-4" />
                <span>Modo Backlog / Desejo ativado</span>
              </div>
              <p className="text-xs text-gray-400">
                Este jogo será guardado na sua lista de desejos. Quando você zerá-lo futuramente, basta editar o status para "Finalizado" para registrar suas horas, nota e review!
              </p>

              {/* Anotações de Expectativa (Opcional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase text-gray-300 font-semibold">
                  POR QUE VOCÊ QUER JOGAR? (OPCIONAL)
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Recomendação de amigos, aguardando promoção, trailer incrível..."
                  value={selectedGame.review}
                  onChange={(e) => setSelectedGame({ ...selectedGame, review: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#151722] border border-[#272a3b] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 resize-y"
                ></textarea>
              </div>
            </div>
          )}

          {/* TRILHA SONORA TEMA */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono uppercase text-accent-bright font-semibold flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5" />
                MÚSICA TEMA DO JOGO (YOUTUBE OU ÁUDIO)
              </label>
              <button
                type="button"
                onClick={handleSearchThemeManual}
                disabled={isFetchingTheme || !selectedGame.title}
                className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors disabled:opacity-40"
              >
                {isFetchingTheme ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                    Buscando OST...
                  </>
                ) : (
                  <>
                    <Search className="w-3 h-3" />
                    {selectedGame.themeUrl ? 'Rebuscar na API' : 'Buscar na API'}
                  </>
                )}
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Ex: https://www.youtube.com/watch?v=..."
                value={selectedGame.themeUrl || ''}
                onChange={(e) => setSelectedGame({ ...selectedGame, themeUrl: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#151722] border border-[#272a3b] rounded-xl text-xs text-white font-mono placeholder-gray-500 focus:outline-none focus:border-accent-bright"
              />
              {isFetchingTheme && (
                <div className="absolute right-3 top-2.5 flex items-center gap-1.5 text-xs text-cyan-400 font-mono">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-[10px]">Buscando tema...</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-400">
                Preenchido automaticamente via YouTube Data API v3. Toca direto no app.
              </span>
              {selectedGame.themeUrl && !isFetchingTheme && (
                <span className="text-accent-bright font-mono text-[10px] flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Tema pronto
                </span>
              )}
            </div>
          </div>

          {saveError && (
            <div className="p-3 rounded-xl bg-red-950/30 border border-red-800/40 text-red-300 text-xs">
              {saveError}
            </div>
          )}

          {/* BOTÕES: + Adicionar ao Vault & Cancelar (Fiel à captura 3) */}
          <div className="space-y-2 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm tracking-wide transition-all shadow-neon-orange disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span>{editingGame ? '✓ Atualizar no Vault' : '+ Adicionar ao Vault'}</span>
              )}
            </button>

            <button
              type="button"
              onClick={onCancelEdit}
              className="w-full py-3 rounded-xl bg-[#1c1f2b] hover:bg-[#252a3a] text-gray-300 font-semibold text-xs transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
