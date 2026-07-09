import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, Pressable, TextInput, ActivityIndicator, Modal,
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
import { BAND_COLORS, DiaryEntry, entryDateLabel } from '../data/types';
import { useTheme } from '../context/ThemeContext';
import { useGroups } from '../context/GroupsContext';
import { fetchGroupEntries, leaveGroup, deleteGroup, renameGroup, reportContent, saveBlockedUsers, getCachedMe } from '../api';
import { notify } from '../notify';
import { Platform } from 'react-native';
import { IconUsers, IconBell as IconBellLine, IconSprout, IconSparkle, IconPencil, IconTrash, PersonaIcon } from '../components/icons/Line';

/** 그룹 나가기용 문/화살표 아이콘 (라인 스타일) */
function IconExit({ color = '#374151', size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <Path d="M16 17l5-5-5-5" />
      <Path d="M21 12H9" />
    </Svg>
  );
}

/** 서버 그룹 피드 행 → DiaryEntry 매핑 */
function mapGroupEntry(row: any): DiaryEntry {
  return {
    id: row.id,
    title: row.title || '',
    body: row.content || '',
    dates: row.dates || [],
    tags: row.tags || [],
    photo: row.photo_url || null,
    persona: row.persona || '',
    author: row.author || '멤버',
    authorId: row.user_id,
    avatar: '🙂',
    createdAt: row.created_at,
    aiComment: row.ai_comment || undefined,
  };
}

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
  entry, onPhotoPress, isShared, onToggleShare, onMore, onOpen,
}: {
  entry: DiaryEntry;
  onPhotoPress: (p: string) => void;
  isShared: boolean;
  onToggleShare: () => void;
  onMore: () => void;
  onOpen: () => void;
}) {
  const { accent } = useTheme();
  return (
    <View style={styles.listCard}>
      <View style={styles.listCardAuthor}>
        <View style={styles.authorAvatar}>
          <Text style={{ fontSize: 16 }}>{entry.avatar}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.authorName}>{entry.author}</Text>
          <Text style={styles.entryDate}>{entryDateLabel(entry)}</Text>
        </View>
        <TouchableOpacity onPress={onMore} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.moreBtn}>
          <Text style={styles.moreDots}>⋯</Text>
        </TouchableOpacity>
      </View>
      {entry.photo && (
        <Pressable style={{ width: '100%' }} onPress={() => onPhotoPress(entry.photo!)}>
          <PhotoBlock photo={entry.photo} height={140} />
        </Pressable>
      )}
      <Pressable style={styles.listCardBody} onPress={onOpen}>
        <Text style={styles.listCardTitle}>{entry.title}</Text>
        <Text style={styles.listCardPreview} numberOfLines={2}>{entry.body}</Text>
        <View style={styles.tagRow}>
          {entry.tags.map((t) => <Tag key={t} label={t} />)}
        </View>
      </Pressable>
    </View>
  );
}

