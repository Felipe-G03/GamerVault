import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Gamepad2,
  Radio,
  FileText,
  ChevronDown,
  ChevronUp,
  X,
  Clock,
  Check,
  Loader2,
  Compass,
  Search,
  BookOpen,
  Key,
  Swords,
  Map,
  Copy,
  CornerDownRight,
  ShieldAlert
} from 'lucide-react';
import { listenToActiveCasts, endCastSession } from '../../services/vaultCastService';

export default function InGameOverlay() {
  const [activeGame, setActiveGame] = useState(null);
  const [overlayMode, setOverlayMode] = useState('compact'); // 'compact' | 'expanded' | 'hidden'
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [totalPlaytimeSeconds, setTotalPlaytimeSeconds] = useState(0);
  const [expandedSection, setExpandedSection] = useState(null); // 'notes' | 'guide' | null
  const [fps, setFps] = useState(60);

  // Game Notes
  const [notes, setNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [savedNotesBadge, setSavedNotesBadge] = useState(false);
  const saveTimeoutRef = useRef(null);

  // Guia IGN in-overlay
  const [guideQuery, setGuideQuery] = useState('');
  const [activeGuideCategory, setActiveGuideCategory] = useState('walkthrough');
  const [copiedId, setCopiedId] = useState(null);

  // VaultCast Estado
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isStartingLive, setIsStartingLive] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [activeCastId, setActiveCastId] = useState(null);

  // Medição suave de FPS em tempo real via requestAnimationFrame
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let rafId;

    const measure = (currentTime) => {
      frameCount++;
      const elapsed = currentTime - lastTime;
      if (elapsed >= 500) {
        const measured = Math.round((frameCount * 1000) / elapsed);
        setFps(measured);
        frameCount = 0;
        lastTime = currentTime;
      }
      rafId = requestAnimationFrame(measure);
    };

    rafId = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Sincroniza modo do overlay com o processo principal do Electron
  useEffect(() => {
    if (window.electronAPI?.getOverlayMode) {
      window.electronAPI.getOverlayMode().then((m) => {
        if (m) setOverlayMode(m);
      });
    }

    if (window.electronAPI?.onOverlayModeChanged) {
      const unsub = window.electronAPI.onOverlayModeChanged((newMode) => {
        if (newMode) setOverlayMode(newMode);
      });
      return unsub;
    }
  }, []);

  // Carrega o jogo ativo inicial
  useEffect(() => {
    if (window.electronAPI?.getActiveGame) {
      window.electronAPI.getActiveGame().then((game) => {
        if (game) {
          setActiveGame(game);
          if (game.startedAt) {
            setSessionSeconds(Math.max(0, Math.floor((Date.now() - game.startedAt) / 1000)));
          }
          if (window.electronAPI?.getGamePlaytime && game.title) {
            window.electronAPI.getGamePlaytime(game.title).then((rec) => {
              if (rec?.totalSeconds) setTotalPlaytimeSeconds(rec.totalSeconds);
            });
          }
        } else {
          setActiveGame(null);
        }
      });
    }

    if (window.electronAPI?.onActiveGameChanged) {
      const unsub = window.electronAPI.onActiveGameChanged((game) => {
        setActiveGame(game);
        setSessionSeconds(0);
        if (game) {
          if (window.electronAPI?.getGamePlaytime && game.title) {
            window.electronAPI.getGamePlaytime(game.title).then((rec) => {
              if (rec?.totalSeconds) setTotalPlaytimeSeconds(rec.totalSeconds);
            });
          }
        }
      });
      return unsub;
    }
  }, []);

  // Escuta atualizações contínuas de tempo de jogo via IPC
  useEffect(() => {
    if (window.electronAPI?.onPlaytimeUpdated) {
      const unsub = window.electronAPI.onPlaytimeUpdated((payload) => {
        if (payload?.totalSeconds !== undefined) {
          setTotalPlaytimeSeconds(payload.totalSeconds);
        }
      });
      return unsub;
    }
  }, [activeGame]);

  // Timer de sessão do jogo/overlay
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Atalho Esc para fechar painel e devolver foco imediato ao jogo
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (expandedSection) {
          toggleSection(null);
          window.electronAPI?.focusGame?.();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expandedSection]);

  // Formata tempo (HH:MM:SS)
  const formatTime = (totalSecs) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Formata tempo total acumulado
  const formatHours = (totalSecs) => {
    const s = Number(totalSecs) || 0;
    if (s <= 0) return '0m';
    if (s < 3600) {
      return `${Math.max(1, Math.floor(s / 60))}m`;
    }
    const h = s / 3600;
    return `${h.toFixed(1)}h`;
  };

  // Carrega notas do jogo atual
  const gameKey = activeGame?.title || 'general_notes';
  useEffect(() => {
    if (window.electronAPI?.getGameNotes) {
      window.electronAPI.getGameNotes(gameKey).then((saved) => {
        setNotes(saved || '');
      });
    }
  }, [gameKey]);

  // Auto-save das notas com debounce
  const handleNotesChange = (e) => {
    const val = e.target.value;
    setNotes(val);
    setIsSavingNotes(true);
    setSavedNotesBadge(false);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      if (window.electronAPI?.saveGameNotes) {
        await window.electronAPI.saveGameNotes({ gameKey, content: val });
        setIsSavingNotes(false);
        setSavedNotesBadge(true);
        setTimeout(() => setSavedNotesBadge(false), 2000);
      }
    }, 800);
  };

  const insertNoteSnippet = (snippet) => {
    const newNotes = notes ? `${notes}\n${snippet}` : snippet;
    setNotes(newNotes);
    setIsSavingNotes(true);
    if (window.electronAPI?.saveGameNotes) {
      window.electronAPI.saveGameNotes({ gameKey, content: newNotes }).then(() => {
        setIsSavingNotes(false);
        setSavedNotesBadge(true);
        setTimeout(() => setSavedNotesBadge(false), 2000);
      });
    }
  };

  // Sincroniza expansão da janela do Electron
  const toggleSection = (section) => {
    const next = expandedSection === section ? null : section;
    setExpandedSection(next);
    if (window.electronAPI?.setOverlayExpanded) {
      window.electronAPI.setOverlayExpanded(Boolean(next));
    }
  };

  // Retorna foco para o jogo
  const handleReturnFocusToGame = () => {
    if (window.electronAPI?.focusGame) {
      window.electronAPI.focusGame();
    }
  };

  // Sincronização de estado da Live
  useEffect(() => {
    const unsubFirestore = listenToActiveCasts((casts) => {
      const myCast = casts.find((c) => c.gameTitle === activeGame?.title);
      if (myCast) {
        setIsBroadcasting(true);
        setActiveCastId(myCast.id);
        setIsStartingLive(false);
      } else {
        setIsBroadcasting(false);
        setActiveCastId(null);
      }
    });

    const unsubIpc = window.electronAPI?.onBroadcastState?.((state) => {
      if (state) {
        setIsBroadcasting(Boolean(state.isBroadcasting));
        if (state.isBroadcasting) {
          setIsStartingLive(false);
        }
        if (typeof state.viewerCount === 'number') {
          setViewerCount(state.viewerCount);
        }
      }
    });

    let bc = null;
    try {
      bc = new BroadcastChannel('vaultcast_sync');
      bc.onmessage = (event) => {
        if (event.data?.type === 'VAULTCAST_STATE_CHANGE') {
          setIsBroadcasting(Boolean(event.data.isBroadcasting));
          if (event.data.isBroadcasting) {
            setIsStartingLive(false);
          }
          if (typeof event.data.viewerCount === 'number') {
            setViewerCount(event.data.viewerCount);
          }
        }
      };
    } catch (_) {}

    return () => {
      unsubFirestore();
      unsubIpc?.();
      bc?.close();
    };
  }, [activeGame]);

  const handleStartLiveFromOverlay = () => {
    if (isBroadcasting || isStartingLive) return;
    setIsStartingLive(true);
    setTimeout(() => setIsStartingLive(false), 5000);

    if (window.electronAPI?.requestStartLive) {
      window.electronAPI.requestStartLive(activeGame);
    }

    try {
      const bc = new BroadcastChannel('vaultcast_sync');
      bc.postMessage({ type: 'TRIGGER_START_LIVE', game: activeGame });
      bc.close();
    } catch (_) {}
  };

  const handleStopLiveFromOverlay = async () => {
    if (window.electronAPI?.requestStopLive) {
      window.electronAPI.requestStopLive();
    }

    try {
      const bc = new BroadcastChannel('vaultcast_sync');
      bc.postMessage({ type: 'TRIGGER_STOP_LIVE' });
      bc.close();
    } catch (_) {}

    if (activeCastId) {
      await endCastSession(activeCastId);
    }

    setIsBroadcasting(false);
    setIsStartingLive(false);
    setActiveCastId(null);
  };

  const handleHideOverlay = () => {
    setOverlayMode('hidden');
    if (window.electronAPI?.setOverlayMode) {
      window.electronAPI.setOverlayMode('hidden');
    } else if (window.electronAPI?.hideOverlay) {
      window.electronAPI.hideOverlay();
    }
  };

  // Cores dinâmicas para o contador de FPS
  const getFpsStyle = (val) => {
    if (val >= 55) {
      return {
        text: 'text-emerald-400',
        dot: 'bg-emerald-400',
        badgeBg: 'bg-emerald-950/70',
        border: 'border-emerald-500/40'
      };
    }
    if (val >= 30) {
      return {
        text: 'text-amber-400',
        dot: 'bg-amber-400',
        badgeBg: 'bg-amber-950/70',
        border: 'border-amber-500/40'
      };
    }
    return {
      text: 'text-rose-400',
      dot: 'bg-rose-400',
      badgeBg: 'bg-rose-950/70',
      border: 'border-rose-500/40'
    };
  };

  const fpsStyle = getFpsStyle(fps);

  // BASE DE CONHECIMENTO DE GUIAS E DETONADOS IN-GAME (100% INTERNOS, SEM ABRIR NAVEGADOR)
  const currentTitle = activeGame?.title || "Gamer's Vault // HUD";

  const guideDatabase = useMemo(() => [
    {
      id: 'g1',
      category: 'walkthrough',
      title: 'Ordem de Fases e Progressão de História',
      game: currentTitle,
      content: 'Complete as missões principais na sequência recomendada. Fique atento a side-quests temporárias que expiram ao avançar de capítulo. Mantenha saves manuais antes de marcos de história.',
      code: 'Save Point: Antes do Ato II'
    },
    {
      id: 'g2',
      category: 'walkthrough',
      title: 'Ponto Sem Retorno (Point of No Return)',
      game: currentTitle,
      content: 'Antes da batalha ou calabouço final, o jogo exibirá um aviso. Esse é o momento ideal para coletar todas as armas secretas, concluir side-quests pendentes e upar equipamentos ao máximo.',
      code: 'Aviso de Não-Retorno: 85% da Campanha'
    },
    {
      id: 'g3',
      category: 'puzzles',
      title: 'Cofres, Portas Digitais & Senhas Comuns',
      game: currentTitle,
      content: 'Procure datas em bilhetes, quadros brancos, calendários de parede e mensagens de áudio na área imediata. Senhas de 4 dígitos frequentemente correspondem a anos de fundação ou aniversários mencionados.',
      code: 'Dica de Código: Inspecione o verso de fotos e crachás'
    },
    {
      id: 'g4',
      category: 'puzzles',
      title: 'Enigmas de Fiação e Rotação de Engrenagens',
      game: currentTitle,
      content: 'Comece alinhando as peças a partir das bordas externas em direção ao centro. Para quebra-cabeças elétricos, siga o fluxo de energia da fonte primária (LED vermelho para verde).',
      code: 'Padrão: Externo -> Central'
    },
    {
      id: 'g5',
      category: 'bosses',
      title: 'Janelas de Esquiva, Parrying e Postura de Bosses',
      game: currentTitle,
      content: 'Observe os olhos ou a arma do chefe brilhando antes de ataques indefensáveis. Não ataque mais de 2 vezes seguidas após uma esquiva bem-sucedida; guarde estamina para o contra-ataque.',
      code: 'Tática: 2 Golpes -> Recuo com Rolamento'
    },
    {
      id: 'g6',
      category: 'bosses',
      title: 'Fase 2 de Chefes (Abaixo de 50% HP)',
      game: currentTitle,
      content: 'Abaixo da metade da vida, chefes costumam ganhar ataques em área (AoE) e maior agressividade. Use itens consumíveis de buff de dano e foque em ataques à distância para manter distância segura.',
      code: 'Fase Crítica: Buffer de Dano Elementar'
    },
    {
      id: 'g7',
      category: 'collectibles',
      title: 'Armas Secretas & Itens Lendários',
      game: currentTitle,
      content: 'Explore salas ocultas atrás de paredes rachadas, cachoeiras e dutos de ventilação. Sons ambientes e mapas com áreas sombreadas sem contorno costumam indicar passagens secretas.',
      code: 'Localizador: Paredes com rachaduras e frestas'
    },
    {
      id: 'g8',
      category: 'collectibles',
      title: 'Mapas & Colecionáveis de Conquistas',
      game: currentTitle,
      content: 'Verifique o menu de mapa regularmente. Áreas com 100% de exploração indicam que todos os baús e colecionáveis foram resgatados. Itens de colecionador geralmente emitem um brilho pulsante.',
      code: 'Exploração: 100% da Região'
    }
  ], [currentTitle]);

  const filteredGuides = useMemo(() => {
    return guideDatabase.filter((item) => {
      const matchCat = activeGuideCategory === 'all' || item.category === activeGuideCategory;
      if (!matchCat) return false;
      if (!guideQuery.trim()) return true;
      const q = guideQuery.toLowerCase();
      return item.title.toLowerCase().includes(q) || item.content.toLowerCase().includes(q) || item.code.toLowerCase().includes(q);
    });
  }, [guideDatabase, activeGuideCategory, guideQuery]);

  const handleCopyCode = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Se estiver no modo oculto, não renderiza conteúdo
  if (overlayMode === 'hidden') {
    return null;
  }

  // ========================================================
  // MODO COMPACTO: MINI HUD DE FPS NO CANTO DA TELA
  // 100% TRANSPARENTE E IMPOSSÍVEL DE SER CLICADO (CLICK-THROUGH)
  // ========================================================
  if (overlayMode === 'compact') {
    return (
      <div className="w-full h-full flex items-center justify-center select-none font-sans overflow-hidden pointer-events-none bg-transparent">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/35 backdrop-blur-sm pointer-events-none">
          <span className={`w-1.5 h-1.5 rounded-full ${fpsStyle.dot} animate-pulse shrink-0`} />
          <span className={`text-[13px] font-mono font-black tracking-tight ${fpsStyle.text}`}>
            {fps}
          </span>
          <span className="text-[9px] font-mono text-gray-400 uppercase tracking-widest font-semibold">
            FPS
          </span>
        </div>
      </div>
    );
  }

  // ========================================================
  // MODO EXPANDIDO: BARRA HORIZONTAL COMPLETA (HUD + PAINÉIS)
  // ========================================================
  return (
    <div className="w-full flex flex-col items-center select-none font-sans p-1">
      {/* BARRA HORIZONTAL PRINCIPAL */}
      <div className="w-[780px] h-12 px-4 rounded-2xl bg-[#080b13]/94 backdrop-blur-xl border border-white/15 shadow-2xl flex items-center justify-between transition-all">
        
        {/* LADO ESQUERDO: Ícone, Título do Jogo, Contador de FPS e Tempos */}
        <div className="flex items-center gap-2.5 min-w-0 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <Gamepad2 className="w-4 h-4" />
          </div>

          <h3 className="text-xs font-gamer font-bold text-white truncate max-w-[150px] shrink-0" title={currentTitle}>
            {currentTitle}
          </h3>

          {/* Badge Dinâmico de FPS */}
          <span
            className={`flex items-center gap-1.5 text-[10px] font-mono font-bold ${fpsStyle.text} ${fpsStyle.badgeBg} px-2 py-0.5 rounded-lg border ${fpsStyle.border} shrink-0`}
            title="Taxa de quadros por segundo em tempo real"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${fpsStyle.dot} animate-pulse`} />
            <span>{fps} FPS</span>
          </span>

          {/* Tempo da Sessão */}
          <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-800/40 shrink-0" title="Tempo jogado nesta sessão">
            <Clock className="w-3 h-3 text-emerald-400" />
            <span>{formatTime(sessionSeconds)}</span>
          </span>

          {/* Tempo Total Acumulado */}
          {totalPlaytimeSeconds > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-800/40 shrink-0" title="Tempo total acumulado pelo Gamer's Hub">
              <span>Tot: {formatHours(totalPlaytimeSeconds)}</span>
            </span>
          )}
        </div>

        {/* CENTRO: Módulos Rápidos (Live, Notas, Guia IGN) */}
        <div className="flex items-center gap-2 shrink-0 px-2">
          
          {/* BOTÃO DE TRANSMISSÃO VAULTCAST */}
          {isBroadcasting ? (
            <button
              type="button"
              onClick={handleStopLiveFromOverlay}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/30 hover:bg-red-600/40 border border-red-500/50 text-red-400 text-[11px] font-mono font-bold transition-all animate-pulse cursor-pointer shrink-0"
              title="Transmissão ativa! Clique para encerrar a live."
            >
              <Radio className="w-3.5 h-3.5 text-red-400" />
              <span>AO VIVO</span>
              {viewerCount > 0 && <span className="text-[10px] text-gray-200">({viewerCount})</span>}
              <span className="text-[9px] underline ml-1 text-white">Parar</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartLiveFromOverlay}
              disabled={isStartingLive}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-[11px] font-mono font-bold transition-all cursor-pointer disabled:opacity-60 shrink-0"
              title="Transmitir esta janela de jogo ao vivo no VaultCast para sua guilda"
            >
              {isStartingLive ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  <span>Iniciando...</span>
                </>
              ) : (
                <>
                  <Radio className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Iniciar Live</span>
                </>
              )}
            </button>
          )}

          {/* BOTÃO BLOCO DE NOTAS */}
          <button
            type="button"
            onClick={() => toggleSection('notes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer shrink-0 ${
              expandedSection === 'notes'
                ? 'bg-accent-bright text-black font-bold shadow-sm'
                : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5'
            }`}
            title="Abrir anotações e códigos salvos deste jogo"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Notas</span>
            {expandedSection === 'notes' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {/* BOTÃO GUIA IGN (Abre Painel In-Game Sem Sair do Jogo) */}
          <button
            type="button"
            onClick={() => toggleSection('guide')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer shrink-0 ${
              expandedSection === 'guide'
                ? 'bg-red-500 text-white shadow-sm'
                : 'bg-[#bf1313]/25 hover:bg-[#bf1313]/40 border border-red-500/40 text-red-300 hover:text-white'
            }`}
            title="Consultar detonados e guias diretamente sobre a tela do jogo sem sair da janela"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Guia IGN</span>
            {expandedSection === 'guide' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* LADO DIREITO: Atalho e Fechar Overlay */}
        <div className="flex items-center gap-2 pl-2 border-l border-white/10 shrink-0">
          <span className="text-[10px] font-mono text-gray-400" title="Atalho global para alternar Modos (Compacto / Expandido / Oculto)">
            Alt+O
          </span>
          <button
            type="button"
            onClick={handleHideOverlay}
            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Ocultar Overlay (Alt+O)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================
          PAINEL EXPANDIDO 1: BLOCO DE NOTAS DO JOGO
          100% IN-GAME: NÃO ROUBA FOCO AUTOMATICAMENTE NEM MINIMIZA O JOGO!
          ======================================================== */}
      {expandedSection === 'notes' && (
        <div className="w-[780px] mt-2 p-4 rounded-2xl bg-[#080b14]/96 backdrop-blur-xl border border-accent-bright/35 shadow-2xl animate-fade-in space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-accent-bright" />
              <h4 className="text-xs font-gamer font-bold text-white">
                Bloco de Notas // {currentTitle}
              </h4>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-[10px] font-mono">
                {isSavingNotes && <span className="text-gray-400">Salvando...</span>}
                {savedNotesBadge && (
                  <span className="text-emerald-400 flex items-center gap-1 font-bold">
                    <Check className="w-3 h-3" /> Salvo no PC
                  </span>
                )}
                <span className="text-gray-500">Salvo automaticamente</span>
              </div>

              {/* Botão para Devolver Foco Imediato ao Jogo */}
              <button
                type="button"
                onClick={handleReturnFocusToGame}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold transition-all cursor-pointer"
                title="Devolver controle e foco imediato para a janela do jogo"
              >
                <CornerDownRight className="w-3 h-3" />
                <span>Voltar ao Jogo</span>
              </button>
            </div>
          </div>

          {/* Atalhos Rápidos para Inserir nas Notas */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] font-mono">
            <span className="text-gray-500">Inserir rápido:</span>
            <button
              type="button"
              onClick={() => insertNoteSnippet(`[SENHA]: `)}
              className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 cursor-pointer"
            >
              + Senha
            </button>
            <button
              type="button"
              onClick={() => insertNoteSnippet(`[PUZZLE]: `)}
              className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 cursor-pointer"
            >
              + Puzzle
            </button>
            <button
              type="button"
              onClick={() => insertNoteSnippet(`[COORDENADA]: `)}
              className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 cursor-pointer"
            >
              + Coordenada
            </button>
            <button
              type="button"
              onClick={() => insertNoteSnippet(`[BUILD/DICA]: `)}
              className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 cursor-pointer"
            >
              + Build
            </button>
          </div>

          <textarea
            value={notes}
            onChange={handleNotesChange}
            placeholder="Digite senhas de cofres, códigos de portas, lembretes de quests, puzzles ou builds aqui... Salvo automaticamente para este jogo! Pressione Esc para voltar ao jogo."
            className="w-full h-52 p-3 bg-[#06080f] border border-white/10 rounded-xl text-xs font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent-bright resize-none custom-scrollbar leading-relaxed"
          />
        </div>
      )}

      {/* ========================================================
          PAINEL EXPANDIDO 2: GUIA RÁPIDO IGN (DIRETO NO OVERLAY)
          100% IN-GAME: DETONADOS, PUZZLES, BOSSES E CÓDIGOS SEM NENHUM NAVEGADOR EXTERNO!
          ======================================================== */}
      {expandedSection === 'guide' && (
        <div className="w-[780px] mt-2 p-4 rounded-2xl bg-[#080b14]/96 backdrop-blur-xl border border-red-500/40 shadow-2xl animate-fade-in space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-red-400" />
              <h4 className="text-xs font-gamer font-bold text-white">
                Guia Rápido IGN & Detonados // {currentTitle}
              </h4>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Guia Integrado (Sem sair do jogo)
              </span>

              {/* Botão de Retorno Rápido ao Jogo */}
              <button
                type="button"
                onClick={handleReturnFocusToGame}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold transition-all cursor-pointer"
                title="Devolver controle e foco imediato para a janela do jogo"
              >
                <CornerDownRight className="w-3 h-3" />
                <span>Voltar ao Jogo</span>
              </button>
            </div>
          </div>

          {/* BARRA DE PESQUISA E CATEGORIAS DO GUIA */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={guideQuery}
                onChange={(e) => setGuideQuery(e.target.value)}
                placeholder={`Filtrar detonado, senhas de cofres, fraqueza de bosses de ${currentTitle}...`}
                className="w-full pl-9 pr-3 py-2 bg-[#06080f] border border-white/10 rounded-xl text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-red-400"
              />
            </div>

            {/* Categorias */}
            <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-xl border border-white/5 shrink-0">
              <button
                type="button"
                onClick={() => setActiveGuideCategory('walkthrough')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  activeGuideCategory === 'walkthrough' ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-3 h-3" />
                <span>Fases</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveGuideCategory('puzzles')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  activeGuideCategory === 'puzzles' ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Key className="w-3 h-3" />
                <span>Senhas</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveGuideCategory('bosses')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  activeGuideCategory === 'bosses' ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Swords className="w-3 h-3" />
                <span>Bosses</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveGuideCategory('collectibles')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  activeGuideCategory === 'collectibles' ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Map className="w-3 h-3" />
                <span>Mapas</span>
              </button>
            </div>
          </div>

          {/* LISTA DE DETONADOS E DICAS IN-GAME (ROLA DENTRO DO OVERLAY SEM SAIR DO JOGO) */}
          <div className="grid grid-cols-2 gap-2.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
            {filteredGuides.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/5 hover:border-red-500/30 transition-all space-y-1.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-gamer font-bold text-white flex items-center gap-1.5 truncate">
                      {item.category === 'walkthrough' && <BookOpen className="w-3 h-3 text-red-400 shrink-0" />}
                      {item.category === 'puzzles' && <Key className="w-3 h-3 text-amber-400 shrink-0" />}
                      {item.category === 'bosses' && <Swords className="w-3 h-3 text-rose-400 shrink-0" />}
                      {item.category === 'collectibles' && <Map className="w-3 h-3 text-cyan-400 shrink-0" />}
                      <span className="truncate">{item.title}</span>
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-300 leading-relaxed pt-1">
                    {item.content}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <span className="text-[9px] font-mono text-amber-300/90 truncate max-w-[220px]">
                    {item.code}
                  </span>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyCode(item.id, `${item.title}: ${item.code}`)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-[9px] font-mono transition-colors cursor-pointer"
                      title="Copiar código ou dica"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="w-2.5 h-2.5 text-emerald-400" />
                          <span className="text-emerald-400">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-2.5 h-2.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => insertNoteSnippet(`[GUIA]: ${item.title} -> ${item.code}`)}
                      className="px-2 py-0.5 rounded bg-accent-bright/20 hover:bg-accent-bright/30 text-accent-bright text-[9px] font-mono transition-colors cursor-pointer"
                      title="Inserir dica diretamente no seu Bloco de Notas do jogo"
                    >
                      + Notas
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredGuides.length === 0 && (
              <div className="col-span-2 py-8 text-center space-y-1">
                <ShieldAlert className="w-5 h-5 text-gray-500 mx-auto" />
                <p className="text-xs font-mono text-gray-400">
                  Nenhum guia encontrado para a pesquisa "{guideQuery}".
                </p>
                <p className="text-[10px] text-gray-500 font-mono">
                  Dica: Tente pesquisar por palavras como "senha", "porta", "boss" ou selecione outra categoria.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
