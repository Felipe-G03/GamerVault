import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check, Sparkles } from 'lucide-react';
import { 
  THEMES, 
  getSavedTheme, 
  applyTheme 
} from '../../services/themeService';

export default function ThemeSelector() {
  const [currentTheme, setCurrentTheme] = useState(getSavedTheme());
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Inicializa o tema salvo ao carregar
  useEffect(() => {
    const savedTheme = getSavedTheme();
    applyTheme(savedTheme);
    setCurrentTheme(savedTheme);
  }, []);

  // Escuta alterações disparadas globalmente
  useEffect(() => {
    const handleThemeChanged = (e) => {
      if (e.detail?.themeId) setCurrentTheme(e.detail.themeId);
    };
    window.addEventListener('gamervault:theme-changed', handleThemeChanged);
    return () => {
      window.removeEventListener('gamervault:theme-changed', handleThemeChanged);
    };
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
  };

  const activeThemeObj = THEMES[currentTheme] || THEMES.obsidian || THEMES.crimson || THEMES.emerald;

  return (
    <div className="flex items-center gap-1.5" style={{ WebkitAppRegion: 'no-drag' }}>
      <div className="relative" ref={dropdownRef}>
        {/* Botão de Disparo */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-high border border-border/80 hover:border-accent-bright/50 text-gray-300 hover:text-white font-mono text-[11px] transition-all shadow-sm active:scale-95 cursor-pointer"
          title="Personalizar Esquema de Cores da Interface"
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

        {isOpen && (
          <div className="absolute right-0 mt-1.5 w-76 rounded-xl bg-surface border border-border shadow-[0_16px_40px_rgba(0,0,0,0.85)] py-2 z-50 animate-fadeIn font-mono text-xs backdrop-blur-md">
            {/* Header do Menu */}
            <div className="px-3 pb-2 border-b border-border/60 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-accent-bright" />
                Esquemas de Cores
              </span>
              <span className="text-[10px] text-accent-bright font-mono">
                v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.3.5'}
              </span>
            </div>

            {/* Conteúdo: Paleta de Cores */}
            <div className="p-1.5 space-y-1 max-h-80 overflow-y-auto">
              <div className="px-2 py-1 text-[9px] uppercase tracking-wider text-gray-400 font-bold">
                Selecione o esquema de cores
              </div>
              {Object.values(THEMES).map((theme) => {
                const isSelected = currentTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => handleSelectTheme(theme.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-surface-high border border-border/80 text-accent-bright font-semibold' 
                        : 'hover:bg-surface-high/60 text-gray-300 hover:text-white border border-transparent'
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
                        <div className="font-bold text-[11px] leading-tight truncate">
                          <span>{theme.name}</span>
                        </div>
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
    </div>
  );
}

