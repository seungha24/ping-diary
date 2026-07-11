import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  TouchableOpacity, TextInput, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { MONTHS, entryDateLabel, stripPhotoMarkers } from '../data/types';
import { useTheme, hexToRgba } from '../context/ThemeContext';
import { useEntries } from '../context/EntriesContext';
import { getMonthlyAwards, MonthlyAward } from '../api';
import { IconX, PersonaIcon, IconTrophy } from '../components/icons/Line';
import PingLogo from '../components/PingLogo';
import { useThemedStyles } from '../theme/themed';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function StatsScreen() {
  const styles = useThemedStyles(lightStyles);
  const navigation = useNavigation<Nav>();
  const { accent, mode } = useTheme();
  const { entries } = useEntries();

  // 개수 기준 단계형 그라데이션 (기록이 쌓일수록 진해짐) — 다크 모드 색 대응
  function getMonthTextColor(count: number): string {
    if (count === 0) return '#9ca3af';
    if (count >= 10) return '#ffffff';
    return mode === 'dark' ? '#e5e7eb' : '#374151';
  }

  function getMonthBg(count: number): string {
    if (count === 0) return mode === 'dark' ? '#232834' : '#f3f4f6';
    if (count >= 15) return accent;                 // 15 개 이상: 가장 진함
    if (count >= 8) return hexToRgba(accent, 0.65); // 8~14 개
    if (count >= 3) return hexToRgba(accent, 0.4);  // 3~7 개
    return hexToRgba(accent, 0.2);                  // 1~2 개: 가장 연함
  }
  const [searchTag, setSearchTag] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);

  // ── 실제 기록 기반 집계 ──
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth(); // 0~11

  // 월별 기록 수 (올해, createdAt 기준)
  const monthCounts = Array(12).fill(0) as number[];
  entries.forEach((e) => {
    const d = new Date(e.createdAt);
    if (d.getFullYear() === thisYear) monthCounts[d.getMonth()]++;
  });
  const thisMonthCount = monthCounts[thisMonth];
  const lastMonthCount = thisMonth === 0 ? 0 : monthCounts[thisMonth - 1];
  const monthDiff = thisMonthCount - lastMonthCount;

  // 이번 달에 쓴 p!ng 목록 (시트용)
  const thisMonthEntries = entries.filter((e) => {
    const d = new Date(e.createdAt);
    return d.getFullYear() === thisYear && d.getMonth() === thisMonth;
  });

  // 연속 기록일: 오늘(또는 어제)부터 거꾸로 하루도 빠짐없이 쓴 날 수
  const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const writtenDays = new Set(entries.map((e) => dayKey(new Date(e.createdAt))));
  let streak = 0;
  const cursor = new Date();
  if (!writtenDays.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1); // 오늘 아직 안 썼으면 어제부터
  while (writtenDays.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // ── 월말 p!ng 어워즈 (페르소나 심사위원 시상식) ──
  const [reportMonth, setReportMonth] = useState(thisMonth); // 시상식을 볼 달 (월별 기록에서 선택)
  const [awardsByMonth, setAwardsByMonth] = useState<Record<number, { awards: MonthlyAward[]; closing: string | null }>>({});
  const [awardsLoading, setAwardsLoading] = useState(false);
  const [awardsError, setAwardsError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set()); // 개봉한 상 (달-인덱스)
  const monthAwards = awardsByMonth[reportMonth] ?? null;

  // 월별 기록에서 달 선택 → 그 달의 시상식 카드로 전환
  function selectReportMonth(m: number) {
    if (m === reportMonth) return;
    setReportMonth(m);
    setAwardsError(null);
  }

  async function loadAwards() {
    if (awardsLoading) return;
    const target = reportMonth;
    setAwardsLoading(true);
    setAwardsError(null);
    try {
      const res = await getMonthlyAwards(thisYear, target + 1);
      if (res.awards.length > 0) {
        setAwardsByMonth((prev) => ({ ...prev, [target]: { awards: res.awards, closing: res.closing } }));
      } else {
        setAwardsError(`${target + 1} 월 기록이 없어요. p!ng를 쓰면 시상식을 열어드릴게요.`);
      }
    } catch (e: any) {
      setAwardsError(e?.message ?? '시상식 준비에 실패했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setAwardsLoading(false);
    }
  }

  function revealAward(key: string) {
    setRevealed((prev) => new Set(prev).add(key));
  }

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
        <PingLogo />
        <View style={{ width: 36, height: 36 }} />
      </View>

      <ScrollView style={{ backgroundColor: mode === 'dark' ? '#191c24' : '#f9fafb' }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Summary */}
        <View style={styles.statsGrid}>
          <TouchableOpacity style={styles.statCard} onPress={() => setListOpen(true)} activeOpacity={0.7}>
            <Text style={[styles.statVal, { color: accent }]}>{entries.length} 개</Text>
            <Text style={styles.statLabel}>총 p!ng</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statCard} onPress={() => setMonthOpen(true)} activeOpacity={0.7}>
            <Text style={[styles.statVal, { color: accent }]}>{thisMonthCount} 개</Text>
            <Text style={styles.statLabel}>이번 달</Text>
          </TouchableOpacity>
        </View>

        {/* 지난달 대비 / 연속 기록 (요약 아래 작은 칩) */}
        <View style={styles.statsGrid}>
          <View style={styles.statChip}>
            <Text style={styles.statChipLabel}>지난달 대비</Text>
            <Text style={[styles.statChipVal, { color: accent }]}>
              {monthDiff >= 0 ? `+${monthDiff} 개` : `${monthDiff} 개`}
            </Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statChipLabel}>연속 기록</Text>
            <Text style={[styles.statChipVal, { color: accent }]}>{streak} 일</Text>
          </View>
        </View>

        {/* Monthly heatmap */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>월별 기록 · {thisYear}</Text>
          <View style={styles.monthGrid}>
            {monthCounts.map((count, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.monthCell,
                  { backgroundColor: getMonthBg(count) },
                  reportMonth === i && { borderWidth: 2, borderColor: accent },
                ]}
                onPress={() => selectReportMonth(i)}
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

        {/* 월말 p!ng 어워즈 */}
        <View style={[styles.card, { borderColor: hexToRgba(accent, 0.3) }]}>
          <View style={styles.reportHeader}>
            <IconTrophy size={15} color={accent} />
            <Text style={[styles.cardTitle, { flex: 1 }]}>{reportMonth + 1} 월 p!ng 어워즈</Text>
          </View>
          {monthAwards ? (
            <>
              {monthAwards.awards.map((a, i) => {
                const key = `${reportMonth}-${i}`;
                const open = revealed.has(key);
                const winner = entries.find((e) => e.id === a.entry_id);
                if (!open) {
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[styles.awardEnvelope, { borderColor: hexToRgba(accent, 0.35) }]}
                      onPress={() => revealAward(key)}
                      activeOpacity={0.8}
                    >
                      <IconTrophy size={16} color="#9ca3af" />
                      <Text style={styles.awardEnvelopeText}>{a.award}</Text>
                      <Text style={[styles.awardEnvelopeHint, { color: accent }]}>탭해서 개봉</Text>
                    </TouchableOpacity>
                  );
                }
                return (
                  <View key={key} style={[styles.awardCard, { borderColor: hexToRgba(accent, 0.25) }]}>
                    <View style={styles.awardHeader}>
                      <PersonaIcon persona={a.persona} size={15} color={accent} />
                      <Text style={[styles.awardName, { color: accent }]}>{a.award}</Text>
                    </View>
                    {winner && (
                      <Text style={styles.awardWinner}>수상작 「{winner.title || '제목 없음'}」 · {entryDateLabel(winner)}</Text>
                    )}
                    {a.quote ? <Text style={styles.awardQuote}>“{a.quote}”</Text> : null}
                    <Text style={styles.awardComment}>{a.comment}  — {a.persona}</Text>
                    {winner && (
                      <TouchableOpacity onPress={() => navigation.navigate('DiaryDetail', { entry: winner })}>
                        <Text style={[styles.awardLink, { color: accent }]}>일기 보러가기 →</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
              {!!monthAwards.closing &&
                monthAwards.awards.every((_, i) => revealed.has(`${reportMonth}-${i}`)) && (
                <Text style={styles.awardClosing}>{monthAwards.closing}</Text>
              )}
            </>
          ) : (
            <>
              <Text style={styles.reportDesc}>
                페르소나 심사위원들이 {reportMonth + 1} 월 일기에 상을 드려요. 위 월별 기록에서 다른 달을 누르면 그 달 시상식도 열 수 있어요.
              </Text>
              {awardsError && <Text style={styles.reportError}>{awardsError}</Text>}
              <TouchableOpacity
                style={[styles.reportBtn, { backgroundColor: accent }, awardsLoading && { opacity: 0.6 }]}
                onPress={loadAwards}
                disabled={awardsLoading}
              >
                {awardsLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.reportBtnText}>시상식 열기</Text>}
              </TouchableOpacity>
            </>
          )}
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
                  <Text style={[styles.tagName, activeTag === label && { color: accent, fontWeight: '600' }]}>
                    #{label}
                  </Text>
                  <View style={styles.barBg}>
                    <View style={[
                      styles.barFill,
                      { width: `${(count / maxTag) * 100}%`, backgroundColor: hexToRgba(accent, 0.35) },
                      activeTag === label && { backgroundColor: accent },
                    ]} />
                  </View>
                  <Text style={[styles.tagCount, activeTag === label && { color: accent, fontWeight: '600' }]}>
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
              #{query} 검색 결과 · {filteredEntries.length} 개
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
                      <Text style={styles.resultDate}>{entryDateLabel(e)}</Text>
                    </View>
                    <Text style={styles.resultPreview} numberOfLines={2}>{stripPhotoMarkers(e.body)}</Text>
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
              <Text style={styles.sheetTitle}>이번 달 p!ng · {thisMonthEntries.length} 개</Text>
              <TouchableOpacity onPress={() => setMonthOpen(false)}>
                <IconX size={18} color="#9ca3af" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {thisMonthEntries.map((e) => (
                <TouchableOpacity
                  key={e.id}
                  style={styles.entryRow}
                  onPress={() => { setMonthOpen(false); navigation.navigate('DiaryDetail', { entry: e }); }}
                >
                  <View style={styles.entryRowLeft}>
                    <Text style={styles.entryRowTitle} numberOfLines={1}>{e.title}</Text>
                    <Text style={styles.entryRowDate}>{entryDateLabel(e)}</Text>
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
              <Text style={styles.sheetTitle}>전체 p!ng · {entries.length} 개</Text>
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
                    <Text style={styles.entryRowDate}>{entryDateLabel(e)}</Text>
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

const lightStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6', backgroundColor: '#ffffff',
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#111827' },
  content: { padding: 16, gap: 14, paddingBottom: 40 },

  // 검색
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f9fafb', borderRadius: 10,
    borderWidth: 1, borderColor: '#e5e7eb',
    paddingHorizontal: 10, paddingVertical: 6,
  },
  searchHash: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
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
  resultTitle: { fontSize: 13, fontWeight: '600', color: '#111827', flex: 1 },
  resultDate: { fontSize: 11, color: '#9ca3af', marginLeft: 8 },
  resultPreview: { fontSize: 12, color: '#6b7280', lineHeight: 17 },
  resultTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  resultTag: { fontSize: 11, color: '#9ca3af' },
  resultTagActive: { color: '#111827', fontWeight: '600' },

  // 요약
  statsGrid: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, backgroundColor: '#ffffff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#f3f4f6', alignItems: 'center', gap: 4,
  },
  statVal: { fontSize: 24, fontWeight: '700', color: '#374151' },
  statLabel: { fontSize: 12, color: '#9ca3af' },
  statCardSm: {
    flex: 1, backgroundColor: '#ffffff', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#f3f4f6', alignItems: 'center', gap: 3,
  },
  statValSm: { fontSize: 17, fontWeight: '700', color: '#374151' },
  statChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#f3f4f6',
    paddingHorizontal: 12, paddingVertical: 8,
  },
  statChipLabel: { fontSize: 11.5, color: '#9ca3af' },
  statChipVal: { fontSize: 13.5, fontWeight: '700' },

  // AI 리포트
  reportHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reportDesc: { fontSize: 12.5, color: '#9ca3af', lineHeight: 19 },
  reportText: { fontSize: 13.5, color: '#374151', lineHeight: 22 },
  reportToggle: { fontSize: 12, fontWeight: '600' },

  // 어워즈
  awardEnvelope: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 14, backgroundColor: '#fafafa',
  },
  awardEnvelopeText: { flex: 1, fontSize: 13.5, fontWeight: '600', color: '#374151' },
  awardEnvelopeHint: { fontSize: 12, fontWeight: '600' },
  awardCard: {
    borderWidth: 1, borderRadius: 14, padding: 14, gap: 6, backgroundColor: '#fbfbfd',
  },
  awardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  awardName: { fontSize: 13.5, fontWeight: '700' },
  awardWinner: { fontSize: 12.5, color: '#374151', fontWeight: '600' },
  awardQuote: { fontSize: 13, color: '#4b5563', fontStyle: 'italic', lineHeight: 20 },
  awardComment: { fontSize: 13, color: '#4b5563', lineHeight: 20 },
  awardLink: { fontSize: 12.5, fontWeight: '600', marginTop: 2 },
  awardClosing: { fontSize: 12.5, color: '#9ca3af', textAlign: 'center', paddingVertical: 4 },
  reportError: { fontSize: 12, color: '#ef4444' },
  reportBtn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  reportBtnText: { fontSize: 13, fontWeight: '600', color: '#ffffff' },

  card: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#f3f4f6', gap: 12,
  },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#374151' },

  // 월별
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  monthCell: {
    width: '22%', borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 4,
    alignItems: 'center', gap: 2,
  },
  monthLabel: { fontSize: 12, fontWeight: '500' },
  monthCount: { fontSize: 13, fontWeight: '600' },

  // 태그 차트
  tagChart: { gap: 10 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  tagRowActive: {},
  tagName: { fontSize: 12, color: '#6b7280', width: 56 },
  tagNameActive: { color: '#111827', fontWeight: '600' },
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
  sheetTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
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
