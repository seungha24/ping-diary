import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

export default function IconBell({ color = '#111827', size = 22, dot = false }: { color?: string; size?: number; dot?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
      {dot && <Circle cx="18" cy="5" r="4" fill="#ef4444" stroke="none" />}
    </Svg>
  );
}
