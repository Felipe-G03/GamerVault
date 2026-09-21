import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';
import { THEMES, getSavedTheme, applyTheme } from '../../services/themeService';

export default function ThemeSelector() {
  const [currentTheme, setCurrentTheme] = useState(getSavedTheme());
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Inicializa o tema salvo ao carregar
  useEffect(() => {
    const saved = getSavedTheme();
    applyTheme(saved);
    setCurrentTheme(saved);
  }, []);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectTheme = (themeId) => {
    applyTheme(themeId);
    setCurrentTheme(themeId);
    setIsOpen(false);
  };

  const activeThemeObj = THEMES[currentTheme] || THEMES.emerald;

  return (
    <div className="relative" ref={dropdownRef} style={{ WebkitAppRegion: 'no-drag' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-high border border-border/80 hover:border-accent-bright/50 text-gray-300 hover:text-white font-mono text-[11px] transition-all shadow-sm active:scale-95"
        title="Alterar Tema Visual"
      >
        <Palette className="w-3.5 h-3.5 text-accent-bright" />
        <span 
          className="w-2 h-2 rounded-full" 
          style={{ 
            backgroundColor: activeThemeObj.color,
            boxShadow: `0 0 8px ${activeThemeObj.color}` 
          }}
        />
        <span className="hidden sm:inline font-semibold">{activeThemeObj.name}</span>
      </button>

      {/* Menu Suspenso */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-60 rounded-xl bg-[#0f111a] border border-border shadow-[0_10px_30px_rgba(0,0,0,0.8)] py-1.5 z-50 animate-fadeIn font-mono text-xs backdrop-blur-md">
          <div className="px-3 py-1.5 border-b border-border/60 text-[10px] uppercase tracking-widest text-gray-400 font-bold flex items-center justify-between">
            <span>Selecione o Tema</span>
            <span className="text-accent-bright font-normal">v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.1.2'}</span>
          </div>

          <div className="p-1 space-y-1">
            {Object.values(THEMES).map((theme) => {
              const isSelected = currentTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => handleSelectTheme(theme.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-all ${
                    isSelected 
                      ? 'bg-surface-high border border-border/80 text-white' 
                      : 'hover:bg-surface text-gray-300 hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ 
                        backgroundColor: theme.color,
                        boxShadow: `0 0 8px ${theme.color}` 
                      }}
                    />
                    <div className="truncate">
                      <div className="font-bold text-[11px] leading-tight truncate">{theme.name}</div>
                      <div className="text-[9px] text-gray-400 leading-tight truncate">{theme.desc}</div>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-3.5 h-3.5 shrink-0 text-accent-bright" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
