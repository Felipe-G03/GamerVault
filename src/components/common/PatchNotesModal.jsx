import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Gamepad2, 
  StickyNote, 
  Radio, 
  BookOpen, 
  EyeOff, 
  Rocket, 
  Keyboard, 
  Trophy, 
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  BadgePercent
} from 'lucide-react';

const HIGHLIGHTS = [
  {
    id: 'deals_radar',
    icon: BadgePercent,
    color: 'from-amber-500/20 to-yellow-500/10 text-amber-400 border-amber-500/30',
    tag: 'RADAR DE OFERTAS',
    tagColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    title: 'Comparador de Preços em 9 Lojas Oficiais',
    description: 'Nova aba dedicada que compara promoções em tempo real na Steam, Nuuvem, Epic Games, GOG, Green Man Gaming, Microsoft, Ubisoft, Fanatical e Humble Store em Reais (BRL), com histórico de menor preço e alerta de meta.'
  },
  {
    id: 'deals_curated',
    icon: ShieldCheck,
    color: 'from-cyan-500/20 to-blue-500/10 text-cyan-400 border-cyan-500/30',
    tag: 'CURADORIA DE PESO',
    tagColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    title: 'Modo Consagrados & Anti-Shovelware',
    description: 'Algoritmo baseado em Rank Global e reputação Steam que limpa DLCs, trilhas sonoras e jogos descartáveis, apresentando as melhores promoções dos maiores jogos do mundo.'
  },
  {
    id: 'deals_seal',
    icon: Sparkles,
    color: 'from-yellow-400/20 to-amber-500/10 text-yellow-300 border-yellow-400/30',
    tag: 'NOVO DESIGN',
    tagColor: 'bg-yellow-400/20 text-yellow-200 border-yellow-400/40',
    title: 'Selo Dourado & Ordem de Abas Renovada',
    description: 'Um selo dourado compacto no canto da tela avisa sobre descontos enquanto você navega no Vault, HUB ou Guilda. A barra superior agora organiza sua rotina gamer com fluidez.'
  },
  {
    id: 'overlay',
    icon: Gamepad2,
    color: 'from-purple-500/20 to-indigo-500/10 text-purple-400 border-purple-500/30',
    tag: 'HUD IN-GAME',
    tagColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    title: 'HUD Secreto In-Game (Overlay)',
    description: 'Enquanto joga qualquer game aberto pelo GamerVault, aperte Alt + O para abrir uma barra mágica por cima da sua tela sem precisar minimizar ou dar Alt+Tab.'
  },
  {
    id: 'notes',
    icon: StickyNote,
    color: 'from-amber-500/20 to-yellow-500/10 text-amber-400 border-amber-500/30',
    tag: 'ORGANIZAÇÃO',
    tagColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    title: 'Bloco de Notas por Jogo',
    description: 'Cada jogo tem agora um caderno de notas individual. Anote senhas de puzzles, builds, coordenadas e lembretes que ficam salvos para sempre no seu PC.'
  },
  {
    id: 'live',
    icon: Radio,
    color: 'from-rose-500/20 to-red-500/10 text-rose-400 border-rose-500/30',
    tag: 'COMUNIDADE',
    tagColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    title: 'Live Automática para a Guilda',
    description: 'Inicie transmissões com 1 clique direto pelo HUD. E o melhor: ao fechar o jogo, o GamerVault detecta e encerra a live automaticamente para você.'
  }
];

export default function PatchNotesModal({ onClose }) {
  const [selectedHighlight, setSelectedHighlight] = useState(null);

  const handleUnderstand = () => {
    try {
      localStorage.setItem('gamervault_last_patch_seen', '2.4.1');
    } catch (_) {}
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div 
        className="relative w-full max-w-3xl flex flex-col rounded-2xl bg-[#0c0e14] border border-cyan-500/30 shadow-[0_0_60px_rgba(6,182,212,0.18)] text-white overflow-hidden max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Glow Header */}
        <div className="relative px-5 sm:px-7 py-5 border-b border-border/70 bg-gradient-to-r from-cyan-950/40 via-surface to-surface-container flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                  O QUE HÁ DE NOVO
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold">
                  v2.4.1 • Radar de Ofertas
                </span>
              </div>
              <h2 className="text-base sm:text-xl font-gamer font-bold text-white tracking-wide">
                Gamer's Vault Atualizado!
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-surface/80 hover:bg-surface-high text-gray-400 hover:text-white transition-colors border border-border/60"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Intro Banner */}
        <div className="px-5 sm:px-7 py-3 bg-gradient-to-r from-accent-bright/10 via-purple-500/10 to-transparent border-b border-border/50 flex items-center gap-3">
          <ShieldCheck className="w-4 h-4 text-accent-bright shrink-0" />
          <p className="text-xs text-gray-300 font-sans leading-relaxed">
            Preparamos esta versão com foco em praticidade pura: menos janelas abertas, atalhos inteligentes e recursos úteis dentro e fora das suas partidas.
          </p>
        </div>

        {/* Lista de Novidades Grid */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-3.5 max-h-[58vh] scrollbar-thin">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {HIGHLIGHTS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="flex flex-col p-4 rounded-xl bg-surface/60 border border-border/70 hover:border-cyan-500/40 transition-all duration-200 group hover:bg-surface/90"
                >
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg bg-gradient-to-br border ${item.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs sm:text-sm font-gamer font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {item.title}
                      </h4>
                    </div>

                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase font-bold tracking-wider shrink-0 ${item.tagColor}`}>
                      {item.tag}
                    </span>
                  </div>

                  <p className="text-xs text-gray-300 font-sans leading-relaxed pl-1">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-7 py-4 border-t border-border/70 bg-surface/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-gray-400 font-mono hidden sm:flex">
            <CheckCircle2 className="w-4 h-4 text-accent-bright" />
            <span>Tudo pronto para você aproveitar sua jogatina ao máximo.</span>
          </div>

          <button
            type="button"
            onClick={handleUnderstand}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-gamer font-bold tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all active-press"
          >
            <span>Bora Jogar!</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
