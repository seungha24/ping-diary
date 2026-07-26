import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Defs, RadialGradient, LinearGradient, Stop, Circle, Ellipse, Rect,
} from 'react-native-svg';
import TouchableOpacity from './Touchable';
import Animated, {
  useSharedValue, useAnimatedStyle, withSequence, withTiming, withDelay,
  Easing, runOnJS,
} from 'react-native-reanimated';

const BALL = 56;
const R = BALL / 2;

/** 탁구공 — 부드러운 구 음영(라디얼) + 반사 하이라이트. */
function PingPongBall() {
  return (
    <Svg width={BALL} height={BALL}>
      <Defs>
        <RadialGradient id="sphere" cx="36%" cy="30%" r="78%">
          <Stop offset="0" stopColor="#ffffff" />
          <Stop offset="0.38" stopColor="#f8f9f4" />
          <Stop offset="0.72" stopColor="#e6e9df" />
          <Stop offset="0.9" stopColor="#d0d5c5" />
          <Stop offset="1" stopColor="#bcc3ae" />
        </RadialGradient>
        <RadialGradient id="spec" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx={R} cy={R} r={R} fill="url(#sphere)" />
      <Ellipse cx={R * 0.62} cy={R * 0.54} rx={R * 0.34} ry={R * 0.26} fill="url(#spec)" />
    </Svg>
  );
}

const PW = 62, PH = 92; // 탁구채 SVG 크기

/** 탁구채 — 빨간 러버 블레이드 + 크림 테두리 + 나무 손잡이. */
function Paddle() {
  return (
    <Svg width={PW} height={PH}>
      <Defs>
        <RadialGradient id="rubber" cx="40%" cy="32%" r="75%">
          <Stop offset="0" stopColor="#e85c50" />
          <Stop offset="0.6" stopColor="#d23a30" />
          <Stop offset="1" stopColor="#b3271f" />
        </RadialGradient>
        <LinearGradient id="wood" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#d2a86e" />
          <Stop offset="0.5" stopColor="#b9884d" />
          <Stop offset="1" stopColor="#9c6c37" />
        </LinearGradient>
        <RadialGradient id="pspec" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#ffffff" stopOpacity="0.5" />
          <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      {/* 손잡이(나무) */}
      <Rect x={PW / 2 - 6.5} y={54} width={13} height={34} rx={5.5} fill="url(#wood)" />
      {/* 블레이드 크림 테두리 */}
      <Ellipse cx={PW / 2} cy={33} rx={30} ry={33} fill="#efe7d8" />
      {/* 러버 */}
      <Ellipse cx={PW / 2} cy={33} rx={27} ry={30} fill="url(#rubber)" />
      {/* 하이라이트 */}
      <Ellipse cx={PW / 2 - 8} cy={22} rx={12} ry={9} fill="url(#pspec)" />
    </Svg>
  );
}

// ── 물리 파라미터 ──
const K = 29;
const dur = (h: number) => Math.round(K * Math.sqrt(h));
const CONTACT = 66;      // 바닥 접촉(눌림) 시간
const SQUASH_DROP = 5;   // 눌릴 때 무게중심이 내려가는 양
const HIT_AT = 380;      // 탁구채가 공을 치는 시각(ms)
const LAUNCH_H = 120;    // 맞고 날아오르는 최고 높이
const BOUNCES = [58, 25, 10]; // 착지 후 감쇠 바운스

/**
 * p0ng 도착 연출 — 탁구채가 스윙해서 공을 치면, 공이 포물선으로 날아와
 * 통통 튀다 안착 → "p0ng이 도착했어요 / 보러가기" 팝업.
 * 순수 연출이라 실패해도 데이터엔 영향 없음.
 */
