import React from 'react';
import { Pressable, StyleProp, ViewStyle, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';

/**
 * 중앙 팝업(줌 카드)용 오버레이: 배경 페이드 + 카드 스프링 스케일.
 * PhotoLightbox와 같은 등장감을 재사용 가능한 형태로.
 */
export default function PopWrap({ style, onBackdropPress, children }: {
  style?: StyleProp<ViewStyle>; // absolute fill + 중앙 정렬 + 어두운 배경
  onBackdropPress?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Animated.View style={style} entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onBackdropPress} />
      <Animated.View
        entering={ZoomIn.springify().damping(16).stiffness(200)}
        exiting={ZoomOut.duration(150)}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
}
