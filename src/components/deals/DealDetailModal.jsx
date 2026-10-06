import React, { useState, useEffect } from 'react';
import { 
  X, 
  ExternalLink, 
  TrendingDown, 
  Flame, 
  Bell, 
  Check, 
  Sparkles, 
  Store, 
  ArrowRight,
  ShieldCheck,
  Globe,
  Loader2
} from 'lucide-react';
import { formatBRL, fetchGamePriceComparison } from '../../services/itadService';
import { trackGameDeal, untrackGameDeal, isDealTracked } from '../../services/dealTrackerService';

export default function DealDetailModal({ deal, onClose, onTrackChanged, userId }) {
  if (!deal) return null;

  const [tracked, setTracked] = useState(isDealTracked(deal.id, deal.title));
  const [targetPrice, setTargetPrice] = useState(deal.targetPrice || '');
  const [savingTarget, setSavingTarget] = useState(false);
  const [comparisonStores, setComparisonStores] = useState(
    deal.storesComparison && deal.storesComparison.length > 0 
      ? deal.storesComparison 
      : [
          {
            name: deal.store?.name || 'Steam',
            price: deal.currentPrice,
            regularPrice: deal.regularPrice,
            cut: deal.cut,
            url: deal.store?.url || '#'
          }
        ]
  );
  const [loadingComparison, setLoadingComparison] = useState(true);

  // Consulta todas as lojas oficiais com desconto ou preço normal em tempo real
  useEffect(() => {
    let isMounted = true;
    setLoadingComparison(true);
    fetchGamePriceComparison(deal).then(stores => {
      if (isMounted && stores && stores.length > 0) {
        setComparisonStores(stores);
      }
      if (isMounted) setLoadingComparison(false);
    }).catch(err => {
      console.warn('Erro ao carregar lojas comparativas:', err);
      if (isMounted) setLoadingComparison(false);
    });

    return () => {
      isMounted = false;
    };
  }, [deal?.id, deal?.title]);

  const handleToggleTrack = async () => {
    if (tracked) {
      await untrackGameDeal(deal.id, userId);
      setTracked(false);
    } else {
      await trackGameDeal(deal, targetPrice || null, userId);
      setTracked(true);
    }
    onTrackChanged?.();
  };

  const handleSaveTarget = async (e) => {
    e.preventDefault();
    setSavingTarget(true);
    await trackGameDeal(deal, targetPrice ? Number(targetPrice) : null, userId);
    setTracked(true);
    setSavingTarget(false);
    onTrackChanged?.();
  };

  const ggDealsSearchUrl = `https://gg.deals/games/?title=${encodeURIComponent(deal.title)}`;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div 
        className="relative w-full max-w-3xl flex flex-col rounded-2xl bg-[#0d1017] border border-cyan-500/30 shadow-[0_0_60px_rgba(6,182,212,0.18)] text-white overflow-hidden max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Glow com Imagem de Fundo */}
        <div className="relative h-44 w-full overflow-hidden flex items-end p-6 border-b border-border/80">
          {deal.coverUrl && (
            <img 
              src={deal.coverUrl} 
              alt={deal.title}
              className="absolute inset-0 w-full h-full object-cover blur-sm opacity-30 scale-105"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d1017] via-[#0d1017]/70 to-transparent" />

          {/* Botão Fechar */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-black/60 hover:bg-black/90 border border-white/10 text-gray-300 hover:text-white transition-all backdrop-blur-md"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Informações da Capa e Título */}
          <div className="relative z-10 flex items-end gap-4 w-full">
            {deal.coverUrl && (
              <img 
                src={deal.coverUrl} 
                alt={deal.title}
                className="w-24 h-32 rounded-xl object-cover shadow-2xl border-2 border-white/10 shrink-0"
              />
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                  RADAR DE PREÇOS
                </span>
                {deal.isHistoricalLow && (
                  <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                    <Flame className="w-3 h-3 text-rose-400" />
                    MENOR PREÇO HISTÓRICO
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-gamer font-bold text-white tracking-wide">
                {deal.title}
              </h2>
              <div className="flex items-center gap-2 pt-0.5">
                <span className="text-xl font-bold font-mono text-emerald-400">
                  {formatBRL(deal.currentPrice)}
                </span>
                {deal.regularPrice > deal.currentPrice && (
                  <span className="text-xs font-mono text-gray-500 line-through">
                    {formatBRL(deal.regularPrice)}
                  </span>
                )}
                {deal.cut > 0 && (
                  <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    -{deal.cut}%
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo do Modal */}
        <div className="p-6 overflow-y-auto space-y-6 max-h-[55vh] scrollbar-thin">
          
          {/* Caixa de Menor Preço Histórico no Brasil */}
          <div className="p-4 rounded-xl bg-surface/70 border border-border/80 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <TrendingDown className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-gray-400">
                  Menor Preço da História no Brasil (BRL)
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold font-mono text-white">
                    {deal.historyLow?.price ? formatBRL(deal.historyLow.price) : formatBRL(deal.currentPrice)}
                  </span>
                  <span className="text-xs text-gray-400 font-sans">
                    na {deal.historyLow?.store || deal.store?.name || 'Steam'} {deal.historyLow?.date && `(${deal.historyLow.date})`}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right hidden sm:block">
              <span className="text-[11px] font-mono text-cyan-400 font-semibold">
                {deal.isHistoricalLow ? 'Preço Imbatível Hoje!' : 'Boa oportunidade'}
              </span>
            </div>
          </div>

          {/* Comparativo de Preços em Lojas Oficiais */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-gamer font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Store className="w-4 h-4 text-cyan-400" />
                <span>Preço Atual nas Lojas Oficiais</span>
                {loadingComparison && (
                  <span className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400 font-normal lowercase">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>consultando lojas...</span>
                  </span>
                )}
              </h3>
              <span className="text-[10px] font-mono text-gray-400">
                {comparisonStores.length} {comparisonStores.length === 1 ? 'plataforma oficial' : 'plataformas oficiais'}
              </span>
            </div>

            <div className="space-y-2">
              {comparisonStores.map((s, idx) => {
                const minPrice = comparisonStores[0]?.price ?? deal.currentPrice;
                const isBestPrice = s.price <= minPrice;
                return (
                  <div 
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      isBestPrice 
                        ? 'bg-cyan-950/25 border-cyan-500/50 text-white shadow-[0_0_15px_rgba(6,182,212,0.12)]' 
                        : 'bg-surface/50 border-border/70 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="font-semibold text-xs font-gamer text-white flex items-center gap-2">
                        <span>{s.name}</span>
                        {s.cut > 0 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                            -{s.cut}%
                          </span>
                        )}
                      </div>
                      {isBestPrice ? (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase font-bold">
                          Melhor Oferta
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono text-gray-400">
                          {s.cut === 0 ? 'Preço Normal' : `+ ${formatBRL(s.price - minPrice)}`}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className={`font-mono font-bold text-xs ${isBestPrice ? 'text-emerald-400' : 'text-gray-200'}`}>
                          {formatBRL(s.price)}
                        </div>
                        {s.regularPrice > s.price && (
                          <div className="text-[10px] font-mono text-gray-500 line-through">
                            {formatBRL(s.regularPrice)}
                          </div>
                        )}
                      </div>

                      <a
                        href={s.url || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold transition-all ${
                          isBestPrice
                            ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                            : 'bg-surface-high hover:bg-surface-mid border-border text-white hover:text-cyan-300'
                        }`}
                      >
                        <span>Comprar</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rastrear Preço / Alerta */}
          <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-purple-400" />
                <h4 className="text-xs font-gamer font-bold text-white">
                  Rastreamento & Meta de Preço
                </h4>
              </div>
              <button
                type="button"
                onClick={handleToggleTrack}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                  tracked
                    ? 'bg-purple-500/20 border border-purple-400 text-purple-300'
                    : 'bg-surface border border-border hover:border-purple-400 text-gray-300'
                }`}
              >
                {tracked ? <Check className="w-3.5 h-3.5 text-purple-400" /> : <Bell className="w-3.5 h-3.5" />}
                <span>{tracked ? 'Rastreando' : 'Rastrear este jogo'}</span>
              </button>
            </div>

            <form onSubmit={handleSaveTarget} className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-[10px] font-mono text-gray-400 block mb-1">
                  Avisar quando o preço atingir (R$):
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 50.00"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-border text-xs font-mono text-white focus:outline-none focus:border-purple-400"
                />
              </div>
              <button
                type="submit"
                disabled={savingTarget}
                className="mt-5 px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold transition-colors"
              >
                Salvar Meta
              </button>
            </form>
          </div>
        </div>

        {/* Footer com link externo ao GG.deals */}
        <div className="px-6 py-4 border-t border-border/80 bg-surface/80 flex items-center justify-between gap-4">
          <a
            href={ggDealsSearchUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs font-mono text-gray-400 hover:text-cyan-400 transition-colors"
            title="Abrir no GG.deals para ver chaves de keyshops e histórico completo"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Consultar chaves e histórico no GG.deals</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-surface-high hover:bg-surface-mid border border-border text-xs font-mono font-bold text-white transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
