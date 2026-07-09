import React from 'react';
import Svg, { Path } from 'react-native-svg';

const CHEV_PATH: Record<'left' | 'right' | 'down', string> = {
  left: 'M15 18l-6-6 6-6',
  right: 'M9 18l6-6-6-6',
  down: 'M6 9l6 6 6-6',
};

export default function IconChev({ dir, color = '#9ca3af', size = 20 }: { dir: 'left' | 'right' | 'down'; color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d={CHEV_PATH[dir]} />
    </Svg>
  );
}
