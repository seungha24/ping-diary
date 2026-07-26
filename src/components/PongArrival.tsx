import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Circle, Ellipse } from 'react-native-svg';
import TouchableOpacity from './Touchable';
import Animated, {
  useSharedValue, useAnimatedStyle, withSequence, withTiming, withDelay,
  Easing, runOnJS,
} from 'react-native-reanimated';

const BALL = 60; // 공 크기

/** 진짜 탁구공처럼 보이는 공 (SVG 라디얼 그라데이션 + 심선 + 하이라이트) */
function PingPongBall() {
  const r = BALL / 2;
  return (
    <Svg width={BALL} height={BALL}>
      <Defs>
        <RadialGradient id="pp" cx="37%" cy="30%" r="72%">
          <Stop offset="0" stopColor="#ffffff" />
          <Stop offset="0.45" stopColor="#fbfbf6" />
          <Stop offset="0.78" stopColor="#ecefe3" />
          <Stop offset="1" stopColor="#cfd5c3" />
        </RadialGradient>
      </Defs>
      <Circle cx={r} cy={r} r={r - 1} fill="url(#pp)" stroke="rgba(0,0,0,0.10)" strokeWidth={1} />
      {/* 심선 (탁구공 이음새) */}
      <Ellipse cx={r} cy={r} rx={r - 2} ry={r * 0.32} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={1} />
      {/* 반사 하이라이트 */}
      <Ellipse cx={r * 0.68} cy={r * 0.6} rx={r * 0.22} ry={r * 0.15} fill="rgba(255,255,255,0.9)" />
    </Svg>
  );
}

/**
 * p0ng 도착 연출 — 탁구공이 왼쪽에서 통통 튀어 잠금 카드에 안착한 뒤
 * "p0ng이 도착했어요 · 보러가기" 팝업으로 바뀐다. 보러가기를 누르면 onView.
 * 순수 연출 컴포넌트라 실패해도 데이터엔 영향 없다.
 */
export default function PongArrival({ accent, onView }: { accent: string; onView: () => void }) {
  const tx = useSharedValue(-150);
  const ty = useSharedValue(-70);
  const ballOpacity = useSharedValue(0);
  const pillOpacity = useSharedValue(0);
  const pillScale = useSharedValue(0.94);
  const [showPill, setShowPill] = useState(false);

  useEffect(() => {
    const up = Easing.out(Easing.quad);
    const down = Easing.in(Easing.quad);
    ballOpacity.value = withTiming(1, { duration: 120 });
    tx.value = withTiming(0, { duration: 1900, easing: Easing.bezier(0.26, 0.55, 0.3, 1) });
    ty.value = withSequence(
      withTiming(0, { duration: 300, easing: down }),
      withTiming(-100, { duration: 300, easing: up }),
      withTiming(0, { duration: 300, easing: down }),
      withTiming(-56, { duration: 240, easing: up }),
      withTiming(0, { duration: 240, easing: down }),
      withTiming(-28, { duration: 190, easing: up }),
      withTiming(0, { duration: 190, easing: down }),
      withTiming(-11, { duration: 130, easing: up }),
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
      <Animated.View style={[styles.ball, ballStyle]} pointerEvents="none">
        <PingPongBall />
      </Animated.View>

      {showPill && (
        <Animated.View style={[styles.pill, pillStyle]}>
          <Text style={[styles.pillSpark, { color: accent }]}>✦</Text>
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
    width: BALL, height: BALL,
    shadowColor: '#1e2836', shadowOpacity: 0.35, shadowRadius: 11, shadowOffset: { width: 0, height: 9 },
    elevation: 6,
  },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#eef0f2', borderRadius: 20,
    paddingVertical: 12, paddingLeft: 16, paddingRight: 11,
    shadowColor: '#1e325a', shadowOpacity: 0.3, shadowRadius: 22, shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
  pillSpark: { fontSize: 17, fontWeight: '800' },
  pillText: { fontSize: 15.5, fontWeight: '700', color: '#1a1c20' },
  pillBtn: { borderRadius: 999, paddingVertical: 9, paddingHorizontal: 17 },
  pillBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
