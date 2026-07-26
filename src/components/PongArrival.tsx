import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Defs, RadialGradient, Stop, Circle, Ellipse, Rect, Path, ClipPath,
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

const PW = 82, PH = 136; // 탁구채 SVG 크기

/** 탁구채 — 심플 플랫(이모지풍). 로즈 블레이드 + 그레이시 우드 손잡이·throat.
 *  채도만 또렷하게 올린 버전. */
function Paddle() {
  const ROSE = '#db6f7c';
  const WOOD = '#cbb79a';
  return (
    <Svg width={PW} height={PH}>
      <Defs>
        <ClipPath id="blade"><Circle cx={41} cy={40} r={37} /></ClipPath>
      </Defs>
      {/* 손잡이(나무) — 블레이드 뒤로 들어가 아래로 뻗음 */}
      <Rect x={30} y={71} width={22} height={60} rx={11} fill={WOOD} />
      {/* 블레이드 */}
      <Circle cx={41} cy={40} r={37} fill={ROSE} />
      {/* 나무 throat — 블레이드 좌하단으로 대각선으로 파고듦 */}
      <Path d="M0 34 L55 77 L60 93 L0 93 Z" fill={WOOD} clipPath="url(#blade)" />
    </Svg>
  );
}

// ── 물리 파라미터 ──
const K = 27;
const dur = (h: number) => Math.round(K * Math.sqrt(h));
const LAUNCH_H = 130;
// 탁구공은 딱딱해서 눌리지 않고 '통통' 여러 번 짧게 튄다 (감쇠, 뒤로 갈수록 촘촘)
const BOUNCES = [72, 44, 26, 15, 8, 4];
// 탁구채 타이밍
const APPROACH = 520, HOLD = 180, SWING = 170, RETREAT = 440;
const HIT_AT = APPROACH + HOLD + SWING; // 공을 치는 시각

/**
 * p0ng 도착 연출 — 탁구채가 들어와 준비자세로 잠깐 멈췄다가 스윙해서 공을 친다.
 * 타격 순간 임팩트가 반짝이고, 공이 큰 포물선으로 천천히 날아와 통통 튀며 안착 →
 * "p0ng이 도착했어요 / 보러가기" 팝업. 순수 연출이라 실패해도 데이터엔 영향 없음.
 */
