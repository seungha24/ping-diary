import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Defs, RadialGradient, Stop, Circle, Ellipse, Rect, Path, ClipPath,
} from 'react-native-svg';
import TouchableOpacity from './Touchable';
import Animated, {
  useSharedValue, useAnimatedStyle, withSequence, withTiming, withDelay,
  Easing, runOnJS, interpolate, Extrapolation,
} from 'react-native-reanimated';

// ── 도착 연출 스타일 토글 ─────────────────────────────────────
// 'letter' = 편지 봉투가 떠내려와 안착 / 'paddle' = 탁구채로 공을 쳐서 날아옴.
// 나중에 탁구채로 되돌리려면 이 값만 'paddle'로 바꾸면 된다.
const ARRIVAL_STYLE: 'letter' | 'paddle' = 'letter';

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

const EW = 140, EH = 100; // 편지 봉투 크기
const FLAP_TOP = 20;      // 플랩 힌지(윗변) y

/** 봉투 몸통 — 오프화이트 종이 + 안쪽(플랩 열리면 보임). */
function EnvelopeBody() {
  return (
    <Svg width={EW} height={EH}>
      <Rect x={3} y={FLAP_TOP} width={134} height={76} rx={12} fill="#fdfcf9" stroke="#ddd9cd" strokeWidth={2} />
      {/* 안쪽 */}
      <Rect x={7} y={FLAP_TOP + 2} width={126} height={38} rx={4} fill="#f4f2eb" />
    </Svg>
  );
}

/** 봉투 플랩(삼각형) — 윗변을 힌지로 위로 열린다. */
function EnvelopeFlap() {
  return (
    <Svg width={EW} height={46}>
      <Path d="M3 0 L70 42 L137 0 Z" fill="#eae7dd" stroke="#ddd9cd" strokeWidth={2} strokeLinejoin="round" />
    </Svg>
  );
}

const SHADOW_W = 56, SHADOW_H = 20;

/** 바닥 그림자 — 가운데 진하고 가장자리로 투명하게 번지는 소프트 타원(하드엣지 X). */
function GroundShadow() {
  return (
    <Svg width={SHADOW_W} height={SHADOW_H}>
      <Defs>
        <RadialGradient id="gsh" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#1e1b16" stopOpacity="0.5" />
          <Stop offset="0.55" stopColor="#1e1b16" stopOpacity="0.2" />
          <Stop offset="1" stopColor="#1e1b16" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx={SHADOW_W / 2} cy={SHADOW_H / 2} rx={SHADOW_W / 2} ry={SHADOW_H / 2} fill="url(#gsh)" />
    </Svg>
  );
}

const PW = 82, PH = 136; // 탁구채 SVG 크기

/** 탁구채 — 심플 플랫(이모지풍). 로즈 블레이드 + 그레이시 우드 손잡이·throat. */
function Paddle() {
  const ROSE = '#db6f7c';
  const WOOD = '#cbb79a';
  return (
    <Svg width={PW} height={PH}>
      <Defs>
        <ClipPath id="blade"><Circle cx={41} cy={40} r={37} /></ClipPath>
      </Defs>
      <Rect x={30} y={71} width={22} height={60} rx={11} fill={WOOD} />
      <Circle cx={41} cy={40} r={37} fill={ROSE} />
      <Path d="M0 34 L55 77 L60 93 L0 93 Z" fill={WOOD} clipPath="url(#blade)" />
    </Svg>
  );
}