function GridCard({
  entry, index, onPhotoPress, isShared, onToggleShare, onMore, onOpen,
}: {
  entry: DiaryEntry;
  index: number;
  onPhotoPress: (p: string) => void;
  isShared: boolean;
  onToggleShare: () => void;
  onMore: () => void;
  onOpen: () => void;
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
          <Text style={[styles.gridAuthorName, { flex: 1 }]}>{entry.author}</Text>
          <TouchableOpacity onPress={onMore} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.moreDots}>⋯</Text>
          </TouchableOpacity>
        </View>
        <Pressable onPress={onOpen}>
          <Text style={styles.gridTitle} numberOfLines={2}>{entry.title}</Text>
          <Text style={styles.gridPreview} numberOfLines={2}>{entry.body}</Text>
          <View style={styles.gridTagRow}>
            {entry.tags.slice(0, 2).map((t) => (
              <Text key={t} style={styles.gridTag}>#{t}</Text>
            ))}
          </View>
          <Text style={styles.gridDate}>{entryDateLabel(entry)}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function GroupScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { group } = useRoute<Route>().params;
  const { accent } = useTheme();
  const { refresh: refreshGroups } = useGroups();
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // 그룹 관리 메뉴(이름 수정/나가기/삭제) — 폰 프레임 안 인앱 다이얼로그
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState<null | 'leave' | 'delete'>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [groupName, setGroupName] = useState(group.name);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(group.name);

  async function doRename() {
    const next = renameValue.trim();
    if (!next || next === groupName) { setRenameOpen(false); return; }
    setActionBusy(true);
    try {
      await renameGroup(group.id, next);
      setGroupName(next);
      await refreshGroups();
      setRenameOpen(false);
    } catch (e: any) {
      notify(e?.message ?? '그룹 이름 수정에 실패했어요.');
    } finally {
      setActionBusy(false);
    }
  }

  async function doLeave() {
    setActionBusy(true);
    try {
      await leaveGroup(group.id);
      await refreshGroups();
      navigation.goBack();
    } catch (e: any) {
      notify(e?.message ?? '그룹 나가기에 실패했어요.');
    } finally {
      setActionBusy(false);
      setConfirmMode(null);
    }
  }

  async function doDelete() {
    setActionBusy(true);
    try {
      await deleteGroup(group.id);
      await refreshGroups();
      navigation.goBack();
    } catch (e: any) {
      notify(e?.message ?? '그룹 삭제에 실패했어요.');
    } finally {
      setActionBusy(false);
      setConfirmMode(null);
    }
  }
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [sharedAiComments, setSharedAiComments] = useState<Set<number>>(new Set());
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // 그룹 공유 피드(멤버들의 '친구 공개' p!ng)를 서버에서 로드
  useEffect(() => {
    let cancelled = false;
    fetchGroupEntries(group.id)
      .then((rows) => { if (!cancelled) setEntries(rows.map(mapGroupEntry)); })
      .catch(() => { if (!cancelled) setEntries([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [group.id]);

  function toggleShare(id: number) {
    setSharedAiComments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // 신고/차단 (앱스토어 UGC 심사 대응)
  const [actionEntry, setActionEntry] = useState<DiaryEntry | null>(null);

  async function reportEntry(entry: DiaryEntry) {
    setActionEntry(null);
    try {
      await reportContent('group_entry', entry.id, `author:${entry.authorId ?? ''}`);
      notify('신고가 접수되었어요. 검토 후 조치할게요.');
    } catch (e: any) {
      notify(e?.message ?? '신고 접수에 실패했어요.');
    }
  }

  async function blockAuthor(entry: DiaryEntry) {
    setActionEntry(null);
    if (!entry.authorId) { notify('이 사용자는 차단할 수 없어요.'); return; }
    const cur = getCachedMe()?.blocked_users ?? [];
    const next = cur.includes(entry.authorId) ? cur : [...cur, entry.authorId];
    setEntries((prev) => prev.filter((e) => e.authorId !== entry.authorId)); // 즉시 숨김
    try {
      await saveBlockedUsers(next);
      notify(`${entry.author} 님을 차단했어요. 이제 이 사람 글은 안 보여요.`);
    } catch (e: any) {
      notify(e?.message ?? '차단에 실패했어요.');
    }
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
          <IconUsers size={20} color="#6b7280" />
          <View style={styles.headerText}>
            <Text style={styles.groupName}>{groupName}</Text>
            <Text style={styles.groupMembers} numberOfLines={1}>
              멤버 {group.member_count ?? 1}명 · 코드 {group.invite_code}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* 그룹 관리 메뉴(나가기/삭제) */}
          <TouchableOpacity style={styles.leaveBtn} onPress={() => setMenuOpen(true)}>
            <Text style={styles.leaveBtnText}>관리</Text>
          </TouchableOpacity>

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


      {/* Feed */}
      {loading ? (
        <View style={styles.feedEmpty}>
          <ActivityIndicator color={accent} />
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.feedEmpty}>
          <IconSprout size={34} color="#d1d5db" />
          <Text style={styles.feedEmptyText}>아직 공유된 p!ng가 없어요.</Text>
          <Text style={styles.feedEmptyHint}>p!ng를 '친구 공개'로 저장하면 그룹에 나타나요.</Text>
        </View>
      ) : viewMode === 'list' ? (
        <ScrollView contentContainerStyle={styles.listContent}>
          {entries.map((entry) => (
            <ListCard
              key={entry.id}
              entry={entry}
              onPhotoPress={setLightboxPhoto}
              isShared={sharedAiComments.has(entry.id)}
              onToggleShare={() => toggleShare(entry.id)}
              onMore={() => setActionEntry(entry)}
              onOpen={() => navigation.navigate('DiaryDetail', { entry })}
            />
          ))}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.gridContent}>
          <View style={styles.gridLayout}>
            {entries.map((entry, i) => (
              <GridCard
                key={entry.id}
                entry={entry}
                index={i}
                onPhotoPress={setLightboxPhoto}
                isShared={sharedAiComments.has(entry.id)}
                onToggleShare={() => toggleShare(entry.id)}
                onMore={() => setActionEntry(entry)}
                onOpen={() => navigation.navigate('DiaryDetail', { entry })}
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

      {/* 신고/차단 액션 시트 */}
      {actionEntry && (
        <View style={styles.overlayWrap}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActionEntry(null)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.actionSheetTitle}>{actionEntry.author} 님의 게시물</Text>
            <TouchableOpacity style={styles.actionRow} onPress={() => reportEntry(actionEntry)}>
              <Text style={styles.actionText}>🚩  이 게시물 신고하기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionRow} onPress={() => blockAuthor(actionEntry)}>
              <Text style={[styles.actionText, styles.actionDanger]}>🚫  이 사용자 차단하기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionRow} onPress={() => setActionEntry(null)}>
              <Text style={[styles.actionText, { color: '#9ca3af' }]}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 그룹 관리 메뉴 */}
      {menuOpen && (
        <View style={styles.overlayWrap}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMenuOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.actionSheetTitle}>{groupName}</Text>
            <TouchableOpacity style={styles.menuRow} onPress={() => { setMenuOpen(false); setRenameValue(groupName); setRenameOpen(true); }}>
              <IconPencil size={17} color="#374151" />
              <Text style={styles.actionText}>그룹 이름 수정</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuRow} onPress={() => { setMenuOpen(false); setConfirmMode('leave'); }}>
              <IconExit size={17} color="#374151" />
              <Text style={styles.actionText}>그룹 나가기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuRow} onPress={() => { setMenuOpen(false); setConfirmMode('delete'); }}>
              <IconTrash size={17} color="#ef4444" />
              <Text style={[styles.actionText, styles.actionDanger]}>그룹 삭제</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuRow} onPress={() => setMenuOpen(false)}>
              <Text style={[styles.actionText, { color: '#9ca3af', marginLeft: 2 }]}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 나가기/삭제 확인 */}
      {confirmMode && (
        <View style={styles.overlayWrap}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => !actionBusy && setConfirmMode(null)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.actionSheetTitle}>
              {confirmMode === 'delete' ? '그룹을 삭제할까요?' : '그룹에서 나갈까요?'}
            </Text>
            <Text style={styles.confirmMsg}>
              {confirmMode === 'delete'
                ? `'${groupName}' 그룹이 모든 멤버에게서 사라져요. 되돌릴 수 없어요.`
                : `'${groupName}' 그룹에서 나가면 이 그룹의 피드를 볼 수 없어요.`}
            </Text>
            <TouchableOpacity
              style={[styles.confirmDangerBtn, actionBusy && { opacity: 0.6 }]}
              onPress={confirmMode === 'delete' ? doDelete : doLeave}
              disabled={actionBusy}
            >
              {actionBusy
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.confirmDangerText}>{confirmMode === 'delete' ? '삭제' : '나가기'}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionRow} onPress={() => !actionBusy && setConfirmMode(null)}>
              <Text style={[styles.actionText, { color: '#9ca3af' }]}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 그룹 이름 수정 */}
      {renameOpen && (
        <View style={styles.overlayWrap}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => !actionBusy && setRenameOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.actionSheetTitle}>그룹 이름 수정</Text>
            <TextInput
              style={styles.renameInput}
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder="그룹 이름"
              placeholderTextColor="#9ca3af"
              maxLength={20}
              autoFocus
              onSubmitEditing={doRename}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: accent }, actionBusy && { opacity: 0.6 }]}
              onPress={doRename}
              disabled={actionBusy}
            >
              {actionBusy
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.saveBtnText}>저장</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionRow} onPress={() => !actionBusy && setRenameOpen(false)}>
              <Text style={[styles.actionText, { color: '#9ca3af' }]}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 알림 설정 모달 */}
      {notifModalOpen && (
      <View style={styles.overlayWrap}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setNotifModalOpen(false)} />
        <View style={styles.sheet}>
          {/* 핸들 */}
          <View style={styles.sheetHandle} />

          <Text style={styles.sheetTitle}>알림 주기 설정</Text>
          <Text style={styles.sheetSubtitle}>{group.name}</Text>

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
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: accent }]} onPress={saveAndClose}>
            <Text style={styles.saveBtnText}>저장</Text>
          </TouchableOpacity>
        </View>
      </View>
      )}
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
  leaveBtn: {
    paddingHorizontal: 10, height: 30, borderRadius: 8,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
  },
  leaveBtnText: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
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

  // Feed empty/loading
  feedEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 32 },
  feedEmptyEmoji: { fontSize: 34 },
  feedEmptyText: { fontSize: 14, color: '#6b7280', fontWeight: '600' },
  feedEmptyHint: { fontSize: 12, color: '#9ca3af', textAlign: 'center' },

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
  overlayWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
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
  moreBtn: { paddingHorizontal: 6, paddingVertical: 2 },
  moreDots: { fontSize: 20, color: '#9ca3af', fontWeight: '700', lineHeight: 20 },
  actionSheetTitle: { fontSize: 14, fontWeight: '700', color: '#6b7280', marginBottom: 8 },
  actionRow: { paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#f3f4f6',
  },
  actionText: { fontSize: 15, color: '#374151', fontWeight: '600' },
  actionDanger: { color: '#ef4444' },
  confirmMsg: { fontSize: 13, color: '#6b7280', lineHeight: 20, marginBottom: 14 },
  renameInput: {
    fontSize: 15, color: '#111827',
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12, marginTop: 4,
  },
  confirmDangerBtn: {
    backgroundColor: '#ef4444', borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', marginBottom: 4,
  },
  confirmDangerText: { fontSize: 14, fontWeight: '700', color: '#fff' },
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
  aiPersonaRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  aiPersonaText: { fontSize: 11, color: '#9ca3af' },
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
