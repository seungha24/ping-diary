import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, Modal, Pressable, TextInput, Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Line, Rect, Circle, Path } from 'react-native-svg';
import { RootStackParamList } from '../navigation/RootNavigator';
import { PhotoBlock } from '../components/PhotoThumb';
import PhotoLightbox from '../components/PhotoLightbox';
import Tag from '../components/Tag';
import IconChev from '../components/icons/IconChev';
import IconPlus from '../components/icons/IconPlus';
import { BAND_COLORS, DiaryEntry } from '../data/types';
import { useTheme } from '../context/ThemeContext';

const PERSONA_EMOJI: Record<string, string> = {
  '선생님': '📖', '엄마': '🌸', '상담사': '💆', '미래의 나': '🔮',
};

type Route = RouteProp<RootStackParamList, 'Group'>;
type ViewMode = 'list' | 'grid';
type Frequency = 'interval' | 'weekly' | 'biweekly' | 'off';

const FREQ_OPTIONS: { value: Frequency; label: string; desc: string }[] = [
  { value: 'interval', label: '직접 입력', desc: '며칠마다 알림 받을지 설정' },
  { value: 'weekly',   label: '매주',      desc: '선택한 요일에 알림' },
  { value: 'biweekly', label: '격주',      desc: '2주에 한 번 알림' },
  { value: 'off',      label: '알림 끄기', desc: '이 그룹의 알림 없음' },
];

const WEEK_DAYS = ['일', '월', '화', '수', '목', '금', '토'];

function IconBell({ hasNotif, accent }: { hasNotif: boolean; accent: string }) {
  const c = hasNotif ? accent : '#9ca3af';
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
      {hasNotif && <Circle cx="18" cy="5" r="3" fill={accent} stroke="none" />}
    </Svg>
  );
}

function IconList({ active, accent }: { active: boolean; accent: string }) {
  const c = active ? accent : '#9ca3af';
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round">
      <Line x1="8" y1="6" x2="21" y2="6" />
      <Line x1="8" y1="12" x2="21" y2="12" />
      <Line x1="8" y1="18" x2="21" y2="18" />
      <Circle cx="3" cy="6" r="1" fill={c} stroke="none" />
      <Circle cx="3" cy="12" r="1" fill={c} stroke="none" />
      <Circle cx="3" cy="18" r="1" fill={c} stroke="none" />
    </Svg>
  );
}

function IconGrid({ active, accent }: { active: boolean; accent: string }) {
  const c = active ? accent : '#9ca3af';
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round">
      <Rect x="3" y="3" width="7" height="7" rx="1" />
      <Rect x="14" y="3" width="7" height="7" rx="1" />
      <Rect x="3" y="14" width="7" height="7" rx="1" />
      <Rect x="14" y="14" width="7" height="7" rx="1" />
    </Svg>
  );
}

