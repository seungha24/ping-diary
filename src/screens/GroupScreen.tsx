import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  SafeAreaView, Pressable, TextInput, ActivityIndicator, Modal, Image, Keyboard,
  RefreshControl,
} from 'react-native';
import KeyboardDismissButton from '../components/KeyboardDismissButton';
import TouchableOpacity from '../components/Touchable';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Line, Rect, Circle, Path } from 'react-native-svg';
import { RootStackParamList } from '../navigation/RootNavigator';
import { PhotoBlock, PhotoThumb, AspectPhoto } from '../components/PhotoThumb';
import PhotoLightbox from '../components/PhotoLightbox';
import Tag from '../components/Tag';
import IconChev from '../components/icons/IconChev';
import IconPlus from '../components/icons/IconPlus';
import { DiaryEntry, entryDateLabel, stripPhotoMarkers } from '../data/types';
import { sortByNewest } from '../data/entrySort';
import { warningHaptic } from '../haptics';
import { joinLinkFor } from '../joinLink';
import { useTheme, hexToRgba } from '../context/ThemeContext';
import { useGroups } from '../context/GroupsContext';
import { useEntries } from '../context/EntriesContext';
import { fetchGroupEntries, fetchGroupMembers, GroupMember as GroupMemberInfo, leaveGroup, deleteGroup, renameGroup, reportContent, saveBlockedUsers, saveMutedGroups, getCachedMe, uploadPhoto, updateGroupPhoto } from '../api';
import { loadGroupNotifSetting, saveGroupNotifSetting, applyGroupReminderSchedule } from '../data/groupNotif';
import { loadCache, saveCache, CACHE_KEYS } from '../data/listCache';
import TimeChipPicker, { timeLabel } from '../components/TimeChipPicker';
import { notify } from '../notify';
import { copyToClipboard, shareText } from '../clipboard';
import { Platform } from 'react-native';
import { IconUsers, IconUser, IconComment, IconBell as IconBellLine, IconSprout, IconSparkle, IconPencil, IconTrash, IconCamera, PersonaIcon } from '../components/icons/Line';
import * as ImagePicker from 'expo-image-picker';
import { useThemedStyles } from '../theme/themed';
import SheetWrap from '../components/SheetWrap';
import FadeIn from '../components/FadeIn';

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

