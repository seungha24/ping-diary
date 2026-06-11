import React from 'react';
import Svg, { Path, Polyline } from 'react-native-svg';

export default function IconTrash({ color = '#9ca3af', size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="3 6 5 6 21 6" />
      <Path d="M19 6l-1 14H6L5 6" />
      <Path d="M10 11v6M14 11v6M9 6V4h6v2" />
    </Svg>
  );
}