function ListCard({
  entry, onPhotoPress, isShared, onToggleShare,
}: {
  entry: DiaryEntry;
  onPhotoPress: (p: string) => void;
  isShared: boolean;
  onToggleShare: () => void;
}) {
  const { accent } = useTheme();
  return (
    <View style={styles.listCard}>
      <View style={styles.listCardAuthor}>
        <View style={styles.authorAvatar}>
          <Text style={{ fontSize: 16 }}>{entry.avatar}</Text>
        </View>
        <View>
          <Text style={styles.authorName}>{entry.author}</Text>
          <Text style={styles.entryDate}>6월 {entry.dates.join(',')}일</Text>
        </View>
      </View>
      {entry.photo && (
        <Pressable style={{ width: '100%' }} onPress={() => onPhotoPress(entry.photo!)}>
          <PhotoBlock photo={entry.photo} height={140} />
        </Pressable>
      )}
      <View style={styles.listCardBody}>
        <Text style={styles.listCardTitle}>{entry.title}</Text>
        <Text style={styles.listCardPreview} numberOfLines={2}>{entry.body}</Text>
        <View style={styles.tagRow}>
          {entry.tags.map((t) => <Tag key={t} label={t} />)}
        </View>
      </View>
      {entry.aiComment && (
        <View style={styles.aiSection}>
          <View style={styles.aiSectionHeader}>
            <View style={styles.aiDotWrap}><View style={styles.aiDotInner} /></View>
            <Text style={styles.aiSectionLabel}>AI 코멘트</Text>
            <Text style={styles.aiPersona}>
              {PERSONA_EMOJI[entry.persona] ?? '🤖'} {entry.persona}
            </Text>
            <TouchableOpacity
              style={[styles.shareToggle, isShared && { borderColor: accent, backgroundColor: accent }]}
              onPress={onToggleShare}
            >
              <Text style={[styles.shareToggleText, isShared && styles.shareToggleTextActive]}>
                {isShared ? '공개 중' : '비공개'}
              </Text>
            </TouchableOpacity>
          </View>
          {isShared ? (
            <Text style={styles.aiCommentText}>{entry.aiComment}</Text>
          ) : (
            <TouchableOpacity style={styles.aiLocked} onPress={onToggleShare}>
              <Text style={styles.aiLockedText}>🔒  비공개 · 탭하여 그룹에 공개하기</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

function GridCard({
  entry, index, onPhotoPress, isShared, onToggleShare,
}: {
  entry: DiaryEntry;
  index: number;
  onPhotoPress: (p: string) => void;
  isShared: boolean;
  onToggleShare: () => void;
}) {
  const { accent } = useTheme();
  return (
    <View style={styles.gridCard}>
      {entry.photo ? (
        <Pressable style={{ width: '100%' }} onPress={() => onPhotoPress(entry.photo!)}>
          <PhotoBlock photo={entry.photo} height={90} />
        </Pressable>
      ) : (
        <View style={[styles.gridBand, { backgroundColor: BAND_COLORS[index % BAND_COLORS.length] }]} />
      )}
      <View style={styles.gridCardBody}>
        <View style={styles.gridAuthorRow}>
          <Text style={{ fontSize: 14 }}>{entry.avatar}</Text>
          <Text style={styles.gridAuthorName}>{entry.author}</Text>
        </View>
        <Text style={styles.gridTitle} numberOfLines={2}>{entry.title}</Text>
        <Text style={styles.gridPreview} numberOfLines={2}>{entry.body}</Text>
        <View style={styles.gridTagRow}>
          {entry.tags.slice(0, 2).map((t) => (
            <Text key={t} style={styles.gridTag}>#{t}</Text>
          ))}
        </View>
        <Text style={styles.gridDate}>6월 {entry.dates.join(',')}일</Text>
      </View>
      {entry.aiComment && (
        <View style={styles.gridAiSection}>
          <View style={styles.gridAiHeader}>
            <View style={styles.aiDotWrap}><View style={styles.aiDotInner} /></View>
            <Text style={styles.gridAiLabel}>AI 코멘트</Text>
            <TouchableOpacity
              style={[styles.shareToggle, isShared && { borderColor: accent, backgroundColor: accent }]}
              onPress={onToggleShare}
            >
              <Text style={[styles.shareToggleText, isShared && styles.shareToggleTextActive]}>
                {isShared ? '공개' : '비공개'}
              </Text>
            </TouchableOpacity>
          </View>
          {isShared ? (
            <Text style={styles.gridAiText} numberOfLines={3}>{entry.aiComment}</Text>
          ) : (
            <TouchableOpacity onPress={onToggleShare}>
              <Text style={styles.gridAiLocked}>🔒 탭하여 공개</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

export default function GroupScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { group } = useRoute<Route>().params;
  const { accent } = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [sharedAiComments, setSharedAiComments] = useState<Set<number>>(new Set());

  function toggleShare(id: number) {
    setSharedAiComments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // 알림 설정 상태
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>('weekly');
  const [selectedDays, setSelectedDays] = useState<number[]>([1]); // 월요일 기본
  const [intervalDays, setIntervalDays] = useState(3); // N일마다

  // 저장 전 임시 상태
  const [draftFreq, setDraftFreq] = useState<Frequency>(frequency);
  const [draftDays, setDraftDays] = useState<number[]>(selectedDays);
  const [draftInterval, setDraftInterval] = useState(String(intervalDays));

  function openModal() {
    setDraftFreq(frequency);
    setDraftDays(selectedDays);
    setDraftInterval(String(intervalDays));
    setNotifModalOpen(true);
  }

  function saveAndClose() {
    setFrequency(draftFreq);
    setSelectedDays(draftDays);
    const parsed = parseInt(draftInterval, 10);
    setIntervalDays(!isNaN(parsed) && parsed > 0 ? parsed : 1);
    setNotifModalOpen(false);
  }

  function toggleDay(d: number) {
    setDraftDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)
    );
  }

  function freqSummary() {
    if (frequency === 'off') return '알림 꺼짐';
    if (frequency === 'interval') return `매 ${intervalDays}일마다`;
    if (frequency === 'biweekly') return '격주';
    if (frequency === 'weekly') {
      if (selectedDays.length === 0) return '매주 (요일 미설정)';
      return '매주 ' + selectedDays.map((d) => WEEK_DAYS[d]).join(', ');
    }
    return '';
  }

  const hasNotif = frequency !== 'off';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <IconChev dir="left" size={18} color="#9ca3af" />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          {group.photo ? (
            <Image source={{ uri: group.photo }} style={styles.groupHeaderPhoto} />
          ) : (
            <Text style={{ fontSize: 18 }}>{group.emoji}</Text>
          )}
          <View style={styles.headerText}>
            <Text style={styles.groupName}>{group.name}</Text>
            <Text style={styles.groupMembers} numberOfLines={1}>{group.members.join(', ')}</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* 알림 설정 버튼 */}
          <TouchableOpacity style={styles.bellBtn} onPress={openModal}>
            <IconBell hasNotif={hasNotif} accent={accent} />
          </TouchableOpacity>

          {/* 리스트/그리드 토글 */}
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
              onPress={() => setViewMode('list')}
            >
              <IconList active={viewMode === 'list'} accent={accent} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'grid' && styles.toggleBtnActive]}
              onPress={() => setViewMode('grid')}
            >
              <IconGrid active={viewMode === 'grid'} accent={accent} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 현재 알림 주기 표시 배너 */}
      {frequency !== 'off' && (
        <TouchableOpacity style={styles.notifBanner} onPress={openModal}>
          <Text style={styles.notifBannerEmoji}>🔔</Text>
          <Text style={styles.notifBannerText}>{freqSummary()} 일기 알림 중</Text>
          <Text style={styles.notifBannerEdit}>변경</Text>
        </TouchableOpacity>
      )}

      {/* Feed */}
      {viewMode === 'list' ? (
        <ScrollView contentContainerStyle={styles.listContent}>
          {group.entries.map((entry) => (
            <ListCard
              key={entry.id}
              entry={entry}
              onPhotoPress={setLightboxPhoto}
              isShared={sharedAiComments.has(entry.id)}
              onToggleShare={() => toggleShare(entry.id)}
            />
          ))}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.gridContent}>
          <View style={styles.gridLayout}>
            {group.entries.map((entry, i) => (
              <GridCard
                key={entry.id}
                entry={entry}
                index={i}
                onPhotoPress={setLightboxPhoto}
                isShared={sharedAiComments.has(entry.id)}
                onToggleShare={() => toggleShare(entry.id)}
              />
            ))}
          </View>
        </ScrollView>
      )}

      {lightboxPhoto && (
        <PhotoLightbox photo={lightboxPhoto} onClose={() => setLightboxPhoto(null)} />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('DiaryWrite')}>
        <IconPlus color="#ffffff" size={22} />
      </TouchableOpacity>

      {/* 알림 설정 모달 */}
      <Modal visible={notifModalOpen} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setNotifModalOpen(false)} />
        <View style={styles.sheet}>
          {/* 핸들 */}
          <View style={styles.sheetHandle} />

          <Text style={styles.sheetTitle}>알림 주기 설정</Text>
          <Text style={styles.sheetSubtitle}>{group.emoji} {group.name}</Text>

          {/* 주기 옵션 */}
          <View style={styles.freqList}>
            {FREQ_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.freqRow, draftFreq === opt.value && { borderColor: accent, backgroundColor: '#ffffff' }]}
                onPress={() => setDraftFreq(opt.value)}
                activeOpacity={0.8}
              >
                <View style={styles.freqRowLeft}>
                  {opt.value === 'interval' ? (
                    <View style={styles.intervalLabelRow}>
                      <Text style={[styles.freqLabel, draftFreq === 'interval' && styles.freqLabelActive]}>매</Text>
                      <TextInput
                        style={[
                          styles.intervalInput,
                          draftFreq === 'interval' && styles.intervalInputActive,
                        ]}
                        value={draftInterval}
                        onChangeText={(v) => {
                          setDraftFreq('interval');
                          setDraftInterval(v.replace(/[^0-9]/g, ''));
                        }}
                        onFocus={() => setDraftFreq('interval')}
                        keyboardType="number-pad"
                        maxLength={3}
                        placeholder="N"
                        placeholderTextColor="#d1d5db"
                        selectTextOnFocus
                      />
                      <Text style={[styles.freqLabel, draftFreq === 'interval' && styles.freqLabelActive]}>일마다</Text>
                    </View>
                  ) : (
                    <Text style={[styles.freqLabel, draftFreq === opt.value && { color: accent }]}>
                      {opt.label}
                    </Text>
                  )}
                  <Text style={styles.freqDesc}>{opt.desc}</Text>
                </View>
                <View style={[styles.radio, draftFreq === opt.value && { borderColor: accent }]}>
                  {draftFreq === opt.value && <View style={[styles.radioInner, { backgroundColor: accent }]} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* 요일 선택 (매주일 때만) */}
          {draftFreq === 'weekly' && (
            <View style={styles.daySection}>
              <Text style={styles.daySectionTitle}>알림 받을 요일</Text>
              <View style={styles.dayRow}>
                {WEEK_DAYS.map((d, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.dayChip, draftDays.includes(i) && { backgroundColor: accent }]}
                    onPress={() => toggleDay(i)}
                  >
                    <Text style={[styles.dayChipText, draftDays.includes(i) && styles.dayChipTextActive]}>
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* 저장 버튼 */}
          <TouchableOpacity style={styles.saveBtn} onPress={saveAndClose}>
            <Text style={styles.saveBtnText}>저장</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  headerText: { flex: 1, minWidth: 0 },
  groupName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  groupMembers: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  groupHeaderPhoto: { width: 28, height: 28, borderRadius: 8 },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
  bellBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
  },
  viewToggle: {
    flexDirection: 'row', backgroundColor: '#f3f4f6',
    borderRadius: 10, padding: 3, gap: 2,
  },
  toggleBtn: { width: 34, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  toggleBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },

  // Notification banner
  notifBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 16, marginTop: 10, marginBottom: 2,
    backgroundColor: '#f3f4f6', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  notifBannerEmoji: { fontSize: 14 },
  notifBannerText: { flex: 1, fontSize: 12, color: '#374151', fontWeight: '500' },
  notifBannerEdit: { fontSize: 12, color: '#6b7280', fontWeight: '600' },

  // List / Grid
  listContent: { padding: 16, gap: 14, paddingBottom: 40 },
  listCard: {
    backgroundColor: '#ffffff', borderRadius: 16,
    borderWidth: 1, borderColor: '#f3f4f6',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1,
    overflow: 'hidden',
  },
  listCardAuthor: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  authorAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
  },
  authorName: { fontSize: 13, fontWeight: '700', color: '#1f2937' },
  entryDate: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  listCardBody: { padding: 14, paddingTop: 10, gap: 6 },
  listCardTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  listCardPreview: { fontSize: 12, color: '#6b7280', lineHeight: 18 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  gridContent: { padding: 12, paddingBottom: 40 },
  gridLayout: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridCard: {
    width: '47.5%',
    backgroundColor: '#ffffff', borderRadius: 14,
    borderWidth: 1, borderColor: '#f3f4f6',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1,
    overflow: 'hidden',
  },
  gridBand: { height: 6, width: '100%' },
  gridCardBody: { padding: 10, gap: 5 },
  gridAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gridAuthorName: { fontSize: 12, fontWeight: '600', color: '#374151' },
  gridTitle: { fontSize: 12, fontWeight: '700', color: '#111827', lineHeight: 16 },
  gridPreview: { fontSize: 11, color: '#9ca3af', lineHeight: 15 },
  gridTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  gridTag: { fontSize: 10, color: '#9ca3af', backgroundColor: '#f3f4f6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 99 },
  gridDate: { fontSize: 10, color: '#d1d5db', marginTop: 2 },

  // Modal bottom sheet
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#e5e7eb', alignSelf: 'center', marginBottom: 20,
  },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 4 },
  sheetSubtitle: { fontSize: 13, color: '#9ca3af', marginBottom: 20 },

  // Frequency options
  freqList: { gap: 8, marginBottom: 20 },
  freqRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 14, borderWidth: 1.5, borderColor: '#f3f4f6',
    backgroundColor: '#f9fafb',
  },
  freqRowActive: { borderColor: '#111827', backgroundColor: '#ffffff' },
  freqRowLeft: { gap: 2 },
  freqLabel: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  freqLabelActive: { color: '#111827' },
  freqDesc: { fontSize: 12, color: '#9ca3af' },
  intervalLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  intervalInput: {
    minWidth: 44, paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1.5, borderColor: '#e5e7eb',
    fontSize: 14, fontWeight: '700', color: '#6b7280',
    textAlign: 'center', backgroundColor: '#f9fafb',
  },
  intervalInputActive: { borderColor: '#111827', color: '#111827', backgroundColor: '#ffffff' },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#d1d5db',
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: '#111827' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#111827' },

  // Day picker
  daySection: { marginBottom: 20 },
  daySectionTitle: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 10 },
  dayRow: { flexDirection: 'row', gap: 8 },
  dayChip: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#f3f4f6', alignItems: 'center',
  },
  dayChipActive: { backgroundColor: '#111827' },
  dayChipText: { fontSize: 13, fontWeight: '600', color: '#9ca3af' },
  dayChipTextActive: { color: '#ffffff' },

  // AI comment section in GridCard
  gridAiSection: {
    marginHorizontal: 8, marginBottom: 10,
    backgroundColor: '#f8f9ff', borderRadius: 10,
    borderWidth: 1, borderColor: '#e8eaf6',
    padding: 8, gap: 5,
  },
  gridAiHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gridAiLabel: { flex: 1, fontSize: 10, fontWeight: '700', color: '#374151' },
  gridAiText: { fontSize: 10, color: '#4b5563', lineHeight: 15 },
  gridAiLocked: { fontSize: 10, color: '#9ca3af', textAlign: 'center', paddingVertical: 2 },

  // AI comment section in ListCard
  aiSection: {
    marginHorizontal: 14, marginBottom: 14,
    backgroundColor: '#f8f9ff', borderRadius: 12,
    borderWidth: 1, borderColor: '#e8eaf6',
    padding: 12, gap: 8,
  },
  aiSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aiDotWrap: {
    width: 16, height: 16, borderRadius: 8, backgroundColor: '#111827',
    alignItems: 'center', justifyContent: 'center',
  },
  aiDotInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ffffff' },
  aiSectionLabel: { fontSize: 11, fontWeight: '700', color: '#374151' },
  aiPersona: { flex: 1, fontSize: 11, color: '#9ca3af' },
  shareToggle: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99,
    borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#ffffff',
  },
  shareToggleActive: { borderColor: '#111827', backgroundColor: '#111827' },
  shareToggleText: { fontSize: 10, fontWeight: '600', color: '#6b7280' },
  shareToggleTextActive: { color: '#ffffff' },
  aiCommentText: { fontSize: 12, color: '#4b5563', lineHeight: 18 },
  aiLocked: {
    paddingVertical: 6, alignItems: 'center',
  },
  aiLockedText: { fontSize: 11, color: '#9ca3af' },

  // Save button
  saveBtn: {
    backgroundColor: '#111827', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
});
