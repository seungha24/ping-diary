import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  SafeAreaView,
} from 'react-native';
import TouchableOpacity from '../components/Touchable';
import { useNavigation } from '@react-navigation/native';
import IconChev from '../components/icons/IconChev';
import { useTheme, hexToRgba } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/themed';
import { loadPersonalReminder, savePersonalReminder, applyPersonalReminder } from '../data/personalNotif';
import { notify } from '../notify';

/** 내 일기 리마인더 시간 선택지 */
const REMINDER_HOURS = [
  { hour: 8, label: '아침 8시' },
  { hour: 12, label: '낮 12시' },
  { hour: 20, label: '저녁 8시' },
  { hour: 22, label: '밤 10시' },
];

/** 테마색이 웹에서도 확실히 적용되는 커스텀 토글 (RN Switch가 웹에서 색 무시하는 문제 회피) */
function ThemeSwitch({ value, onChange, disabled, accent }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean; accent: string }) {
  const styles = useThemedStyles(lightStyles);
  const { mode } = useTheme();
  const offColor = mode === 'dark' ? '#3a465e' : '#e5e7eb';
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={[
        styles.switchTrack,
        { backgroundColor: value ? accent : offColor, justifyContent: value ? 'flex-end' : 'flex-start' },
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
  const styles = useThemedStyles(lightStyles);
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
  const styles = useThemedStyles(lightStyles);
  const navigation = useNavigation();
  const { accent } = useTheme();

  const [allOn, setAllOn] = useState(true);
  const [newDiary, setNewDiary] = useState(true);
  const [aiComment, setAiComment] = useState(true);
  const [groupInvite, setGroupInvite] = useState(true);
  const [reminder, setReminder] = useState(true);
  const [quietHours, setQuietHours] = useState(false);

  // ── 내 일기 리마인더 (실제 동작: 매일 지정 시각 로컬 알림) ──
  const [myReminderOn, setMyReminderOn] = useState(false);
  const [myReminderHour, setMyReminderHour] = useState(20);
  useEffect(() => {
    loadPersonalReminder().then((s) => {
      if (!s) return;
      setMyReminderOn(s.enabled);
      setMyReminderHour(s.hour);
    }).catch(() => {});
  }, []);
  function updateMyReminder(enabled: boolean, hour: number) {
    setMyReminderOn(enabled);
    setMyReminderHour(hour);
    const setting = { enabled, hour };
    savePersonalReminder(setting).catch(() => {});
    applyPersonalReminder(setting).catch(() => {});
    if (enabled) {
      const label = REMINDER_HOURS.find((h) => h.hour === hour)?.label ?? `${hour}시`;
      notify(`매일 ${label}에 일기 리마인더를 보내드릴게요.`);
    } else {
      notify('내 일기 리마인더를 껐어요.');
    }
  }

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
              label="퐁 알림"
              desc="10 시간 후 퐁이 도착하면 알림"
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

        {/* 내 일기 리마인더 (개인) */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>내 일기 리마인더</Text>
          <View style={styles.card}>
            <ToggleRow
              label="매일 일기 알림"
              desc="정해둔 시간에 일기 쓸 시간을 알려드려요"
              value={myReminderOn}
              onChange={(v) => updateMyReminder(v, myReminderHour)}
            />
            {myReminderOn && (
              <>
                <View style={styles.divider} />
                <View style={styles.hourRow}>
                  {REMINDER_HOURS.map((h) => {
                    const active = myReminderHour === h.hour;
                    return (
                      <TouchableOpacity
                        key={h.hour}
                        style={[
                          styles.hourChip,
                          active && { backgroundColor: hexToRgba(accent, 0.12), borderColor: accent },
                        ]}
                        onPress={() => updateMyReminder(true, h.hour)}
                      >
                        <Text style={[styles.hourChipText, active && { color: accent, fontWeight: '700' }]}>
                          {h.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
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

const lightStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6', backgroundColor: '#ffffff',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
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
  timeBtnText: { fontSize: 16, fontWeight: '700', color: '#111827', letterSpacing: 0.5 },
  timeSep: { fontSize: 18, color: '#d1d5db', marginTop: 18 },
  hourRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingVertical: 14,
  },
  hourChip: {
    paddingHorizontal: 13, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#f3f4f6', borderWidth: 1.5, borderColor: 'transparent',
  },
  hourChipText: { fontSize: 12.5, fontWeight: '600', color: '#6b7280' },
  footerNote: { fontSize: 12, color: '#d1d5db', textAlign: 'center' },
});
