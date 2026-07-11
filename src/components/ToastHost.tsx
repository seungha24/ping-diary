import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { setNotifyListener } from '../notify';
import { useThemedStyles } from '../theme/themed';

// 웹에서만 지원되는 프로스트 글래스(블러) 효과
const blurStyle =
  Platform.OS === 'web'
    ? ({ backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' } as any)
    : null;

/**
 * 폰 프레임 안에 뜨는 전역 토스트. App 루트에 한 번 마운트하면
 * notify()가 호출될 때마다 반투명 흰색 알약 형태의 인앱 메시지로 표시된다.
 */
export default function ToastHost() {
  const styles = useThemedStyles(lightStyles);
  const [message, setMessage] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setNotifyListener((msg) => {
      setMessage(msg);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: Platform.OS !== 'web' }).start();
      // 메시지 길이에 따라 표시 시간 조절 (최소 2.4초)
      const dur = Math.min(6000, Math.max(2400, msg.length * 90));
      hideTimer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 260, useNativeDriver: Platform.OS !== 'web' })
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

  // 나타날 때 살짝 아래에서 떠오르며 커지는 느낌
  const translateY = opacity.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });
  const scale = opacity.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Animated.View style={[styles.toast, blurStyle, { opacity, transform: [{ translateY }, { scale }] }]}>
        <Text style={styles.text}>{message}</Text>
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
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderRadius: 999,
    paddingHorizontal: 20, paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 24, shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  text: {
    color: '#1f2937', fontSize: 13.5, lineHeight: 19, textAlign: 'center',
    fontWeight: '600', letterSpacing: -0.2,
  },
});
