import React from 'react';
import { Gamepad2, Layers, Dices, Compass, BadgePercent, PlusCircle, Users, BarChart3, User, LogOut, Sparkles } from 'lucide-react';
import BgmPlayer from '../common/BgmPlayer';

export default function Navbar({ activeTab, setActiveTab, profile, onLogout }) {
  const tabs = [
    { id: 'vault', label: 'Vault', icon: Gamepad2 },
    { id: 'adicionar', label: 'Adicionar Jogo', icon: PlusCircle },
    { id: 'hub', label: 'HUB', icon: Layers },
    { id: 'explorar', label: 'Explorar', icon: Compass },
    { id: 'guilda', label: 'Guilda', icon: Users },
    { id: 'estatisticas', label: 'Estatísticas', icon: BarChart3 },
    { id: 'perfil', label: 'Perfil', icon: User },
    { id: 'roleta', label: 'Larga de Frescura', icon: Dices },
    { id: 'ofertas', label: 'Ofertas', icon: BadgePercent, tag: 'PROMO' },
  ];

  return (
    <header className="w-full bg-surface-low/90 backdrop-blur-xl border-b border-border/80 select-none transition-colors duration-500 sticky top-0 z-30">
      {/* Top Banner / Hero Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-3.5 pb-2.5 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Sair / Logout */}
        <div className="flex items-center gap-2 self-start md:self-auto order-2 md:order-1">
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface hover:bg-rose-950/40 border border-white/5 hover:border-rose-500/30 text-white/70 hover:text-rose-300 text-xs font-mono font-medium tracking-wide transition-all active-press cursor-pointer"
            title="Encerrar sessão"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>

        {/* Central Logo Gamer's Vault */}
        <div className="flex flex-col items-center text-center order-1 md:order-2 group cursor-default">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent-subtle/80 border border-accent/40 text-accent-bright shadow-[0_0_20px_var(--accent-glow)] transition-transform duration-300 group-hover:scale-105">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-gamer font-extrabold tracking-widest text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
              Gamer's Vault
            </h1>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">
              Depósito Pessoal & Social
            </span>
            <span className="text-zinc-600">•</span>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
              <span className="px-2 py-0.5 rounded-md bg-surface-high/80 border border-border text-accent-bright font-semibold">
                {profile?.nickname || 'Gamer'}
              </span>
            </div>
          </div>
        </div>

        {/* Player de Trilha Sonora de Fundo (EA Trax) */}
        <div className="order-3 flex items-center justify-end">
          <BgmPlayer />
        </div>
      </div>

      {/* Navegação por Abas (Dock Gaming / Segmented Control) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <nav className="flex items-center gap-1 sm:gap-1.5 pt-1.5 pb-2 overflow-x-auto scrollbar-none">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap active-press cursor-pointer ${
                  isActive
                    ? 'bg-surface-high/90 text-white shadow-[0_4px_16px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] border border-white/10'
                    : 'text-zinc-400 hover:text-white hover:bg-surface/60 border border-transparent hover:border-white/5'
                }`}
              >
                {/* Ícone com Destaque Dinâmico */}
                <Icon
                  className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${
                    isActive ? 'text-accent-bright drop-shadow-[0_0_6px_var(--accent-glow)]' : 'text-zinc-400 group-hover:text-zinc-200'
                  }`}
                />

                <span className="relative font-medium tracking-wide">
                  {tab.label}
                </span>

                {/* Tag de destaque (ex: Ofertas) */}
                {tab.tag && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded font-extrabold bg-amber-400 text-black shadow-sm tracking-wider">
                    {tab.tag}
                  </span>
                )}

                {/* Linha de brilho inferior ativo */}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-accent-bright shadow-[0_0_8px_var(--accent-bright)]"
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
