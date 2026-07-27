import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withDelay, withTiming, Easing, runOnJS,
} from 'react-native-reanimated';

/** 커튼 한 짝 — 주름(세로 스트라이프) + 안쪽 금색 트림. */
function Panel({ inner }: { inner: 'right' | 'left' }) {
  const pleats = [0, 1, 2, 3, 4, 5];
  return (
    <View style={[styles.panel, inner === 'right' ? styles.trimRight : styles.trimLeft]}>
      {pleats.map((i) => (
        <View key={i} style={[styles.pleat, { backgroundColor: i % 2 === 0 ? '#a8323e' : '#932a35' }]} />
      ))}
    </View>
  );
}

/**
 * 시상식 커튼 — 자식 콘텐츠를 덮고 있다가 양옆으로 스르륵 걷히는 오버레이.
 * 부모(콘텐츠를 감싼 relative 컨테이너)의 마지막 자식으로 넣으면 된다.
 * 걷힘이 끝나면 onDone으로 스스로 제거를 요청한다.
 */
export default function CurtainReveal({ onDone }: { onDone: () => void }) {
  const [w, setW] = useState(0);
  const progress = useSharedValue(0); // 0=닫힘, 1=완전히 걷힘

  useEffect(() => {
    if (!w) return;
    // 닫힌 커튼을 잠깐 보여줬다가(기대감) 천천히 걷는다
    progress.value = withDelay(500, withTiming(1, {
      duration: 1250,
      easing: Easing.inOut(Easing.cubic),
    }, (finished) => {
      'worklet';
      if (finished) runOnJS(onDone)();
    }));
  }, [w]);

  const leftStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -progress.value * (w / 2 + 24) }],
  }));
  const rightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * (w / 2 + 24) }],
  }));

  return (
    <View
      style={styles.overlay}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      pointerEvents="auto"
    >
      <Animated.View style={[styles.half, { left: 0 }, leftStyle]}>
        <Panel inner="right" />
      </Animated.View>
      <Animated.View style={[styles.half, { right: 0 }, rightStyle]}>
        <Panel inner="left" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    overflow: 'hidden',
    borderRadius: 16, // 카드 모서리에 맞춤
  },
  half: {
    position: 'absolute', top: 0, bottom: 0, width: '50%',
  },
  panel: {
    flex: 1, flexDirection: 'row',
  },
  pleat: { flex: 1 },
  trimRight: { borderRightWidth: 3, borderRightColor: '#d9b463' },
  trimLeft: { borderLeftWidth: 3, borderLeftColor: '#d9b463' },
});
