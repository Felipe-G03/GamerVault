import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Gamepad2, 
  Palette, 
  Crown, 
  ShieldCheck, 
  Sliders, 
  Trophy, 
  CheckCircle2,
  ChevronRight,
  Layers
} from 'lucide-react';

const HIGHLIGHTS = [
  {
    id: 'impeccable_design',
    icon: Sparkles,
    color: 'from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30',
    tag: 'DESIGN REVOLUTION',
    tagColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    title: 'Padrão Impeccable Visual',
    description: 'Adotamos o Impeccable no design system: contraste aperfeiçoado, dock de navegação flutuante estilo console HUD, ambient lighting duplo e acabamento premium em toda a interface.'
  },
  {
    id: 'guild_podium',
    icon: Crown,
    color: 'from-amber-500/20 to-yellow-500/10 text-amber-400 border-amber-500/30',
    tag: 'HALL DA FAMA',
    tagColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    title: 'Pódio Visual Top 3 na Guilda',
    description: 'A aba Guilda agora conta com um pódio olímpico destacando o 1º MVP com coroa dourada, 2º prata e 3º bronze, além de categorias de ranking intuitivas e cartões com a aura de cada membro.'
  },
  {
    id: 'profile_aura',
    icon: Palette,
    color: 'from-pink-500/20 to-rose-500/10 text-pink-400 border-pink-500/30',
    tag: 'PERSONALIZAÇÃO',
    tagColor: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
    title: 'Seletor de Cor & Aura de Perfil',
    description: 'Personalize a cor da sua aura por seletor livre ou paletas gamer rápidas. Sua cor ilumina o modal e os destaques quando seus amigos visualizarem seu perfil na guilda.'
  },
  {
    id: 'qol_polish',
    icon: Sliders,
    color: 'from-cyan-500/20 to-blue-500/10 text-cyan-400 border-cyan-500/30',
    tag: 'QUALIDADE DE VIDA',
    tagColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    title: 'Melhorias de QoL e Fluidez',
    description: 'Múltiplos refinamentos de usabilidade e performance: cartões de jogos com visual limpo, transições suaves e feed social integrado com identidade visual dos membros.'
  }
];

export default function PatchNotesModal({ onClose }) {
  const [selectedHighlight, setSelectedHighlight] = useState(null);

  const handleUnderstand = () => {
    try {
      localStorage.setItem('gamervault_last_patch_seen', '2.4.2');
    } catch (_) {}
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div 
        className="relative w-full max-w-3xl flex flex-col rounded-2xl bg-[#0c0e14] border border-emerald-500/30 shadow-[0_0_60px_rgba(16,185,129,0.18)] text-white overflow-hidden max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Glow Header */}
        <div className="relative px-5 sm:px-7 py-5 border-b border-border/70 bg-gradient-to-r from-emerald-950/40 via-surface to-surface-container flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
                  O QUE HÁ DE NOVO
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold">
                  v2.4.2 • Impeccable & QoL
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
        <div className="px-5 sm:px-7 py-3 bg-gradient-to-r from-accent-bright/10 via-cyan-500/5 to-transparent border-b border-border/50 flex items-center gap-3">
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
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-gamer font-bold tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all active-press"
          >
            <span>Bora Jogar!</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
