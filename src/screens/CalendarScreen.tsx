import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import IconChev from '../components/icons/IconChev';
import { INITIAL_ENTRIES, MONTHS, DAYS } from '../data/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function getDaysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year: number, month: number) { return new Date(year, month, 1).getDay(); }

export default function CalendarScreen() {
  const navigation = useNavigation<Nav>();
  const today = new Date();
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [year] = useState(2026);
  const [month, setMonth] = useState(5);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const calGrid: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (calGrid.length % 7 !== 0) calGrid.push(null);

  const todayDate = today.getDate();
  const selectedEntries = INITIAL_ENTRIES.filter((e) => e.dates.includes(selectedDay));

  return (
    <SafeAreaView style={styles.container}>
      {/* Month nav */}
      <View style={styles.header}>
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
            const hasEntry = day !== null && INITIAL_ENTRIES.some((e) => e.dates.includes(day));
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.cell,
                  isSelected ? styles.cellSelected : isToday ? styles.cellToday : null,
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
        <Text style={styles.previewLabel}>{MONTHS[month]} {selectedDay}일의 일기</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {selectedEntries.length > 0 ? (
            selectedEntries.map((e) => (
              <TouchableOpacity
                key={e.id}
                style={styles.previewCard}
                onPress={() => navigation.navigate('DiaryDetail', { entry: e })}
              >
                <View style={styles.previewIcon}>
                  <Text style={{ fontSize: 16 }}>📖</Text>
                </View>
                <View>
                  <Text style={styles.previewTitle}>{e.title}</Text>
                  {e.photo && <Text style={styles.previewSub}>사진 포함</Text>}
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyDay}>
              <Text style={styles.emptyText}>이 날의 일기가 없어요</Text>
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
    paddingHorizontal: 24, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
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
