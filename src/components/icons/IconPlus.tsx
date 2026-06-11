import React from 'react';
import Svg, { Path } from 'react-native-svg';

export default function IconPlus({ color = 'currentColor', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}
