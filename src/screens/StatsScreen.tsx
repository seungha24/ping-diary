import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  TouchableOpacity, TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { MONTH_COUNTS, MONTHS } from '../data/types';
import { useTheme, hexToRgba } from '../context/ThemeContext';
import { useEntries } from '../context/EntriesContext';
import { IconX } from '../components/icons/Line';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function getMonthTextColor(count: number): string {
  if (count === 0) return '#9ca3af';
  return count / 30 > 0.5 ? '#ffffff' : '#374151';
}

export default function StatsScreen() {
  const navigation = useNavigation<Nav>();
  const { accent } = useTheme();
  const { entries } = useEntries();

  function getMonthBg(count: number): string {
    if (count === 0) return '#f3f4f6';
    const r = count / 30;
    if (r > 0.8) return accent;
    if (r > 0.5) return hexToRgba(accent, 0.65);
    if (r > 0.3) return hexToRgba(accent, 0.38);
    return hexToRgba(accent, 0.18);
  }
  const [searchTag, setSearchTag] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);

  const tagCounts: Record<string, number> = {};
  entries.forEach((e) => e.tags.forEach((t) => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));
  const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxTag = topTags[0]?.[1] || 1;

  // 검색어 또는 선택된 태그로 필터링
  const query = activeTag ?? searchTag.replace(/^#/, '').trim();
  const filteredEntries = query
    ? entries.filter((e) => e.tags.some((t) => t.includes(query)))
    : [];

  function selectTag(tag: string) {
    setActiveTag(tag);
    setSearchTag(tag);
  }

  function handleSearchChange(text: string) {
    setSearchTag(text);
    setActiveTag(null);
  }

  function clearSearch() {
    setSearchTag('');
    setActiveTag(null);
  }

  return (
    <SafeAreaView style={styles.container} collapsable={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>통계</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Summary */}
        <View style={styles.statsGrid}>
          <TouchableOpacity style={styles.statCard} onPress={() => setListOpen(true)} activeOpacity={0.7}>
            <Text style={[styles.statVal, { color: accent }]}>{entries.length}개</Text>
            <Text style={styles.statLabel}>총 p!ng</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statCard} onPress={() => setMonthOpen(true)} activeOpacity={0.7}>
            <Text style={[styles.statVal, { color: accent }]}>{entries.length}개</Text>
            <Text style={styles.statLabel}>이번 달</Text>
          </TouchableOpacity>
        </View>


        {/* Monthly heatmap */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>월별 기록 · 2026</Text>
          <View style={styles.monthGrid}>
            {MONTH_COUNTS.map((count, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.monthCell, { backgroundColor: getMonthBg(count) }]}
                onPress={() => (navigation as any).navigate('Calendar', { month: i })}
                activeOpacity={0.7}
              >
                <Text style={[styles.monthLabel, { color: getMonthTextColor(count) }]}>{MONTHS[i]}</Text>
                {count > 0 && (
                  <Text style={[styles.monthCount, { color: getMonthTextColor(count) }]}>{count}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tag bar chart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>자주 쓴 태그 · 탭하여 검색</Text>

          {/* 검색창 */}
          <View style={styles.searchRow}>
            <Text style={styles.searchHash}>#</Text>
            <TextInput
              style={styles.searchInput}
              value={searchTag}
              onChangeText={handleSearchChange}
              placeholder="탭하여 검색"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              returnKeyType="search"
            />
            {searchTag.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearBtn}>
                <IconX size={12} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>

          {topTags.length === 0 ? (
            <Text style={styles.emptyText}>아직 태그가 없어요</Text>
          ) : (
            <View style={styles.tagChart}>
              {topTags.map(([label, count]) => (
                <TouchableOpacity
                  key={label}
                  style={[styles.tagRow, activeTag === label && styles.tagRowActive]}
                  onPress={() => activeTag === label ? clearSearch() : selectTag(label)}
                >
                  <Text style={[styles.tagName, activeTag === label && { color: accent, fontWeight: '700' }]}>
                    #{label}
                  </Text>
                  <View style={styles.barBg}>
                    <View style={[
                      styles.barFill,
                      { width: `${(count / maxTag) * 100}%`, backgroundColor: hexToRgba(accent, 0.35) },
                      activeTag === label && { backgroundColor: accent },
                    ]} />
                  </View>
                  <Text style={[styles.tagCount, activeTag === label && { color: accent, fontWeight: '700' }]}>
                    {count}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* 검색 결과 */}
        {query.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              #{query} 검색 결과 · {filteredEntries.length}개
            </Text>
            {filteredEntries.length === 0 ? (
              <Text style={styles.emptyText}>일치하는 p!ng가 없어요</Text>
            ) : (
              <View style={styles.resultList}>
                {filteredEntries.map((e) => (
                  <TouchableOpacity
                    key={e.id}
                    style={styles.resultCard}
                    onPress={() => navigation.navigate('DiaryDetail', { entry: e })}
                  >
                    <View style={styles.resultTop}>
                      <Text style={styles.resultTitle} numberOfLines={1}>{e.title}</Text>
                      <Text style={styles.resultDate}>6월 {e.dates.join(',')}일</Text>
                    </View>
                    <Text style={styles.resultPreview} numberOfLines={2}>{e.body}</Text>
                    <View style={styles.resultTagRow}>
                      {e.tags.map((t) => (
                        <Text
                          key={t}
                          style={[styles.resultTag, t === query && styles.resultTagActive]}
                        >
                          #{t}
                        </Text>
                      ))}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* 전체 p!ng 목록 — 화면 안에서 올라오는 시트 */}
      {monthOpen && (
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayBg} activeOpacity={1} onPress={() => setMonthOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>이번 달 p!ng · {entries.length}개</Text>
              <TouchableOpacity onPress={() => setMonthOpen(false)}>
                <IconX size={18} color="#9ca3af" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {entries.map((e) => (
                <TouchableOpacity
                  key={e.id}
                  style={styles.entryRow}
                  onPress={() => { setMonthOpen(false); navigation.navigate('DiaryDetail', { entry: e }); }}
                >
                  <View style={styles.entryRowLeft}>
                    <Text style={styles.entryRowTitle} numberOfLines={1}>{e.title}</Text>
                    <Text style={styles.entryRowDate}>6월 {e.dates.join(', ')}일</Text>
                  </View>
                  <View style={styles.entryTagRow}>
                    {e.tags.slice(0, 2).map((t) => (
                      <Text key={t} style={styles.entryTag}>#{t}</Text>
                    ))}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {listOpen && (
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayBg} activeOpacity={1} onPress={() => setListOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>전체 p!ng · {entries.length}개</Text>
              <TouchableOpacity onPress={() => setListOpen(false)}>
                <IconX size={18} color="#9ca3af" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {entries.map((e) => (
                <TouchableOpacity
                  key={e.id}
                  style={styles.entryRow}
                  onPress={() => { setListOpen(false); navigation.navigate('DiaryDetail', { entry: e }); }}
                >
                  <View style={styles.entryRowLeft}>
                    <Text style={styles.entryRowTitle} numberOfLines={1}>{e.title}</Text>
                    <Text style={styles.entryRowDate}>6월 {e.dates.join(', ')}일</Text>
                  </View>
                  <View style={styles.entryTagRow}>
                    {e.tags.slice(0, 2).map((t) => (
                      <Text key={t} style={styles.entryTag}>#{t}</Text>
                    ))}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
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

  // 검색
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f9fafb', borderRadius: 10,
    borderWidth: 1, borderColor: '#e5e7eb',
    paddingHorizontal: 10, paddingVertical: 6,
  },
  searchHash: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  searchInput: { flex: 1, fontSize: 12, color: '#111827' },
  clearBtn: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  clearBtnText: { fontSize: 11, color: '#9ca3af' },

  // 검색 결과
  resultList: { gap: 10 },
  resultCard: {
    backgroundColor: '#f9fafb', borderRadius: 12,
    borderWidth: 1, borderColor: '#f3f4f6', padding: 12, gap: 6,
  },
  resultTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultTitle: { fontSize: 13, fontWeight: '700', color: '#111827', flex: 1 },
  resultDate: { fontSize: 11, color: '#9ca3af', marginLeft: 8 },
  resultPreview: { fontSize: 12, color: '#6b7280', lineHeight: 17 },
  resultTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  resultTag: { fontSize: 11, color: '#9ca3af' },
  resultTagActive: { color: '#111827', fontWeight: '700' },

  // 요약
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

  // 월별
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  monthCell: {
    width: '22%', borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 4,
    alignItems: 'center', gap: 2,
  },
  monthLabel: { fontSize: 12, fontWeight: '500' },
  monthCount: { fontSize: 13, fontWeight: '700' },

  // 태그 차트
  tagChart: { gap: 10 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  tagRowActive: {},
  tagName: { fontSize: 12, color: '#6b7280', width: 56 },
  tagNameActive: { color: '#111827', fontWeight: '700' },
  barBg: { flex: 1, height: 8, backgroundColor: '#f3f4f6', borderRadius: 99, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#9ca3af', borderRadius: 99 },
  barFillActive: { backgroundColor: '#111827' },
  tagCount: { fontSize: 12, color: '#9ca3af', width: 20, textAlign: 'right' },
  emptyText: { fontSize: 13, color: '#d1d5db' },

  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' },
  overlayBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 40, maxHeight: '80%',
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  sheetTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  sheetClose: { fontSize: 16, color: '#9ca3af', paddingHorizontal: 4 },
  entryRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 12,
  },
  entryRowLeft: { flex: 1, gap: 3 },
  entryRowTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  entryRowDate: { fontSize: 12, color: '#9ca3af' },
  entryTagRow: { flexDirection: 'row', gap: 4 },
  entryTag: { fontSize: 11, color: '#9ca3af' },
});
