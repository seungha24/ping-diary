import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';

/**
 * 마운트 시 페이드+살짝 상승.
 * key를 상태값으로 주면 상태가 바뀔 때 리마운트되며 콘텐츠 전환 애니메이션이 된다.
 */
export default function FadeIn({ style, children, duration = 180, offset = 8 }: {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  duration?: number;
  offset?: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1, duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [anim, duration]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
