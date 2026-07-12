import React from 'react';
import Svg, { Path, Rect, Circle, Line, Polyline } from 'react-native-svg';

/** 공용 라인 아이콘 (Feather 스타일). color/size prop으로 조절 */
type IconProps = { color?: string; size?: number };

function Base({ size = 16, color = '#6b7280', children }: { size?: number; color?: string; children: React.ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </Svg>
  );
}

export function IconCamera({ color, size }: IconProps) {
  return <Base size={size} color={color}><Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><Circle cx="12" cy="13" r="4" /></Base>;
}
export function IconTrophy({ color, size }: IconProps) {
  return (
    <Base size={size} color={color}>
      <Path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <Path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <Path d="M4 22h16" />
      <Path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <Path d="M14 14.66V17c0 .55.47.98.97 1.21 1.18.54 2.03 2.03 2.03 4.34" />
      <Path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </Base>
  );
}
export function IconLock({ color, size }: IconProps) {
  return <Base size={size} color={color}><Rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><Path d="M7 11V7a5 5 0 0 1 10 0v4" /></Base>;
}
export function IconUsers({ color, size }: IconProps) {
  return <Base size={size} color={color}><Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><Circle cx="9" cy="7" r="4" /><Path d="M23 21v-2a4 4 0 0 0-3-3.87" /><Path d="M16 3.13a4 4 0 0 1 0 7.75" /></Base>;
}
export function IconUser({ color, size }: IconProps) {
  return <Base size={size} color={color}><Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><Circle cx="12" cy="7" r="4" /></Base>;
}
export function IconMessage({ color, size }: IconProps) {
  return <Base size={size} color={color}><Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></Base>;
}
export function IconRefresh({ color, size }: IconProps) {
  return <Base size={size} color={color}><Polyline points="23 4 23 10 17 10" /><Polyline points="1 20 1 14 7 14" /><Path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></Base>;
}
export function IconTrash({ color, size }: IconProps) {
  return <Base size={size} color={color}><Polyline points="3 6 5 6 21 6" /><Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><Line x1="10" y1="11" x2="10" y2="17" /><Line x1="14" y1="11" x2="14" y2="17" /></Base>;
}
export function IconBell({ color, size }: IconProps) {
  return <Base size={size} color={color}><Path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><Path d="M13.73 21a2 2 0 0 1-3.46 0" /></Base>;
}
export function IconBellOff({ color, size }: IconProps) {
  return <Base size={size} color={color}><Path d="M13.73 21a2 2 0 0 1-3.46 0" /><Path d="M18.63 13A17.89 17.89 0 0 1 18 8" /><Path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" /><Path d="M18 8a6 6 0 0 0-9.33-5" /><Line x1="1" y1="1" x2="23" y2="23" /></Base>;
}
export function IconPencil({ color, size }: IconProps) {
  return <Base size={size} color={color}><Path d="M12 20h9" /><Path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></Base>;
}
export function IconX({ color, size }: IconProps) {
  return <Base size={size} color={color}><Line x1="18" y1="6" x2="6" y2="18" /><Line x1="6" y1="6" x2="18" y2="18" /></Base>;
}
export function IconList({ color, size }: IconProps) {
  return <Base size={size} color={color}><Line x1="8" y1="6" x2="21" y2="6" /><Line x1="8" y1="12" x2="21" y2="12" /><Line x1="8" y1="18" x2="21" y2="18" /><Line x1="3" y1="6" x2="3.01" y2="6" /><Line x1="3" y1="12" x2="3.01" y2="12" /><Line x1="3" y1="18" x2="3.01" y2="18" /></Base>;
}
export function IconFolder({ color, size }: IconProps) {
  return <Base size={size} color={color}><Path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></Base>;
}
export function IconSprout({ color, size }: IconProps) {
  return <Base size={size} color={color}><Path d="M12 22V11" /><Path d="M12 11C12 7 9 4 4 4c0 5 3 8 8 8z" /><Path d="M12 13c0-3 2-6 6-6 0 4-3 6-6 6z" /></Base>;
}
/** 잠금 해제/반짝임 — 채움 아이콘 */
export function IconSparkle({ color = '#6b7280', size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2l2.2 6.2L20.5 10 14.2 12 12 18.5 9.8 12 3.5 10l6.3-1.8L12 2z" />
    </Svg>
  );
}
export function IconBook({ color, size }: IconProps) {
  return <Base size={size} color={color}><Path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><Path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></Base>;
}
export function IconHeart({ color, size }: IconProps) {
  return <Base size={size} color={color}><Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></Base>;
}
export function IconClock({ color, size }: IconProps) {
  return <Base size={size} color={color}><Circle cx="12" cy="12" r="10" /><Polyline points="12 6 12 12 16 14" /></Base>;
}
export function IconFeather({ color, size }: IconProps) {
  return <Base size={size} color={color}><Path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" /><Line x1="16" y1="8" x2="2" y2="22" /><Line x1="17.5" y1="15" x2="9" y2="15" /></Base>;
}
export function IconAward({ color, size }: IconProps) {
  return <Base size={size} color={color}><Circle cx="12" cy="8" r="7" /><Polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></Base>;
}
export function IconVerse({ color, size }: IconProps) {
  return <Base size={size} color={color}><Line x1="4" y1="7" x2="17" y2="7" /><Line x1="4" y1="12" x2="14" y2="12" /><Line x1="4" y1="17" x2="10" y2="17" /></Base>;
}
export function IconShield({ color, size }: IconProps) {
  return <Base size={size} color={color}><Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></Base>;
}
export function IconGrump({ color, size }: IconProps) {
  return (
    <Base size={size} color={color}>
      <Circle cx="12" cy="12" r="10" />
      <Path d="M16 16.5s-1.5-2-4-2-4 2-4 2" />
      <Line x1="9" y1="9" x2="9.01" y2="9" />
      <Line x1="15" y1="9" x2="15.01" y2="9" />
    </Base>
  );
}