/** 서버 그룹 피드 행 → DiaryEntry 매핑 (알림 딥링크에서도 사용) */
export function mapGroupEntry(row: any): DiaryEntry {
  return {
    id: row.id,
    title: row.title || '',
    body: row.content || '',
    dates: row.dates || [],
    tags: row.tags || [],
    photo: row.photo_url || null,
    photos: Array.isArray(row.photos) ? row.photos : [],
    persona: row.persona || '',
    author: row.author || '멤버',
    authorId: row.user_id,
    avatar: '🙂',
    avatarUrl: row.author_avatar || null,
    createdAt: row.created_at,
    aiComment: row.ai_comment || undefined,
    commentCount: row.comment_count ?? 0,
    // 그룹 피드의 글은 정의상 전부 '친구 공개' — 상세 화면의 댓글 섹션 표시 조건에 필요
    visibility: 'friends',
    sharedGroups: Array.isArray(row.shared_groups) ? row.shared_groups : null,
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
  { value: 'biweekly', label: '격주',      desc: '선택한 요일에 2주마다 알림' },
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
  const styles = useThemedStyles(lightStyles);
  const { accent } = useTheme();
  return (
    <View style={styles.listCard}>
      <View style={styles.listCardAuthor}>
        <View style={styles.authorAvatar}>
          {entry.avatarUrl
            ? <Image source={{ uri: entry.avatarUrl }} style={styles.authorAvatarImg} />
            : <IconUser size={16} color="#9ca3af" />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.authorName}>{entry.author}</Text>
          <Text style={styles.entryDate}>{entryDateLabel(entry)}</Text>
        </View>
        <TouchableOpacity onPress={onMore} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.moreBtn}>
          <Text style={styles.moreDots}>⋯</Text>
        </TouchableOpacity>
      </View>
      <Pressable style={styles.listCardBody} onPress={onOpen}>
        <Text style={styles.listCardTitle}>{entry.title}</Text>
        <View style={styles.listCardRow}>
          {entry.photo && (
            <Pressable onPress={() => onPhotoPress(entry.photo!)}>
              <PhotoThumb photo={entry.photo} size={48} radius={10} />
            </Pressable>
          )}
          <Text style={[styles.listCardPreview, { flex: 1 }]} numberOfLines={3}>{stripPhotoMarkers(entry.body)}</Text>
        </View>
        <View style={styles.tagRow}>
          {entry.tags.map((t) => <Tag key={t} label={t} />)}
          {!!entry.commentCount && (
            <View style={styles.commentCountBadge}>
              <IconComment size={13} color="#9ca3af" />
              <Text style={styles.commentCountText}>{entry.commentCount}</Text>
            </View>
          )}
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
  const styles = useThemedStyles(lightStyles);
  const { accent } = useTheme();
  return (
    <View style={styles.gridCardShadow}>
    <View style={styles.gridCard}>
      {entry.photo && (
        <Pressable style={{ width: '100%' }} onPress={() => onPhotoPress(entry.photo!)}>
          <AspectPhoto photo={entry.photo} minRatio={0.85} />
        </Pressable>
      )}
      <View style={styles.gridCardBody}>
        <View style={styles.gridAuthorRow}>
          <View style={styles.gridAvatar}>
            {entry.avatarUrl
              ? <Image source={{ uri: entry.avatarUrl }} style={styles.gridAvatarImg} />
              : <IconUser size={12} color="#9ca3af" />}
          </View>
          <Text style={[styles.gridAuthorName, { flex: 1 }]}>{entry.author}</Text>
          <TouchableOpacity onPress={onMore} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.moreDots}>⋯</Text>
          </TouchableOpacity>
        </View>
        <Pressable onPress={onOpen}>
          <Text style={styles.gridTitle} numberOfLines={2}>{entry.title}</Text>
          <Text style={styles.gridPreview} numberOfLines={2}>{stripPhotoMarkers(entry.body)}</Text>
          <View style={styles.gridTagRow}>
            {entry.tags.slice(0, 2).map((t) => (
              <Text key={t} style={styles.gridTag}>#{t}</Text>
            ))}
          </View>
          <View style={styles.gridFooterRow}>
            <Text style={styles.gridDate}>{entryDateLabel(entry)}</Text>
            {!!entry.commentCount && (
              <View style={styles.commentCountBadge}>
                <IconComment size={12} color="#9ca3af" />
                <Text style={styles.commentCountText}>{entry.commentCount}</Text>
              </View>
            )}
          </View>
        </Pressable>
      </View>
    </View>
    </View>
  );
}

