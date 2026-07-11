import React from 'react';
import { TouchableOpacity as RNTouchableOpacity, TouchableOpacityProps } from 'react-native';

/**
 * activeOpacity 기본값을 0.7로 낮춘 TouchableOpacity.
 * 기본값 0.2는 탭할 때 플래시가 너무 강해서 앱이 다급해 보인다.
 * 호출부에서 activeOpacity를 명시하면 그 값이 우선한다.
 */
export default function Touchable(props: TouchableOpacityProps) {
  return <RNTouchableOpacity activeOpacity={0.7} {...props} />;
}