export default function PongArrival({ accent, onView }: { accent: string; onView: () => void }) {
  // 탁구채
  const pX = useSharedValue(-215);
  const pY = useSharedValue(34);
  const pRot = useSharedValue(-38);
  const pOpacity = useSharedValue(0);
  // 공
  const bX = useSharedValue(-96);
  const bY = useSharedValue(-6);
  const bSX = useSharedValue(1);
  const bSY = useSharedValue(1);
  const bOpacity = useSharedValue(0);
  // 팝업
  const pillOpacity = useSharedValue(0);
  const pillScale = useSharedValue(0.96);
  const pillShift = useSharedValue(14);
  const [showPill, setShowPill] = useState(false);

  useEffect(() => {
    const OUT = Easing.out(Easing.quad);
    const IN = Easing.in(Easing.quad);
    const ST = { x: 0.95, y: 1.06 };  // 정점 늘어남
    const SQ = { x: 1.18, y: 0.8 };   // 착지 눌림

    // ── 탁구채: 접근(와인드업) → 스윙(타격) → 팔로우스루 후 퇴장 ──
    pOpacity.value = withSequence(
      withTiming(1, { duration: 120 }),
      withTiming(1, { duration: 260 }),
      withTiming(0, { duration: 380, easing: IN }),
    );
    pX.value = withSequence(
      withTiming(-120, { duration: 260, easing: OUT }),
      withTiming(-104, { duration: 120, easing: IN }),
      withTiming(-240, { duration: 380, easing: IN }),
    );
    pY.value = withSequence(
      withTiming(8, { duration: 260, easing: OUT }),
      withTiming(-8, { duration: 120, easing: IN }),
      withTiming(-46, { duration: 380, easing: IN }),
    );
    pRot.value = withSequence(
      withTiming(-44, { duration: 260, easing: OUT }),  // 뒤로 감기
      withTiming(26, { duration: 120, easing: IN }),    // 휘둘러 타격
      withTiming(46, { duration: 380, easing: OUT }),   // 팔로우스루
    );

    // ── 공: 타격 순간 등장 → 포물선 비행 → 감쇠 바운스 ──
    bOpacity.value = withDelay(HIT_AT, withTiming(1, { duration: 70 }));
    bX.value = withDelay(HIT_AT, withTiming(0, { duration: 940, easing: Easing.bezier(0.17, 0.55, 0.3, 1) }));

    const tyA: any[] = [];
    const sxA: any[] = [];
    const syA: any[] = [];
    // 발사 상승
    tyA.push(withTiming(-LAUNCH_H, { duration: 360, easing: OUT }));
    sxA.push(withTiming(ST.x, { duration: 360 }));
    syA.push(withTiming(ST.y, { duration: 360 }));
    // 첫 낙하
    tyA.push(withTiming(0, { duration: 360, easing: IN }));
    sxA.push(withTiming(1, { duration: 360 }));
    syA.push(withTiming(1, { duration: 360 }));

    BOUNCES.forEach((h, i) => {
      const last = i === BOUNCES.length - 1;
      const half = CONTACT / 2;
      const d = dur(h);
      // 접촉: 눌림 → 반발
      tyA.push(withTiming(SQUASH_DROP, { duration: half, easing: OUT }));
      sxA.push(withTiming(SQ.x, { duration: half, easing: OUT }));
      syA.push(withTiming(SQ.y, { duration: half, easing: OUT }));
      tyA.push(withTiming(0, { duration: half, easing: IN }));
      sxA.push(withTiming(1, { duration: half, easing: IN }));
      syA.push(withTiming(1, { duration: half, easing: IN }));
      // 상승
      tyA.push(withTiming(-h, { duration: d, easing: OUT }));
      sxA.push(withTiming(ST.x, { duration: d }));
      syA.push(withTiming(ST.y, { duration: d }));
      // 낙하 (마지막이면 팝업 트리거)
      tyA.push(
        withTiming(0, { duration: d, easing: IN }, last ? (finished) => {
          'worklet';
          if (finished) runOnJS(setShowPill)(true);
        } : undefined),
      );
      sxA.push(withTiming(1, { duration: d }));
      syA.push(withTiming(1, { duration: d }));
    });

    bY.value = withDelay(HIT_AT, withSequence(...tyA));
    bSX.value = withDelay(HIT_AT, withSequence(...sxA));
    bSY.value = withDelay(HIT_AT, withSequence(...syA));
  }, []);

  useEffect(() => {
    if (!showPill) return;
    bOpacity.value = withTiming(0, { duration: 200 });
    pillOpacity.value = withDelay(80, withTiming(1, { duration: 260 }));
    pillScale.value = withDelay(80, withTiming(1, { duration: 320, easing: Easing.out(Easing.back(1.4)) }));
    pillShift.value = withDelay(80, withTiming(0, { duration: 320, easing: Easing.out(Easing.back(1.4)) }));
  }, [showPill]);

  const paddleStyle = useAnimatedStyle(() => ({
    opacity: pOpacity.value,
    transform: [{ translateX: pX.value }, { translateY: pY.value }, { rotate: `${pRot.value}deg` }],
  }));
  const ballStyle = useAnimatedStyle(() => ({
    opacity: bOpacity.value,
    transform: [
      { translateX: bX.value },
      { translateY: bY.value },
      { scaleX: bSX.value },
      { scaleY: bSY.value },
    ],
  }));
  const pillStyle = useAnimatedStyle(() => ({
    opacity: pillOpacity.value,
    transform: [{ translateY: pillShift.value }, { scale: pillScale.value }],
  }));

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {!showPill && (
        <>
          <Animated.View style={[styles.paddle, paddleStyle]} pointerEvents="none">
            <Paddle />
          </Animated.View>
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
  ball: { position: 'absolute', width: BALL, height: BALL },
  paddle: { position: 'absolute', width: PW, height: PH },
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
