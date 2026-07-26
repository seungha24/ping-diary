import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Circle, Ellipse } from 'react-native-svg';
import TouchableOpacity from './Touchable';
import Animated, {
  useSharedValue, useAnimatedStyle, withSequence, withTiming, withDelay,
  Easing, runOnJS,
} from 'react-native-reanimated';

const BALL = 60;

/** 탁구공 — 부드러운 구 음영(라디얼) + 반사 하이라이트. 하드 테두리·심선 없음. */
function PingPongBall() {
  const r = BALL / 2;
  return (
    <Svg width={BALL} height={BALL}>
      <Defs>
        {/* 왼쪽 위가 밝고 오른쪽 아래로 갈수록 어두워지는 구 음영 */}
        <RadialGradient id="sphere" cx="36%" cy="30%" r="78%">
          <Stop offset="0" stopColor="#ffffff" />
          <Stop offset="0.38" stopColor="#f8f9f4" />
          <Stop offset="0.72" stopColor="#e6e9df" />
          <Stop offset="0.9" stopColor="#d0d5c5" />
          <Stop offset="1" stopColor="#bcc3ae" />
        </RadialGradient>
        {/* 반사광 */}
        <RadialGradient id="spec" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx={r} cy={r} r={r} fill="url(#sphere)" />
      {/* 좌상단 하이라이트 */}
      <Ellipse cx={r * 0.62} cy={r * 0.54} rx={r * 0.34} ry={r * 0.26} fill="url(#spec)" />
    </Svg>
  );
}

/**
 * p0ng 도착 연출 — 탁구공이 왼쪽에서 통통 튀어 안착 → "p0ng이 도착했어요 / 보러가기" 팝업.
 * 보러가기를 누르면 onView. 순수 연출이라 실패해도 데이터엔 영향 없음.
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
          <View style={styles.pillTop}>
            <Text style={[styles.pillSpark, { color: accent }]}>✦</Text>
            <Text style={styles.pillText}>p0ng이 도착했어요</Text>
          </View>
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
    shadowColor: '#1e2836', shadowOpacity: 0.32, shadowRadius: 11, shadowOffset: { width: 0, height: 9 },
    elevation: 6,
  },
  pill: {
    alignItems: 'center', gap: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#eef0f2', borderRadius: 20,
    paddingVertical: 16, paddingHorizontal: 22,
    shadowColor: '#1e325a', shadowOpacity: 0.3, shadowRadius: 22, shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
  pillTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pillSpark: { fontSize: 17, fontWeight: '800' },
  pillText: { fontSize: 15.5, fontWeight: '700', color: '#1a1c20' },
  pillBtn: { borderRadius: 999, paddingVertical: 10, paddingHorizontal: 30 },
  pillBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
