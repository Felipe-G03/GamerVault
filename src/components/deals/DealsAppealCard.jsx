import React, { useState } from 'react';
import { BadgePercent, X, Sparkles, ShoppingBag } from 'lucide-react';

export default function DealsAppealCard({ activeTab, onNavigateToDeals }) {
  // Visível apenas nas abas Vault, HUB e Guilda
  const isAllowedTab = activeTab === 'vault' || activeTab === 'hub' || activeTab === 'guilda';
  const [dismissed, setDismissed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  if (!isAllowedTab || dismissed) return null;

  return (
    <div 
      className="fixed bottom-5 left-5 z-40 select-none group transition-transform duration-300 hover:-translate-y-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Tooltip Dinâmico ao Passar o Mouse */}
      <div 
        className={`absolute bottom-full left-0 mb-3 w-48 p-2.5 rounded-xl bg-[#0e111a]/95 border border-amber-400/50 shadow-[0_4px_25px_rgba(0,0,0,0.7),0_0_15px_rgba(251,191,36,0.25)] backdrop-blur-md transition-all duration-200 pointer-events-none ${
          isHovered ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
          <Sparkles className="w-3 h-3 text-amber-300" />
          <span>Radar de Ofertas</span>
        </div>
        <p className="text-[11px] font-sans text-gray-200 leading-tight mt-1">
          Promoções oficiais com até <strong className="text-amber-300">90% OFF</strong> no Brasil.
        </p>
        <div className="mt-1.5 flex items-center gap-1 text-[9px] font-mono text-amber-300/80">
          <ShoppingBag className="w-2.5 h-2.5" />
          <span>Clique para abrir a loja</span>
        </div>
      </div>

      {/* Botão de Fechar Discreto (Aparece no Hover) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setDismissed(true);
        }}
        className="absolute -top-1.5 -right-1.5 z-50 w-5 h-5 rounded-full bg-slate-900 border border-amber-400/60 text-white hover:bg-rose-600 transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center shadow-md cursor-pointer"
        title="Ocultar selo"
      >
        <X className="w-3 h-3 text-white" />
      </button>

      {/* Selo Redondo Amarelo / Dourado */}
      <button
        type="button"
        onClick={onNavigateToDeals}
        className="relative w-14 h-14 rounded-full p-1 bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-500 shadow-[0_0_20px_rgba(251,191,36,0.45)] hover:shadow-[0_0_30px_rgba(251,191,36,0.7)] transition-all duration-300 transform hover:scale-110 active:scale-95 flex items-center justify-center cursor-pointer border-2 border-yellow-200/90"
        title="Abrir Radar de Ofertas"
      >
        {/* Anel Pulsante Suave de Atenção */}
        <span className="absolute inset-0 rounded-full bg-amber-400 opacity-25 animate-ping pointer-events-none" />

        {/* Círculo Interno com Efeito de Selo / Moeda */}
        <div className="w-full h-full rounded-full border border-dashed border-amber-700/60 flex flex-col items-center justify-center bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 font-gamer shadow-inner">
          <BadgePercent className="w-5 h-5 text-slate-950 drop-shadow-sm group-hover:rotate-12 transition-transform duration-300" />
          <span className="text-[8px] font-extrabold font-mono tracking-tighter leading-none mt-0.5 text-slate-950 uppercase">
            OFERTAS
          </span>
        </div>
      </button>
    </div>
  );
}
