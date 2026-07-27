import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle, withDelay, withRepeat, withSequence, withTiming,
  Easing, runOnJS,
} from 'react-native-reanimated';

// ── 색 유틸: accent를 어둡게/밝게 섞어 커튼 톤 생성 ──
function shade(hex: string, amt: number): string {
  const m = hex.replace('#', '');
  const n = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
  const t = amt < 0 ? 0 : 255;
  const k = Math.abs(amt);
  const mix = (c: number) => Math.round(c + (t - c) * k);
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

// 채도 낮추기 — 회색(밝기 유지) 쪽으로 섞는다
function desaturate(hex: string, k: number): string {
  const m = hex.replace('#', '');
  const n = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
  const gray = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
  const mix = (c: number) => Math.round(c + (gray - c) * k);
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

const PLEATS = 7;

/** 커튼 한 짝 — 주름(그라데이션 세로 밴드) + 물결치는 밑단. (첫 극장 커튼에서
 *  명암만 한 단계 낮춘 버전) */
function CurtainPanel({ accent, flip }: { accent: string; flip?: boolean }) {
  // 밝고 플랫한 차분 톤 — 전체를 밝히고 명암 폭은 좁게, 채도는 낮게
  const dark = desaturate(shade(accent, -0.04), 0.28);
  const light = desaturate(shade(accent, 0.18), 0.28);
  const pw = 100 / PLEATS;
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 160" preserveAspectRatio="none"
      style={flip ? { transform: [{ scaleX: -1 }] } : undefined}>
      <Defs>
        <LinearGradient id="curtP" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={dark} />
          <Stop offset="0.45" stopColor={light} />
          <Stop offset="1" stopColor={dark} />
        </LinearGradient>
      </Defs>
      {Array.from({ length: PLEATS }, (_, i) => {
        const x0 = i * pw, x1 = x0 + pw, xm = x0 + pw / 2;
        const dip = i % 2 === 0 ? 160 : 150; // 물결 밑단
        return (
          <Path
            key={i}
            d={`M${x0} 0 L${x1} 0 L${x1} ${i % 2 === 0 ? 150 : 156} Q${xm} ${dip} ${x0} ${i % 2 === 0 ? 156 : 150} Z`}
            fill="url(#curtP)"
          />
        );
      })}
    </Svg>
  );
}

/**
 * 시상식 커튼 — 콘텐츠를 덮고 있다가 극장 커튼처럼 걷히는 오버레이.
 * ready=false면(어워즈 준비 중) 닫힌 채 기다리고, true가 되면 걷힌다 —
 * 로딩 시간이 커튼 뒤에 숨는다. 부모(relative 컨테이너)의 마지막 자식으로 사용.
 */
export default function CurtainReveal({ accent, ready = true, onDone }: {
  accent: string; ready?: boolean; onDone: () => void;
}) {
  const [w, setW] = useState(0);
  const started = useRef(false);
  const progress = useSharedValue(0); // 0=닫힘, 1=양옆으로 걷힘
  const fade = useSharedValue(1);     // 마지막 전체 페이드
  const labelOp = useSharedValue(0);  // '심사 중' 문구 (대기 동안 깜빡임)

  // 심사(로딩) 중 — 커튼 위에 문구를 은은히 깜빡여 멈춘 게 아님을 보여준다
  useEffect(() => {
    if (ready || started.current) return;
    labelOp.value = withRepeat(withSequence(
      withTiming(1, { duration: 850, easing: Easing.inOut(Easing.sin) }),
      withTiming(0.45, { duration: 850, easing: Easing.inOut(Easing.sin) }),
    ), -1, false);
  }, [ready]);

  useEffect(() => {
    if (!w || !ready || started.current) return;
    started.current = true;
    // 준비 완료 → 문구 걷고 → 주름을 접으며 걷힘 → 잠깐 유지 → 페이드
    labelOp.value = withTiming(0, { duration: 220 });
    progress.value = withDelay(250, withTiming(1, {
      duration: 1300,
      easing: Easing.inOut(Easing.cubic),
    }));
    fade.value = withDelay(1800, withTiming(0, { duration: 450 }, (finished) => {
      'worklet';
      if (finished) runOnJS(onDone)();
    }));
  }, [w, ready]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  // 걷힘 = 바깥쪽 가장자리를 기준으로 주름이 압축(개더링) + 살짝 바깥으로 밀림
  const leftStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -progress.value * 26 }, { scaleX: 1 - progress.value * 0.68 }],
  }));
  const rightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * 26 }, { scaleX: 1 - progress.value * 0.68 }],
  }));
  const labelStyle = useAnimatedStyle(() => ({ opacity: labelOp.value }));

  return (
    <Animated.View
      style={[styles.overlay, overlayStyle]}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      pointerEvents="auto"
    >
      <Animated.View style={[styles.half, styles.halfLeft, leftStyle]}>
        <CurtainPanel accent={accent} />
      </Animated.View>
      <Animated.View style={[styles.half, styles.halfRight, rightStyle]}>
        <CurtainPanel accent={accent} flip />
      </Animated.View>
      {/* 심사 중 문구 — 닫힌 커튼 위에서 은은히 깜빡임 */}
      <Animated.View style={[styles.labelWrap, labelStyle]} pointerEvents="none">
        <Text style={styles.labelText}>심사중입니다..</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    overflow: 'hidden',
    borderRadius: 16, // 카드 모서리에 맞춤
  },
  half: { position: 'absolute', top: 0, bottom: 0, width: '50%' },
  halfLeft: { left: 0, transformOrigin: 'left center' },   // 왼쪽 가장자리로 개더링
  halfRight: { right: 0, transformOrigin: 'right center' }, // 오른쪽 가장자리로 개더링
  labelWrap: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  labelText: {
    color: '#ffffff', fontSize: 13.5, fontWeight: '700', letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
});
