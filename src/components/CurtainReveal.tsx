import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle, withDelay, withSequence, withTiming, Easing, runOnJS,
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

const PLEATS = 7;

/** 커튼 한 짝 — 주름(그라데이션 세로 밴드) + 물결치는 밑단. */
function CurtainPanel({ accent, flip }: { accent: string; flip?: boolean }) {
  const dark = shade(accent, -0.42);
  const light = shade(accent, 0.16);
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

/** 상단 밸런스(가로 주름 장식) — 스캘럽(반원 물결) 밑단. */
function Valance({ accent }: { accent: string }) {
  const dark = shade(accent, -0.5);
  const light = shade(accent, 0.05);
  const n = 8, w = 100 / n;
  const scallops = Array.from({ length: n }, (_, i) => {
    const x0 = i * w;
    return `M${x0} 0 L${x0 + w} 0 L${x0 + w} 14 Q${x0 + w / 2} 26 ${x0} 14 Z`;
  }).join(' ');
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 26" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="curtV" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={light} />
          <Stop offset="1" stopColor={dark} />
        </LinearGradient>
      </Defs>
      <Path d={scallops} fill="url(#curtV)" />
    </Svg>
  );
}

/**
 * 시상식 커튼 — 콘텐츠를 덮고 있다가 극장 커튼처럼 걷히는 오버레이.
 * 상단 밸런스는 남아 있고, 좌우 커튼이 주름을 접으며(스케일 압축) 양옆으로
 * 모였다가 전체가 사라진다. 부모(relative 컨테이너)의 마지막 자식으로 사용.
 */
export default function CurtainReveal({ accent, onDone }: { accent: string; onDone: () => void }) {
  const [w, setW] = useState(0);
  const progress = useSharedValue(0); // 0=닫힘, 1=양옆으로 걷힘
  const fade = useSharedValue(1);     // 마지막 전체 페이드

  useEffect(() => {
    if (!w) return;
    // 닫힌 커튼 잠깐(기대감) → 주름을 접으며 걷힘 → 잠깐 유지 → 페이드
    progress.value = withDelay(500, withTiming(1, {
      duration: 1300,
      easing: Easing.inOut(Easing.cubic),
    }));
    fade.value = withDelay(2050, withTiming(0, { duration: 450 }, (finished) => {
      'worklet';
      if (finished) runOnJS(onDone)();
    }));
  }, [w]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  // 걷힘 = 바깥쪽 가장자리를 기준으로 주름이 압축(개더링) + 살짝 바깥으로 밀림
  const leftStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -progress.value * 26 }, { scaleX: 1 - progress.value * 0.68 }],
  }));
  const rightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * 26 }, { scaleX: 1 - progress.value * 0.68 }],
  }));

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
      {/* 상단 밸런스 — 커튼이 걷혀도 남아 있다가 함께 페이드 */}
      <View style={styles.valance} pointerEvents="none">
        <Valance accent={accent} />
      </View>
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
  valance: { position: 'absolute', top: 0, left: 0, right: 0, height: 26 },
});
