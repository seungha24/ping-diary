import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import TouchableOpacity from '../components/Touchable';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, TabParamList } from '../navigation/RootNavigator';
import IconChev from '../components/icons/IconChev';
import PingLogo from '../components/PingLogo';
import PopWrap from '../components/PopWrap';
import { MONTHS, DAYS } from '../data/types';
import { useTheme, hexToRgba } from '../context/ThemeContext';
import { useEntries } from '../context/EntriesContext';
import { IconPencil } from '../components/icons/Line';
import useTabSwipe from '../hooks/useTabSwipe';
import { useThemedStyles } from '../theme/themed';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type CalendarRoute = RouteProp<TabParamList, 'Calendar'>;

function getDaysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year: number, month: number) { return new Date(year, month, 1).getDay(); }

export default function CalendarScreen() {
  const styles = useThemedStyles(lightStyles);
  const tabSwipe = useTabSwipe('Stats', 'Home'); // 좌우 스와이프로 옆 탭 이동
  const navigation = useNavigation<Nav>();
  const route = useRoute<CalendarRoute>();
  const { accent } = useTheme();
  const today = new Date();
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(route.params?.month ?? today.getMonth());
  // 연·월 피커: 제목을 누르면 열리고, 피커 안에서 연도만 따로 넘길 수 있다
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(today.getFullYear());

  function openPicker() {
    setPickerYear(year);
    setPickerOpen(true);
  }
  function pickMonth(m: number) {
    setYear(pickerYear);
    setMonth(m);
    setPickerOpen(false);
  }

  useEffect(() => {
    // 홈에서 넘어온 month 칩은 '올해' 기준이므로 연도도 함께 리셋
    if (route.params?.month !== undefined) {
      setYear(today.getFullYear());
      setMonth(route.params.month);
    }
  }, [route.params?.month]);

  // 12월↔1월 이동 시 연도도 함께 굴린다
  function shiftMonth(delta: number) {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  }

  // 월이 바뀌면 선택일을 그 달의 일수로 clamp (31일 선택 후 2월 이동 → "2월 31일" 방지)
  useEffect(() => {
    const max = getDaysInMonth(year, month);
    setSelectedDay((d) => Math.min(d, max));
  }, [year, month]);

  const calGrid = useMemo(() => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const grid: (number | null)[] = [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    while (grid.length % 7 !== 0) grid.push(null);
    return grid;
  }, [year, month]);

  const { entries } = useEntries();
  const todayDate = today.getDate();
  // 보고 있는 연·월에 작성된 글만 (일 숫자만 비교하면 다른 달에도 중복 표시됨)
  const monthEntries = useMemo(() => entries.filter((e) => {
    const d = new Date(e.createdAt);
    return d.getFullYear() === year && d.getMonth() === month;
  }), [entries, year, month]);
  const selectedEntries = monthEntries.filter((e) => e.dates.includes(selectedDay));

  return (
    <SafeAreaView style={styles.container} {...tabSwipe}>
      {/* 상단 로고 (모든 탭 공통) */}
      <View style={styles.header}>
        <PingLogo />
        <View style={{ width: 36, height: 36 }} />
      </View>

      {/* Month nav */}
      <View style={styles.monthNav}>
        <TouchableOpacity style={styles.navBtn} onPress={() => shiftMonth(-1)}>
          <IconChev dir="left" size={20} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.monthTitleBtn} onPress={openPicker}>
          <Text style={[styles.monthTitle, { color: accent }]}>{year} 년 {MONTHS[month]}</Text>
          <IconChev dir="down" size={14} color={accent} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => shiftMonth(1)}>
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
        <Text style={styles.previewLabel}>{MONTHS[month]} {selectedDay} 일의 p!ng</Text>
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

      {/* 연·월 피커 팝업 */}
      {pickerOpen && (
        <PopWrap style={styles.pickerOverlay} onBackdropPress={() => setPickerOpen(false)}>
          <View style={styles.pickerCard}>
            <View style={styles.pickerYearRow}>
              <TouchableOpacity style={styles.pickerYearBtn} onPress={() => setPickerYear((y) => y - 1)}>
                <IconChev dir="left" size={16} color="#6b7280" />
              </TouchableOpacity>
              <Text style={styles.pickerYearText}>{pickerYear} 년</Text>
              <TouchableOpacity style={styles.pickerYearBtn} onPress={() => setPickerYear((y) => y + 1)}>
                <IconChev dir="right" size={16} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.pickerGrid}>
              {MONTHS.map((label, m) => {
                const active = pickerYear === year && m === month;
                const isThisMonth = pickerYear === today.getFullYear() && m === today.getMonth();
                return (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.pickerMonthCell,
                      isThisMonth && !active && styles.pickerMonthCellToday,
                      active && { backgroundColor: hexToRgba(accent, 0.15) },
                    ]}
                    onPress={() => pickMonth(m)}
                  >
                    <Text style={[styles.pickerMonthText, active && { color: accent, fontWeight: '700' }]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </PopWrap>
      )}
    </SafeAreaView>
  );
}

const lightStyles = StyleSheet.create({
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
  monthTitleBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 8 },
  monthTitle: { fontSize: 17, fontWeight: '600', color: '#111827' },
  pickerOverlay: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(17,24,39,0.35)', paddingHorizontal: 32, zIndex: 10,
  },
  pickerCard: {
    alignSelf: 'stretch', backgroundColor: '#ffffff', borderRadius: 20, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 28, shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  pickerYearRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
  },
  pickerYearBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  pickerYearText: { fontSize: 16, fontWeight: '600', color: '#111827' },
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  pickerMonthCell: {
    width: '33.33%', paddingVertical: 13, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  pickerMonthCellToday: { backgroundColor: '#f3f4f6' },
  pickerMonthText: { fontSize: 14, color: '#374151', fontWeight: '500' },
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
