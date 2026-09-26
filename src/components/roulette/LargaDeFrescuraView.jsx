import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Dices,
  Swords,
  Layers,
  Bookmark,
  Search,
  Trash2,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  Flame,
  Plus
} from 'lucide-react';
import {
  getRouletteItems,
  saveRouletteItems,
  removeRouletteItem,
  clearRouletteItems,
  addRouletteItem
} from '../../services/rouletteStorageService';
import { getAllHubGames, launchGame } from '../../services/hubService';
import { isWishlist } from '../../utils/gameUtils';
import { searchRawgGames } from '../../config/rawg';
import DiscoverGameModal from '../discover/DiscoverGameModal';

// Sons sintéticos via Web Audio API (Zero arquivos externos)
function playTickSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.035);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.035);
  } catch (_) {}
}

function playWinSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [261.63, 329.63, 392.0, 523.25, 659.25];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.09);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + i * 0.09 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.09);
      osc.stop(ctx.currentTime + i * 0.09 + 0.3);
    });
  } catch (_) {}
}

const SLICE_COLORS = [
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#ef4444', // red
  '#14b8a6', // teal
  '#6366f1'  // indigo
];

export default function LargaDeFrescuraView({ games = [], onDirectAddWishlist }) {
  const [mode, setMode] = useState('roulette'); // 'roulette' | 'tournament'
  const [items, setItems] = useState(() => getRouletteItems());

  // Modais de Importação no estilo Biblioteca
  const [showHubModal, setShowHubModal] = useState(false);
  const [showBacklogModal, setShowBacklogModal] = useState(false);
  const [selectedHubIds, setSelectedHubIds] = useState(new Set());
  const [selectedBacklogIds, setSelectedBacklogIds] = useState(new Set());

  // Busca rápida de jogos adicionais
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Estados da Roleta
  const canvasRef = useRef(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winnerGame, setWinnerGame] = useState(null);
  const rotationRef = useRef(0);
  const lastTickSliceRef = useRef(-1);

  // Estados do Torneio Mata-Mata
  const [tournamentRound, setTournamentRound] = useState(1);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [matches, setMatches] = useState([]);
  const [nextRoundCandidates, setNextRoundCandidates] = useState([]);
  const [tournamentWinner, setTournamentWinner] = useState(null);

  // Modal de Detalhes
  const [selectedGameForModal, setSelectedGameForModal] = useState(null);

  // Jogos escaneados do Hub
  const hubGames = useMemo(() => getAllHubGames(), []);
  // Jogos da lista de desejos
  const backlogGames = useMemo(() => games.filter(g => isWishlist(g.status)), [games]);

  // Sincroniza itens da roleta com eventos do sistema
  useEffect(() => {
    const handleUpdate = (e) => {
      if (e.detail) setItems(e.detail);
    };
    window.addEventListener('gamervault:roulette-updated', handleUpdate);
    return () => window.removeEventListener('gamervault:roulette-updated', handleUpdate);
  }, []);

  // 1. Desenho da Roleta no Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const radius = width / 2 - 14;
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.clearRect(0, 0, width, height);

    if (items.length === 0) {
      // Roleta vazia amigável
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#334155';
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Adicione jogos para girar!', centerX, centerY);
      return;
    }

    const numSlices = items.length;
    const sliceAngle = (2 * Math.PI) / numSlices;
    const rotation = rotationRef.current;

    for (let i = 0; i < numSlices; i++) {
      const angle = rotation + i * sliceAngle;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, angle, angle + sliceAngle);
      ctx.closePath();

      ctx.fillStyle = SLICE_COLORS[i % SLICE_COLORS.length];
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#020617';
      ctx.stroke();

      // Texto do título do jogo na fatia
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = numSlices > 10 ? 'bold 11px sans-serif' : 'bold 13px sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = 4;

      const title = items[i].title;
      const displayTitle = title.length > 18 ? title.slice(0, 16) + '...' : title;
      ctx.fillText(displayTitle, radius - 18, 5);
      ctx.restore();
    }

    // Centro da Roleta (Miolo)
    ctx.beginPath();
    ctx.arc(centerX, centerY, 32, 0, 2 * Math.PI);
    ctx.fillStyle = '#020617';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#f8fafc';
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VAULT', centerX, centerY + 4);
  }, [items]);

  // 2. Animação de Giro da Roleta
  const handleSpinRoulette = () => {
    if (items.length < 2 || isSpinning) return;
    setIsSpinning(true);
    setWinnerGame(null);

    const spinTotalAngle = Math.PI * 2 * (5 + Math.random() * 4); // 5 a 9 voltas completas
    const duration = 4500; // 4.5 segundos
    const startRotation = rotationRef.current;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Easing cúbico para desaceleração realista
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentRotation = startRotation + spinTotalAngle * easeOut;
      rotationRef.current = currentRotation;

      // Som de tick ao trocar de fatia no ponteiro
      const numSlices = items.length;
      const sliceAngle = (2 * Math.PI) / numSlices;
      // Ponteiro está no topo (3 * PI / 2 radianos)
      const pointerAngle = (3 * Math.PI) / 2;
      const normalizedAngle = (pointerAngle - (currentRotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const currentSlice = Math.floor(normalizedAngle / sliceAngle);

      if (currentSlice !== lastTickSliceRef.current) {
        playTickSound();
        lastTickSliceRef.current = currentSlice;
      }

      // Redesenha manual no loop para performance máxima de 60fps
      if (canvasRef.current) {
        const c = canvasRef.current;
        const ctx = c.getContext('2d');
        const w = c.width;
        const h = c.height;
        const r = w / 2 - 14;
        const cx = w / 2;
        const cy = h / 2;
        ctx.clearRect(0, 0, w, h);

        for (let i = 0; i < numSlices; i++) {
          const angle = currentRotation + i * sliceAngle;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, r, angle, angle + sliceAngle);
          ctx.closePath();
          ctx.fillStyle = SLICE_COLORS[i % SLICE_COLORS.length];
          ctx.fill();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#020617';
          ctx.stroke();

          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(angle + sliceAngle / 2);
          ctx.textAlign = 'right';
          ctx.fillStyle = '#ffffff';
          ctx.font = numSlices > 10 ? 'bold 11px sans-serif' : 'bold 13px sans-serif';
          ctx.shadowColor = 'rgba(0,0,0,0.85)';
          ctx.shadowBlur = 4;
          const title = items[i].title;
          const displayTitle = title.length > 18 ? title.slice(0, 16) + '...' : title;
          ctx.fillText(displayTitle, r - 18, 5);
          ctx.restore();
        }

        ctx.beginPath();
        ctx.arc(cx, cy, 32, 0, 2 * Math.PI);
        ctx.fillStyle = '#020617';
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#f8fafc';
        ctx.stroke();
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('VAULT', cx, cy + 4);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        playWinSound();
        const winner = items[currentSlice % items.length];
        setWinnerGame(winner);
      }
    };

    requestAnimationFrame(animate);
  };

  // 3. Mecanismo do Torneio Mata-Mata
  const startTournament = () => {
    if (items.length < 2) return;
    setTournamentWinner(null);
    setTournamentRound(1);
    setCurrentMatchIndex(0);
    setNextRoundCandidates([]);

    // Embaralha os jogos aleatoriamente
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    const roundMatches = [];

    // Cria os pares (Game A vs Game B)
    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) {
        roundMatches.push({
          gameA: shuffled[i],
          gameB: shuffled[i + 1]
        });
      } else {
        // Se número ímpar, o jogo sem par passa direto!
        roundMatches.push({
          gameA: shuffled[i],
          gameB: null, // Bye (Passa direto)
          isBye: true
        });
      }
    }

    setMatches(roundMatches);
  };

  // Auto-inicializa o chaveamento quando entra no modo torneio ou quando adiciona itens
  useEffect(() => {
    if (mode === 'tournament' && items.length >= 2 && matches.length === 0 && !tournamentWinner) {
      startTournament();
    }
  }, [mode, items.length]);

  const handleSelectTournamentWinner = (chosenGame) => {
    playTickSound();
    const updatedCandidates = [...nextRoundCandidates, chosenGame];

    // Se ainda há partidas na rodada atual
    if (currentMatchIndex + 1 < matches.length) {
      setNextRoundCandidates(updatedCandidates);
      setCurrentMatchIndex(prev => prev + 1);
    } else {
      // Rodada atual finalizada
      if (updatedCandidates.length === 1) {
        // Temos o Grande Campeão!
        playWinSound();
        setTournamentWinner(updatedCandidates[0]);
      } else {
        // Próxima fase do torneio!
        const nextRoundMatches = [];
        for (let i = 0; i < updatedCandidates.length; i += 2) {
          if (i + 1 < updatedCandidates.length) {
            nextRoundMatches.push({
              gameA: updatedCandidates[i],
              gameB: updatedCandidates[i + 1]
            });
          } else {
            nextRoundMatches.push({
              gameA: updatedCandidates[i],
              gameB: null,
              isBye: true
            });
          }
        }
        setMatches(nextRoundMatches);
        setCurrentMatchIndex(0);
        setNextRoundCandidates([]);
        setTournamentRound(prev => prev + 1);
      }
    }
  };

  // 4. Importação de Jogos do Hub
  const handleConfirmHubImport = () => {
    const toAdd = hubGames.filter(g => selectedHubIds.has(g.id || g.title));
    const current = getRouletteItems();
    const map = new Map(current.map(i => [i.title.toLowerCase().trim(), i]));
    toAdd.forEach(g => {
      map.set(g.title.toLowerCase().trim(), {
        id: g.id || `hub_${Date.now()}_${Math.random()}`,
        title: g.title,
        imageUrl: g.imageUrl || '',
        platform: g.platformName || 'PC',
        rating: g.rating || 0
      });
    });
    saveRouletteItems([...map.values()]);
    setShowHubModal(false);
    setSelectedHubIds(new Set());
  };

  // 5. Importação de Jogos do Backlog
  const handleConfirmBacklogImport = () => {
    const toAdd = backlogGames.filter(g => selectedBacklogIds.has(g.id || g.title));
    const current = getRouletteItems();
    const map = new Map(current.map(i => [i.title.toLowerCase().trim(), i]));
    toAdd.forEach(g => {
      map.set(g.title.toLowerCase().trim(), {
        id: g.id || `backlog_${Date.now()}_${Math.random()}`,
        title: g.title,
        imageUrl: g.imageUrl || '',
        platform: 'Backlog',
        rating: g.rating || 0
      });
    });
    saveRouletteItems([...map.values()]);
    setShowBacklogModal(false);
    setSelectedBacklogIds(new Set());
  };

  // 6. Busca rápida RAWG
  const handleSearchRawg = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || isSearching) return;
    setIsSearching(true);
    try {
      const res = await searchRawgGames(searchQuery.trim(), 1);
      setSearchResults(res ? res.slice(0, 6) : []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6 select-none font-sans">
      
      {/* Top Header & Seletor de Modo */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-surface-low border border-border p-4 sm:p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <Dices className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-gamer font-bold text-white tracking-wide flex items-center gap-2">
                Larga de Frescura
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 uppercase font-mono font-semibold">
                  Decisor Oficial
                </span>
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Chega de encarar o menu por 40 minutos. Deixe a roleta ou o torneio decidir o que você vai jogar agora.
              </p>
            </div>
          </div>
        </div>

        {/* Alternador de Modo */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-default rounded-xl border border-border self-start md:self-auto">
          <button
            onClick={() => setMode('roulette')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              mode === 'roulette'
                ? 'bg-accent-bright text-surface-low shadow-sm font-bold'
                : 'text-gray-400 hover:text-white hover:bg-surface-high'
            }`}
          >
            <Dices className="w-4 h-4" />
            Roleta da Fortuna
          </button>
          <button
            onClick={() => {
              setMode('tournament');
              startTournament();
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              mode === 'tournament'
                ? 'bg-orange-500 text-surface-low shadow-sm font-bold'
                : 'text-gray-400 hover:text-white hover:bg-surface-high'
            }`}
          >
            <Swords className="w-4 h-4" />
            Torneio Mata-Mata
          </button>
        </div>
      </div>

      {/* Main Grid: Área Visual (Roleta / Mata-Mata) + Painel Lateral de Jogos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Lado Esquerdo: O Jogo Visual (8 colunas) */}
        <div className="lg:col-span-8 bg-surface-low border border-border rounded-2xl p-6 flex flex-col items-center justify-center min-h-[520px] relative overflow-hidden">
          
          {/* MODO 1: ROLETA DA FORTUNA */}
          {mode === 'roulette' && (
            <div className="w-full flex flex-col items-center justify-center space-y-6">
              
              {/* Roleta Visual com Ponteiro */}
              <div className="relative flex items-center justify-center">
                {/* Ponteiro Triangular no Topo */}
                <div className="absolute -top-3 z-20 w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[24px] border-t-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" />

                {/* Canvas da Roleta */}
                <canvas
                  ref={canvasRef}
                  width={380}
                  height={380}
                  className="rounded-full shadow-[0_0_40px_rgba(0,0,0,0.6)] border-4 border-surface-container"
                />
              </div>

              {/* Botão de Giro */}
              <button
                onClick={handleSpinRoulette}
                disabled={items.length < 2 || isSpinning}
                className="px-8 py-3.5 rounded-xl bg-accent-bright hover:bg-accent-bright/90 disabled:opacity-40 text-surface-low font-gamer font-bold text-sm tracking-wider uppercase shadow-[0_0_25px_var(--accent-glow)] transition-all active-press flex items-center gap-2"
              >
                <Dices className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
                {isSpinning ? 'GIRANDO...' : 'GIRAR / LARGA DE FRESCURA'}
              </button>

              {items.length < 2 && (
                <p className="text-xs text-amber-400 font-mono">
                  Adicione pelo menos 2 jogos na lista ao lado para girar a roleta.
                </p>
              )}
            </div>
          )}

          {/* MODO 2: TORNEIO MATA-MATA (1v1) */}
          {mode === 'tournament' && (
            <div className="w-full flex flex-col items-center justify-center space-y-6">
              {items.length < 2 ? (
                <div className="text-center space-y-2 py-12">
                  <Swords className="w-12 h-12 text-gray-600 mx-auto" />
                  <p className="text-sm font-semibold text-gray-400">
                    Adicione pelo menos 2 jogos para disputar o mata-mata!
                  </p>
                </div>
              ) : tournamentWinner ? (
                /* Campeão do Torneio */
                <div className="text-center space-y-5 animate-in zoom-in-95 duration-300 py-6 max-w-md w-full">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(245,158,11,0.3)] animate-bounce">
                    <Trophy className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
                      🏆 O Campeão Supremo da Noite
                    </span>
                    <h2 className="text-2xl font-gamer font-extrabold text-white mt-1">
                      {tournamentWinner.title}
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">
                      Ele sobreviveu a todas as rodadas do mata-mata. Acabou a desculpa, é hora de jogar!
                    </p>
                  </div>

                  {tournamentWinner.imageUrl && (
                    <img
                      src={tournamentWinner.imageUrl}
                      alt={tournamentWinner.title}
                      className="w-full h-44 rounded-xl object-cover border border-white/10 shadow-lg mx-auto"
                    />
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={startTournament}
                      className="flex-1 py-2.5 rounded-xl bg-surface-high hover:bg-surface-higher text-gray-300 font-semibold text-xs border border-border transition-colors flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Novo Torneio
                    </button>
                    <button
                      onClick={() => setSelectedGameForModal(tournamentWinner)}
                      className="flex-1 py-2.5 rounded-xl bg-accent-bright hover:bg-accent-bright/90 text-surface-low font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Ver / Jogar Agora
                    </button>
                  </div>
                </div>
              ) : matches.length > 0 && matches[currentMatchIndex] ? (
                /* Duelo Ativo */
                <div className="w-full max-w-2xl space-y-5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs text-gray-400 font-mono border-b border-border pb-3">
                    <span className="font-bold text-orange-400 uppercase">
                      Fase {tournamentRound} • Duelo {currentMatchIndex + 1} de {matches.length}
                    </span>
                    <span>Clique no jogo que você prefere jogar hoje:</span>
                  </div>

                  {/* Se for partida com Bye (Ímpar que passa direto) */}
                  {matches[currentMatchIndex].isBye ? (
                    <div className="p-6 rounded-2xl bg-surface-default border border-amber-500/30 text-center space-y-3">
                      <span className="text-xs font-mono text-amber-400 uppercase font-semibold">
                        Sorteio Ímpar • Passou Direto de Fase!
                      </span>
                      <h3 className="text-xl font-bold text-white">
                        {matches[currentMatchIndex].gameA.title}
                      </h3>
                      <button
                        onClick={() => handleSelectTournamentWinner(matches[currentMatchIndex].gameA)}
                        className="px-6 py-2.5 bg-accent-bright text-surface-low font-bold rounded-xl text-xs hover:bg-accent-bright/90 transition-all"
                      >
                        Avançar para o Próximo Round
                      </button>
                    </div>
                  ) : (
                    /* Duelo 1v1 Normal */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative">
                      {/* Versus Badge Central */}
                      <div className="hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-surface-low border border-orange-500/40 text-orange-400 items-center justify-center font-gamer font-bold text-xs shadow-md">
                        VS
                      </div>

                      {/* Card Jogo A */}
                      <div
                        onClick={() => handleSelectTournamentWinner(matches[currentMatchIndex].gameA)}
                        className="p-4 rounded-2xl bg-surface-default border border-border/80 hover:border-accent-bright/60 transition-all cursor-pointer group flex flex-col justify-between h-64 relative overflow-hidden shadow-sm"
                      >
                        {matches[currentMatchIndex].gameA.imageUrl && (
                          <div
                            className="absolute inset-0 bg-cover bg-center opacity-25 group-hover:opacity-40 transition-opacity"
                            style={{ backgroundImage: `url(${matches[currentMatchIndex].gameA.imageUrl})` }}
                          />
                        )}
                        <div className="relative z-10">
                          <span className="text-[10px] font-mono uppercase text-gray-400">Opção 1</span>
                          <h4 className="text-base font-bold text-white mt-1 group-hover:text-accent-bright transition-colors">
                            {matches[currentMatchIndex].gameA.title}
                          </h4>
                        </div>
                        <button className="relative z-10 w-full py-2 bg-accent-bright/15 group-hover:bg-accent-bright text-accent-bright group-hover:text-surface-low font-bold text-xs rounded-xl border border-accent-bright/30 transition-all">
                          Escolher Este Jogo
                        </button>
                      </div>

                      {/* Card Jogo B */}
                      <div
                        onClick={() => handleSelectTournamentWinner(matches[currentMatchIndex].gameB)}
                        className="p-4 rounded-2xl bg-surface-default border border-border/80 hover:border-orange-500/60 transition-all cursor-pointer group flex flex-col justify-between h-64 relative overflow-hidden shadow-sm"
                      >
                        {matches[currentMatchIndex].gameB.imageUrl && (
                          <div
                            className="absolute inset-0 bg-cover bg-center opacity-25 group-hover:opacity-40 transition-opacity"
                            style={{ backgroundImage: `url(${matches[currentMatchIndex].gameB.imageUrl})` }}
                          />
                        )}
                        <div className="relative z-10">
                          <span className="text-[10px] font-mono uppercase text-gray-400">Opção 2</span>
                          <h4 className="text-base font-bold text-white mt-1 group-hover:text-orange-400 transition-colors">
                            {matches[currentMatchIndex].gameB.title}
                          </h4>
                        </div>
                        <button className="relative z-10 w-full py-2 bg-orange-500/15 group-hover:bg-orange-500 text-orange-400 group-hover:text-surface-low font-bold text-xs rounded-xl border border-orange-500/30 transition-all">
                          Escolher Este Jogo
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center space-y-4 py-8 max-w-sm">
                  <div className="w-16 h-16 rounded-2xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center mx-auto shadow-md">
                    <Swords className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-gamer font-bold text-white">Chaveamento Pronto</h3>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                      Você tem <strong className="text-orange-400 font-bold">{items.length} jogos</strong> selecionados. Vamos colocá-los frente a frente em duelos 1v1 até sobrar o Grande Campeão!
                    </p>
                  </div>
                  <button
                    onClick={startTournament}
                    className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-surface-low font-gamer font-bold text-xs tracking-wider uppercase rounded-xl shadow-md transition-all active-press flex items-center justify-center gap-2 mx-auto"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Iniciar Mata-Mata Agora
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Lado Direito: Gerenciamento dos Jogos na Disputa (4 colunas) */}
        <div className="lg:col-span-4 bg-surface-low border border-border rounded-2xl p-5 space-y-4">
          
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                Jogos na Disputa
                <span className="text-xs font-mono px-1.5 py-0.2 rounded bg-surface-high text-accent-bright border border-border">
                  {items.length}
                </span>
              </h3>
              <p className="text-[11px] text-gray-400">
                Selecione do Hub, do Backlog ou busque
              </p>
            </div>
            {items.length > 0 && (
              <button
                onClick={clearRouletteItems}
                title="Limpar todos os jogos da roleta"
                className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpar
              </button>
            )}
          </div>

          {/* Botões de Ação de Importação */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowHubModal(true)}
              className="p-2.5 rounded-xl bg-surface-default hover:bg-surface-high border border-border text-xs font-semibold text-gray-200 transition-all flex items-center justify-center gap-2"
            >
              <Layers className="w-4 h-4 text-sky-400" />
              Do Meu Hub
            </button>
            <button
              onClick={() => setShowBacklogModal(true)}
              className="p-2.5 rounded-xl bg-surface-default hover:bg-surface-high border border-border text-xs font-semibold text-gray-200 transition-all flex items-center justify-center gap-2"
            >
              <Bookmark className="w-4 h-4 text-pink-400" />
              Do Backlog
            </button>
          </div>

          {/* Busca Rápida RAWG */}
          <form onSubmit={handleSearchRawg} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar jogo avulso para adicionar..."
              className="w-full pl-8 pr-16 py-2 rounded-xl bg-surface-default border border-border focus:border-accent-bright focus:outline-none text-xs text-white placeholder-gray-500"
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <button
              type="submit"
              disabled={isSearching}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-surface-high hover:bg-surface-higher text-[10px] font-bold text-white rounded-lg border border-border"
            >
              Buscar
            </button>
          </form>

          {/* Resultados da Busca rápida */}
          {searchResults.length > 0 && (
            <div className="p-2 rounded-xl bg-surface-default border border-border space-y-1.5 max-h-40 overflow-y-auto">
              <span className="text-[10px] text-gray-400 font-mono px-1">Resultados da busca:</span>
              {searchResults.map(game => (
                <div
                  key={game.id}
                  className="flex items-center justify-between p-1.5 rounded-lg hover:bg-surface-high text-xs text-white"
                >
                  <span className="truncate pr-2">{game.title}</span>
                  <button
                    onClick={() => {
                      addRouletteItem(game);
                      setSearchResults(prev => prev.filter(g => g.id !== game.id));
                    }}
                    className="p-1 rounded bg-accent-bright/20 text-accent-bright hover:bg-accent-bright/30"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Lista com Scroll dos Jogos Ativos */}
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
            {items.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500 font-mono">
                Nenhum jogo na roleta ainda.
              </div>
            ) : (
              items.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="flex items-center justify-between p-2 rounded-xl bg-surface-default/70 border border-border/60 hover:border-border text-xs text-slate-200 group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: SLICE_COLORS[idx % SLICE_COLORS.length] }}
                    />
                    <span className="truncate font-medium">{item.title}</span>
                  </div>
                  <button
                    onClick={() => removeRouletteItem(item.id)}
                    className="p-1 rounded hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* MODAL: RESULTADO DO VENCEDOR DA ROLETA */}
      {winnerGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-surface-low border border-accent-bright/40 rounded-2xl p-6 text-center space-y-4 shadow-[0_0_50px_rgba(0,0,0,0.85)]">
            <div className="w-14 h-14 rounded-2xl bg-accent-bright/20 border border-accent-bright/40 text-accent-bright flex items-center justify-center mx-auto shadow-md animate-bounce">
              <Trophy className="w-7 h-7" />
            </div>

            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-accent-bright font-bold">
                🎯 Jogo Sorteado pelo Destino
              </span>
              <h2 className="text-2xl font-gamer font-extrabold text-white mt-1">
                {winnerGame.title}
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                A roleta falou! Sem desculpas e sem frescura: essa é a sua jogatina de hoje.
              </p>
            </div>

            {winnerGame.imageUrl && (
              <img
                src={winnerGame.imageUrl}
                alt={winnerGame.title}
                className="w-full h-40 rounded-xl object-cover border border-white/10 shadow-md"
              />
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  setSelectedGameForModal(winnerGame);
                  setWinnerGame(null);
                }}
                className="w-full py-2.5 bg-accent-bright hover:bg-accent-bright/90 text-surface-low font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <Play className="w-4 h-4 fill-current" />
                Bora Jogar / Ver Detalhes
              </button>

              <button
                onClick={() => {
                  removeRouletteItem(winnerGame.id);
                  setWinnerGame(null);
                  handleSpinRoulette();
                }}
                className="w-full py-2 bg-surface-high hover:bg-surface-higher text-gray-300 text-xs font-semibold rounded-xl border border-border transition-colors flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Hoje não... Eliminar da Roleta e Girar de Novo
              </button>

              <button
                onClick={() => setWinnerGame(null)}
                className="text-xs text-gray-400 hover:text-white pt-1"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: IMPORTAR DO HUB ESTILO BIBLIOTECA */}
      {showHubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="max-w-2xl w-full bg-surface-low border border-border rounded-2xl p-6 flex flex-col max-h-[85vh] shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-bold text-white">Importar Jogos do Seu Hub</h3>
              </div>
              <button onClick={() => setShowHubModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-400 py-3">
              Marque os jogos instalados ou cadastrados no seu Game Hub que deseja incluir no Larga de Frescura:
            </p>

            <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 pr-1 my-2">
              {hubGames.length === 0 ? (
                <div className="col-span-2 py-10 text-center text-xs text-gray-500 font-mono">
                  Nenhum jogo encontrado no seu Game Hub.
                </div>
              ) : (
                hubGames.map(g => {
                  const isChecked = selectedHubIds.has(g.id || g.title);
                  return (
                    <div
                      key={g.id || g.title}
                      onClick={() => {
                        const next = new Set(selectedHubIds);
                        if (isChecked) next.delete(g.id || g.title);
                        else next.add(g.id || g.title);
                        setSelectedHubIds(next);
                      }}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                        isChecked
                          ? 'bg-sky-500/15 border-sky-400 text-white'
                          : 'bg-surface-default border-border/80 text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded flex items-center justify-center border ${isChecked ? 'bg-sky-500 border-sky-400 text-black' : 'border-gray-600'}`}>
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="text-xs font-semibold truncate">{g.title}</span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <button
                onClick={() => {
                  if (selectedHubIds.size === hubGames.length) setSelectedHubIds(new Set());
                  else setSelectedHubIds(new Set(hubGames.map(g => g.id || g.title)));
                }}
                className="text-xs text-sky-400 hover:underline"
              >
                {selectedHubIds.size === hubGames.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowHubModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface-high text-xs text-gray-300 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmHubImport}
                  disabled={selectedHubIds.size === 0}
                  className="px-5 py-2 rounded-xl bg-accent-bright disabled:opacity-40 text-surface-low font-bold text-xs"
                >
                  Adicionar Selecionados ({selectedHubIds.size})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: IMPORTAR DO BACKLOG (DESEJOS) */}
      {showBacklogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="max-w-2xl w-full bg-surface-low border border-border rounded-2xl p-6 flex flex-col max-h-[85vh] shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-pink-400" />
                <h3 className="text-base font-bold text-white">Importar do Backlog (Desejos)</h3>
              </div>
              <button onClick={() => setShowBacklogModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-400 py-3">
              Marque os jogos da sua lista de desejos que você está enrolando para jogar:
            </p>

            <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 pr-1 my-2">
              {backlogGames.length === 0 ? (
                <div className="col-span-2 py-10 text-center text-xs text-gray-500 font-mono">
                  Nenhum jogo na sua lista de desejos / backlog.
                </div>
              ) : (
                backlogGames.map(g => {
                  const isChecked = selectedBacklogIds.has(g.id || g.title);
                  return (
                    <div
                      key={g.id || g.title}
                      onClick={() => {
                        const next = new Set(selectedBacklogIds);
                        if (isChecked) next.delete(g.id || g.title);
                        else next.add(g.id || g.title);
                        setSelectedBacklogIds(next);
                      }}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                        isChecked
                          ? 'bg-pink-500/15 border-pink-400 text-white'
                          : 'bg-surface-default border-border/80 text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded flex items-center justify-center border ${isChecked ? 'bg-pink-500 border-pink-400 text-black' : 'border-gray-600'}`}>
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="text-xs font-semibold truncate">{g.title}</span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <button
                onClick={() => {
                  if (selectedBacklogIds.size === backlogGames.length) setSelectedBacklogIds(new Set());
                  else setSelectedBacklogIds(new Set(backlogGames.map(g => g.id || g.title)));
                }}
                className="text-xs text-pink-400 hover:underline"
              >
                {selectedBacklogIds.size === backlogGames.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowBacklogModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface-high text-xs text-gray-300 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmBacklogImport}
                  disabled={selectedBacklogIds.size === 0}
                  className="px-5 py-2 rounded-xl bg-accent-bright disabled:opacity-40 text-surface-low font-bold text-xs"
                >
                  Adicionar Selecionados ({selectedBacklogIds.size})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes Completo quando clicado */}
      {selectedGameForModal && (
        <DiscoverGameModal
          game={selectedGameForModal}
          isOwned={false}
          isWishlist={false}
          onClose={() => setSelectedGameForModal(null)}
          onAddToWishlist={() => {
            if (onDirectAddWishlist) {
              onDirectAddWishlist(selectedGameForModal);
            }
            setSelectedGameForModal(null);
          }}
          onRegisterFull={() => {}}
        />
      )}
    </div>
  );
}
