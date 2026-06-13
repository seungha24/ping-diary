import React, { createContext, useContext, useState } from 'react';

export const THEMES = [
  { key: 'dark',    label: '다크',    color: '#111827' },
  { key: 'sky',     label: '스카이',  color: '#0284c7' },
  { key: 'emerald', label: '에메랄드', color: '#047857' },
  { key: 'lime',    label: '라임',    color: '#65a30d' },
  { key: 'violet',  label: '바이올렛', color: '#6d28d9' },
  { key: 'rose',    label: '로즈',    color: '#be123c' },
  { key: 'pink',    label: '핑크',    color: '#db2777' },
  { key: 'orange',  label: '오렌지',  color: '#ea580c' },
  { key: 'amber',   label: '앰버',    color: '#b45309' },
] as const;

export type ThemeKey = typeof THEMES[number]['key'];

interface ThemeCtx {
  accent: string;
  themeKey: ThemeKey;
  setTheme: (key: ThemeKey) => void;
}

const ThemeContext = createContext<ThemeCtx>({
  accent: '#111827',
  themeKey: 'dark',
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeKey, setThemeKey] = useState<ThemeKey>('dark');
  const accent = THEMES.find((t) => t.key === themeKey)?.color ?? '#111827';
  return (
    <ThemeContext.Provider value={{ accent, themeKey, setTheme: setThemeKey }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
