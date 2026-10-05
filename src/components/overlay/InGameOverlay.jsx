import React, { useState, useEffect, useRef } from 'react';
import {
  Gamepad2,
  Radio,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  Clock,
  Check,
  Loader2
} from 'lucide-react';
import { listenToActiveCasts, endCastSession } from '../../services/vaultCastService';

export default function InGameOverlay() {
  const [activeGame, setActiveGame] = useState(null);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [expandedSection, setExpandedSection] = useState(null); // 'notes' | null
  
  // Game Notes
  const [notes, setNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [savedNotesBadge, setSavedNotesBadge] = useState(false);
  const saveTimeoutRef = useRef(null);

  // VaultCast Estado
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isStartingLive, setIsStartingLive] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [activeCastId, setActiveCastId] = useState(null);

  // Carrega o jogo ativo inicial
  useEffect(() => {
    if (window.electronAPI?.getActiveGame) {
      window.electronAPI.getActiveGame().then((game) => {
        if (game) {
          setActiveGame(game);
          if (game.startedAt) {
            setSessionSeconds(Math.max(0, Math.floor((Date.now() - game.startedAt) / 1000)));
          }
        } else {
          setActiveGame(null);
          window.electronAPI?.hideOverlay?.();
        }
      });
    }

    if (window.electronAPI?.onActiveGameChanged) {
      const unsub = window.electronAPI.onActiveGameChanged((game) => {
        setActiveGame(game);
        setSessionSeconds(0);
        if (!game) {
          window.electronAPI?.hideOverlay?.();
        }
      });
      return unsub;
    }
  }, []);

  // Se não houver jogo ativo, oculta o overlay imediatamente
  useEffect(() => {
    if (!activeGame && window.electronAPI?.hideOverlay) {
      window.electronAPI.hideOverlay();
    }
  }, [activeGame]);

  // Timer de sessão do jogo
  useEffect(() => {
    if (!activeGame) return;
    const timer = setInterval(() => {
      setSessionSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [activeGame]);

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

  // Sincroniza expansão da janela do Electron
  const toggleSection = (section) => {
    const next = expandedSection === section ? null : section;
    setExpandedSection(next);
    if (window.electronAPI?.setOverlayExpanded) {
      window.electronAPI.setOverlayExpanded(Boolean(next));
    }
  };

  // Sincronização de estado da Live via Firestore, Electron IPC e BroadcastChannel
  useEffect(() => {
    // 1. Firestore listener
    const unsubFirestore = listenToActiveCasts((casts) => {
      const myCast = casts.find(c => c.gameTitle === activeGame?.title);
      if (myCast) {
        setIsBroadcasting(true);
        setActiveCastId(myCast.id);
        setIsStartingLive(false);
      } else {
        setIsBroadcasting(false);
        setActiveCastId(null);
      }
    });

    // 2. Electron IPC listener
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

    // 3. BroadcastChannel listener (Cross-window dentro do mesmo Electron)
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

  // Iniciar live direto do HUD
  const handleStartLiveFromOverlay = () => {
    if (isBroadcasting || isStartingLive) return;
    setIsStartingLive(true);
    setTimeout(() => setIsStartingLive(false), 5000);

    // Dispara via IPC no Electron
    if (window.electronAPI?.requestStartLive) {
      window.electronAPI.requestStartLive(activeGame);
    }

    // Dispara via BroadcastChannel
    try {
      const bc = new BroadcastChannel('vaultcast_sync');
      bc.postMessage({ type: 'TRIGGER_START_LIVE', game: activeGame });
      bc.close();
    } catch (_) {}
  };

  // Encerrar live direto do HUD
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

  // Abre diretamente o guia do IGN para o jogo no navegador padrão
  const handleOpenIgnGuide = () => {
    const gameName = activeGame?.title || 'game';
    const query = encodeURIComponent(`${gameName} guide walkthrough`);
    const url = `https://www.ign.com/search?q=${query}`;
    window.open(url, '_blank');
  };

  const handleHideOverlay = () => {
    if (window.electronAPI?.hideOverlay) {
      window.electronAPI.hideOverlay();
    }
  };

  // Se não houver jogo ativo, não renderiza conteúdo
  if (!activeGame) {
    return null;
  }

  return (
    <div className="w-full flex flex-col items-center select-none font-sans p-2">
      {/* ========================================================
          BARRA HORIZONTAL PRINCIPAL (Glassmorphism Concisa)
          ======================================================== */}
      <div className="w-[660px] h-12 px-4 rounded-2xl bg-[#090b12]/92 backdrop-blur-xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.85)] flex items-center justify-between transition-all">
        
        {/* LADO ESQUERDO: Ícone e Título do Jogo Ativo */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm">
            <Gamepad2 className="w-4 h-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-gamer font-bold text-white truncate max-w-[210px]" title={activeGame?.title}>
                {activeGame?.title}
              </h3>
              <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-800/40 shrink-0">
                <Clock className="w-2.5 h-2.5" />
                {formatTime(sessionSeconds)}
              </span>
            </div>
          </div>
        </div>

        {/* CENTRO: Módulos Rápidos (Live, Notas, Guia IGN) */}
        <div className="flex items-center gap-2 shrink-0 px-2">
          
          {/* BOTÃO DE TRANSMISSÃO VAULTCAST */}
          {isBroadcasting ? (
            <button
              onClick={handleStopLiveFromOverlay}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/30 hover:bg-red-600/40 border border-red-500/50 text-red-400 text-[11px] font-mono font-bold transition-all animate-pulse cursor-pointer shadow-md"
              title="Transmissão ativa! Clique para encerrar a live."
            >
              <Radio className="w-3.5 h-3.5 text-red-400" />
              <span>AO VIVO</span>
              {viewerCount > 0 && <span className="text-[10px] text-gray-200">({viewerCount})</span>}
              <span className="text-[9px] underline ml-1 text-white">Parar</span>
            </button>
          ) : (
            <button
              onClick={handleStartLiveFromOverlay}
              disabled={isStartingLive}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-[11px] font-mono font-bold transition-all cursor-pointer shadow-neon-cyan/20 disabled:opacity-60"
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
            onClick={() => toggleSection('notes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
              expandedSection === 'notes'
                ? 'bg-accent-bright text-black shadow-neon-green/40'
                : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5'
            }`}
            title="Abrir anotações e códigos salvos para este jogo"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Notas</span>
            {expandedSection === 'notes' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {/* BOTÃO GUIA IGN (Direto no Navegador) */}
          <button
            onClick={handleOpenIgnGuide}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#bf1313]/25 hover:bg-[#bf1313]/40 border border-red-500/40 text-red-300 hover:text-white text-xs font-mono font-bold transition-all cursor-pointer shadow-sm group"
            title={`Abrir detonado e guias do ${activeGame?.title || 'jogo'} no IGN`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500 group-hover:scale-125 transition-transform" />
            <span>Guia IGN</span>
            <ExternalLink className="w-3 h-3 text-red-400 group-hover:text-white transition-colors" />
          </button>
        </div>

        {/* LADO DIREITO: Atalho e Fechar Overlay */}
        <div className="flex items-center gap-2 pl-2 border-l border-white/10">
          <span className="text-[10px] font-mono text-gray-500 hidden sm:inline" title="Atalho global para abrir/fechar">
            Alt+O
          </span>
          <button
            onClick={handleHideOverlay}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Recolher Overlay (Alt+O)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================
          PAINEL EXPANDIDO: BLOCO DE NOTAS DO JOGO
          ======================================================== */}
      {expandedSection === 'notes' && (
        <div className="w-[660px] mt-2 p-4 rounded-2xl bg-[#0b0e18]/95 backdrop-blur-xl border border-accent-bright/30 shadow-2xl animate-fade-in space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-accent-bright" />
              <h4 className="text-xs font-gamer font-bold text-white">
                Bloco de Notas // {activeGame?.title}
              </h4>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-mono">
              {isSavingNotes && (
                <span className="text-gray-400">Salvando...</span>
              )}
              {savedNotesBadge && (
                <span className="text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Salvo no PC
                </span>
              )}
              <span className="text-gray-500">Salvo automaticamente</span>
            </div>
          </div>

          <textarea
            value={notes}
            onChange={handleNotesChange}
            placeholder="Digite senhas de cofres, códigos de portas, lembretes de quests, puzzles ou builds aqui... Salvo automaticamente para este jogo!"
            className="w-full h-56 p-3 bg-[#070910] border border-white/10 rounded-xl text-xs font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent-bright resize-none custom-scrollbar leading-relaxed"
            autoFocus
          />
        </div>
      )}
    </div>
  );
}
