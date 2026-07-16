import React from 'react';
import { Platform, Pressable, StyleProp, ViewStyle, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut, withTiming, Easing } from 'react-native-reanimated';

// 카드 등장: 0.96 → 1로 살짝 커지며 페이드 — 스프링 바운스 없이 차분하게.
// 커스텀 entering은 웹 미지원이라 네이티브 전용 (웹은 페이드로 폴백).
const gentlePopIn = () => {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.96 }] },
    animations: {
      opacity: withTiming(1, { duration: 160 }),
      transform: [{ scale: withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) }) }],
    },
  };
};

/**
 * 중앙 팝업용 오버레이: 배경 페이드 + 카드가 살짝 커지며 등장.
 * PhotoLightbox와 같은 등장감을 재사용 가능한 형태로.
 */
export default function PopWrap({ style, onBackdropPress, children }: {
  style?: StyleProp<ViewStyle>; // absolute fill + 중앙 정렬 + 어두운 배경
  onBackdropPress?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Animated.View style={style} entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onBackdropPress} />
      <Animated.View
        entering={Platform.OS === 'web' ? FadeIn.duration(160) : gentlePopIn}
        exiting={FadeOut.duration(120)}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
}
