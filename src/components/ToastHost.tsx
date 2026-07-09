import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { setNotifyListener } from '../notify';

/**
 * 폰 프레임 안에 뜨는 전역 토스트. App 루트에 한 번 마운트하면
 * notify()가 호출될 때마다 하단에 인앱 메시지로 표시된다.
 */
export default function ToastHost() {
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
          .start(() => setMessage(null));
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
      <Animated.View style={[styles.toast, { opacity }]}>
        <Text style={styles.text}>{message}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute', left: 0, right: 0, bottom: 90,
    alignItems: 'center', paddingHorizontal: 24,
  },
  toast: {
    maxWidth: '100%',
    backgroundColor: 'rgba(17,24,39,0.94)',
    borderRadius: 14, paddingHorizontal: 18, paddingVertical: 13,
  },
  text: { color: '#fff', fontSize: 13.5, lineHeight: 20, textAlign: 'center' },
});