export default function PongArrival({ accent, onView }: { accent: string; onView: () => void }) {
  // 탁구채
  const pX = useSharedValue(-220);
  const pY = useSharedValue(42);
  const pRot = useSharedValue(-30);
  const pOpacity = useSharedValue(0);
  // 임팩트 반짝임
  const fScale = useSharedValue(0.3);
  const fOpacity = useSharedValue(0);
  // 공
  const bX = useSharedValue(-92);
  const bY = useSharedValue(-8);
  const bScale = useSharedValue(1);
  const bOpacity = useSharedValue(0);
  // 팝업
  const pillOpacity = useSharedValue(0);
  const pillScale = useSharedValue(0.4);
  const [showPill, setShowPill] = useState(false);

  useEffect(() => {
    const OUT = Easing.out(Easing.quad);
    const IN = Easing.in(Easing.quad);

    // ── 탁구채: 접근 → 준비자세 유지(HOLD) → 스윙(타격) → 팔로우스루 후 퇴장 ──
    pOpacity.value = withSequence(
      withTiming(1, { duration: 160 }),
      withTiming(1, { duration: HIT_AT - 160 }),
      withTiming(0, { duration: RETREAT, easing: IN }),
    );
    pX.value = withSequence(
      withTiming(-122, { duration: APPROACH, easing: OUT }),
      withTiming(-122, { duration: HOLD }),
      withTiming(-104, { duration: SWING, easing: IN }),
      withTiming(-250, { duration: RETREAT, easing: IN }),
    );
    pY.value = withSequence(
      withTiming(6, { duration: APPROACH, easing: OUT }),
      withTiming(6, { duration: HOLD }),
      withTiming(-10, { duration: SWING, easing: IN }),
      withTiming(-54, { duration: RETREAT, easing: IN }),
    );
    pRot.value = withSequence(
      withTiming(-46, { duration: APPROACH, easing: OUT }),  // 뒤로 감기
      withTiming(-46, { duration: HOLD }),                   // 준비자세 유지
      withTiming(28, { duration: SWING, easing: IN }),       // 휘둘러 타격
      withTiming(52, { duration: RETREAT, easing: OUT }),    // 팔로우스루
    );

    // ── 임팩트 반짝임(타격 순간) ──
    fOpacity.value = withDelay(HIT_AT, withSequence(
      withTiming(0.9, { duration: 60 }),
      withTiming(0, { duration: 220, easing: OUT }),
    ));
    fScale.value = withDelay(HIT_AT, withTiming(1.6, { duration: 280, easing: OUT }));

    // ── 공: 타격 순간 등장 → 포물선 비행 → 딱딱한 '통통' 바운스(눌림 없음) ──
    bOpacity.value = withDelay(HIT_AT, withTiming(1, { duration: 70 }));
    bX.value = withDelay(HIT_AT, withTiming(0, { duration: 1150, easing: Easing.bezier(0.17, 0.55, 0.3, 1) }));

    const tyA: any[] = [];
    // 발사 상승 → 첫 낙하
    tyA.push(withTiming(-LAUNCH_H, { duration: 470, easing: OUT }));
    tyA.push(withTiming(0, { duration: 450, easing: IN }));
    // 바닥에서 즉시 반전하는 딱딱한 바운스(V자) — 눌림/머무름 없음
    BOUNCES.forEach((h, i) => {
      const last = i === BOUNCES.length - 1;
      const d = dur(h);
      tyA.push(withTiming(-h, { duration: d, easing: OUT }));   // 튀어오름(감속)
      tyA.push(
        withTiming(0, { duration: d, easing: IN }, last ? (finished) => { // 떨어짐(가속)
          'worklet';
          if (finished) runOnJS(setShowPill)(true);
        } : undefined),
      );
    });

    bY.value = withDelay(HIT_AT, withSequence(...tyA));
  }, []);

  useEffect(() => {
    if (!showPill) return;
    // 공이 안착한 그 자리에서 팝업이 피어나듯 연결 — 공은 오므라들며 사라지고,
    // 팝업이 같은 지점에서 작게 시작해 살짝 튕기며(back) 커진다.
    bScale.value = withTiming(0.2, { duration: 200, easing: Easing.in(Easing.quad) });
    bOpacity.value = withTiming(0, { duration: 200 });
    pillOpacity.value = withTiming(1, { duration: 220 });
    pillScale.value = withTiming(1, { duration: 380, easing: Easing.out(Easing.back(1.5)) });
  }, [showPill]);

  const paddleStyle = useAnimatedStyle(() => ({
    opacity: pOpacity.value,
    transform: [{ translateX: pX.value }, { translateY: pY.value }, { rotate: `${pRot.value}deg` }],
  }));
  const flashStyle = useAnimatedStyle(() => ({
    opacity: fOpacity.value,
    transform: [{ translateX: -98 }, { translateY: -10 }, { scale: fScale.value }],
  }));
  const ballStyle = useAnimatedStyle(() => ({
    opacity: bOpacity.value,
    transform: [
      { translateX: bX.value },
      { translateY: bY.value },
      { scale: bScale.value },
    ],
  }));
  const pillStyle = useAnimatedStyle(() => ({
    opacity: pillOpacity.value,
    transform: [{ scale: pillScale.value }],
  }));

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {!showPill && (
        <>
          <Animated.View style={[styles.paddle, paddleStyle]} pointerEvents="none">
            <Paddle />
          </Animated.View>
          <Animated.View style={[styles.flash, flashStyle]} pointerEvents="none" />
        </>
      )}
      {/* 공은 항상 마운트 — 팝업으로 오므라드는 연결 연출이 보이도록 opacity로만 제어 */}
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
  ball: { position: 'absolute', width: BALL, height: BALL },
  paddle: { position: 'absolute', width: PW, height: PH },
  flash: {
    position: 'absolute',
    width: 34, height: 34, borderRadius: 999,
    borderWidth: 3, borderColor: '#cf8790',
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
