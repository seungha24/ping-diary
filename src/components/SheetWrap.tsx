import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, Easing } from 'react-native-reanimated';

/**
 * 바텀시트/오버레이 래퍼 (아이폰 시트 느낌).
 * 기존 <View style={styles.overlayWrap}> 자리에 그대로 끼워 쓴다.
 * reanimated의 exiting 덕분에 `{cond && <SheetWrap>}` 패턴 그대로
 * 닫힐 때도 슬라이드다운+페이드가 적용된다.
 */
export default function SheetWrap({ style, children }: {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  return (
    <Animated.View
      style={style}
      entering={FadeInDown.duration(240)
        .easing(Easing.out(Easing.cubic))
        .withInitialValues({ opacity: 0, transform: [{ translateY: 16 }] })}
      exiting={FadeOutDown.duration(180).easing(Easing.in(Easing.cubic))}
    >
      {children}
    </Animated.View>
  );
}
