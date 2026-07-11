import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, TabParamList } from '../navigation/RootNavigator';
import IconChev from '../components/icons/IconChev';
import PingLogo from '../components/PingLogo';
import { MONTHS, DAYS } from '../data/types';
import { useTheme } from '../context/ThemeContext';
import { useEntries } from '../context/EntriesContext';
import { IconPencil } from '../components/icons/Line';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type CalendarRoute = RouteProp<TabParamList, 'Calendar'>;

function getDaysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year: number, month: number) { return new Date(year, month, 1).getDay(); }

export default function CalendarScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<CalendarRoute>();
  const { accent } = useTheme();
  const today = new Date();
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [year] = useState(today.getFullYear());
  const [month, setMonth] = useState(route.params?.month ?? today.getMonth());

  useEffect(() => {
    if (route.params?.month !== undefined) setMonth(route.params.month);
  }, [route.params?.month]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const calGrid: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (calGrid.length % 7 !== 0) calGrid.push(null);

  const { entries } = useEntries();
  const todayDate = today.getDate();
  // 보고 있는 연·월에 작성된 글만 (일 숫자만 비교하면 다른 달에도 중복 표시됨)
  const monthEntries = entries.filter((e) => {
    const d = new Date(e.createdAt);
    return d.getFullYear() === year && d.getMonth() === month;
  });
  const selectedEntries = monthEntries.filter((e) => e.dates.includes(selectedDay));

  return (
    <SafeAreaView style={styles.container}>
      {/* 상단 로고 (모든 탭 공통) */}
      <View style={styles.header}>
        <PingLogo />
        <View style={{ width: 36, height: 36 }} />
      </View>

      {/* Month nav */}
      <View style={styles.monthNav}>
        <TouchableOpacity style={styles.navBtn} onPress={() => setMonth((m) => Math.max(0, m - 1))}>
          <IconChev dir="left" size={20} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{year}년 {MONTHS[month]}</Text>
        <TouchableOpacity style={styles.navBtn} onPress={() => setMonth((m) => Math.min(11, m + 1))}>
          <IconChev dir="right" size={20} />
        </TouchableOpacity>
      </View>

      {/* Calendar grid */}
      <View style={styles.calendar}>
        <View style={styles.weekRow}>
          {DAYS.map((d) => (
            <Text key={d} style={styles.weekLabel}>{d}</Text>
          ))}
        </View>
        <View style={styles.grid}>
          {calGrid.map((day, i) => {
            const isSelected = day === selectedDay;
            const isToday = day === todayDate;
            const hasEntry = day !== null && monthEntries.some((e) => e.dates.includes(day));
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.cell,
                  isSelected ? { backgroundColor: accent } : isToday ? styles.cellToday : null,
                ]}
                onPress={() => day && setSelectedDay(day)}
                disabled={day === null}
              >
                {day !== null && (
                  <>
                    <Text style={[styles.cellNum, isSelected && styles.cellNumActive]}>{day}</Text>
                    {hasEntry && <View style={[styles.entryDot, isSelected && styles.entryDotActive]} />}
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Day entries */}
      <View style={styles.preview}>
        <Text style={styles.previewLabel}>{MONTHS[month]} {selectedDay}일의 p!ng</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {selectedEntries.length > 0 ? (
            selectedEntries.map((e) => (
              <TouchableOpacity
                key={e.id}
                style={styles.previewCard}
                onPress={() => navigation.navigate('DiaryDetail', { entry: e })}
              >
                <View style={styles.previewIcon}>
                  <IconPencil size={15} color="#9ca3af" />
                </View>
                <View>
                  <Text style={styles.previewTitle}>{e.title}</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyDay}>
              <Text style={styles.emptyText}>이 날의 p!ng이 없어요</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6', backgroundColor: '#ffffff',
  },
  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingVertical: 10,
  },
  navBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  monthTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  calendar: { paddingHorizontal: 12, paddingTop: 12 },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekLabel: { flex: 1, textAlign: 'center', fontSize: 12, color: '#9ca3af', paddingVertical: 4, fontWeight: '500' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: '14.28%', height: 46,
    borderRadius: 10, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 6, gap: 2,
  },
  cellSelected: { backgroundColor: '#111827' },
  cellToday: { backgroundColor: '#e5e7eb' },
  cellNum: { fontSize: 13, color: '#374151', fontWeight: '500' },
  cellNumActive: { color: '#ffffff' },
  entryDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#9ca3af' },
  entryDotActive: { backgroundColor: '#d1d5db' },
  preview: { flex: 1, paddingHorizontal: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6', gap: 10 },
  previewLabel: { fontSize: 13, color: '#9ca3af', fontWeight: '500' },
  previewCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#ffffff', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#f3f4f6', marginBottom: 8,
  },
  previewIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  previewTitle: { fontSize: 13, color: '#374151', fontWeight: '500' },
  previewSub: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  emptyDay: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { fontSize: 13, color: '#d1d5db' },
});
