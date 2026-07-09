import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import IconChev from '../components/icons/IconChev';
import { useTheme, hexToRgba } from '../context/ThemeContext';

/** 테마색이 웹에서도 확실히 적용되는 커스텀 토글 (RN Switch가 웹에서 색 무시하는 문제 회피) */
function ThemeSwitch({ value, onChange, disabled, accent }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean; accent: string }) {
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

interface ToggleRowProps {
  label: string;
  desc?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

function ToggleRow({ label, desc, value, onChange, disabled }: ToggleRowProps) {
  const { accent } = useTheme();
  return (
    <View style={[styles.row, disabled && styles.rowDisabled]}>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, disabled && styles.rowLabelDisabled]}>{label}</Text>
        {desc && <Text style={styles.rowDesc}>{desc}</Text>}
      </View>
      <ThemeSwitch value={value} onChange={onChange} disabled={disabled} accent={accent} />
    </View>
  );
}

export default function NotifSettingsScreen() {
  const navigation = useNavigation();
  const { accent } = useTheme();

  const [allOn, setAllOn] = useState(true);
  const [newDiary, setNewDiary] = useState(true);
  const [aiComment, setAiComment] = useState(true);
  const [groupInvite, setGroupInvite] = useState(true);
  const [reminder, setReminder] = useState(true);
  const [quietHours, setQuietHours] = useState(false);

  function toggleAll(v: boolean) {
    setAllOn(v);
    if (!v) {
      setNewDiary(false);
      setAiComment(false);
      setGroupInvite(false);
      setReminder(false);
    } else {
      setNewDiary(true);
      setAiComment(true);
      setGroupInvite(true);
      setReminder(true);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <IconChev dir="left" size={18} color="#9ca3af" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>알림 설정</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* 전체 알림 */}
        <View style={styles.card}>
          <ToggleRow
            label="알림 전체"
            desc="모든 알림을 켜거나 끕니다"
            value={allOn}
            onChange={toggleAll}
          />
        </View>

        {/* 알림 종류 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>알림 종류</Text>
          <View style={styles.card}>
            <ToggleRow
              label="새 p!ng 알림"
              desc="그룹 멤버가 p!ng를 쓰면 알림"
              value={newDiary}
              onChange={setNewDiary}
              disabled={!allOn}
            />
            <View style={styles.divider} />
            <ToggleRow
              label="AI 코멘트 알림"
              desc="24시간 후 코멘트가 공개되면 알림"
              value={aiComment}
              onChange={setAiComment}
              disabled={!allOn}
            />
            <View style={styles.divider} />
            <ToggleRow
              label="그룹 초대 알림"
              desc="새 그룹에 초대받으면 알림"
              value={groupInvite}
              onChange={setGroupInvite}
              disabled={!allOn}
            />
            <View style={styles.divider} />
            <ToggleRow
              label="p!ng 리마인더"
              desc="그룹별로 설정한 주기에 맞춰 알림"
              value={reminder}
              onChange={setReminder}
              disabled={!allOn}
            />
          </View>
        </View>

        {/* 방해 금지 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>방해 금지 시간</Text>
          <View style={styles.card}>
            <ToggleRow
              label="방해 금지"
              desc="설정한 시간에는 알림을 받지 않아요"
              value={quietHours}
              onChange={setQuietHours}
              disabled={!allOn}
            />
            {quietHours && allOn && (
              <>
                <View style={styles.divider} />
                <View style={styles.timeRow}>
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeLabel}>시작</Text>
                    <TouchableOpacity style={[styles.timeBtn, { backgroundColor: hexToRgba(accent, 0.1), borderColor: hexToRgba(accent, 0.25) }]}>
                      <Text style={[styles.timeBtnText, { color: accent }]}>22:00</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.timeSep}>—</Text>
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeLabel}>종료</Text>
                    <TouchableOpacity style={[styles.timeBtn, { backgroundColor: hexToRgba(accent, 0.1), borderColor: hexToRgba(accent, 0.25) }]}>
                      <Text style={[styles.timeBtnText, { color: accent }]}>08:00</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        <Text style={styles.footerNote}>
          기기의 알림 권한이 허용된 경우에만 작동해요
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6', backgroundColor: '#ffffff',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  content: { padding: 16, gap: 20, paddingBottom: 48 },
  section: { gap: 8 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: '#9ca3af', paddingHorizontal: 4 },
  card: {
    backgroundColor: '#ffffff', borderRadius: 16,
    borderWidth: 1, borderColor: '#f3f4f6',
    paddingHorizontal: 16,
  },
  divider: { height: 1, backgroundColor: '#f9fafb' },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, gap: 12,
  },
  rowDisabled: { opacity: 0.4 },
  switchTrack: {
    width: 48, height: 28, borderRadius: 14,
    paddingHorizontal: 3, flexDirection: 'row', alignItems: 'center',
  },
  switchThumb: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: '#ffffff',
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  rowLabelDisabled: { color: '#9ca3af' },
  rowDesc: { fontSize: 12, color: '#9ca3af' },
  timeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, gap: 16,
  },
  timeBlock: { alignItems: 'center', gap: 6 },
  timeLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '500' },
  timeBtn: {
    backgroundColor: '#f3f4f6', borderRadius: 12, borderWidth: 1.5, borderColor: 'transparent',
    paddingHorizontal: 22, paddingVertical: 11, minWidth: 88, alignItems: 'center',
  },
  timeBtnText: { fontSize: 16, fontWeight: '800', color: '#111827', letterSpacing: 0.5 },
  timeSep: { fontSize: 18, color: '#d1d5db', marginTop: 18 },
  footerNote: { fontSize: 12, color: '#d1d5db', textAlign: 'center' },
});
