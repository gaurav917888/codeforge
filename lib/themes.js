// Theme definitions for VaultX
// Each theme controls the primary accent color used across the app.

export const THEMES = {
  terra: {
    id: 'terra',
    name: 'Terra',
    kind: 'solid',
    accent: '#da5d4b',
    accentHover: '#c44e3e',
    accentSoft: '#fdf2f1',
    accentSoftDark: '#3a1d19',
    gradient: null,
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    kind: 'solid',
    accent: '#3b82f6',
    accentHover: '#2563eb',
    accentSoft: '#eff6ff',
    accentSoftDark: '#172a4d',
    gradient: null,
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    kind: 'solid',
    accent: '#10b981',
    accentHover: '#059669',
    accentSoft: '#ecfdf5',
    accentSoftDark: '#0d3a2b',
    gradient: null,
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    kind: 'solid',
    accent: '#f59e0b',
    accentHover: '#d97706',
    accentSoft: '#fffbeb',
    accentSoftDark: '#3d2a08',
    gradient: null,
  },
  amethyst: {
    id: 'amethyst',
    name: 'Amethyst',
    kind: 'solid',
    accent: '#8b5cf6',
    accentHover: '#7c3aed',
    accentSoft: '#f5f3ff',
    accentSoftDark: '#2d1b5c',
    gradient: null,
  },
  slate: {
    id: 'slate',
    name: 'Slate',
    kind: 'solid',
    accent: '#475569',
    accentHover: '#334155',
    accentSoft: '#f1f5f9',
    accentSoftDark: '#1e293b',
    gradient: null,
  },
  aurora: {
    id: 'aurora',
    name: 'Aurora',
    kind: 'gradient',
    accent: '#6366f1',
    accentHover: '#4f46e5',
    accentSoft: '#eef2ff',
    accentSoftDark: '#1e1b4b',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
  },
  peach: {
    id: 'peach',
    name: 'Peach',
    kind: 'gradient',
    accent: '#ec4899',
    accentHover: '#db2777',
    accentSoft: '#fdf2f8',
    accentSoftDark: '#3d1a2b',
    gradient: 'linear-gradient(135deg, #f472b6 0%, #fb923c 100%)',
  },
  mint: {
    id: 'mint',
    name: 'Mint',
    kind: 'gradient',
    accent: '#14b8a6',
    accentHover: '#0d9488',
    accentSoft: '#f0fdfa',
    accentSoftDark: '#0d3a37',
    gradient: 'linear-gradient(135deg, #34d399 0%, #06b6d4 100%)',
  },
};

export const THEME_LIST = Object.values(THEMES);

// pick a random non-random theme id
export function pickRandomThemeId() {
  const ids = Object.keys(THEMES);
  return ids[Math.floor(Math.random() * ids.length)];
}

// apply theme as CSS variables on document.documentElement
export function applyTheme(themeId, dark) {
  const theme = THEMES[themeId] || THEMES.terra;
  const root = document.documentElement;
  root.style.setProperty('--accent-red', theme.accent);
  root.style.setProperty('--accent-red-hover', theme.accentHover);
  root.style.setProperty('--accent-soft', dark ? theme.accentSoftDark : theme.accentSoft);
  root.style.setProperty('--accent-gradient', theme.gradient || theme.accent);
  root.classList.toggle('dark', !!dark);
}
