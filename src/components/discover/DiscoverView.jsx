import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Flame,
  Crown,
  Calendar,
  EyeOff,
  Eye,
  Plus,
  Bookmark,
  Star,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Gamepad2,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';
import { getRawgDiscoverGames, getRawgApiKey } from '../../config/rawg';
import { isWishlist, isFinished } from '../vault/VaultView';
import DiscoverGameModal from './DiscoverGameModal';

// Cache em memória durante a sessão para evitar requisições repetidas
const DISCOVER_CACHE = new Map();

const CATEGORIES = [
  {
    id: 'best_year',
    label: 'Melhores do Ano',
    description: 'Os títulos mais aclamados e bem avaliados do ano',
    icon: Trophy,
    hasYear: true
  },
  {
    id: 'popular_year',
    label: 'Mais Populares',
    description: 'Jogos mais adicionados e comentados pela comunidade',
    icon: Flame,
    hasYear: true
  },
  {
    id: 'top_250',
    label: 'Top 250 de Todos os Tempos',
    description: 'As 250 maiores obras-primas da história dos videogames (Meta > 80)',
    icon: Crown,
    hasYear: false
  }
];

const currentYear = new Date().getFullYear();
// Gera todos os anos a partir de 2026 até 1980 (47 anos de história)
const AVAILABLE_YEARS = Array.from({ length: currentYear - 1980 + 1 }, (_, i) => currentYear - i);

const PAGE_SIZE = 25;

