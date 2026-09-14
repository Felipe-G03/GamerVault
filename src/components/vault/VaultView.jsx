import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  Filter,
  Plus,
  Gamepad2,
  SlidersHorizontal,
  FolderOpen,
  Calendar,
  Clock,
  Star,
  Bookmark,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import GameCard from './GameCard';
import GameExpandedModal from './GameExpandedModal';

export const isWishlist = (status) => {
  if (!status) return false;
  const s = String(status).toLowerCase();
  return s.includes('desejo') || s.includes('quero') || s.includes('backlog');
};

export const isFinished = (status) => {
  if (!status) return true;
  const s = String(status).toLowerCase();
  return s.includes('finalizado') || s.includes('zerado') || s.includes('conclu');
};

export default function VaultView({ games = [], onAddGameClick, onEditGame, onDeleteGame }) {
  const [selectedGame, setSelectedGame] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Finalizado'); // 'Finalizado', 'Desejo', 'Todos'
  const [sortBy, setSortBy] = useState('rating'); // 'rating', 'dateFinished', 'playtime', 'title'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' ou 'desc'
  const [collapsedYears, setCollapsedYears] = useState({});

  const filterOptions = [
    { id: 'Finalizado', label: 'Finalizados' },
    { id: 'Desejo', label: 'Lista de Desejos' },
    { id: 'Todos', label: 'Todos os Jogos' }
  ];

  // Extrai o ano ou categoria do jogo
  const getGameCategory = (game) => {
    if (isWishlist(game.status)) {
      return 'Lista de Desejos';
    }
    if (game.dateFinished) {
      const match = game.dateFinished.match(/^(\d{4})/);
      if (match) return match[1];
    }
    if (game.createdAt?.toDate) {
      return String(game.createdAt.toDate().getFullYear());
    }
    return 'Sem Ano Definido';
  };

  // Filtra os jogos
  const filteredGames = useMemo(() => {
    return games.filter(game => {
      let matchesStatus = true;
      if (statusFilter === 'Finalizado') {
        matchesStatus = isFinished(game.status);
      } else if (statusFilter === 'Desejo') {
        matchesStatus = isWishlist(game.status);
      }

      const matchesSearch =
        !searchTerm ||
        game.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        game.genre?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [games, statusFilter, searchTerm]);

  // Agrupa os jogos por ano/coleção e calcula métricas
  const yearGroups = useMemo(() => {
    const groups = {};

    filteredGames.forEach(game => {
      const category = getGameCategory(game);
      if (!groups[category]) {
        groups[category] = {
          category,
          games: [],
          totalHours: 0,
          totalScore: 0,
          ratedCount: 0
        };
      }
      groups[category].games.push(game);

      const hours = parseFloat(game.playtime) || 0;
      groups[category].totalHours += hours;

      const score = parseFloat(game.rating) || 0;
      if (score > 0) {
        groups[category].totalScore += score;
        groups[category].ratedCount += 1;
      }
    });

    // Ordena os jogos dentro de cada grupo
    Object.values(groups).forEach(grp => {
      grp.games.sort((a, b) => {
        let valueA = a[sortBy];
        let valueB = b[sortBy];

        if (sortBy === 'rating' || sortBy === 'playtime' || sortBy === 'metacritic') {
          valueA = Number(valueA) || 0;
          valueB = Number(valueB) || 0;
        } else if (sortBy === 'title') {
          valueA = (valueA || '').toLowerCase();
          valueB = (valueB || '').toLowerCase();
        }

        if (sortOrder === 'desc') {
          return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
        } else {
          return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
        }
      });
    });

    // Ordenação dos cabeçalhos: Lista de Desejos (se houver), depois anos decrescentes (2026, 2025...), depois outros
    return Object.values(groups).sort((a, b) => {
      if (a.category === 'Lista de Desejos') return -1;
      if (b.category === 'Lista de Desejos') return 1;
      if (a.category === 'Sem Ano Definido') return 1;
      if (b.category === 'Sem Ano Definido') return -1;
      return b.category.localeCompare(a.category);
    });
  }, [filteredGames, sortBy, sortOrder]);

  const toggleSortOrder = () => {
    setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
  };

  const toggleYearCollapse = (category) => {
    setCollapsedYears(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const getSortLabel = () => {
    switch (sortBy) {
      case 'rating': return 'Nota';
      case 'dateFinished': return 'Data de Conclusão';
      case 'playtime': return 'Tempo de Jogo';
      case 'title': return 'Título';
      case 'metacritic': return 'Metacritic';
      default: return 'Nota';
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra de Filtros e Ordenação Superior */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-3 sm:p-4 rounded-xl bg-[#0f1118] border border-border">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {filterOptions.map(opt => (
            <button
              key={opt.id}
              onClick={() => setStatusFilter(opt.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === opt.id
                  ? 'bg-accent/20 border border-accent/60 text-accent-bright shadow-sm'
                  : 'bg-surface hover:bg-surface-high border border-border/80 text-gray-400 hover:text-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Busca e Ordenação */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Campo de Busca Rápida */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Filtrar jogos..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent-bright transition-colors"
            />
          </div>

          {/* Seletor "Ordenar por" */}
          <div className="flex items-center gap-1.5 bg-surface border border-border px-2.5 py-1.5 rounded-lg">
            <span className="text-[11px] font-mono text-gray-400 hidden sm:inline">Ordenar:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer font-medium"
            >
              <option value="rating" className="bg-[#10121a]">Nota</option>
              <option value="dateFinished" className="bg-[#10121a]">Data</option>
              <option value="playtime" className="bg-[#10121a]">Tempo de Jogo</option>
              <option value="title" className="bg-[#10121a]">Título (A-Z)</option>
              <option value="metacritic" className="bg-[#10121a]">Metacritic</option>
            </select>
            <button
              onClick={toggleSortOrder}
              className="p-1 rounded text-gray-400 hover:text-accent-bright transition-colors"
              title={`Inverter ordem (${sortOrder === 'desc' ? 'Decrescente' : 'Crescente'})`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Botão Adicionar Jogo */}
          <button
            onClick={onAddGameClick}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all shadow-neon-cyan active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Jogo</span>
          </button>
        </div>
      </div>

      {/* Exibição em Coleções Separadas por Ano / Desejos */}
      {yearGroups.length > 0 ? (
        <div className="space-y-8">
          {yearGroups.map(grp => {
            const isCollapsed = collapsedYears[grp.category];
            const avgRating = grp.ratedCount > 0 ? (grp.totalScore / grp.ratedCount).toFixed(1) : '-';
            const isWishlistGroup = grp.category === 'Lista de Desejos';

            return (
              <section key={grp.category} className="space-y-4">
                {/* Header da Coleção */}
                <div
                  onClick={() => toggleYearCollapse(grp.category)}
                  className={`flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r border cursor-pointer select-none transition-all shadow-sm group ${
                    isWishlistGroup
                      ? 'from-[#141b22] via-[#0f141a] to-transparent border-cyan-700/60 hover:border-cyan-400'
                      : 'from-[#141622] via-[#0f111a] to-transparent border-border/90 hover:border-accent/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-7 rounded-full shadow-md ${
                        isWishlistGroup
                          ? 'bg-cyan-400 shadow-[0_0_10px_#06b6d4]'
                          : 'bg-accent-bright shadow-[0_0_10px_#3dd69b]'
                      }`}
                    ></div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-gamer font-bold text-white tracking-wider flex items-center gap-2">
                        {isWishlistGroup ? (
                          <span className="flex items-center gap-1.5 text-cyan-300">
                            <Bookmark className="w-4 h-4 fill-current" />
                            Lista de Desejos (Quero Jogar)
                          </span>
                        ) : grp.category !== 'Sem Ano Definido' ? (
                          <span>Coleção {grp.category}</span>
                        ) : (
                          <span>Outros / Sem Data</span>
                        )}
                        <span className="text-xs font-mono font-normal text-gray-400 bg-surface px-2 py-0.5 rounded border border-border">
                          {grp.games.length} {grp.games.length === 1 ? 'jogo' : 'jogos'}
                        </span>
                      </h2>
                    </div>
                  </div>

                  {/* Resumo Métricas do Grupo & Botão Recolher */}
                  <div className="flex items-center gap-4 text-xs font-mono text-gray-400">
                    {!isWishlistGroup && grp.totalHours > 0 && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-amber-400">
                        <Clock className="w-3.5 h-3.5" />
                        {grp.totalHours}h
                      </span>
                    )}
                    {!isWishlistGroup && avgRating !== '-' && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-emerald-400">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        {avgRating} média
                      </span>
                    )}
                    <button className="p-1 rounded hover:bg-surface text-gray-400 group-hover:text-white transition-colors">
                      {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Grid de Cards do Grupo */}
                {!isCollapsed && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 animate-in fade-in duration-200">
                    {grp.games.map(game => (
                      <GameCard
                        key={game.id}
                        game={game}
                        onClick={game => setSelectedGame(game)}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        /* Estado Vazio */
        <div className="py-16 text-center rounded-2xl bg-surface-container/40 border border-dashed border-border/80 p-8 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-surface-high flex items-center justify-center text-gray-500">
            <FolderOpen className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Nenhum jogo encontrado</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
              {searchTerm
                ? `Nenhum jogo corresponde à busca "${searchTerm}".`
                : `Você ainda não possui nenhum jogo marcado nesta categoria.`}
            </p>
          </div>
          <button
            onClick={onAddGameClick}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-all shadow-neon-orange"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Primeiro Jogo
          </button>
        </div>
      )}

      {/* Modal Expandido do Jogo */}
      {selectedGame && (
        <GameExpandedModal
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
          onEdit={game => {
            setSelectedGame(null);
            onEditGame(game);
          }}
          onDelete={gameId => {
            onDeleteGame(gameId);
            setSelectedGame(null);
          }}
        />
      )}
    </div>
  );
}
