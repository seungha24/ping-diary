// AM/PM + 1~12시 + 10분 단위 칩으로 시각을 고르는 인앱 피커.
// (네이티브 DateTimePicker 모듈 없이 OTA로도 동작 — 알림 설정·그룹 알림 공용)
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import TouchableOpacity from './Touchable';
import { useTheme, hexToRgba } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/themed';

/** 24시간제 시각을 "PM 8:30" 형태로 표기 */
export function timeLabel(hour: number, minute: number): string {
  const pm = hour >= 12;
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${pm ? 'PM' : 'AM'} ${h12}:${String(minute).padStart(2, '0')}`;
}

interface Props {
  hour: number;   // 0~23
  minute: number; // 0~59
  onChange: (hour: number, minute: number) => void;
}

export default function TimeChipPicker({ hour, minute, onChange }: Props) {
  const styles = useThemedStyles(lightStyles);
  const { accent } = useTheme();
  const isPm = hour >= 12;
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const activeStyle = { backgroundColor: hexToRgba(accent, 0.12), borderColor: accent };
  const activeText = { color: accent, fontWeight: '700' as const };

  return (
    <View>
      {/* 오전/오후 */}
      <View style={styles.ampmRow}>
        {([['AM', false], ['PM', true]] as const).map(([label, pm]) => (
          <TouchableOpacity
            key={label}
            style={[styles.ampmChip, isPm === pm && activeStyle]}
            onPress={() => onChange((hour12 % 12) + (pm ? 12 : 0), minute)}
          >
            <Text style={[styles.chipText, isPm === pm && activeText]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* 시 (1~12) */}
      <View style={styles.chipRow}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((h12) => (
          <TouchableOpacity
            key={h12}
            style={[styles.chip, hour12 === h12 && activeStyle]}
            onPress={() => onChange((h12 % 12) + (isPm ? 12 : 0), minute)}
          >
            <Text style={[styles.chipText, hour12 === h12 && activeText]}>{h12}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* 분 (10분 단위) */}
      <View style={styles.chipRow}>
        {[0, 10, 20, 30, 40, 50].map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.chip, minute === m && activeStyle]}
            onPress={() => onChange(hour, m)}
          >
            <Text style={[styles.chipText, minute === m && activeText]}>:{String(m).padStart(2, '0')}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const lightStyles = StyleSheet.create({
  ampmRow: { flexDirection: 'row', gap: 8, paddingTop: 12 },
  ampmChip: {
    flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10,
    backgroundColor: '#f3f4f6', borderWidth: 1.5, borderColor: 'transparent',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 12 },
  chip: {
    minWidth: 44, alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#f3f4f6', borderWidth: 1.5, borderColor: 'transparent',
  },
  chipText: { fontSize: 12.5, fontWeight: '600', color: '#6b7280' },
});