/** 두 버전이 공유하는 팝업(배너). */
function ArrivalPill({ accent, onView, style }: { accent: string; onView: () => void; style: any }) {
  return (
    <Animated.View style={[styles.pill, style]}>
      <View style={styles.pillTop}>
        <Text style={[styles.pillSpark, { color: accent }]}>✦</Text>
        <Text style={styles.pillText}>p0ng이 도착했어요</Text>
      </View>
      <TouchableOpacity style={[styles.pillBtn, { backgroundColor: accent }]} onPress={onView}>
        <Text style={styles.pillBtnText}>보러가기</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ══════════════════════════════════════════════════════════════
//  편지 버전 — 봉투가 위에서 떠내려와 살랑이며 안착 → 팝업
// ══════════════════════════════════════════════════════════════
function LetterArrival({ accent, onView }: { accent: string; onView: () => void }) {
  // 비행: 오른쪽 뒤에서 '‹' 포물선을 그리며 앞으로(커지며) 날아옴
  const eX = useSharedValue(200);
  const eY = useSharedValue(-30);
  const eRot = useSharedValue(14);
  const eScale = useSharedValue(0.5);
  const eOpacity = useSharedValue(0);
  const flapRot = useSharedValue(0);   // 플랩 열림(rotateX)
  // 팝업: 봉투 안에서 위로 나옴
  const pillOpacity = useSharedValue(0);
  const pillScale = useSharedValue(0.5);
  const pillShift = useSharedValue(30);
  const [showPill, setShowPill] = useState(false);

  useEffect(() => {
    const OUT = Easing.out(Easing.cubic);
    const INOUT = Easing.inOut(Easing.quad);
    eOpacity.value = withTiming(1, { duration: 240 });
    eScale.value = withTiming(1, { duration: 1100, easing: OUT }); // 앞으로 나오며 커짐
    // X: 오른쪽 → 왼쪽으로 살짝 지나쳤다(‹ 꼭짓점) → 중앙
    eX.value = withSequence(
      withTiming(-38, { duration: 780, easing: OUT }),
      withTiming(0, { duration: 430, easing: INOUT }),
    );
    // Y: 포물선 배(아래로) → 안착
    eY.value = withSequence(
      withTiming(26, { duration: 780, easing: INOUT }),
      withTiming(0, { duration: 430, easing: Easing.out(Easing.quad) }, (finished) => {
        'worklet';
        if (finished) runOnJS(setShowPill)(true);
      }),
    );
    // 비행 중 기울었다가 수평
    eRot.value = withSequence(
      withTiming(-4, { duration: 780, easing: OUT }),
      withTiming(0, { duration: 430, easing: INOUT }),
    );
  }, []);

  useEffect(() => {
    if (!showPill) return;
    // 봉투 플랩이 열리고 → 그 안에서 팝업이 위로 올라오며 등장 → 봉투는 사라짐
    flapRot.value = withTiming(-160, { duration: 380, easing: Easing.out(Easing.quad) });
    pillShift.value = withDelay(300, withTiming(-10, { duration: 540, easing: Easing.out(Easing.cubic) }));
    pillScale.value = withDelay(300, withTiming(1, { duration: 540, easing: Easing.out(Easing.cubic) }));
    pillOpacity.value = withDelay(320, withTiming(1, { duration: 400 }));
    eOpacity.value = withDelay(560, withTiming(0, { duration: 400 }));
  }, [showPill]);

  const shadowStyle = useAnimatedStyle(() => {
    const k = interpolate(eScale.value, [0.5, 1], [0.55, 1.05], Extrapolation.CLAMP);
    const o = interpolate(eScale.value, [0.5, 1], [0.05, 0.18], Extrapolation.CLAMP);
    return {
      opacity: eOpacity.value * o,
      transform: [{ translateX: eX.value }, { translateY: EH / 2 + 2 }, { scaleX: k * 1.9 }, { scaleY: k * 0.95 }],
    };
  });
  const envStyle = useAnimatedStyle(() => ({
    opacity: eOpacity.value,
    transform: [
      { translateX: eX.value },
      { translateY: eY.value },
      { rotate: `${eRot.value}deg` },
      { scale: eScale.value },
    ],
  }));
  const flapStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 700 }, { rotateX: `${flapRot.value}deg` }],
  }));
  const pillStyle = useAnimatedStyle(() => ({
    opacity: pillOpacity.value,
    transform: [{ translateY: pillShift.value }, { scale: pillScale.value }],
  }));

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Animated.View style={[styles.shadow, shadowStyle]} pointerEvents="none">
        <GroundShadow />
      </Animated.View>
      <Animated.View style={[styles.envelope, envStyle]} pointerEvents="none">
        <View style={styles.envBody}><EnvelopeBody /></View>
        <Animated.View style={[styles.envFlap, flapStyle]}><EnvelopeFlap /></Animated.View>
      </Animated.View>
      {showPill && <ArrivalPill accent={accent} onView={onView} style={pillStyle} />}
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
//  탁구채 버전 — 탁구채가 스윙해 공을 치면 날아와 통통 튀며 안착 → 팝업
// ══════════════════════════════════════════════════════════════
const K = 26;
const dur = (h: number) => Math.round(K * Math.sqrt(h));
const LAUNCH_H = 130;
const BOUNCES = [62, 28, 10];
const APPROACH = 520, HOLD = 180, SWING = 170, RETREAT = 440;
const HIT_AT = APPROACH + HOLD + SWING;

