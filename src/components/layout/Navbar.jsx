import React from 'react';
import { Gamepad2, Compass, PlusCircle, Users, BarChart3, User, LogOut } from 'lucide-react';
import BgmPlayer from '../common/BgmPlayer';

export default function Navbar({ activeTab, setActiveTab, profile, onLogout }) {
  const tabs = [
    { id: 'vault', label: 'Vault', icon: Gamepad2 },
    { id: 'explorar', label: 'Explorar', icon: Compass },
    { id: 'adicionar', label: 'Adicionar Jogo', icon: PlusCircle },
    { id: 'guilda', label: 'Guilda', icon: Users },
    { id: 'estatisticas', label: 'Estatísticas', icon: BarChart3 },
    { id: 'perfil', label: 'Perfil', icon: User },
  ];

  return (
    <header className="w-full bg-surface-low border-b border-border select-none transition-colors duration-500">
      {/* Top Banner / Hero Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-3 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Sair / Logout */}
        <div className="flex items-center gap-2 self-start md:self-auto order-2 md:order-1">
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-900/40 hover:bg-red-800/60 border border-red-700/60 text-red-200 text-xs font-semibold tracking-wide transition-all shadow-sm active-press"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>

        {/* Central Logo Gamer's Vault */}
        <div className="flex flex-col items-center text-center order-1 md:order-2">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-500">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-gamer font-extrabold tracking-wider text-white">
              Gamer's Vault
            </h1>
          </div>
          <span className="text-[10px] sm:text-[11px] font-mono tracking-widest text-gray-400 uppercase mt-0.5">
            Seu Depósito Pessoal de Jogos
          </span>
          <div className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-mono text-gray-300">
            <span className="text-gray-500">USER:</span>
            <span className="px-2 py-0.5 rounded bg-surface-high border border-border font-semibold text-accent-bright">
              {profile?.nickname || 'Gamer'}
            </span>
          </div>
        </div>

        {/* Player de Trilha Sonora de Fundo (FIFA / EA Trax) */}
        <div className="order-3 flex items-center justify-end">
          <BgmPlayer />
        </div>
      </div>

      {/* Navegação por Abas (Estilo Original / Stitch) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <nav className="flex items-center gap-2 sm:gap-6 border-t border-border/60 pt-2 pb-0 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group relative flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold transition-all whitespace-nowrap active-press ${
                  isActive
                    ? 'text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {/* Linha / Moldura de aba ativa */}
                {isActive ? (
                  <div className="absolute inset-0 rounded-t-md border-2 border-b-0 border-amber-400/90 bg-surface-container/60 shadow-[0_-4px_12px_rgba(251,191,36,0.15)] pointer-events-none"></div>
                ) : (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-transparent group-hover:bg-gray-700 transition-colors"></div>
                )}
                <Icon className={`w-4 h-4 relative z-10 ${isActive ? 'text-amber-400' : 'text-gray-400 group-hover:text-gray-200'}`} />
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
