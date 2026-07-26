import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Circle, Ellipse } from 'react-native-svg';
import TouchableOpacity from './Touchable';
import Animated, {
  useSharedValue, useAnimatedStyle, withSequence, withTiming, withDelay,
  Easing, runOnJS, interpolate, Extrapolation,
} from 'react-native-reanimated';

const BALL = 60;
const R = BALL / 2;

/** 탁구공 — 부드러운 구 음영(라디얼) + 반사 하이라이트. 하드 테두리·심선 없음. */
function PingPongBall() {
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
      <Circle cx={R} cy={R} r={R} fill="url(#sphere)" />
      {/* 좌상단 하이라이트 */}
      <Ellipse cx={R * 0.62} cy={R * 0.54} rx={R * 0.34} ry={R * 0.26} fill="url(#spec)" />
    </Svg>
  );
}

// ── 바운스 물리 파라미터 ──
const PEAKS = [104, 60, 33, 17, 7]; // 각 튐의 최고 높이(px), 감쇠
const ENTRY_H = 92;                 // 화면에 들어올 때의 시작 높이
const K = 29;                       // 높이→시간 계수 (낙하시간 ∝ √높이)
const CONTACT = 66;                 // 바닥 접촉(눌림) 시간
const SQUASH_DROP = 6;              // 눌릴 때 무게중심이 내려가는 양(바닥에 붙어보이게)
const dur = (h: number) => Math.round(K * Math.sqrt(h));

const FLOOR_TOP = -104;             // 그림자 보간 기준(가장 높이 뜬 지점)

/**
 * p0ng 도착 연출 — 탁구공이 왼쪽에서 통통 튀어 안착 → "p0ng이 도착했어요 / 보러가기" 팝업.
 * 착지 눌림(squash&stretch) + 높이에 따라 커지는 바닥 그림자 + 감쇠 포물선으로 실제 탁구공처럼.
 * 보러가기를 누르면 onView. 순수 연출이라 실패해도 데이터엔 영향 없음.
 */
export default function PongArrival({ accent, onView }: { accent: string; onView: () => void }) {
  const tx = useSharedValue(-170);
  const ty = useSharedValue(-ENTRY_H);
  const sx = useSharedValue(1);
  const sy = useSharedValue(1);
  const ballOpacity = useSharedValue(0);
  const pillOpacity = useSharedValue(0);
  const pillScale = useSharedValue(0.96);
  const pillShift = useSharedValue(14);
  const [showPill, setShowPill] = useState(false);

  useEffect(() => {
    const EASE_FALL = Easing.in(Easing.quad);   // 낙하 = 가속
    const EASE_RISE = Easing.out(Easing.quad);  // 상승 = 감속
    const SQ = { x: 1.18, y: 0.8 };             // 착지 눌림
    const ST = { x: 0.95, y: 1.06 };            // 정점 늘어남(살짝)

    const tyA: any[] = [];
    const sxA: any[] = [];
    const syA: any[] = [];
    let total = 0;

    // 등장: 첫 낙하 (구른 자세 유지)
    const d0 = dur(ENTRY_H); total += d0;
    tyA.push(withTiming(0, { duration: d0, easing: EASE_FALL }));
    sxA.push(withTiming(1, { duration: d0 }));
    syA.push(withTiming(1, { duration: d0 }));

    PEAKS.forEach((h, i) => {
      const last = i === PEAKS.length - 1;
      const half = CONTACT / 2;
      const d = dur(h);
      total += CONTACT + d * 2;

      // 접촉: 눌림(무게중심 살짝 내려가 바닥에 붙음) → 반발
      tyA.push(withTiming(SQUASH_DROP, { duration: half, easing: Easing.out(Easing.quad) }));
      sxA.push(withTiming(SQ.x, { duration: half, easing: Easing.out(Easing.quad) }));
      syA.push(withTiming(SQ.y, { duration: half, easing: Easing.out(Easing.quad) }));
      tyA.push(withTiming(0, { duration: half, easing: Easing.in(Easing.quad) }));
      sxA.push(withTiming(1, { duration: half, easing: Easing.in(Easing.quad) }));
      syA.push(withTiming(1, { duration: half, easing: Easing.in(Easing.quad) }));

      // 상승(정점서 살짝 늘어남)
      tyA.push(withTiming(-h, { duration: d, easing: EASE_RISE }));
      sxA.push(withTiming(ST.x, { duration: d }));
      syA.push(withTiming(ST.y, { duration: d }));

      // 낙하(다시 둥글게) — 마지막이면 완료 콜백으로 팝업 트리거
      tyA.push(
        withTiming(0, { duration: d, easing: EASE_FALL }, last ? (finished) => {
          'worklet';
          if (finished) runOnJS(setShowPill)(true);
        } : undefined),
      );
      sxA.push(withTiming(1, { duration: d }));
      syA.push(withTiming(1, { duration: d }));
    });

    ballOpacity.value = withTiming(1, { duration: 110 });
    tx.value = withTiming(0, { duration: total, easing: Easing.bezier(0.16, 0.5, 0.3, 1) });
    ty.value = withSequence(...tyA);
    sx.value = withSequence(...sxA);
    sy.value = withSequence(...syA);
  }, []);

  useEffect(() => {
    if (!showPill) return;
    ballOpacity.value = withTiming(0, { duration: 220 });
    pillOpacity.value = withDelay(90, withTiming(1, { duration: 260 }));
    pillScale.value = withDelay(90, withTiming(1, { duration: 320, easing: Easing.out(Easing.back(1.4)) }));
    pillShift.value = withDelay(90, withTiming(0, { duration: 320, easing: Easing.out(Easing.back(1.4)) }));
  }, [showPill]);

  const ballStyle = useAnimatedStyle(() => ({
    opacity: ballOpacity.value,
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scaleX: sx.value },
      { scaleY: sy.value },
    ],
  }));
  // 바닥 그림자: 바닥에 고정, 공이 높을수록 작고 옅게 / 낮을수록 크고 진하게
  const shadowStyle = useAnimatedStyle(() => {
    const s = interpolate(ty.value, [FLOOR_TOP, SQUASH_DROP], [0.5, 1.05], Extrapolation.CLAMP);
    const o = interpolate(ty.value, [FLOOR_TOP, SQUASH_DROP], [0.05, 0.22], Extrapolation.CLAMP);
    return { opacity: o, transform: [{ translateY: R - 2 }, { scaleX: s }, { scaleY: s }] };
  });
  const pillStyle = useAnimatedStyle(() => ({
    opacity: pillOpacity.value,
    transform: [{ translateY: pillShift.value }, { scale: pillScale.value }],
  }));

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {!showPill && (
        <>
          <Animated.View style={[styles.shadow, shadowStyle]} pointerEvents="none" />
          <Animated.View style={[styles.ball, ballStyle]} pointerEvents="none">
            <PingPongBall />
          </Animated.View>
        </>
      )}

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
    // 그림자는 아래 shadow(타원)로 그린다 — View에 shadow를 주면 웹에서 사각형 box-shadow가 생김
    position: 'absolute',
    width: BALL, height: BALL,
  },
  shadow: {
    position: 'absolute',
    width: BALL * 0.78, height: 12,
    borderRadius: 999,
    backgroundColor: '#0e1524',
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
