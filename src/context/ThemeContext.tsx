import React, { createContext, useContext, useState } from 'react';
import { Platform } from 'react-native';
import { setThemeServer } from '../api';

export const THEMES = [
  // 비비드
  { key: 'dark',    label: '다크',    color: '#111827' },
  { key: 'sky',     label: '스카이',  color: '#0284c7' },
  { key: 'emerald', label: '에메랄드', color: '#047857' },
  { key: 'lime',    label: '라임',    color: '#65a30d' },
  { key: 'violet',  label: '바이올렛', color: '#6d28d9' },
  { key: 'rose',    label: '로즈',    color: '#be123c' },
  { key: 'pink',    label: '핑크',    color: '#db2777' },
  { key: 'orange',  label: '오렌지',  color: '#ea580c' },
  { key: 'amber',   label: '앰버',    color: '#b45309' },
  // 파스텔
  { key: 'pastel-sky',      label: '파스텔 스카이',  color: '#7dd3fc' },
  { key: 'pastel-mint',     label: '파스텔 민트',    color: '#6ee7b7' },
  { key: 'pastel-lavender', label: '파스텔 라벤더',  color: '#c4b5fd' },
  { key: 'pastel-pink',     label: '파스텔 핑크',    color: '#f9a8d4' },
  { key: 'pastel-peach',    label: '파스텔 피치',    color: '#fdba74' },
  { key: 'pastel-lemon',    label: '파스텔 레몬',    color: '#fcd34d' },
] as const;

export type ThemeKey = typeof THEMES[number]['key'];

const STORAGE_KEY = 'ping_theme';

interface ThemeCtx {
  accent: string;
  themeKey: ThemeKey;
  /** 사용자가 테마 변경 (localStorage + DB 저장) */
  setTheme: (key: ThemeKey) => void;
  /** 서버/저장소에서 불러온 값 적용 (DB 재저장 없음) */
  hydrateTheme: (key: ThemeKey) => void;
}

const ThemeContext = createContext<ThemeCtx>({
  accent: '#111827',
  themeKey: 'dark',
  setTheme: () => {},
  hydrateTheme: () => {},
});

function isThemeKey(v: unknown): v is ThemeKey {
  return typeof v === 'string' && THEMES.some((t) => t.key === v);
}

/** 웹: localStorage에서 초기 테마 복원 (로그아웃해도 유지) */
function initialTheme(): ThemeKey {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (isThemeKey(saved)) return saved;
    } catch {}
  }
  return 'dark';
}

function persistLocal(key: ThemeKey) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try { window.localStorage.setItem(STORAGE_KEY, key); } catch {}
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeKey, setThemeKey] = useState<ThemeKey>(initialTheme);
  const accent = THEMES.find((t) => t.key === themeKey)?.color ?? '#111827';

  function setTheme(key: ThemeKey) {
    setThemeKey(key);
    persistLocal(key);
    setThemeServer(key).catch(() => {}); // 로그인 상태면 DB(user_metadata)에 저장
  }

  function hydrateTheme(key: ThemeKey) {
    if (!isThemeKey(key)) return;
    setThemeKey(key);
    persistLocal(key);
  }

  return (
    <ThemeContext.Provider value={{ accent, themeKey, setTheme, hydrateTheme }}>
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
