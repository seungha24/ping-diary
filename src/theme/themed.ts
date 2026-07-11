import { useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * 다크 모드: 라이트 팔레트(회색 계열) → 다크 팔레트 자동 매핑.
 * 화면별 StyleSheet를 통째로 변환해서 쓴다 (useThemedStyles).
 */
// 아이폰 다크모드처럼 계층감 있는 네이비 팔레트:
// 페이지(가장 어두움) < 카드 < 알약/입력칸 순으로 밝아져 떠 보이게.
const DARK_MAP: Record<string, string> = {
  // 표면 계열 (라이트에서 밝을수록 → 다크에서 페이지에 가깝게)
  '#ffffff': '#171f2e', // 카드·시트
  '#fff': '#171f2e',
  '#f9fafb': '#0e131e', // 페이지·스크롤 배경 (가장 어두운 네이비)
  '#fafafa': '#0e131e',
  '#f8fafc': '#0e131e',
  '#f3f4f6': '#222c40', // 알약·연한 채움·연한 경계
  '#f4f4f5': '#222c40',
  '#e5e7eb': '#2c384f', // 경계선
  '#d1d5db': '#47536b', // 진한 경계·플레이스홀더
  // 중간 회색 (보조 글자)
  '#9ca3af': '#8794aa',
  '#6b7280': '#97a3b9',
  '#4b5563': '#a9b4c8',
  // 글자 계열 (어두운 → 밝은)
  '#374151': '#c1cadb',
  '#1f2937': '#dce2ed',
  '#111827': '#eef1f7',
  '#0f172a': '#eef1f7',
  // 위험/경고 배경 틴트
  '#fee2e2': '#3a2531',
  '#fef2f2': '#2a1c23',
  '#3c4043': '#dce2ed', // 구글 버튼 라벨 (다크에서 밝게)
};

function mapColor(v: string, isTextColor = false): string {
  const k = v.trim().toLowerCase();
  // 흰 글자는 색 버튼(accent·빨강) 위의 라벨이므로 다크에서도 흰색 유지 — 배경만 어두워진다
  if (isTextColor && (k === '#fff' || k === '#ffffff' || k === 'white' || /^rgba\(\s*255\s*,\s*255\s*,\s*255/.test(k))) {
    return v;
  }
  if (DARK_MAP[k]) return DARK_MAP[k];
  // 흰색 기반 반투명 오버레이 → 다크 카드색 반투명
  const m = k.match(/^rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*([\d.]+)\s*\)$/);
  if (m) return `rgba(23,31,46,${m[1]})`;
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
        copy[p] = mapColor(val, p === 'color');
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