export default function DiscoverView({ games = [], onDirectAddWishlist, onSelectGameToRegister }) {
  const [activeCategory, setActiveCategory] = useState('best_year');
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(250);

  const [hideOwned, setHideOwned] = useState(false);
  const [onlyNotable, setOnlyNotable] = useState(true); // Filtro ativo por padrão para barrar shovelware
  const [searchTerm, setSearchTerm] = useState('');

  const [gamesList, setGamesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [addingId, setAddingId] = useState(null);
  const [selectedGameForModal, setSelectedGameForModal] = useState(null);

  // Mapeia os títulos dos jogos do usuário para busca rápida O(1)
  const userGamesMap = useMemo(() => {
    const map = new Map();
    games.forEach((g) => {
      if (g.title) {
        map.set(g.title.toLowerCase().trim(), g);
      }
    });
    return map;
  }, [games]);

  // Carrega os dados da categoria, ano e página selecionados
  const fetchDiscoverGames = async (forceRefresh = false) => {
    const cacheKey = `${activeCategory}_${activeCategory === 'top_250' ? 'all' : selectedYear}_p${currentPage}`;

    if (forceRefresh) {
      DISCOVER_CACHE.clear();
    } else if (DISCOVER_CACHE.has(cacheKey)) {
      const cached = DISCOVER_CACHE.get(cacheKey);
      setGamesList(cached.results);
      setTotalCount(cached.count);
      setIsLoading(false);
      setErrorMessage(null);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const apiKey = getRawgApiKey();
      if (!apiKey) {
        throw new Error('Chave da API RAWG não configurada nas Configurações.');
      }

      const data = await getRawgDiscoverGames(activeCategory, {
        year: selectedYear,
        page: currentPage,
        pageSize: PAGE_SIZE
      });

      const effectiveCount = activeCategory === 'top_250' ? 250 : data.count;
      DISCOVER_CACHE.set(cacheKey, { results: data.results, count: effectiveCount });
      setGamesList(data.results);
      setTotalCount(effectiveCount);
    } catch (err) {
      console.error('Erro ao carregar sugestões do RAWG:', err);
      setErrorMessage(err.message || 'Falha ao conectar com o catálogo da RAWG.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscoverGames();
  }, [activeCategory, selectedYear, currentPage]);

  const handleCategoryChange = (catId) => {
    if (catId === activeCategory) return;
    setActiveCategory(catId);
    setCurrentPage(1);
  };

  const handleYearChange = (year) => {
    if (year === selectedYear) return;
    setSelectedYear(year);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage === currentPage || newPage < 1) return;
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Ação rápida: Adicionar diretamente à Lista de Desejos
  const handleQuickAddWishlist = async (rawgGame) => {
    if (!onDirectAddWishlist) return;
    setAddingId(rawgGame.id);
    try {
      await onDirectAddWishlist({
        title: rawgGame.title,
        status: 'Lista de Desejos',
        rating: 0,
        playtime: '0',
        imageUrl: rawgGame.imageUrl || '',
        metacritic: rawgGame.metacritic || null,
        genre: rawgGame.genres || '',
        genre_slugs: rawgGame.genre_slugs || [],
        tags: rawgGame.tags || [],
        review: '',
        dateFinished: ''
      });
    } catch (e) {
      console.error('Erro ao adicionar à lista de desejos:', e);
    } finally {
      setAddingId(null);
    }
  };

  // Filtragem dos jogos para exibição
  const displayedGames = useMemo(() => {
    return gamesList.filter((item) => {
      const normalizedTitle = item.title?.toLowerCase().trim();
      const userGame = userGamesMap.get(normalizedTitle);

      // Filtro de busca textual
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(term);
        const matchesGenre = item.genres?.toLowerCase().includes(term);
        if (!matchesTitle && !matchesGenre) return false;
      }

      // Filtro de ocultar jogos já registrados
      if (hideOwned && userGame) {
        return false;
      }

      // Filtro de relevância / qualidade (elimina jogos desconhecidos sem comunidade)
      if (onlyNotable && activeCategory !== 'top_250') {
        const hasGoodCommunity = (item.added || 0) >= 30 || Boolean(item.metacritic);
        if (!hasGoodCommunity) return false;
      }

      return true;
    });
  }, [gamesList, userGamesMap, hideOwned, onlyNotable, activeCategory, searchTerm]);

  // Contagem de jogos do acervo presentes nesta lista da página
  const ownedCountInList = useMemo(() => {
    return gamesList.filter((item) => {
      const normalized = item.title?.toLowerCase().trim();
      return userGamesMap.has(normalized);
    }).length;
  }, [gamesList, userGamesMap]);

  // Total de páginas calculadas (Top 250 tem exatamente 10 páginas de 25)
  const totalPages = useMemo(() => {
    if (activeCategory === 'top_250') return 10;
    return Math.min(Math.max(1, Math.ceil(totalCount / PAGE_SIZE)), 10);
  }, [activeCategory, totalCount]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header da Aba */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/70 pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-gamer font-bold tracking-wide text-white flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-accent-bright" />
            Explorar Sugestões
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1 font-sans">
            Descubra novos títulos aclamados pelo mundo gamer e integre diretamente ao seu acervo.
          </p>
        </div>

        {/* Botão de Atualizar dados */}
        <button
          onClick={() => fetchDiscoverGames(true)}
          disabled={isLoading}
          className="inline-flex items-center gap-2 self-start md:self-auto px-3 py-1.5 rounded-lg bg-surface-high hover:bg-surface-container border border-border text-gray-300 hover:text-white text-xs font-semibold tracking-wide transition-all disabled:opacity-50"
          title="Recarregar dados da API e limpar cache"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-accent-bright' : ''}`} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* Barra de Controles: Categorias, Ano e Filtros */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface p-4 rounded-xl border border-border">
        {/* Categorias (Pílulas) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all select-none ${
                  isActive
                    ? 'bg-accent-bright/15 text-accent-bright border border-accent-bright/50 shadow-sm'
                    : 'bg-surface-high/60 hover:bg-surface-high text-gray-400 hover:text-gray-200 border border-border/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Filtros secundários: Seletor de Ano Único, Busca e Toggles */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor de Ano Único: vai de 2026 até 1980 */}
          {activeCategory !== 'top_250' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-high border border-border text-xs text-gray-300">
              <Calendar className="w-3.5 h-3.5 text-accent-bright" />
              <span className="text-gray-400 font-mono text-[11px]">Ano:</span>
              <select
                value={selectedYear}
                onChange={(e) => handleYearChange(Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer pr-1 border-b border-accent-bright/40 pb-0.5"
              >
                {AVAILABLE_YEARS.map((y) => (
                  <option key={y} value={y} className="bg-surface text-white">
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Campo de Busca Rápida na lista */}
          <div className="relative flex-1 sm:w-44">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar título..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface-high border border-border text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent-bright/60 transition-colors"
            />
          </div>

          {/* Toggle para Ocultar Jogos do Acervo */}
          <button
            onClick={() => setHideOwned(!hideOwned)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border select-none ${
              hideOwned
                ? 'bg-accent-bright/20 border-accent-bright text-accent-bright'
                : 'bg-surface-high hover:bg-surface-container border-border text-gray-400 hover:text-gray-200'
            }`}
            title="Ocultar jogos que já estão no seu Vault ou Lista de Desejos"
          >
            {hideOwned ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>Ocultar do meu acervo</span>
            {ownedCountInList > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded bg-black/40 text-[10px] text-gray-300 font-mono">
                {ownedCountInList}
              </span>
            )}
          </button>

          {/* Toggle para Filtrar Shovelware / Jogos Desconhecidos */}
          {activeCategory !== 'top_250' && (
            <button
              onClick={() => setOnlyNotable(!onlyNotable)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border select-none ${
                onlyNotable
                  ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                  : 'bg-surface-high hover:bg-surface-container border-border text-gray-400 hover:text-gray-200'
              }`}
              title={
                onlyNotable
                  ? 'Filtrando jogos desconhecidos (exibindo títulos com comunidade e relevância)'
                  : 'Exibindo todos os títulos sem filtro de popularidade'
              }
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${onlyNotable ? 'text-emerald-400' : 'text-gray-400'}`} />
              <span>Apenas Relevantes</span>
            </button>
          )}
        </div>
      </div>

      {/* Informações da Categoria e Posição da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-400 px-1 font-mono">
        <span>
          {CATEGORIES.find((c) => c.id === activeCategory)?.description}
        </span>
        {!isLoading && (
          <span className="text-gray-300">
            Página {currentPage} de {totalPages} • Exibindo {displayedGames.length} jogos
          </span>
        )}
      </div>

      {/* Estado de Carregamento */}
      {isLoading && (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-accent-bright" />
          <span className="text-xs font-mono">
            {activeCategory === 'top_250'
              ? `Carregando posições #${(currentPage - 1) * PAGE_SIZE + 1} a #${currentPage * PAGE_SIZE} do Top 250...`
              : 'Consultando catálogo da RAWG...'}
          </span>
        </div>
      )}

      {/* Estado de Erro */}
      {!isLoading && errorMessage && (
        <div className="p-6 rounded-xl bg-red-950/30 border border-red-800/50 text-center space-y-3">
          <p className="text-sm text-red-200">{errorMessage}</p>
          <button
            onClick={() => fetchDiscoverGames(true)}
            className="px-4 py-2 rounded-lg bg-red-900/40 hover:bg-red-800/60 border border-red-700/60 text-xs font-semibold text-red-100 transition-all"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Lista Vazia */}
      {!isLoading && !errorMessage && displayedGames.length === 0 && (
        <div className="py-16 text-center space-y-2 border border-dashed border-border/70 rounded-xl p-8 bg-surface/50">
          <Gamepad2 className="w-10 h-10 text-gray-600 mx-auto" />
          <h3 className="text-sm font-semibold text-gray-300">Nenhum jogo encontrado nesta página</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {hideOwned
              ? 'Todos os jogos desta página já fazem parte do seu acervo! Desative o filtro de ocultação ou navegue para outra página.'
              : 'Nenhum resultado corresponde aos filtros selecionados.'}
          </p>
        </div>
      )}

      {/* Grade de Jogos Sugeridos */}
      {!isLoading && !errorMessage && displayedGames.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayedGames.map((game, index) => {
            const normalizedTitle = game.title?.toLowerCase().trim();
            const userGame = userGamesMap.get(normalizedTitle);
            const finished = userGame && isFinished(userGame.status);
            const inWishlist = userGame && isWishlist(userGame.status);
            const isBeingAdded = addingId === game.id;
            const rankNumber = (currentPage - 1) * PAGE_SIZE + index + 1;

            return (
              <div
                key={game.id}
                onClick={() => setSelectedGameForModal(game)}
                className={`group relative flex flex-col rounded-xl overflow-hidden bg-surface border transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-1 cursor-pointer select-none ${
                  finished
                    ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)] hover:border-amber-400'
                    : inWishlist
                    ? 'border-cyan-500/40 hover:border-cyan-400'
                    : 'border-border hover:border-accent-bright/50'
                }`}
              >
                {/* Imagem do Jogo com Aspect Ratio 16:9 */}
                <div className="relative aspect-video w-full overflow-hidden bg-surface-container">
                  {game.imageUrl ? (
                    <img
                      src={game.imageUrl}
                      alt={game.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-surface-container text-gray-500 text-xs">
                      Sem Imagem
                    </div>
                  )}

                  {/* Gradiente de sombra */}
                  <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-black/40 pointer-events-none" />

                  {/* Overlay sutil de clique para prévia */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 border border-accent-bright/60 text-accent-bright text-xs font-semibold backdrop-blur-md shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
                      <Info className="w-3.5 h-3.5" />
                      <span>Ver Detalhes & Trailer</span>
                    </span>
                  </div>

                  {/* Posição no Topo: Rank numérico no Top 250 ou Metacritic */}
                  <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5">
                    {activeCategory === 'top_250' && (
                      <span className="px-2 py-0.5 rounded font-mono font-extrabold text-[11px] tracking-tight bg-black/85 backdrop-blur-md border border-amber-500/70 text-amber-300 shadow-md">
                        #{rankNumber}
                      </span>
                    )}

                    {game.metacritic && (
                      <span
                        className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] tracking-tight border ${
                          game.metacritic >= 85
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                            : game.metacritic >= 75
                            ? 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                            : 'bg-rose-950/80 text-rose-300 border-rose-500/50'
                        }`}
                        title="Metacritic Score"
                      >
                        {game.metacritic}
                      </span>
                    )}
                  </div>

                  {/* BADGES DE CRUZAMENTO COM O ACERVO (Top Right) */}
                  <div className="absolute top-2.5 right-2.5 z-10 flex flex-col items-end gap-1">
                    {finished && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/90 border border-amber-500/80 text-amber-300 text-[10px] font-bold shadow-[0_0_12px_rgba(245,158,11,0.5)] backdrop-blur-md">
                        <Trophy className="w-3 h-3 text-amber-400" />
                        <span>Zerado</span>
                        {userGame.rating > 0 && (
                          <span className="font-mono text-amber-200">
                            • {Number(userGame.rating).toFixed(1)}
                          </span>
                        )}
                      </div>
                    )}

                    {!finished && inWishlist && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/90 border border-cyan-500/80 text-cyan-300 text-[10px] font-bold backdrop-blur-md shadow-sm">
                        <Bookmark className="w-3 h-3 text-cyan-400 fill-cyan-400" />
                        <span>No Backlog</span>
                      </div>
                    )}
                  </div>

                  {/* Gêneros resumidos */}
                  {game.genres && (
                    <div className="absolute bottom-2 left-2.5 right-2.5 z-10">
                      <span className="text-[10px] font-mono text-gray-300 line-clamp-1 drop-shadow-md">
                        {game.genres}
                      </span>
                    </div>
                  )}
                </div>

                {/* Conteúdo do Card */}
                <div className="p-3.5 flex flex-col flex-1 justify-between gap-3">
                  <div>
                    <h3 className="font-gamer font-bold text-sm text-white line-clamp-1 group-hover:text-accent-bright transition-colors">
                      {game.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-gray-400 font-mono mt-1">
                      {game.released && (
                        <span>{game.released.split('-')[0]}</span>
                      )}
                      {game.rating > 0 && (
                        <span className="flex items-center gap-1 text-gray-300">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          {game.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ações Inferiores */}
                  <div className="pt-2 border-t border-border/50 flex items-center gap-2">
                    {userGame ? (
                      <div className="w-full text-center py-1 text-[11px] font-mono text-gray-400 bg-surface-high/50 rounded-lg border border-border/40">
                        {finished ? 'No seu Vault' : 'Na sua Lista de Desejos'}
                      </div>
                    ) : (
                      <>
                        {/* Botão de 1 Clique: Salvar em Desejos */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickAddWishlist(game);
                          }}
                          disabled={isBeingAdded}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-surface-high hover:bg-cyan-950/40 text-gray-300 hover:text-cyan-300 border border-border hover:border-cyan-500/50 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                          title="Salvar na sua Lista de Desejos com 1 clique"
                        >
                          {isBeingAdded ? (
                            <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                          ) : (
                            <Bookmark className="w-3 h-3 text-cyan-400" />
                          )}
                          <span className="text-[11px]">Desejos</span>
                        </button>

                        {/* Botão de Registrar Completo */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectGameToRegister(game);
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-accent-bright/15 hover:bg-accent-bright/25 text-accent-bright border border-accent-bright/40 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
                          title="Abrir formulário completo para registrar"
                        >
                          <Plus className="w-3 h-3" />
                          <span className="text-[11px]">Registrar</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paginação Numérica Elegante (Abas Numéricas de 1 a 10) */}
      {!isLoading && !errorMessage && totalPages > 1 && (
        <div className="pt-6 pb-4 flex flex-wrap items-center justify-center gap-1.5 select-none border-t border-border/50">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-high hover:bg-surface-container border border-border text-xs font-semibold text-gray-300 hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none"
            title="Página Anterior"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Anterior</span>
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
            const isActive = pageNum === currentPage;
            return (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                className={`w-8 h-8 rounded-lg text-xs font-mono font-bold transition-all ${
                  isActive
                    ? 'bg-accent-bright text-black shadow-[0_0_12px_rgba(20,184,166,0.5)] font-extrabold scale-105'
                    : 'bg-surface-high hover:bg-surface-container border border-border text-gray-400 hover:text-white'
                }`}
                title={`Ir para página ${pageNum}`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-high hover:bg-surface-container border border-border text-xs font-semibold text-gray-300 hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none"
            title="Próxima Página"
          >
            <span className="hidden sm:inline">Próxima</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Modal Rico de Detalhes da Sugestão (Sob Demanda) */}
      {selectedGameForModal && (
        <DiscoverGameModal
          game={selectedGameForModal}
          isOwned={Boolean(
            userGamesMap.get(selectedGameForModal.title?.toLowerCase().trim()) &&
            isFinished(userGamesMap.get(selectedGameForModal.title?.toLowerCase().trim())?.status)
          )}
          isWishlist={Boolean(
            userGamesMap.get(selectedGameForModal.title?.toLowerCase().trim()) &&
            isWishlist(userGamesMap.get(selectedGameForModal.title?.toLowerCase().trim())?.status)
          )}
          onClose={() => setSelectedGameForModal(null)}
          onAddToWishlist={handleQuickAddWishlist}
          onRegisterFull={onSelectGameToRegister}
        />
      )}
    </div>
  );
}