export function IconCat({ color, size }: IconProps) {
  return (
    <Base size={size} color={color}>
      <Path d="M12 20c-4.4 0-8-2.7-8-7 0-1.9.7-3.6 1.9-4.9L5 3l4.5 2.2A8.8 8.8 0 0 1 12 4.9c.9 0 1.7.1 2.5.3L19 3l-.9 5.1A7.1 7.1 0 0 1 20 13c0 4.3-3.6 7-8 7z" />
      <Line x1="9" y1="12" x2="9.01" y2="12" />
      <Line x1="15" y1="12" x2="15.01" y2="12" />
    </Base>
  );
}

export function IconDumbbell({ color, size }: IconProps) {
  return (
    <Base size={size} color={color}>
      <Path d="M6.5 6.5v11" />
      <Path d="M17.5 6.5v11" />
      <Path d="M3 9.5v5" />
      <Path d="M21 9.5v5" />
      <Path d="M6.5 12h11" />
    </Base>
  );
}

/** 페르소나별 라인 아이콘 */
export function PersonaIcon({ persona, color, size }: { persona: string; color?: string; size?: number }) {
  switch (persona) {
    case '선생님': return <IconBook color={color} size={size} />;
    case '엄마': return <IconHeart color={color} size={size} />;
    case '상담사': return <IconMessage color={color} size={size} />;
    case '미래의 나': return <IconClock color={color} size={size} />;
    case '소설가': return <IconFeather color={color} size={size} />;
    case '전기 작가': return <IconAward color={color} size={size} />;
    case '시인': return <IconVerse color={color} size={size} />;
    case '언제나 내 편': return <IconShield color={color} size={size} />;
    case '투덜이': return <IconGrump color={color} size={size} />;
    case '고양이': return <IconCat color={color} size={size} />;
    case '트레이너': return <IconDumbbell color={color} size={size} />;
    default: return <IconMessage color={color} size={size} />;
  }
}
