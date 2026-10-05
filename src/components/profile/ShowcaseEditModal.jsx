import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  Gamepad2,
  Search,
  Star,
  Flame,
  Check,
  Globe,
  Loader2
} from 'lucide-react';
import { searchRawgGames } from '../../config/rawg';

export default function ShowcaseEditModal({ showcase, userGames = [], onSave, onClose }) {
  const [title, setTitle] = useState(showcase?.title || '');
  const [description, setDescription] = useState(showcase?.description || '');
  const [games, setGames] = useState(showcase?.games || []);
  
  // Modo de seleção: 'library' ou 'rawg'
  const [sourceMode, setSourceMode] = useState('library');
  const [searchQuery, setSearchQuery] = useState('');
  
  // RAWG busca
  const [rawgResults, setRawgResults] = useState([]);
  const [isSearchingRawg, setIsSearchingRawg] = useState(false);
  const rawgTimeoutRef = useRef(null);

  // Custom Game por URL
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customGameTitle, setCustomGameTitle] = useState('');
  const [customGameCover, setCustomGameCover] = useState('');
  const [customGameNote, setCustomGameNote] = useState('');

  // Sugestões de títulos rápidos
  const TITLE_SUGGESTIONS = [
    'Nunca jogue esses jogos',
    'Top 5 Obras de Arte',
    'Jogos que marcaram minha infância',
    'Histórias inesquecíveis',
    'Mais difíceis que já platinei',
    'Melhores Soundtracks'
  ];

  // Busca no RAWG com debounce quando no modo 'rawg'
  useEffect(() => {
    if (sourceMode !== 'rawg' || !searchQuery.trim() || searchQuery.length < 2) {
      setRawgResults([]);
      return;
    }

    if (rawgTimeoutRef.current) clearTimeout(rawgTimeoutRef.current);
    rawgTimeoutRef.current = setTimeout(async () => {
      setIsSearchingRawg(true);
      try {
        const res = await searchRawgGames(searchQuery.trim(), 1);
        const list = Array.isArray(res) ? res : (res?.results || []);
        setRawgResults(list);
      } catch (err) {
        console.warn('Erro ao pesquisar jogos no RAWG:', err);
      } finally {
        setIsSearchingRawg(false);
      }
    }, 450);

    return () => {
      if (rawgTimeoutRef.current) clearTimeout(rawgTimeoutRef.current);
    };
  }, [searchQuery, sourceMode]);

  const handleAddGame = (gameData) => {
    if (games.some(g => g.title?.toLowerCase() === gameData.title?.toLowerCase())) {
      alert('Este jogo já está na sua vitrine.');
      return;
    }
    if (games.length >= 6) {
      alert('Uma vitrine pode conter no máximo 6 jogos em destaque.');
      return;
    }

    setGames(prev => [
      ...prev,
      {
        id: gameData.id || `game_${Date.now()}`,
        title: gameData.title,
        coverUrl: gameData.coverUrl || gameData.imageUrl || '',
        rating: gameData.rating || 0,
        note: ''
      }
    ]);
  };

  const handleAddCustomGame = (e) => {
    e.preventDefault();
    if (!customGameTitle.trim()) return;
    if (games.length >= 6) {
      alert('Uma vitrine pode conter no máximo 6 jogos em destaque.');
      return;
    }

    setGames(prev => [
      ...prev,
      {
        id: `custom_${Date.now()}`,
        title: customGameTitle.trim(),
        coverUrl: customGameCover.trim(),
        note: customGameNote.trim()
      }
    ]);

    setCustomGameTitle('');
    setCustomGameCover('');
    setCustomGameNote('');
    setIsAddingCustom(false);
  };

  const handleRemoveGame = (index) => {
    setGames(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateNote = (index, note) => {
    setGames(prev => prev.map((g, i) => i === index ? { ...g, note } : g));
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Informe o título da vitrine.');
      return;
    }
    if (games.length === 0) {
      alert('Adicione pelo menos 1 jogo à vitrine.');
      return;
    }

    onSave({
      id: showcase?.id || `showcase_${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      games
    });
  };

  // Filtra biblioteca local
  const filteredLibrary = userGames.filter(g =>
    g.title?.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !games.some(existing => existing.title?.toLowerCase() === g.title?.toLowerCase())
  ).slice(0, 10);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-3xl bg-[#0e1017] border border-[#272b3c] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Topo do Modal */}
        <div className="p-5 border-b border-border/80 flex items-center justify-between">
          <h2 className="text-base font-gamer font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent-bright" />
            {showcase ? 'Editar Vitrine' : 'Criar Nova Vitrine Personalizada'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface-high transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário Principal */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
          
          {/* Título & Sugestões */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase text-gray-300 font-semibold block">
              Título da Vitrine:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Nunca jogue esses jogos"
              className="w-full px-3.5 py-2.5 bg-[#141724] border border-[#262a3d] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-bright transition-colors"
              required
            />

            {/* Chips de sugestões */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {TITLE_SUGGESTIONS.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setTitle(sug)}
                  className="px-2.5 py-1 rounded-lg bg-[#161a2b] hover:bg-[#1f243b] text-[11px] font-mono text-gray-400 hover:text-accent-bright border border-white/5 transition-colors cursor-pointer"
                >
                  + {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Subtítulo / Descrição */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase text-gray-300 font-semibold block">
              Subtítulo / Descrição (Opcional):
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Poupe seu tempo e sua sanidade com estes títulos"
              className="w-full px-3.5 py-2.5 bg-[#141724] border border-[#262a3d] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent-bright transition-colors"
            />
          </div>

          {/* Jogos Selecionados na Vitrine */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono uppercase text-gray-300 font-semibold block">
                Jogos Adicionados à Vitrine ({games.length}/6):
              </label>
              <button
                type="button"
                onClick={() => setIsAddingCustom(!isAddingCustom)}
                className="text-[11px] font-mono text-accent-bright hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar por Link/Imagem
              </button>
            </div>

            {/* Painel de Adicionar Jogo Customizado por URL */}
            {isAddingCustom && (
              <div className="p-3.5 rounded-xl bg-[#141724] border border-accent-bright/30 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Nome do Jogo"
                    value={customGameTitle}
                    onChange={(e) => setCustomGameTitle(e.target.value)}
                    className="px-3 py-1.5 bg-[#0f111a] border border-[#262a3d] rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none"
                  />
                  <input
                    type="url"
                    placeholder="URL da Capa (opcional)"
                    value={customGameCover}
                    onChange={(e) => setCustomGameCover(e.target.value)}
                    className="px-3 py-1.5 bg-[#0f111a] border border-[#262a3d] rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Comentário ou motivo (ex: História horrível)"
                  value={customGameNote}
                  onChange={(e) => setCustomGameNote(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#0f111a] border border-[#262a3d] rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingCustom(false)}
                    className="px-3 py-1 rounded-lg text-xs font-mono text-gray-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleAddCustomGame}
                    className="px-4 py-1 rounded-lg bg-accent-bright text-black font-bold text-xs font-mono cursor-pointer"
                  >
                    Adicionar Jogo
                  </button>
                </div>
              </div>
            )}

            {/* Lista dos Jogos já Escolhidos */}
            {games.length === 0 ? (
              <div className="p-6 text-center text-xs font-mono text-gray-500 bg-[#12141f] rounded-xl border border-dashed border-border/70">
                Nenhum jogo adicionado a esta vitrine ainda. Escolha da sua biblioteca ou busque no catálogo do RAWG abaixo!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {games.map((g, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[#141724] border border-[#262a3d]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-10 h-12 rounded-lg overflow-hidden bg-black/60 shrink-0 border border-white/5">
                        {g.coverUrl ? (
                          <img src={g.coverUrl} alt={g.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-mono text-gray-500">
                            🎮
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-white truncate">{g.title}</h4>
                        <input
                          type="text"
                          placeholder="Comentário sobre ele..."
                          value={g.note || ''}
                          onChange={(e) => handleUpdateNote(idx, e.target.value)}
                          className="w-full mt-1 px-2 py-0.5 bg-[#0e1017] border border-white/5 rounded text-[11px] text-gray-300 placeholder-gray-600 focus:outline-none focus:border-accent-bright"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveGame(idx)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer shrink-0"
                      title="Remover da vitrine"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SELEÇÃO DE JOGOS: BIBLIOTECA OU PESQUISA GLOBAL RAWG */}
          <div className="space-y-3 pt-3 border-t border-[#1e2233]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              {/* Botões de Alternância de Fonte */}
              <div className="flex items-center gap-1 bg-[#131624] p-1 rounded-xl border border-[#23273a]">
                <button
                  type="button"
                  onClick={() => setSourceMode('library')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    sourceMode === 'library'
                      ? 'bg-accent-bright text-black shadow-neon-green/30'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Gamepad2 className="w-3.5 h-3.5" />
                  <span>Sua Biblioteca ({userGames.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSourceMode('rawg')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    sourceMode === 'rawg'
                      ? 'bg-cyan-500 text-black shadow-neon-cyan/30'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Catálogo Global RAWG</span>
                </button>
              </div>

              {/* Barra de Pesquisa */}
              <div className="relative w-full sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder={sourceMode === 'rawg' ? 'Digite nome do jogo (RAWG)...' : 'Buscar na sua biblioteca...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 bg-[#141724] border border-[#262a3d] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent-bright"
                />
              </div>
            </div>

            {/* MODO 1: Biblioteca do Usuário */}
            {sourceMode === 'library' && (
              <div className="space-y-3 pt-1">
                {filteredLibrary.length === 0 ? (
                  <div className="py-8 text-center space-y-3 bg-[#11131e] rounded-xl border border-dashed border-border/60 p-4">
                    <p className="text-xs font-mono text-gray-400">
                      Nenhum jogo correspondente encontrado na sua biblioteca local.
                    </p>
                    {searchQuery.trim().length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSourceMode('rawg')}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-gamer font-bold text-xs transition-all shadow-neon-cyan/30 cursor-pointer"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>Pesquisar "{searchQuery}" no Catálogo Global RAWG (500k+ Jogos)</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      {filteredLibrary.map((libGame) => (
                        <button
                          key={libGame.id}
                          type="button"
                          onClick={() => handleAddGame({
                            id: libGame.id,
                            title: libGame.title,
                            coverUrl: libGame.coverUrl || libGame.imageUrl,
                            rating: libGame.rating
                          })}
                          className="flex flex-col p-2 rounded-xl bg-[#131624] hover:bg-[#1b2034] border border-[#24293d] hover:border-accent-bright/50 text-left transition-all group cursor-pointer"
                        >
                          <div className="aspect-[3/4] w-full rounded-lg overflow-hidden bg-black/60 relative">
                            {libGame.coverUrl || libGame.imageUrl ? (
                              <img src={libGame.coverUrl || libGame.imageUrl} alt={libGame.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                                🎮
                              </div>
                            )}
                            {libGame.rating > 0 && (
                              <div className="absolute top-1 right-1 px-1 py-0.5 rounded bg-black/80 text-[9px] text-amber-300 font-mono flex items-center gap-0.5">
                                <Star className="w-2 h-2 fill-amber-400" /> {libGame.rating}
                              </div>
                            )}
                          </div>
                          <h5 className="text-[11px] font-bold text-white truncate group-hover:text-accent-bright mt-1.5">
                            {libGame.title}
                          </h5>
                        </button>
                      ))}
                    </div>

                    {searchQuery.trim().length > 0 && (
                      <div className="pt-2 text-center">
                        <button
                          type="button"
                          onClick={() => setSourceMode('rawg')}
                          className="text-xs font-mono text-cyan-400 hover:text-cyan-300 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Globe className="w-3 h-3" />
                          <span>Não encontrou? Pesquisar "{searchQuery}" no banco de dados do RAWG</span>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* MODO 2: Pesquisa no RAWG */}
            {sourceMode === 'rawg' && (
              <div className="pt-1">
                {isSearchingRawg ? (
                  <div className="py-8 flex items-center justify-center gap-2 text-cyan-400 font-mono text-xs">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Pesquisando no catálogo de 500.000+ jogos da RAWG...</span>
                  </div>
                ) : rawgResults.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {rawgResults.map((rawgGame) => {
                      const gameTitle = rawgGame.title || rawgGame.name;
                      const gameCover = rawgGame.imageUrl || rawgGame.background_image;
                      return (
                        <button
                          key={rawgGame.id}
                          type="button"
                          onClick={() => handleAddGame({
                            id: `rawg_${rawgGame.id}`,
                            title: gameTitle,
                            coverUrl: gameCover,
                            rating: rawgGame.rating
                          })}
                          className="flex flex-col p-2 rounded-xl bg-[#131624] hover:bg-[#1a2238] border border-[#24293d] hover:border-cyan-400/50 text-left transition-all group cursor-pointer"
                        >
                          <div className="aspect-[3/4] w-full rounded-lg overflow-hidden bg-black/60 relative">
                            {gameCover ? (
                              <img src={gameCover} alt={gameTitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                                🎮
                              </div>
                            )}
                            {rawgGame.rating > 0 && (
                              <div className="absolute top-1 right-1 px-1 py-0.5 rounded bg-black/80 text-[9px] text-amber-300 font-mono flex items-center gap-0.5">
                                <Star className="w-2 h-2 fill-amber-400" /> {rawgGame.rating}
                              </div>
                            )}
                          </div>
                          <h5 className="text-[11px] font-bold text-white truncate group-hover:text-cyan-300 mt-1.5" title={gameTitle}>
                            {gameTitle}
                          </h5>
                          <span className="text-[9px] font-mono text-gray-500 truncate">
                            {rawgGame.released?.slice(0, 4) || 'RAWG'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : searchQuery.length >= 2 ? (
                  <div className="py-8 text-center text-xs font-mono text-gray-500">
                    Nenhum jogo encontrado no RAWG para "{searchQuery}".
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs font-mono text-gray-400 bg-[#12141f] rounded-xl border border-dashed border-border/60 space-y-1">
                    <p className="font-semibold text-white">Pesquise qualquer jogo do mundo</p>
                    <p className="text-[11px] text-gray-500">Digite o nome de jogos antigos de PS1, PS2, PC, Xbox ou clássicos que jogou anos atrás para adicionar à sua vitrine.</p>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Botões Finais de Ação */}
          <div className="pt-4 border-t border-[#1e2233] flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-[#141724] hover:bg-[#1a1e30] border border-[#262a3d] text-gray-300 font-mono text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-accent-bright hover:bg-emerald-400 text-black font-gamer font-bold text-xs transition-all shadow-neon-green cursor-pointer"
            >
              Salvar Vitrine
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
