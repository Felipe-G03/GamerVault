import React, { useState } from 'react';
import { Bot, Sparkles, MessageSquare } from 'lucide-react';
import LWorderChatModal from './LWorderChatModal';

export default function LWorderFloatingWidget({
  profile = null,
  games = [],
  hubGames = [],
  onAddToWishlist
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Botão Flutuante no Canto Inferior Esquerdo */}
      <div className="fixed bottom-5 left-5 z-40 select-none">
        <button
          onClick={() => setIsOpen(prev => !prev)}
          title="Falar com L.Worder (IA Gamer)"
          className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-full border transition-all duration-300 shadow-[0_4px_25px_rgba(0,0,0,0.6)] group active-press ${
            isOpen
              ? 'bg-accent-bright text-surface-low border-accent-bright font-bold'
              : 'bg-surface-low/90 backdrop-blur-xl border-border/80 hover:border-accent-bright/60 text-white'
          }`}
        >
          <div className="relative flex items-center justify-center">
            <Bot className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'scale-110' : 'group-hover:scale-110 text-accent-bright'}`} />
            {!isOpen && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent-bright animate-ping" />
            )}
          </div>

          <div className="flex flex-col text-left leading-none">
            <span className="text-xs font-gamer font-bold tracking-wider">
              L.Worder
            </span>
            <span className="text-[9px] font-mono text-gray-400 group-hover:text-accent-bright transition-colors">
              IA Gamer
            </span>
          </div>
        </button>
      </div>

      {/* Modal de Chat do L.Worder */}
      <LWorderChatModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        userName={profile?.nickname || 'Gamer'}
        games={games}
        hubGames={hubGames}
        onAddToWishlist={onAddToWishlist}
      />
    </>
  );
}
