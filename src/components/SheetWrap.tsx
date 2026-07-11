import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';

/**
 * 바텀시트/오버레이 등장 애니메이션 래퍼 (아이폰 시트 느낌).
 * 기존 <View style={styles.overlayWrap}> 자리에 그대로 끼워 쓴다 —
 * 배경은 페이드, 내용물은 살짝 슬라이드업.
 */
export default function SheetWrap({ style, children }: {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [anim]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
