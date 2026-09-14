import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  Filter,
  Plus,
  Gamepad2,
  SlidersHorizontal,
  FolderOpen
} from 'lucide-react';
import GameCard from './GameCard';
import GameExpandedModal from './GameExpandedModal';

export default function VaultView({ games = [], onAddGameClick, onEditGame, onDeleteGame }) {
  const [selectedGame, setSelectedGame] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Finalizado'); // Padrão 'Finalizado' como na tela original
  const [sortBy, setSortBy] = useState('rating'); // 'rating', 'dateFinished', 'playtime', 'title'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' ou 'desc'

  const statuses = ['Todos', 'Finalizado', 'Quero Jogar', 'Jogando', 'Abandonado'];

  // Filtra e ordena a lista de jogos
  const filteredGames = useMemo(() => {
    return games
      .filter(game => {
        const matchesStatus = statusFilter === 'Todos' || game.status === statusFilter;
        const matchesSearch =
          !searchTerm ||
          game.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          game.genre?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
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
  }, [games, statusFilter, searchTerm, sortBy, sortOrder]);

  const toggleSortOrder = () => {
    setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
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
      {/* Barra de Filtros e Ordenação Superior (Estilo Original) */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-3 sm:p-4 rounded-xl bg-[#0f1118] border border-border">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {statuses.map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === st
                  ? 'bg-accent/20 border border-accent/60 text-accent-bright shadow-sm'
                  : 'bg-surface hover:bg-surface-high border border-border/80 text-gray-400 hover:text-gray-200'
              }`}
            >
              {st}
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

      {/* Título da Seção com Barra Neon Verde (Fiel ao Print Original) */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-6 bg-accent-bright rounded-full shadow-[0_0_10px_#3dd69b]"></div>
          <h2 className="text-lg sm:text-xl font-gamer font-bold text-white tracking-wide">
            Jogos {statusFilter !== 'Todos' ? statusFilter + 's' : ''} (por {getSortLabel()})
          </h2>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface border border-border text-gray-400">
            {filteredGames.length}
          </span>
        </div>
      </div>

      {/* Grid de Cards de Jogos */}
      {filteredGames.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredGames.map(game => (
            <GameCard
              key={game.id}
              game={game}
              onClick={game => setSelectedGame(game)}
            />
          ))}
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
                : `Você ainda não possui nenhum jogo marcado como "${statusFilter}".`}
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
