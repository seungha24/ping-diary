import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import TouchableOpacity from './Touchable';
import Animated, {
  useSharedValue, useAnimatedStyle, withSequence, withTiming, withDelay,
  Easing, runOnJS,
} from 'react-native-reanimated';

/**
 * p0ng 도착 연출 — 탁구공이 왼쪽에서 통통 튀어 잠금 카드에 안착한 뒤
 * "p0ng이 도착했어요 · 보러가기" 팝업으로 바뀐다. 보러가기를 누르면 onView.
 * 순수 연출 컴포넌트라 실패해도 데이터엔 영향 없다.
 */
export default function PongArrival({ accent, onView }: { accent: string; onView: () => void }) {
  const tx = useSharedValue(-150);   // 가로: 왼쪽 밖 → 중앙
  const ty = useSharedValue(-64);    // 세로: 0 = 카드 위 안착점, 음수 = 위로 튐
  const ballOpacity = useSharedValue(0);
  const pillOpacity = useSharedValue(0);
  const pillScale = useSharedValue(0.94);
  const [showPill, setShowPill] = useState(false);

  useEffect(() => {
    const up = Easing.out(Easing.quad);   // 올라갈 땐 감속
    const down = Easing.in(Easing.quad);  // 내려올 땐 가속(중력)
    ballOpacity.value = withTiming(1, { duration: 120 });
    // 가로: 2초에 걸쳐 감속하며 중앙으로
    tx.value = withTiming(0, { duration: 1900, easing: Easing.bezier(0.26, 0.55, 0.3, 1) });
    // 세로: 감쇠 바운스 (점점 낮게 4번 튀고 안착)
    ty.value = withSequence(
      withTiming(0, { duration: 300, easing: down }),
      withTiming(-96, { duration: 300, easing: up }),
      withTiming(0, { duration: 300, easing: down }),
      withTiming(-54, { duration: 240, easing: up }),
      withTiming(0, { duration: 240, easing: down }),
      withTiming(-26, { duration: 190, easing: up }),
      withTiming(0, { duration: 190, easing: down }),
      withTiming(-10, { duration: 130, easing: up }),
      withTiming(0, { duration: 130, easing: down }, (finished) => {
        if (finished) runOnJS(setShowPill)(true);
      }),
    );
  }, []);

  useEffect(() => {
    if (!showPill) return;
    ballOpacity.value = withTiming(0, { duration: 200 });
    pillOpacity.value = withDelay(80, withTiming(1, { duration: 280 }));
    pillScale.value = withDelay(80, withTiming(1, { duration: 320, easing: Easing.out(Easing.back(1.3)) }));
  }, [showPill]);

  const ballStyle = useAnimatedStyle(() => ({
    opacity: ballOpacity.value,
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }));
  const pillStyle = useAnimatedStyle(() => ({
    opacity: pillOpacity.value,
    transform: [{ scale: pillScale.value }],
  }));

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* 탁구공 */}
      <Animated.View style={[styles.ball, ballStyle]} pointerEvents="none">
        <View style={styles.ballHi} />
      </Animated.View>

      {/* 도착 팝업 */}
      {showPill && (
        <Animated.View style={[styles.pill, pillStyle]}>
          <View style={styles.pillBall} />
          <Text style={styles.pillText}>p0ng이 도착했어요</Text>
          <TouchableOpacity style={[styles.pillBtn, { backgroundColor: accent }]} onPress={onView}>
            <Text style={styles.pillBtnText}>보러가기</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ball: {
    position: 'absolute',
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#1e2836', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  ballHi: {
    position: 'absolute', left: 13, top: 10, width: 14, height: 11, borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#eef0f2', borderRadius: 16,
    paddingVertical: 8, paddingLeft: 10, paddingRight: 8,
    shadowColor: '#1e325a', shadowOpacity: 0.28, shadowRadius: 18, shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  pillBall: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
  },
  pillText: { fontSize: 13.5, fontWeight: '700', color: '#1a1c20' },
  pillBtn: { borderRadius: 999, paddingVertical: 6, paddingHorizontal: 13 },
  pillBtnText: { color: '#fff', fontSize: 12.5, fontWeight: '700' },
});
