import React from 'react';
import Svg, { Path } from 'react-native-svg';

export default function IconChev({ dir, color = '#9ca3af', size = 20 }: { dir: 'left' | 'right'; color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {dir === 'left' ? <Path d="M15 18l-6-6 6-6" /> : <Path d="M9 18l6-6-6-6" />}
    </Svg>
  );
}
