import { LayoutAnimation, Platform } from 'react-native';

/**
 * setState 직전에 호출하면 다음 레이아웃 변화(펼침/접힘 등)가 부드러워진다.
 * iOS/Android 전용 — 웹에서는 no-op.
 */
export function animateLayout(duration = 220) {
  if (Platform.OS === 'web') return;
  LayoutAnimation.configureNext(
    LayoutAnimation.create(duration, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity),
  );
}