export default function GroupScreen() {
  const styles = useThemedStyles(lightStyles);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { group } = useRoute<Route>().params;
  const { accent } = useTheme();
  const { groups: allGroups, refresh: refreshGroups } = useGroups();
  // 방장 여부 — 목록의 최신 created_by 기준 (레거시 null이면 기존처럼 모두 삭제 허용)
  const liveGroup = allGroups.find((g) => g.id === group.id) ?? group;
  const isOwner = !liveGroup.created_by || liveGroup.created_by === getCachedMe()?.id;
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // 초대 코드/링크 공유
  const [inviteOpen, setInviteOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // 멤버 목록 시트 (헤더의 그룹명/멤버 수를 누르면)
  const [membersOpen, setMembersOpen] = useState(false);
  const [members, setMembers] = useState<GroupMemberInfo[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  async function openMembers() {
    setMembersOpen(true);
    setMembersLoading(true);
    try {
      setMembers(await fetchGroupMembers(group.id));
    } catch {
      notify('멤버 목록을 불러오지 못했어요.');
      setMembersOpen(false);
    } finally {
      setMembersLoading(false);
    }
  }

  async function copyText(text: string) {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      return true;
    }
    // 클립보드가 안 되는 환경(구형 빌드)에서는 공유 시트로 폴백 — 시트 안의 '복사'를 쓸 수 있다
    const shared = await shareText(text);
    if (!shared) notify('복사에 실패했어요.');
    return shared;
  }

  async function shareInviteLink() {
    const msg = [
      'p!ng — 날 잡지 말고, 매일 일기로 보자 📔',
      '',
      `'${groupName}' 들어와!`,
      joinLinkFor(group.invite_code ?? ''),
      `초대 코드: ${group.invite_code}`,
    ].join('\n');
    if (await shareText(msg, 'p!ng 그룹 초대')) return;
    const ok = await copyToClipboard(msg);
    notify(ok ? '초대 메시지를 복사했어요. 붙여넣어 공유하세요!' : '공유에 실패했어요.');
  }

  // 그룹 관리 메뉴(이름 수정/나가기/삭제) — 폰 프레임 안 인앱 다이얼로그
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState<null | 'leave' | 'delete'>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [groupName, setGroupName] = useState(group.name);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(group.name);

  // 그룹 대표 사진 변경 (멤버 전원에게 보임)
  async function changeGroupPhoto() {
    setMenuOpen(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 2],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    try {
      const url = await uploadPhoto(result.assets[0].uri);
      await updateGroupPhoto(group.id, url);
      await refreshGroups();
      notify('그룹 대표 사진을 바꿨어요. 멤버 모두에게 보여요.');
    } catch (e: any) {
      notify(e?.message ?? '사진 변경에 실패했어요.');
    }
  }

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
    warningHaptic();
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
    warningHaptic();
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

  // 내가 이 그룹에 공유한 일기를 로컬(낙관적 저장 포함)에서 합쳐 표시 —
  // 방금 쓴 글이 서버 저장 완료 전이어도 피드에 즉시 보이게
  const { entries: myEntries, deleteEntry } = useEntries();
  const displayEntries = React.useMemo(() => {
    const me = getCachedMe();
    const serverIds = new Set(entries.map((e) => e.id));
    const mine = myEntries
      .filter((e) => e.visibility === 'friends' && Array.isArray(e.sharedGroups) && e.sharedGroups.includes(group.id) && !serverIds.has(e.id))
      .map((e) => ({ ...e, author: me?.display_name || '나', authorId: me?.id ?? e.authorId, avatarUrl: me?.avatar_url ?? null }));
    return mine.length ? sortByNewest([...entries, ...mine]) : entries;
  }, [entries, myEntries, group.id]);
  const [loading, setLoading] = useState(true);

  // 그룹 공유 피드(멤버들의 '친구 공개' p!ng)를 서버에서 로드
  async function loadFeed() {
    try {
      const rows = await fetchGroupEntries(group.id);
      setEntries(sortByNewest(rows.map(mapGroupEntry)));
    } catch {
      // 새로고침 실패 시 기존 목록 유지 (첫 로드 실패면 빈 목록 그대로)
    }
  }
  useEffect(() => {
    let cancelled = false;
    // 마지막에 본 피드를 먼저 (0초 표시) → 서버 최신으로 교체
    loadCache<Record<string, any[]>>(CACHE_KEYS.feeds).then((all) => {
      const cached = all?.[String(group.id)];
      if (!cancelled && cached?.length) { setEntries(sortByNewest(cached.map(mapGroupEntry))); setLoading(false); }
    });
    fetchGroupEntries(group.id)
      .then(async (rows) => {
        if (!cancelled) { setEntries(sortByNewest(rows.map(mapGroupEntry))); }
        const all = (await loadCache<Record<string, any[]>>(CACHE_KEYS.feeds)) ?? {};
        saveCache(CACHE_KEYS.feeds, { ...all, [String(group.id)]: rows });
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [group.id]);

  // 화면에 돌아올 때마다 피드 재조회 — 상세에서 공유 그룹을 빼거나 새 글을 쓰고 돌아오면 즉시 반영
  useFocusEffect(
    useCallback(() => {
      loadFeed();
    }, [group.id])
  );

  // 당겨서 새로고침 — 그룹 피드 + 그룹 정보(멤버 수 등) 재조회
  const [refreshing, setRefreshing] = useState(false);
  async function handleRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([loadFeed(), refreshGroups()]);
    } finally {
      setRefreshing(false);
    }
  }

  function toggleShare(id: number) {
    setSharedAiComments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // 신고/차단 (앱스토어 UGC 심사 대응)
  const [actionEntry, setActionEntry] = useState<DiaryEntry | null>(null);
  const [confirmDeleteEntry, setConfirmDeleteEntry] = useState<DiaryEntry | null>(null); // 내 글 삭제 확인

  function deleteMyEntry(entry: DiaryEntry) {
    setConfirmDeleteEntry(null);
    deleteEntry(entry.id); // 낙관적 삭제 + 서버 반영 (실패 시 컨텍스트가 복구·안내)
    setEntries((prev) => prev.filter((e) => e.id !== entry.id)); // 그룹 피드 목록에서도 즉시 제거
  }
  const [confirmReport, setConfirmReport] = useState<DiaryEntry | null>(null); // 신고 전 확인

  async function reportEntry(entry: DiaryEntry) {
    setConfirmReport(null);
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

  // 알림 설정 상태 (기기에 저장, '끄기'는 서버 푸시 뮤트 + 나머진 로컬 리마인더 예약)
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>('weekly');
  const [selectedDays, setSelectedDays] = useState<number[]>([1]); // 월요일 기본
  const [intervalDays, setIntervalDays] = useState(3); // N일마다
  const [notifHour, setNotifHour] = useState(20); // 알림 시각 (저녁 8시 기본)
  const [notifMinute, setNotifMinute] = useState(0);

  // 저장된 설정 복원
  useEffect(() => {
    let cancelled = false;
    loadGroupNotifSetting(group.id).then((s) => {
      if (!s || cancelled) return;
      setFrequency(s.frequency);
      setSelectedDays(s.days);
      setIntervalDays(s.intervalDays);
      setNotifHour(s.hour ?? 20);
      setNotifMinute(s.minute ?? 0);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [group.id]);

  // 저장 전 임시 상태
  const [draftFreq, setDraftFreq] = useState<Frequency>(frequency);
  const [draftDays, setDraftDays] = useState<number[]>(selectedDays);
  const [draftInterval, setDraftInterval] = useState(String(intervalDays));
  const [draftHour, setDraftHour] = useState(notifHour);
  const [draftMinute, setDraftMinute] = useState(notifMinute);

  function openModal() {
    setDraftFreq(frequency);
    setDraftDays(selectedDays);
    setDraftInterval(String(intervalDays));
    setDraftHour(notifHour);
    setDraftMinute(notifMinute);
    setNotifModalOpen(true);
  }

  function saveAndClose() {
    Keyboard.dismiss(); // 숫자 키패드가 열린 채 저장해도 자판이 정리되게
    const parsed = parseInt(draftInterval, 10);
    const nextInterval = !isNaN(parsed) && parsed > 0 ? parsed : 1;
    setFrequency(draftFreq);
    setSelectedDays(draftDays);
    setIntervalDays(nextInterval);
    setNotifHour(draftHour);
    setNotifMinute(draftMinute);
    setNotifModalOpen(false);

    // 실제 반영: 기기 저장 + 리마인더 재예약 + '끄기'는 서버 푸시 뮤트
    const setting = {
      frequency: draftFreq, days: draftDays, intervalDays: nextInterval,
      hour: draftHour, minute: draftMinute,
    };
    saveGroupNotifSetting(group.id, setting).catch(() => {});
    applyGroupReminderSchedule(group.id, groupName, setting).catch(() => {});
    const muted = new Set(getCachedMe()?.muted_groups ?? []);
    if (draftFreq === 'off') muted.add(group.id); else muted.delete(group.id);
    saveMutedGroups([...muted]).catch(() => {});
    notify(draftFreq === 'off'
      ? '이 그룹의 알림을 껐어요. 새 글 알림도 오지 않아요.'
      : `알림 설정을 저장했어요. ${timeLabel(draftHour, draftMinute)}에 알려드릴게요.`);
  }

  function toggleDay(d: number) {
    setDraftDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)
    );
  }

  function freqSummary() {
    if (frequency === 'off') return '알림 꺼짐';
    if (frequency === 'interval') return `매 ${intervalDays} 일마다`;
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

        <TouchableOpacity style={styles.headerInfo} onPress={openMembers} activeOpacity={0.7}>
          <IconUsers size={20} color="#6b7280" />
          <View style={styles.headerText}>
            <Text style={styles.groupName}>{groupName}</Text>
            <Text style={styles.groupMembers} numberOfLines={1}>
              멤버 {group.member_count ?? 1} 명
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerRight}>
          {/* 초대 코드/링크 공유 */}
          <TouchableOpacity style={styles.bellBtn} onPress={() => { setCopied(false); setInviteOpen(true); }}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <Path d="M16 6l-4-4-4 4" />
              <Line x1="12" y1="2" x2="12" y2="15" />
            </Svg>
          </TouchableOpacity>

          {/* 그룹 관리 메뉴(나가기/삭제) */}
          <TouchableOpacity style={styles.leaveBtn} onPress={() => setMenuOpen(true)}>
            <Text style={styles.leaveBtnText}>관리</Text>
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

      {/* 알림 주기 배너 — 탭하면 알림 설정 */}
      <TouchableOpacity style={styles.notifBanner} onPress={openModal}>
        <IconBellLine size={15} color={frequency === 'off' ? '#9ca3af' : accent} />
        <Text style={styles.notifBannerText}>
          {frequency === 'off' ? '알림이 꺼져 있어요' : `${freqSummary()} p!ng 알림 중`}
        </Text>
        <Text style={styles.notifBannerEdit}>변경</Text>
      </TouchableOpacity>

      {/* Feed */}
      <FadeIn key={loading ? 'loading' : viewMode} style={{ flex: 1 }}>
      {loading ? (
        <View style={styles.feedEmpty}>
          <ActivityIndicator color={accent} />
        </View>
      ) : displayEntries.length === 0 ? (
        <View style={styles.feedEmpty}>
          <IconSprout size={34} color="#d1d5db" />
          <Text style={styles.feedEmptyText}>아직 공유된 p!ng가 없어요.</Text>
          <Text style={styles.feedEmptyHint}>p!ng를 '친구 공개'로 저장하면 그룹에 나타나요.</Text>
        </View>
      ) : viewMode === 'list' ? (
        <ScrollView contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#9ca3af" colors={[accent]} />}>
          {displayEntries.map((entry) => (
            <ListCard
              key={entry.id}
              entry={entry}
              onPhotoPress={setLightboxPhoto}
              isShared={sharedAiComments.has(entry.id)}
              onToggleShare={() => toggleShare(entry.id)}
              onMore={() => setActionEntry(entry)}
              onOpen={() => navigation.navigate('DiaryDetail', { entry, groupId: group.id })}
            />
          ))}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.gridContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#9ca3af" colors={[accent]} />}>
          {/* 2열 독립 컬럼(마소너리) — 짧은 일기는 카드도 짧게, 줄 맞춤 없이 자연스럽게 쌓임 */}
          <View style={styles.gridLayout}>
            {[0, 1].map((col) => (
              <View key={col} style={styles.gridColumn}>
                {displayEntries.filter((_, i) => i % 2 === col).map((entry, i) => (
                  <GridCard
                    key={entry.id}
                    entry={entry}
                    index={i * 2 + col}
                    onPhotoPress={setLightboxPhoto}
                    isShared={sharedAiComments.has(entry.id)}
                    onToggleShare={() => toggleShare(entry.id)}
                    onMore={() => setActionEntry(entry)}
                    onOpen={() => navigation.navigate('DiaryDetail', { entry, groupId: group.id })}
                  />
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
      </FadeIn>

      {lightboxPhoto && (
        <PhotoLightbox photo={lightboxPhoto} onClose={() => setLightboxPhoto(null)} />
      )}

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: accent }]} onPress={() => navigation.navigate('DiaryWrite')}>
        <IconPlus color="#ffffff" size={22} />
      </TouchableOpacity>

      {/* 신고/차단 액션 시트 */}
      {actionEntry && (
        <SheetWrap style={styles.overlayWrap}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActionEntry(null)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            {actionEntry.authorId === getCachedMe()?.id ? (
              <>
                <Text style={styles.actionSheetTitle}>내 게시물</Text>
                <TouchableOpacity style={styles.actionRow} onPress={() => { setActionEntry(null); setConfirmDeleteEntry(actionEntry); }}>
                  <Text style={[styles.actionText, styles.actionDanger]}>🗑  이 p!ng 삭제하기</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.actionSheetTitle}>{actionEntry.author} 님의 게시물</Text>
                <TouchableOpacity style={styles.actionRow} onPress={() => { setActionEntry(null); setConfirmReport(actionEntry); }}>
                  <Text style={styles.actionText}>🚩  이 게시물 신고하기</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionRow} onPress={() => blockAuthor(actionEntry)}>
                  <Text style={[styles.actionText, styles.actionDanger]}>🚫  이 사용자 차단하기</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={styles.actionRow} onPress={() => setActionEntry(null)}>
              <Text style={[styles.actionText, { color: '#9ca3af' }]}>취소</Text>
            </TouchableOpacity>
          </View>
        </SheetWrap>
      )}

      {/* 내 글 삭제 확인 */}
      {confirmDeleteEntry && (
        <SheetWrap style={styles.overlayWrap}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setConfirmDeleteEntry(null)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.actionSheetTitle}>이 p!ng을 삭제할까요?</Text>
            <Text style={styles.confirmMsg}>'{confirmDeleteEntry.title}'이(가) 영구적으로 삭제되고 그룹에서도 사라져요.</Text>
            <TouchableOpacity style={styles.confirmDangerBtn} onPress={() => deleteMyEntry(confirmDeleteEntry)}>
              <Text style={styles.confirmDangerText}>삭제하기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionRow} onPress={() => setConfirmDeleteEntry(null)}>
              <Text style={[styles.actionText, { color: '#9ca3af' }]}>취소</Text>
            </TouchableOpacity>
          </View>
        </SheetWrap>
      )}

      {/* 신고 확인 */}
      {confirmReport && (
        <SheetWrap style={styles.overlayWrap}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setConfirmReport(null)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.actionSheetTitle}>이 게시물을 신고할까요?</Text>
            <Text style={styles.confirmMsg}>
              {confirmReport.author} 님의 게시물이 운영팀에 접수되고, 검토 후 조치돼요.
            </Text>
            <TouchableOpacity style={styles.confirmDangerBtn} onPress={() => reportEntry(confirmReport)}>
              <Text style={styles.confirmDangerText}>신고하기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionRow} onPress={() => setConfirmReport(null)}>
              <Text style={[styles.actionText, { color: '#9ca3af' }]}>취소</Text>
            </TouchableOpacity>
          </View>
        </SheetWrap>
      )}

      {/* 초대 코드/링크 공유 */}
      {/* 멤버 목록 시트 (헤더의 그룹명/멤버 수 탭) */}
      {membersOpen && (
        <SheetWrap style={styles.overlayWrap}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMembersOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.actionSheetTitle}>멤버 {members.length > 0 ? members.length : (group.member_count ?? 1)} 명</Text>
            {membersLoading ? (
              <ActivityIndicator color={accent} style={{ paddingVertical: 24 }} />
            ) : (
              <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
                {members.map((m) => (
                  <View key={m.id} style={styles.memberRow}>
                    <View style={styles.authorAvatar}>
                      {m.avatar_url
                        ? <Image source={{ uri: m.avatar_url }} style={styles.authorAvatarImg} />
                        : <IconUser size={16} color="#9ca3af" />}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.memberName} numberOfLines={1}>
                        {m.name}{m.is_me ? ' (나)' : ''}
                      </Text>
                      {!!m.username && <Text style={styles.memberSub} numberOfLines={1}>@{m.username}</Text>}
                    </View>
                    {m.is_owner && (
                      <View style={[styles.memberBadge, { backgroundColor: hexToRgba(accent, 0.12) }]}>
                        <Text style={[styles.memberBadgeText, { color: accent }]}>방장</Text>
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </SheetWrap>
      )}

      {inviteOpen && (
        <SheetWrap style={styles.overlayWrap}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setInviteOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.actionSheetTitle}>친구 초대하기</Text>
            <Text style={styles.confirmMsg}>아래 코드를 알려주거나 초대 메시지를 공유하면 친구가 '{groupName}'에 참여할 수 있어요.</Text>
            <View style={styles.inviteCodeBox}>
              <Text style={[styles.inviteCodeText, { color: accent }]}>{group.invite_code}</Text>
              <TouchableOpacity
                style={[styles.inviteCopyBtn, { borderColor: hexToRgba(accent, 0.4) }]}
                onPress={() => copyText(group.invite_code ?? '')}
              >
                <Text style={[styles.inviteCopyText, { color: accent }]}>{copied ? '복사됨 ✓' : '코드 복사'}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: accent }]} onPress={shareInviteLink}>
              <Text style={styles.saveBtnText}>초대 메시지 공유</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.inviteCloseBtn} onPress={() => setInviteOpen(false)}>
              <Text style={styles.inviteCloseText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </SheetWrap>
      )}

      {/* 그룹 관리 메뉴 */}
      {menuOpen && (
        <SheetWrap style={styles.overlayWrap}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMenuOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.actionSheetTitle}>{groupName}</Text>
            <TouchableOpacity style={styles.menuRow} onPress={changeGroupPhoto}>
              <IconCamera size={17} color="#374151" />
              <Text style={styles.actionText}>대표 사진 변경</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuRow} onPress={() => { setMenuOpen(false); setRenameValue(groupName); setRenameOpen(true); }}>
              <IconPencil size={17} color="#374151" />
              <Text style={styles.actionText}>그룹 이름 수정</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuRow} onPress={() => { setMenuOpen(false); setConfirmMode('leave'); }}>
              <IconExit size={17} color="#374151" />
              <Text style={styles.actionText}>그룹 나가기</Text>
            </TouchableOpacity>
            {isOwner && (
            <TouchableOpacity style={styles.menuRow} onPress={() => { setMenuOpen(false); setConfirmMode('delete'); }}>
              <IconTrash size={17} color="#ef4444" />
              <Text style={[styles.actionText, styles.actionDanger]}>그룹 삭제</Text>
            </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.menuRow} onPress={() => setMenuOpen(false)}>
              <Text style={[styles.actionText, { color: '#9ca3af', marginLeft: 2 }]}>취소</Text>
            </TouchableOpacity>
          </View>
        </SheetWrap>
      )}

      {/* 나가기/삭제 확인 */}
      {confirmMode && (
        <SheetWrap style={styles.overlayWrap}>
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
        </SheetWrap>
      )}

      {/* 그룹 이름 수정 */}
      {renameOpen && (
        <SheetWrap style={styles.overlayWrap}>
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
        </SheetWrap>
      )}

      {/* 알림 설정 모달 */}
      {notifModalOpen && (
      <SheetWrap style={styles.overlayWrap}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setNotifModalOpen(false)} />
        <View style={styles.sheet}>
          {/* 핸들 */}
          <View style={styles.sheetHandle} />

          <Text style={styles.sheetTitle}>알림 주기 설정</Text>
          <Text style={styles.sheetSubtitle}>{group.name}</Text>

          {/* 옵션이 길어 작은 화면에서도 저장 버튼이 잘리지 않게 스크롤 */}
          <ScrollView style={{ maxHeight: 430 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* 주기 옵션 */}
          <View style={styles.freqList}>
            {FREQ_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.freqRow, draftFreq === opt.value && { borderColor: accent, backgroundColor: hexToRgba(accent, 0.08) }]}
                onPress={() => {
                  setDraftFreq(opt.value);
                  // 다른 옵션을 고르면 'N일마다' 입력 키패드를 내린다
                  if (opt.value !== 'interval') Keyboard.dismiss();
                }}
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
          {(draftFreq === 'weekly' || draftFreq === 'biweekly') && (
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

          {/* 알림 받을 시간 */}
          {draftFreq !== 'off' && (
            <View style={styles.daySection}>
              <Text style={styles.daySectionTitle}>알림 받을 시간</Text>
              <TimeChipPicker
                hour={draftHour}
                minute={draftMinute}
                onChange={(h, m) => { setDraftHour(h); setDraftMinute(m); }}
              />
            </View>
          )}
          </ScrollView>

          {/* 저장 버튼 */}
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: accent }]} onPress={saveAndClose}>
            <Text style={styles.saveBtnText}>저장</Text>
          </TouchableOpacity>
        </View>
        {/* 숫자 키패드에는 완료 키가 없어 자판을 내릴 방법이 필요 (작성 화면과 동일한 플로팅 버튼) */}
        <KeyboardDismissButton />
      </SheetWrap>
      )}
    </SafeAreaView>
  );
}

const lightStyles = StyleSheet.create({
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
  groupName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  groupMembers: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  groupHeaderPhoto: { width: 28, height: 28, borderRadius: 8 },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
  bellBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
  },
  leaveBtn: {
    paddingHorizontal: 12, height: 36, borderRadius: 10,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
  },
  leaveBtnText: { fontSize: 12.5, color: '#6b7280', fontWeight: '600' },
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
  },
  listCardAuthor: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  authorAvatar: {
    width: 34, height: 34, borderRadius: 17, overflow: 'hidden',
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
  },
  authorAvatarImg: { width: 34, height: 34, borderRadius: 17 },
  // 멤버 목록 시트
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  memberName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  memberSub: { fontSize: 12, color: '#9ca3af', marginTop: 1 },
  memberBadge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  memberBadgeText: { fontSize: 11.5, fontWeight: '700' },
  gridAvatar: {
    width: 22, height: 22, borderRadius: 11, overflow: 'hidden',
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
  },
  gridAvatarImg: { width: 22, height: 22, borderRadius: 11 },
  authorName: { fontSize: 13, fontWeight: '600', color: '#1f2937' },
  entryDate: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  listCardBody: { padding: 14, paddingTop: 10, gap: 6 },
  listCardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  listCardTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  listCardPreview: { fontSize: 12, color: '#6b7280', lineHeight: 18 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  commentCountBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 'auto' },
  commentCountText: { fontSize: 11.5, color: '#9ca3af', fontWeight: '600' },
  gridFooterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gridContent: { padding: 12, paddingBottom: 40 },
  gridLayout: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  gridColumn: { flex: 1, gap: 10 },
  gridCardShadow: {
    width: '100%', borderRadius: 14, backgroundColor: '#ffffff',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  gridCard: {
    width: '100%',
    backgroundColor: '#ffffff', borderRadius: 14,
    borderWidth: 1, borderColor: '#f3f4f6',
    overflow: 'hidden',
  },
  gridBand: { height: 6, width: '100%' },
  gridCardBody: { padding: 12, gap: 6 },
  gridAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 1 },
  gridAuthorName: { fontSize: 12, fontWeight: '600', color: '#374151' },
  gridTitle: { fontSize: 13, fontWeight: '700', color: '#111827', lineHeight: 18 },
  gridPreview: { fontSize: 11.5, color: '#9ca3af', lineHeight: 16 },
  gridTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 1 },
  gridTag: { fontSize: 10, color: '#9ca3af', backgroundColor: '#f3f4f6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 99 },
  gridDate: { fontSize: 10.5, color: '#d1d5db', marginTop: 3 },

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
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 4 },
  moreBtn: { paddingHorizontal: 6, paddingVertical: 2 },
  moreDots: { fontSize: 20, color: '#9ca3af', fontWeight: '600', lineHeight: 20 },
  actionSheetTitle: { fontSize: 14, fontWeight: '600', color: '#6b7280', marginBottom: 8 },
  actionRow: { paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#f3f4f6',
  },
  actionText: { fontSize: 15, color: '#374151', fontWeight: '600' },
  actionDanger: { color: '#ef4444' },
  confirmMsg: { fontSize: 13, color: '#6b7280', lineHeight: 20, marginBottom: 14 },
  inviteCodeBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    backgroundColor: '#f9fafb', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb',
    paddingVertical: 14, paddingHorizontal: 16, marginBottom: 12,
  },
  inviteCodeText: { fontSize: 22, fontWeight: '700', letterSpacing: 3 },
  inviteCopyBtn: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  inviteCopyText: { fontSize: 12, fontWeight: '600' },
  inviteCloseBtn: {
    backgroundColor: '#f3f4f6', borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', marginTop: 8,
  },
  inviteCloseText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  renameInput: {
    fontSize: 15, color: '#111827',
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12, marginTop: 4,
  },
  confirmDangerBtn: {
    backgroundColor: '#ef4444', borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', marginBottom: 4,
  },
  confirmDangerText: { fontSize: 14, fontWeight: '600', color: '#fff' },
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
    fontSize: 14, fontWeight: '600', color: '#6b7280',
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
  gridAiLabel: { flex: 1, fontSize: 10, fontWeight: '600', color: '#374151' },
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
  aiSectionLabel: { fontSize: 11, fontWeight: '600', color: '#374151' },
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
  saveBtnText: { fontSize: 15, fontWeight: '600', color: '#ffffff' },
});
