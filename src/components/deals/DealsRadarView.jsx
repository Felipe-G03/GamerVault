import React, { useState, useEffect, useMemo } from 'react';
import { 
  BadgePercent, 
  Search, 
  Flame, 
  TrendingDown, 
  Store, 
  Bell, 
  Check, 
  Filter, 
  Loader2, 
  Sparkles, 
  Gift, 
  ChevronLeft, 
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  X
} from 'lucide-react';
import DealCard from './DealCard';
import DealDetailModal from './DealDetailModal';
import { fetchDeals, searchGameDeals, POPULAR_SHOPS, formatBRL, clearDealsPool } from '../../services/itadService';
import { getTrackedDeals, trackGameDeal, untrackGameDeal } from '../../services/dealTrackerService';

const PAGE_SIZE = 36;

export default function DealsRadarView({ user }) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Busca e Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [filterMode, setFilterMode] = useState('curated'); // 'curated' (Populares/Consagrados) | 'all' (Explorar Tudo)
  const [selectedSort, setSelectedSort] = useState('popular'); // 'popular', '-cut', 'price'
  const [selectedPriceRange, setSelectedPriceRange] = useState('all'); // 'all', 'under20', 'under50', 'under100', 'above100', 'free'
  const [selectedStore, setSelectedStore] = useState('all');
  
  // Modo de visualização: 'store' (Loja) ou 'tracked' (Jogos Monitorados)
  const [viewMode, setViewMode] = useState('store'); // 'store' | 'tracked'
  const [trackedList, setTrackedList] = useState([]);
  const [selectedDeal, setSelectedDeal] = useState(null);

  // Carrega ofertas da página atual usando pool sem duplicatas
  const loadDeals = async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetchDeals({
        page,
        pageSize: PAGE_SIZE,
        sort: selectedSort,
        storeId: selectedStore,
        curated: filterMode === 'curated'
      });
      setDeals(res.deals || []);
      setHasMore(res.hasMore);
    } catch (err) {
      console.error('Erro ao carregar ofertas:', err);
    } finally {
      setLoading(false);
    }
  };

  // Carrega lista de rastreados
  const loadTracked = async () => {
    const list = await getTrackedDeals(user?.uid);
    setTrackedList(list || []);
  };

  useEffect(() => {
    loadTracked();
  }, [user]);

  // Dispara nova busca quando filtros de ordenação, loja ou modo curado mudam
  useEffect(() => {
    if (viewMode === 'store' && !searchTerm.trim()) {
      clearDealsPool();
      setCurrentPage(1);
      loadDeals(1);
    }
  }, [selectedSort, selectedStore, viewMode, filterMode]);

  // Mudança de página
  const handlePageChange = (newPage) => {
    if (newPage < 1) return;
    setCurrentPage(newPage);
    loadDeals(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Busca em tempo real
  useEffect(() => {
    if (!searchTerm.trim()) {
      if (isSearching) {
        setIsSearching(false);
        loadDeals(1);
      }
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setLoading(true);
      try {
        const results = await searchGameDeals(searchTerm);
        setDeals(results || []);
      } catch (e) {
        console.error('Erro na pesquisa:', e);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Alterna rastreamento
  const handleToggleTrack = async (deal) => {
    const isAlready = trackedList.some(d => d.id === deal.id || d.title.toLowerCase() === deal.title.toLowerCase());
    if (isAlready) {
      const updated = await untrackGameDeal(deal.id, user?.uid);
      setTrackedList(updated || []);
    } else {
      const updated = await trackGameDeal(deal, null, user?.uid);
      setTrackedList(updated || []);
    }
  };

  // Filtragem local por faixa de preço
  const displayedDeals = useMemo(() => {
    if (viewMode === 'tracked') {
      return trackedList;
    }

    let list = [...deals];
    if (selectedPriceRange === 'under20') {
      list = list.filter(d => d.currentPrice <= 20);
    } else if (selectedPriceRange === 'under50') {
      list = list.filter(d => d.currentPrice <= 50);
    } else if (selectedPriceRange === 'under100') {
      list = list.filter(d => d.currentPrice <= 100);
    } else if (selectedPriceRange === 'above100') {
      list = list.filter(d => d.currentPrice > 100);
    } else if (selectedPriceRange === 'free') {
      list = list.filter(d => d.currentPrice === 0 || d.cut === 100);
    }
    return list;
  }, [deals, viewMode, trackedList, selectedPriceRange]);

  // Destaque principal (Hero Banner)
  const heroDeal = useMemo(() => {
    if (viewMode !== 'store' || isSearching || deals.length === 0) return null;
    return deals.find(d => d.cut >= 50 && d.coverUrl) || deals[0];
  }, [deals, viewMode, isSearching]);

  return (
    <div className="w-full space-y-6 animate-fade-in select-none">
      
      {/* ============================================================ */}
      {/* 1. HERO SPOTLIGHT BANNER: ESTILO LOJA DIGITAL (STEAM / EPIC) */}
      {/* ============================================================ */}
      {heroDeal && (
        <div className="relative rounded-3xl overflow-hidden border border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.2)] bg-[#0d1017]">
          {/* Imagem de Fundo Panorâmica */}
          <div className="absolute inset-0">
            <img 
              src={heroDeal.coverUrl} 
              alt={heroDeal.title}
              className="w-full h-full object-cover opacity-25 filter blur-xs scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0d1017] via-[#0d1017]/85 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d1017] via-transparent to-transparent" />
          </div>

          <div className="relative z-10 p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-3 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-extrabold uppercase tracking-widest bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  DESTAQUE DA SEMANA NO BRASIL
                </span>
                {heroDeal.isHistoricalLow && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-extrabold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    MENOR PREÇO HISTÓRICO
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-4xl font-gamer font-extrabold text-white tracking-wide leading-tight drop-shadow-md">
                {heroDeal.title}
              </h2>

              <p className="text-xs sm:text-sm text-gray-300 font-sans leading-relaxed line-clamp-2">
                Disponível na <strong className="text-cyan-300">{heroDeal.store?.name || 'Steam'}</strong> com preço oficial em Reais (BRL). Revendedor 100% autorizado.
              </p>

              {/* Bloco de Preço Grande */}
              <div className="flex items-center gap-4 pt-2">
                {heroDeal.cut > 0 && (
                  <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-mono font-extrabold text-lg sm:text-2xl shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                    -{heroDeal.cut}%
                  </div>
                )}
                <div className="flex flex-col">
                  {heroDeal.regularPrice > heroDeal.currentPrice && (
                    <span className="text-xs sm:text-sm font-mono text-gray-400 line-through">
                      {formatBRL(heroDeal.regularPrice)}
                    </span>
                  )}
                  <span className="text-xl sm:text-3xl font-mono font-extrabold text-emerald-400">
                    {formatBRL(heroDeal.currentPrice)}
                  </span>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedDeal(heroDeal)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs sm:text-sm font-gamer font-bold tracking-wider shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all active-press"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Ver Oferta & Comparar Lojas</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleTrack(heroDeal)}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-surface/80 hover:bg-surface-high border border-white/20 text-xs font-mono font-semibold text-white transition-colors"
                >
                  <Bell className="w-4 h-4 text-purple-400" />
                  <span>{trackedList.some(d => d.id === heroDeal.id) ? 'Rastreando' : 'Monitorar'}</span>
                </button>
              </div>
            </div>

            {/* Imagem do Jogo em Destaque */}
            <div className="hidden md:block w-72 h-44 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl shrink-0 group cursor-pointer" onClick={() => setSelectedDeal(heroDeal)}>
              <img 
                src={heroDeal.coverUrl} 
                alt={heroDeal.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. BARRA DE CONTROLES DE E-COMMERCE & FILTROS DROPDOWN       */}
      {/* ============================================================ */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0f121a] border border-[#232738] shadow-xl space-y-4">
        
        {/* Linha Superior: Busca e Modos (Loja vs Monitorados) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Seletor de Modo */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => { setViewMode('store'); setSearchTerm(''); }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-gamer font-bold transition-all ${
                viewMode === 'store'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                  : 'bg-surface hover:bg-surface-high text-gray-300 border border-white/10'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Loja de Promoções</span>
            </button>

            <button
              onClick={() => setViewMode('tracked')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-gamer font-bold transition-all ${
                viewMode === 'tracked'
                  ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                  : 'bg-surface hover:bg-surface-high text-gray-300 border border-white/10'
              }`}
            >
              <Bell className="w-4 h-4 text-purple-300" />
              <span>Meus Monitorados ({trackedList.length})</span>
            </button>
          </div>

          {/* Barra de Pesquisa de Jogos */}
          <div className="w-full sm:w-80 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar qualquer jogo por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2 rounded-xl bg-black/40 border border-[#2c3247] focus:border-cyan-400 text-xs font-mono text-white placeholder-gray-500 focus:outline-none transition-colors"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Linha Inferior: Dropdowns de Filtro de Loja */}
        {viewMode === 'store' && (
          <div className="pt-3 border-t border-white/5 flex items-center gap-3 flex-wrap">
            {/* Toggle Curadoria: Populares & Consagrados vs Explorar Tudo */}
            <div className="flex items-center p-0.5 rounded-xl bg-black/60 border border-[#282e44]">
              <button
                type="button"
                onClick={() => setFilterMode('curated')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  filterMode === 'curated'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Exibe os jogos consagrados, populares e premiados com desconto (Rank Global ITAD & Steam Reviews)"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Mais Populares & Consagrados</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  filterMode === 'all'
                    ? 'bg-zinc-700 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Explora o catálogo amplo de promoções das lojas autorizadas"
              >
                <span>Explorar Tudo</span>
              </button>
            </div>

            {/* Dropdown: Ordenação */}
            <div className="flex items-center gap-1.5 bg-black/40 border border-[#282e44] rounded-xl px-3 py-1.5">
              <span className="text-[10px] font-mono text-gray-400 uppercase">Ordem:</span>
              <select
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value)}
                className="bg-transparent text-xs font-mono text-cyan-300 focus:outline-none cursor-pointer"
              >
                <option value="popular" className="bg-[#0f121a] text-white">🌟 Destaques & Mais Vendidos</option>
                <option value="-cut" className="bg-[#0f121a] text-white">📉 Maior Desconto %</option>
                <option value="price" className="bg-[#0f121a] text-white">💲 Menor Preço (Super Ofertas)</option>
              </select>
            </div>

            {/* Dropdown: Faixa de Preço */}
            <div className="flex items-center gap-1.5 bg-black/40 border border-[#282e44] rounded-xl px-3 py-1.5">
              <span className="text-[10px] font-mono text-gray-400 uppercase">Preço:</span>
              <select
                value={selectedPriceRange}
                onChange={(e) => setSelectedPriceRange(e.target.value)}
                className="bg-transparent text-xs font-mono text-emerald-400 focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-[#0f121a] text-white">Todos os Preços</option>
                <option value="under20" className="bg-[#0f121a] text-white">Até R$ 20,00</option>
                <option value="under50" className="bg-[#0f121a] text-white">Até R$ 50,00</option>
                <option value="under100" className="bg-[#0f121a] text-white">Até R$ 100,00</option>
                <option value="above100" className="bg-[#0f121a] text-white">Acima de R$ 100,00</option>
                <option value="free" className="bg-[#0f121a] text-white">🎁 100% Grátis</option>
              </select>
            </div>

            {/* Dropdown: Loja Oficial */}
            <div className="flex items-center gap-1.5 bg-black/40 border border-[#282e44] rounded-xl px-3 py-1.5">
              <span className="text-[10px] font-mono text-gray-400 uppercase">Loja:</span>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="bg-transparent text-xs font-mono text-white focus:outline-none cursor-pointer"
              >
                {POPULAR_SHOPS.map(s => (
                  <option key={s.id} value={s.id} className="bg-[#0f121a] text-white">
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Selo Informativo do Modo */}
            {filterMode === 'curated' ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-mono text-cyan-300 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Rank Global & Validação Steam</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[10px] font-mono text-amber-300 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Catálogo Aberto (Sem DLCs/OSTs)</span>
              </div>
            )}

            {/* Contagem de resultados */}
            <span className="ml-auto text-[11px] font-mono text-gray-400">
              {displayedDeals.length} {displayedDeals.length === 1 ? 'oferta listada' : 'ofertas nesta página'}
            </span>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 3. GRID DE OFERTAS: DENSO E COMPACTO (ATÉ 6 COLUNAS)          */}
      {/* ============================================================ */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          <span className="text-xs font-mono">Consultando promoções em tempo real nas lojas oficiais...</span>
        </div>
      ) : displayedDeals.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-[#0d1017] rounded-3xl border border-dashed border-border/80 p-8">
          <BadgePercent className="w-10 h-10 text-gray-600 mx-auto" />
          <h3 className="text-base font-gamer font-bold text-white">
            Nenhuma oferta encontrada para estes filtros
          </h3>
          <p className="text-xs font-sans text-gray-400 max-w-sm mx-auto">
            {viewMode === 'tracked'
              ? 'Você ainda não está monitorando nenhum jogo. Clique no ícone de sino em qualquer jogo para acompanhar o preço aqui!'
              : 'Tente alterar os filtros de preço, loja ou pesquisar por outro título.'}
          </p>
          {viewMode === 'tracked' && (
            <button
              onClick={() => setViewMode('store')}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-gamer font-bold transition-all shadow-md"
            >
              Explorar Ofertas da Loja
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-3.5">
          {displayedDeals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              onClick={(d) => setSelectedDeal(d)}
              onToggleTrack={handleToggleTrack}
            />
          ))}
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. CONTROLES DE PAGINAÇÃO COMPLETA                           */}
      {/* ============================================================ */}
      {viewMode === 'store' && !isSearching && displayedDeals.length > 0 && (
        <div className="pt-4 pb-8 flex items-center justify-center gap-3 border-t border-white/5">
          <button
            type="button"
            disabled={currentPage <= 1 || loading}
            onClick={() => handlePageChange(currentPage - 1)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0f121a] hover:bg-surface-high border border-border text-xs font-mono font-bold text-white transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Anterior</span>
          </button>

          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-white/10 text-xs font-mono">
            <span className="text-gray-400">Página</span>
            <span className="font-bold text-cyan-400">{currentPage}</span>
          </div>

          <button
            type="button"
            disabled={!hasMore || loading}
            onClick={() => handlePageChange(currentPage + 1)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0f121a] hover:bg-surface-high border border-border text-xs font-mono font-bold text-white transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-95"
          >
            <span>Próxima</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal de Detalhes da Oferta */}
      {selectedDeal && (
        <DealDetailModal
          deal={selectedDeal}
          userId={user?.uid}
          onClose={() => setSelectedDeal(null)}
          onTrackChanged={loadTracked}
        />
      )}
    </div>
  );
}
