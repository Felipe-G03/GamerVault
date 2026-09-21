import React, { useState, useEffect, useRef } from 'react';
import { Gamepad2, FastForward } from 'lucide-react';

export default function StartupSplash({ onFinish }) {
  const [videoAvailable, setVideoAvailable] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  const videoRef = useRef(null);
  const hasFinishedRef = useRef(false);

  const completeSplash = () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    setIsFadingOut(true);
    window.dispatchEvent(new CustomEvent('gamervault:splash-finished'));
    setTimeout(() => {
      onFinish();
    }, 600); // Duração do fade-out suave
  };

  // Permite pular com ESC, Espaço, Enter ou clique
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        completeSplash();
      }
    };

    // Ativa a dica de pular após 1 segundo
    const skipTimer = setTimeout(() => setCanSkip(true), 1000);

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(skipTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Tentativa de autoplay com áudio; se o ambiente bloquear áudio, toca com mute
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = 0.75;
      videoRef.current.play().catch(() => {
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.play().catch(() => {
            setVideoAvailable(false);
          });
        }
      });
    }
  }, []);

  // Fallback se o vídeo não existir na pasta public (ex: intro.mp4 ausente)
  useEffect(() => {
    if (!videoAvailable) {
      const fallbackTimer = setTimeout(() => {
        completeSplash();
      }, 2000); // 2 segundos exibindo a logo animada
      return () => clearTimeout(fallbackTimer);
    }
  }, [videoAvailable]);

  return (
    <div
      onClick={completeSplash}
      className={`fixed inset-0 z-[99999] bg-black flex items-center justify-center cursor-pointer select-none transition-opacity duration-700 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ backgroundColor: '#000000' }}
    >
      {videoAvailable ? (
        <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-8 bg-black">
          <video
            ref={videoRef}
            src="./intro.mp4"
            playsInline
            onEnded={completeSplash}
            onError={() => setVideoAvailable(false)}
            className="w-auto h-auto max-w-[85vw] max-h-[60vh] sm:max-w-[640px] md:max-w-[760px] object-contain pointer-events-none select-none"
          />
        </div>
      ) : (
        /* Splash Animada da Logo (Fallback caso não encontre intro.mp4) */
        <div className="flex flex-col items-center justify-center gap-5 animate-in fade-in zoom-in-95 duration-700 bg-black">
          <div className="relative flex items-center justify-center">
            {/* Halo de Brilho Neon */}
            <div className="absolute inset-0 rounded-full bg-accent-bright/20 blur-3xl scale-150 animate-pulse" />
            <div className="relative w-20 h-20 rounded-2xl bg-[#090b10] border border-accent-bright/40 flex items-center justify-center shadow-[0_0_35px_rgba(61,214,155,0.25)]">
              <Gamepad2 className="w-10 h-10 text-accent-bright animate-bounce" style={{ animationDuration: '2s' }} />
            </div>
          </div>

          <div className="text-center space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-gamer font-extrabold tracking-widest text-white uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
              Gamer's Vault
            </h1>
            <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-accent-bright">
              Carregando Acervo...
            </p>
          </div>
        </div>
      )}

      {/* Dica discreta de pular intro */}
      {canSkip && (
        <div className="absolute bottom-6 right-6 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 border border-white/10 text-gray-400 hover:text-white font-mono text-[11px] backdrop-blur-md transition-all animate-fade-in">
          <span>Clique ou ESC para pular</span>
          <FastForward className="w-3.5 h-3.5" />
        </div>
      )}
    </div>
  );
}
