import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemedStyles } from '../theme/themed';

/** 테마색이 웹에서도 확실히 적용되는 커스텀 토글 (알림 설정과 동일한 모양) */
export default function ThemeSwitch({ value, onChange, disabled, accent }: {
  value: boolean; onChange: (v: boolean) => void; disabled?: boolean; accent: string;
}) {
  const styles = useThemedStyles(lightStyles);
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={[
        styles.switchTrack,
        { backgroundColor: value ? accent : '#e5e7eb', justifyContent: value ? 'flex-end' : 'flex-start' },
      ]}
    >
      <View style={styles.switchThumb} />
    </TouchableOpacity>
  );
}

const lightStyles = StyleSheet.create({
  switchTrack: {
    width: 48, height: 28, borderRadius: 14,
    paddingHorizontal: 3, flexDirection: 'row', alignItems: 'center',
  },
  switchThumb: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: '#ffffff',
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
});
