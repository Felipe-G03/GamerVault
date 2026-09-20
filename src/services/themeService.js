export const THEMES = {
  emerald: {
    id: 'emerald',
    name: 'Cyber Emerald',
    desc: 'Verde Neon Matrix clássico',
    color: '#3dd69b',
    dotClass: 'bg-[#3dd69b]',
    vars: {
      '--bg-primary': '#07080c',
      '--accent-primary': '#10b981',
      '--accent-rgb': '16, 185, 129',
      '--accent-bright': '#3dd69b',
      '--accent-bright-rgb': '61, 214, 155',
      '--accent-glow': 'rgba(61, 214, 155, 0.35)'
    }
  },
  cyan: {
    id: 'cyan',
    name: 'Electric Cyan',
    desc: 'Ciano futurista e gelo elétrico',
    color: '#06b6d4',
    dotClass: 'bg-[#06b6d4]',
    vars: {
      '--bg-primary': '#050a12',
      '--accent-primary': '#06b6d4',
      '--accent-rgb': '6, 182, 212',
      '--accent-bright': '#22d3ee',
      '--accent-bright-rgb': '34, 211, 238',
      '--accent-glow': 'rgba(6, 182, 212, 0.35)'
    }
  },
  amber: {
    id: 'amber',
    name: 'Solar Amber',
    desc: 'Dourado e fogo estelar',
    color: '#f59e0b',
    dotClass: 'bg-[#f59e0b]',
    vars: {
      '--bg-primary': '#0c0906',
      '--accent-primary': '#d97706',
      '--accent-rgb': '217, 119, 6',
      '--accent-bright': '#fbbf24',
      '--accent-bright-rgb': '251, 191, 36',
      '--accent-glow': 'rgba(245, 158, 11, 0.35)'
    }
  },
  purple: {
    id: 'purple',
    name: 'Synthwave Void',
    desc: 'Violeta e néon retrô',
    color: '#a855f7',
    dotClass: 'bg-[#a855f7]',
    vars: {
      '--bg-primary': '#0a0712',
      '--accent-primary': '#9333ea',
      '--accent-rgb': '147, 51, 234',
      '--accent-bright': '#c084fc',
      '--accent-bright-rgb': '192, 132, 252',
      '--accent-glow': 'rgba(168, 85, 247, 0.35)'
    }
  },
  crimson: {
    id: 'crimson',
    name: 'Blood Crimson',
    desc: 'Vermelho carmesim visceral',
    color: '#ef4444',
    dotClass: 'bg-[#ef4444]',
    vars: {
      '--bg-primary': '#0d0608',
      '--accent-primary': '#dc2626',
      '--accent-rgb': '220, 38, 38',
      '--accent-bright': '#f87171',
      '--accent-bright-rgb': '248, 113, 113',
      '--accent-glow': 'rgba(239, 68, 68, 0.35)'
    }
  }
};

const THEME_STORAGE_KEY = 'gamervault_app_theme';

export function getSavedTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && THEMES[saved]) {
      return saved;
    }
  } catch (e) {
    // LocalStorage indisponível
  }
  return 'emerald';
}

export function applyTheme(themeId) {
  const theme = THEMES[themeId] || THEMES.emerald;
  const root = document.documentElement;

  // Aplica as variáveis CSS
  Object.entries(theme.vars).forEach(([prop, val]) => {
    root.style.setProperty(prop, val);
  });

  root.setAttribute('data-theme', theme.id);

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme.id);
  } catch (e) {
    // LocalStorage indisponível
  }

  return theme.id;
}
