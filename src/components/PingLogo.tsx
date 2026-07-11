import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

/**
 * 헤더용 p!ng 로고. 누르면 홈 탭 첫 화면으로 이동한다.
 * (reset 파라미터로 홈 내부 상태도 초기화)
 */
export default function PingLogo({ size = 20 }: { size?: number }) {
  const navigation = useNavigation<any>();
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Home', { reset: Date.now() })}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={[styles.logo, { fontSize: size }]}>p!ng</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  logo: { fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
});
