export const THEMES = {
  emerald: {
    id: 'emerald',
    name: 'Cyber Emerald',
    desc: 'Verde Neon Matrix clássico',
    color: '#3dd69b',
    dotClass: 'bg-[#3dd69b]',
    vars: {
      '--bg-primary': '#07080c',
      '--surface-dark': '#10121a',
      '--surface-low': '#0a0c10',
      '--surface-container': '#161822',
      '--surface-high': '#1f2230',
      '--border-default': '#262a3b',
      '--accent-primary': '#10b981',
      '--accent-bright': '#3dd69b',
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
      '--surface-dark': '#0d1522',
      '--surface-low': '#080d16',
      '--surface-container': '#121b2b',
      '--surface-high': '#1a263c',
      '--border-default': '#1f314d',
      '--accent-primary': '#06b6d4',
      '--accent-bright': '#22d3ee',
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
      '--surface-dark': '#18120d',
      '--surface-low': '#0f0b08',
      '--surface-container': '#201811',
      '--surface-high': '#2c2217',
      '--border-default': '#3a2d1e',
      '--accent-primary': '#d97706',
      '--accent-bright': '#fbbf24',
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
      '--surface-dark': '#140f22',
      '--surface-low': '#0d0a16',
      '--surface-container': '#1b142d',
      '--surface-high': '#261c3e',
      '--border-default': '#342654',
      '--accent-primary': '#9333ea',
      '--accent-bright': '#c084fc',
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
      '--surface-dark': '#180d10',
      '--surface-low': '#10080a',
      '--surface-container': '#201115',
      '--surface-high': '#2c171d',
      '--border-default': '#3d2028',
      '--accent-primary': '#dc2626',
      '--accent-bright': '#f87171',
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
