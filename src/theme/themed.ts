import { useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * 다크 모드: 라이트 팔레트(회색 계열) → 다크 팔레트 자동 매핑.
 * 화면별 StyleSheet를 통째로 변환해서 쓴다 (useThemedStyles).
 */
const DARK_MAP: Record<string, string> = {
  // 배경 계열 (밝은 → 어두운)
  '#ffffff': '#14161d',
  '#fff': '#14161d',
  '#f9fafb': '#191c24',
  '#fafafa': '#191c24',
  '#f8fafc': '#191c24',
  '#f3f4f6': '#232834',
  '#f4f4f5': '#232834',
  '#e5e7eb': '#2d3340',
  '#d1d5db': '#4d5564',
  // 중간 회색 (양쪽에서 큰 차이 없음, 약간 밝게)
  '#9ca3af': '#8b93a2',
  '#6b7280': '#9aa2b1',
  '#4b5563': '#aab2c0',
  // 글자 계열 (어두운 → 밝은)
  '#374151': '#c6ccd6',
  '#1f2937': '#dfe3e9',
  '#111827': '#eceef2',
  '#0f172a': '#eceef2',
  // 위험/경고 배경 틴트
  '#fee2e2': '#3b2225',
  '#fef2f2': '#2a1b1d',
};

function mapColor(v: string): string {
  const k = v.trim().toLowerCase();
  if (DARK_MAP[k]) return DARK_MAP[k];
  // 흰색 기반 반투명 오버레이 → 다크 카드색 반투명
  const m = k.match(/^rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*([\d.]+)\s*\)$/);
  if (m) return `rgba(23,26,34,${m[1]})`;
  return v;
}

const COLOR_PROP = /color$/i; // color, backgroundColor, borderColor, borderTopColor …

function darkifySheet<T extends Record<string, any>>(sheet: T): T {
  const out: any = {};
  for (const key of Object.keys(sheet)) {
    const st: any = sheet[key];
    const copy: any = { ...st };
    for (const p of Object.keys(copy)) {
      const val = copy[p];
      if (typeof val === 'string' && COLOR_PROP.test(p) && p !== 'shadowColor') {
        copy[p] = mapColor(val);
      }
    }
    out[key] = copy;
  }
  return out;
}

const cache = new WeakMap<object, any>();

/** 현재 모드에 맞는 스타일 시트 반환 (다크면 색만 자동 변환) */
export function useThemedStyles<T extends Record<string, any>>(light: T): T {
  const { mode } = useTheme();
  return useMemo(() => {
    if (mode !== 'dark') return light;
    let dark = cache.get(light);
    if (!dark) { dark = darkifySheet(light); cache.set(light, dark); }
    return dark;
  }, [mode, light]);
}
