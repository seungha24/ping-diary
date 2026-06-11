import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { INITIAL_ENTRIES, MONTH_COUNTS, MONTHS } from '../data/types';

function getMonthBg(count: number): string {
  if (count === 0) return '#f3f4f6';
  const r = count / 30;
  if (r > 0.8) return '#111827';
  if (r > 0.5) return '#4b5563';
  if (r > 0.3) return '#9ca3af';
  return '#d1d5db';
}

function getMonthTextColor(count: number): string {
  if (count === 0) return '#9ca3af';
  return count / 30 > 0.5 ? '#ffffff' : '#374151';
}

export default function StatsScreen() {
  const entries = INITIAL_ENTRIES;

  const tagCounts: Record<string, number> = {};
  entries.forEach((e) => e.tags.forEach((t) => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));
  const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxTag = topTags[0]?.[1] || 1;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>통계</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <View style={styles.statsGrid}>
          {[['총 일기', `${entries.length}개`], ['이번 달', `${entries.length}개`]].map(([label, val]) => (
            <View key={label} style={styles.statCard}>
              <Text style={styles.statVal}>{val}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Monthly heatmap */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>월별 기록 · 2026</Text>
          <View style={styles.monthGrid}>
            {MONTH_COUNTS.map((count, i) => (
              <View key={i} style={[styles.monthCell, { backgroundColor: getMonthBg(count) }]}>
                <Text style={[styles.monthLabel, { color: getMonthTextColor(count) }]}>{MONTHS[i]}</Text>
                {count > 0 && (
                  <Text style={[styles.monthCount, { color: getMonthTextColor(count) }]}>{count}</Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Tag bar chart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>자주 쓴 태그</Text>
          {topTags.length === 0 ? (
            <Text style={styles.emptyText}>아직 태그가 없어요</Text>
          ) : (
            <View style={styles.tagChart}>
              {topTags.map(([label, count]) => (
                <View key={label} style={styles.tagRow}>
                  <Text style={styles.tagName}>#{label}</Text>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${(count / maxTag) * 100}%` }]} />
                  </View>
                  <Text style={styles.tagCount}>{count}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6', backgroundColor: '#ffffff',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  statsGrid: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, backgroundColor: '#ffffff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#f3f4f6', alignItems: 'center', gap: 4,
  },
  statVal: { fontSize: 24, fontWeight: '800', color: '#374151' },
  statLabel: { fontSize: 12, color: '#9ca3af' },
  card: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#f3f4f6', gap: 12,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#374151' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  monthCell: {
    width: '21%', borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 4,
    alignItems: 'center', gap: 2,
  },
  monthLabel: { fontSize: 12, fontWeight: '500' },
  monthCount: { fontSize: 13, fontWeight: '700' },
  tagChart: { gap: 10 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tagName: { fontSize: 12, color: '#6b7280', width: 48 },
  barBg: { flex: 1, height: 8, backgroundColor: '#f3f4f6', borderRadius: 99, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#9ca3af', borderRadius: 99 },
  tagCount: { fontSize: 12, color: '#9ca3af', width: 20, textAlign: 'right' },
  emptyText: { fontSize: 13, color: '#d1d5db' },
});
