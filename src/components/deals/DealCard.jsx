import React from 'react';
import { Flame, Bell, Check, Store, ShoppingBag } from 'lucide-react';
import { formatBRL, POPULAR_SHOPS } from '../../services/itadService';
import { isDealTracked } from '../../services/dealTrackerService';

export default function DealCard({ deal, onClick, onToggleTrack }) {
  const isTracked = isDealTracked(deal.id, deal.title);

  const handleTrackClick = (e) => {
    e.stopPropagation();
    onToggleTrack?.(deal);
  };

  // Identificação visual da loja
  const storeInfo = POPULAR_SHOPS.find(s => 
    deal.store?.name?.toLowerCase().includes(s.slug || '') || 
    deal.store?.name?.toLowerCase() === s.name.toLowerCase()
  );

  return (
    <div
      onClick={() => onClick?.(deal)}
      className="group relative flex flex-col rounded-xl bg-[#111420] border border-[#202538] hover:border-cyan-400/60 shadow-md hover:shadow-[0_6px_25px_rgba(6,182,212,0.18)] transition-all duration-200 overflow-hidden cursor-pointer hover:-translate-y-0.5 select-none"
    >
      {/* Capa Compacta 16:9 */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-black/80">
        {deal.coverUrl ? (
          <img
            src={deal.coverUrl}
            alt={deal.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={(e) => {
              e.target.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop&q=80';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-2 text-center text-[10px] font-mono text-gray-500 bg-surface">
            {deal.title}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#111420] via-transparent to-black/40" />

        {/* Badge da Loja */}
        <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/85 backdrop-blur-md border border-white/10 text-[9px] font-mono font-bold text-gray-200 shadow-sm">
          <Store className="w-2.5 h-2.5 text-cyan-400" />
          <span className="truncate max-w-[80px]">{deal.store?.name || 'Oficial'}</span>
        </div>

        {/* Selo Menor Histórico */}
        {deal.isHistoricalLow && (
          <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-600/90 text-white text-[8px] font-mono font-extrabold shadow-[0_0_10px_rgba(225,29,72,0.5)] backdrop-blur-md">
            <Flame className="w-2.5 h-2.5 fill-rose-200" />
            <span>MÍNIMA</span>
          </div>
        )}

        {/* Botão de Rastreamento (Sino) */}
        <button
          type="button"
          onClick={handleTrackClick}
          className={`absolute bottom-1.5 right-1.5 p-1 rounded-lg border backdrop-blur-md transition-all active:scale-90 ${
            isTracked
              ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_8px_rgba(168,85,247,0.5)]'
              : 'bg-black/60 border-white/20 text-gray-300 hover:text-white hover:border-purple-400'
          }`}
          title={isTracked ? 'Remover dos jogos monitorados' : 'Monitorar preço'}
        >
          {isTracked ? <Check className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
        </button>
      </div>

      {/* Detalhes e Preço Compacto */}
      <div className="p-2.5 flex-1 flex flex-col justify-between space-y-2">
        <div>
          <h3 
            className="text-xs font-gamer font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1 leading-snug" 
            title={deal.title}
          >
            {deal.title}
          </h3>
        </div>

        {/* Preço e Botão */}
        <div className="pt-1.5 border-t border-white/5 flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            {deal.cut > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-400 text-black font-mono font-black text-[11px] shadow-sm">
                -{deal.cut}%
              </span>
            )}

            <div className="flex flex-col">
              {deal.regularPrice > deal.currentPrice && (
                <span className="text-[9px] font-mono text-gray-500 line-through leading-none">
                  {formatBRL(deal.regularPrice)}
                </span>
              )}
              <span className="text-xs font-mono font-bold text-emerald-400 leading-tight">
                {formatBRL(deal.currentPrice)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onClick?.(deal)}
            className="p-1.5 rounded-lg bg-surface-high hover:bg-surface-mid border border-white/10 group-hover:border-cyan-500/50 group-hover:text-cyan-300 text-gray-200 transition-colors"
            title="Ver detalhes e comparar lojas"
          >
            <ShoppingBag className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