function PaddleArrival({ accent, onView }: { accent: string; onView: () => void }) {
  const pX = useSharedValue(-220);
  const pY = useSharedValue(42);
  const pRot = useSharedValue(-30);
  const pOpacity = useSharedValue(0);
  const fScale = useSharedValue(0.3);
  const fOpacity = useSharedValue(0);
  const bX = useSharedValue(-92);
  const bY = useSharedValue(-8);
  const bScale = useSharedValue(1);
  const bOpacity = useSharedValue(0);
  const pillOpacity = useSharedValue(0);
  const pillScale = useSharedValue(0.4);
  const [showPill, setShowPill] = useState(false);

  useEffect(() => {
    const OUT = Easing.out(Easing.quad);
    const IN = Easing.in(Easing.quad);

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
      withTiming(-46, { duration: APPROACH, easing: OUT }),
      withTiming(-46, { duration: HOLD }),
      withTiming(28, { duration: SWING, easing: IN }),
      withTiming(52, { duration: RETREAT, easing: OUT }),
    );

    fOpacity.value = withDelay(HIT_AT, withSequence(
      withTiming(0.9, { duration: 60 }),
      withTiming(0, { duration: 220, easing: OUT }),
    ));
    fScale.value = withDelay(HIT_AT, withTiming(1.6, { duration: 280, easing: OUT }));

    bOpacity.value = withDelay(HIT_AT, withTiming(1, { duration: 70 }));
    bX.value = withDelay(HIT_AT, withTiming(0, { duration: 1150, easing: Easing.bezier(0.17, 0.55, 0.3, 1) }));

    const tyA: any[] = [];
    tyA.push(withTiming(-LAUNCH_H, { duration: 470, easing: OUT }));
    tyA.push(withTiming(0, { duration: 450, easing: IN }));
    BOUNCES.forEach((h, i) => {
      const last = i === BOUNCES.length - 1;
      const d = dur(h);
      tyA.push(withTiming(-h, { duration: d, easing: OUT }));
      tyA.push(
        withTiming(0, { duration: d, easing: IN }, last ? (finished) => {
          'worklet';
          if (finished) runOnJS(setShowPill)(true);
        } : undefined),
      );
    });
    bY.value = withDelay(HIT_AT, withSequence(...tyA));
  }, []);

  useEffect(() => {
    if (!showPill) return;
    bScale.value = withTiming(0.25, { duration: 240, easing: Easing.in(Easing.quad) });
    bOpacity.value = withTiming(0, { duration: 240 });
    pillOpacity.value = withDelay(460, withTiming(1, { duration: 440 }));
    pillScale.value = withDelay(460, withTiming(1, { duration: 560, easing: Easing.out(Easing.cubic) }));
  }, [showPill]);

  const paddleStyle = useAnimatedStyle(() => ({
    opacity: pOpacity.value,
    transform: [{ translateX: pX.value }, { translateY: pY.value }, { rotate: `${pRot.value}deg` }],
  }));
  const flashStyle = useAnimatedStyle(() => ({
    opacity: fOpacity.value,
    transform: [{ translateX: -98 }, { translateY: -10 }, { scale: fScale.value }],
  }));
  const shadowStyle = useAnimatedStyle(() => {
    const k = interpolate(bY.value, [-LAUNCH_H, 0], [0.5, 1.05], Extrapolation.CLAMP);
    const o = interpolate(bY.value, [-LAUNCH_H, 0], [0.35, 1], Extrapolation.CLAMP);
    return {
      opacity: bOpacity.value * o,
      transform: [{ translateX: bX.value }, { translateY: BALL / 2 + 3 }, { scaleX: k }, { scaleY: k }],
    };
  });
  const ballStyle = useAnimatedStyle(() => ({
    opacity: bOpacity.value,
    transform: [{ translateX: bX.value }, { translateY: bY.value }, { scale: bScale.value }],
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
      <Animated.View style={[styles.shadow, shadowStyle]} pointerEvents="none">
        <GroundShadow />
      </Animated.View>
      <Animated.View style={[styles.ball, ballStyle]} pointerEvents="none">
        <PingPongBall />
      </Animated.View>
      {showPill && <ArrivalPill accent={accent} onView={onView} style={pillStyle} />}
    </View>
  );
}

/**
 * p0ng 도착 연출. ARRIVAL_STYLE 상수로 편지/탁구채 버전 전환.
 * 순수 연출이라 실패해도 데이터엔 영향 없음.
 */
export default function PongArrival(props: { accent: string; onView: () => void }) {
  return ARRIVAL_STYLE === 'letter' ? <LetterArrival {...props} /> : <PaddleArrival {...props} />;
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ball: { position: 'absolute', width: BALL, height: BALL },
  envelope: { position: 'absolute', width: EW, height: EH },
  envBody: { position: 'absolute', top: 0, left: 0 },
  envFlap: {
    position: 'absolute', top: FLAP_TOP, left: 0, width: EW, height: 46,
    transformOrigin: 'center top', // 윗변을 힌지로 열림
  },
  shadow: {
    position: 'absolute',
    width: SHADOW_W, height: SHADOW_H,
    alignItems: 'center', justifyContent: 'center',
  },
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
