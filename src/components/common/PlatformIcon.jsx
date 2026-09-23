import React, { useState } from 'react';
import { Flame, Zap, Gamepad2, Compass, Skull, Globe } from 'lucide-react';

import steamIcon from '../../assets/platforms/steam.png';
import epicIcon from '../../assets/platforms/epic.png';
import gamepassIcon from '../../assets/platforms/gamepass.png';
import eaIcon from '../../assets/platforms/ea.png';
import ubisoftIcon from '../../assets/platforms/ubisoft.png';

const PLATFORM_IMAGE_MAP = {
  steam: steamIcon,
  epic: epicIcon,
  gamepass: gamepassIcon,
  ea: eaIcon,
  ubisoft: ubisoftIcon,
};

export default function PlatformIcon({ platformId, size = 'md', className = '' }) {
  const [hasError, setHasError] = useState(false);

  const imgSrc = PLATFORM_IMAGE_MAP[platformId?.toLowerCase()];

  const isSm = size === 'sm';
  const isLg = size === 'lg';

  const boxSize = isSm ? 'w-5 h-5 rounded' : isLg ? 'w-8 h-8 rounded-xl' : 'w-6 h-6 rounded-lg';
  const iconSize = isSm ? 'w-3.5 h-3.5' : isLg ? 'w-5 h-5' : 'w-4 h-4';

  if (imgSrc && !hasError) {
    return (
      <div className={`relative ${boxSize} flex items-center justify-center overflow-hidden bg-black/40 border border-white/10 shrink-0 ${className}`}>
        <img
          src={imgSrc}
          alt={platformId}
          className="w-full h-full object-contain p-0.5 pointer-events-none select-none"
          onError={() => setHasError(true)}
        />
      </div>
    );
  }

  // Fallbacks elegantes caso o PNG não exista ou falhe
  return (
    <div className={`relative ${boxSize} flex items-center justify-center overflow-hidden bg-surface-high border border-border/70 shrink-0 ${className}`}>
      {platformId === 'steam' && <Flame className={`${iconSize} text-sky-400`} />}
      {platformId === 'epic' && <Zap className={`${iconSize} text-slate-300`} />}
      {platformId === 'gamepass' && <Gamepad2 className={`${iconSize} text-emerald-400`} />}
      {platformId === 'ea' && <Flame className={`${iconSize} text-red-500`} />}
      {platformId === 'ubisoft' && <Compass className={`${iconSize} text-cyan-400`} />}
      {platformId === 'suspeitos' && <Skull className={`${iconSize} text-purple-400`} />}
      {!['steam', 'epic', 'gamepass', 'ea', 'ubisoft', 'suspeitos'].includes(platformId) && (
        <Globe className={`${iconSize} text-gray-400`} />
      )}
    </div>
  );
}
