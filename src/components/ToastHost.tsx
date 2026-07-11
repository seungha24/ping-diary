import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { setNotifyListener } from '../notify';
import { useThemedStyles } from '../theme/themed';
import { useTheme, hexToRgba } from '../context/ThemeContext';

/** 배경색 밝기에 따라 잘 보이는 글자색 선택 (파스텔 테마 대응)
 *  반투명 배경은 뒤 화면과 섞여 보이므로, 섞인 뒤의 색 기준으로 판단한다 */
function readableTextOn(hex: string, bgOpacity: number, screenBg: string): string {
  const parse = (h: string): [number, number, number] => {
    const m = /^#?([0-9a-f]{6})$/i.exec(h);
    const n = m ? parseInt(m[1], 16) : 0xffffff;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [r1, g1, b1] = parse(hex);
  const [r2, g2, b2] = parse(screenBg);
  const r = r1 * bgOpacity + r2 * (1 - bgOpacity);
  const g = g1 * bgOpacity + g2 * (1 - bgOpacity);
  const b = b1 * bgOpacity + b2 * (1 - bgOpacity);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#111827' : '#ffffff';
}

const TOAST_BG_OPACITY = 0.45;

/**
 * 폰 프레임 안에 뜨는 전역 토스트. App 루트에 한 번 마운트하면
 * notify()가 호출될 때마다 하단에 인앱 메시지로 표시된다.
 */
export default function ToastHost() {
  const styles = useThemedStyles(lightStyles);
  const { accent, mode } = useTheme();
  const screenBg = mode === 'dark' ? '#111827' : '#ffffff';
  const [message, setMessage] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setNotifyListener((msg) => {
      setMessage(msg);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: Platform.OS !== 'web' }).start();
      // 메시지 길이에 따라 표시 시간 조절 (최소 2.4초)
      const dur = Math.min(6000, Math.max(2400, msg.length * 90));
      hideTimer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: Platform.OS !== 'web' })
          // 페이드아웃 중 새 알림이 오면 이 콜백이 finished:false로 불리는데,
          // 그때 null을 넣으면 새 메시지가 지워지므로 완료된 경우에만 지운다
          .start(({ finished }) => { if (finished) setMessage(null); });
      }, dur);
    });
    return () => {
      setNotifyListener(null);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [opacity]);

  if (!message) return null;

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Animated.View style={[styles.toast, { opacity, backgroundColor: hexToRgba(accent, TOAST_BG_OPACITY) }]}>
        <Text style={[styles.text, { color: readableTextOn(accent, TOAST_BG_OPACITY, screenBg) }]}>{message}</Text>
      </Animated.View>
    </View>
  );
}

const lightStyles = StyleSheet.create({
  wrap: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24,
  },
  toast: {
    maxWidth: '100%',
    backgroundColor: 'rgba(17,24,39,0.94)',
    borderRadius: 14, paddingHorizontal: 18, paddingVertical: 13,
  },
  text: { color: '#fff', fontSize: 13.5, lineHeight: 20, textAlign: 'center' },
});
