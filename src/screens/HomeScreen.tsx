import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  Modal, Pressable, Image, TextInput, PanResponder, InteractionManager, Animated,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import TouchableOpacity from '../components/Touchable';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '../navigation/RootNavigator';
import Tag from '../components/Tag';
import IconPlus from '../components/icons/IconPlus';
import IconChev from '../components/icons/IconChev';
import IconBell from '../components/icons/IconBell';
import { getUnreadCount as getNotifUnread, subscribeNotifs, refreshNotifs } from '../data/notifStore';
import { PhotoThumb } from '../components/PhotoThumb';
import PhotoLightbox from '../components/PhotoLightbox';
import { FOLDERS, DiaryEntry, DiaryFolder, entryDateLabel, mergeFolders, stripPhotoMarkers } from '../data/types';
import { useTheme, hexToRgba } from '../context/ThemeContext';
import { useEntries } from '../context/EntriesContext';
import { useGroups } from '../context/GroupsContext';
import { useAuth } from '../context/AuthContext';
import { uploadPhoto, updateGroupPhoto, getMe, getCachedMe, setFolderCover, saveFolders, saveHiddenFolders, saveGroupOrder } from '../api';
import { notify } from '../notify';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import { IconFolder, IconList, IconLock, IconUsers, IconPencil, IconX, IconCamera } from '../components/icons/Line';
import { useThemedStyles } from '../theme/themed';
import SheetWrap from '../components/SheetWrap';
import FadeIn from '../components/FadeIn';
import PopWrap from '../components/PopWrap';
import { thumbUrl } from '../imageUrl';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** 폴더 만들기 시 고를 수 있는 아이콘들 */
const FOLDER_EMOJIS = ['📁', '📔', '✈️', '📚', '🍜', '🎵', '💼', '🏃', '🎨', '❤️', '🌱', '⭐', '☕', '🐾', '🎮', '🌸'];

export default function HomeScreen() {
  const styles = useThemedStyles(lightStyles);
  const navigation = useNavigation<Nav>();
  const { accent, mode } = useTheme();
  const { entries, updateEntry, refresh: refreshEntries } = useEntries();
  const { groups, refresh: refreshGroups } = useGroups();
  const { token } = useAuth();

  // 당겨서 새로고침 — 일기·그룹·알림을 한 번에 재조회
  const [refreshing, setRefreshing] = useState(false);
  async function handleRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([refreshEntries(), refreshGroups(), refreshNotifs()]);
    } finally {
      setRefreshing(false);
    }
  }
  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#9ca3af" colors={[accent]} />
  );
  const [tab, setTab] = useState<'personal' | 'group'>('personal');
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [zoomedGroup, setZoomedGroup] = useState<{ emoji: string; photo?: string; name: string } | null>(null);
  // 알림 읽음 상태 구독 → 종 배지(빨간 점)를 안 읽은 알림이 있을 때만 표시
  const [, forceNotif] = useState(0);
  useEffect(() => subscribeNotifs(() => forceNotif((v) => v + 1)), []);
  useEffect(() => { refreshNotifs(); }, []); // 실제 알림(AI 코멘트·그룹 새 글) 로드

  // 홈 첫 화면으로 리셋 (홈 탭·로고 클릭 공용)
  function resetToFirstScreen() {
    InteractionManager.runAfterInteractions(() => {
      setSelectedFolder(null);
      setTab('personal');
      setPersonalView('folder');
    });
  }

  // 홈 탭을 누르면 항상 첫 화면(개인 폴더 목록)으로 리셋
  useEffect(() => {
    const unsub = (navigation as any).addListener('tabPress', resetToFirstScreen);
    return unsub;
  }, [navigation]);

  // 다른 탭에서 p!ng 로고를 눌러 넘어온 경우(reset 파라미터)도 첫 화면으로
  const resetParam = (useRoute() as any).params?.reset;
  useEffect(() => {
    if (resetParam) resetToFirstScreen();
  }, [resetParam]);
  const hasUnreadNotif = getNotifUnread() > 0;
  const [selectedFolder, setSelectedFolder] = useState<DiaryFolder | null>(null);

  // 폴더 커버: 스크롤 내리면 높이가 줄어드는 컬랩싱 헤더
  const COVER_MAX = 176, COVER_MIN = 84;
  const coverScroll = useRef(new Animated.Value(0)).current;
  const coverHeight = coverScroll.interpolate({
    inputRange: [0, COVER_MAX - COVER_MIN],
    outputRange: [COVER_MAX, COVER_MIN],
    extrapolate: 'clamp',
  });
  useEffect(() => { coverScroll.setValue(0); }, [selectedFolder]); // 폴더 바꿀 때 커버 높이 초기화

  // 좌우 스와이프: 폴더 목록에선 개인↔그룹 전환, 그룹에서 한 번 더 밀면 달력 탭으로.
  // 폴더 상세에선 왼쪽으로 밀면 나가기
  const swipeStateRef = useRef({ selectedFolder: false, tab: 'personal' as 'personal' | 'group' });
  const swipePan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        // 폴더/그룹 드래그 중에는 스와이프 전환 금지 (가로 드래그를 탭 전환으로 오인 방지)
        dragIdRef.current == null && gDragIdRef.current == null &&
        Math.abs(g.dx) > 28 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
      onPanResponderRelease: (_, g) => {
        if (swipeStateRef.current.selectedFolder) {
          if (g.dx >= 40) setSelectedFolder(null); // 폴더 상세에서 오른쪽으로 밀면 폴더 목록으로 나가기 (iOS 뒤로가기 제스처)
          return;
        }
        if (g.dx <= -40) {
          if (swipeStateRef.current.tab === 'group') navigation.navigate('Main', { screen: 'Calendar' } as any);
          else setTab('group');
        } else if (g.dx >= 40) setTab('personal');
      },
    })
  ).current;
  swipeStateRef.current.selectedFolder = !!selectedFolder;
  swipeStateRef.current.tab = tab;

  const [personalView, setPersonalView] = useState<'folder' | 'all'>('folder');
  // 캐시된 프로필로 초기화 → 폴더 커버·목록이 즉시 표시(시간차 제거), 아래 useEffect가 갱신
  const [folderCovers, setFolderCovers] = useState<Record<string, string>>(() => getCachedMe()?.folder_covers ?? {});
  const [shareEntry, setShareEntry] = useState<DiaryEntry | null>(null);

  const [groupCovers, setGroupCovers] = useState<Record<number, string>>({});
  const [customFolders, setCustomFolders] = useState<DiaryFolder[]>(() => (getCachedMe()?.folders ?? []) as DiaryFolder[]);
  const [hiddenFolders, setHiddenFolders] = useState<string[]>(() => getCachedMe()?.hidden_folders ?? []);
  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderEmoji, setNewFolderEmoji] = useState('📁');
  // 폴더 이름/아이콘 수정
  const [editFolder, setEditFolder] = useState<DiaryFolder | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('📁');
  const [deleteTarget, setDeleteTarget] = useState<DiaryFolder | null>(null);

  // 저장된 순서(사용자 재정렬 포함)대로 폴더 목록 구성
  const allFolders: DiaryFolder[] = useMemo(() => mergeFolders(customFolders, hiddenFolders), [customFolders, hiddenFolders]);

  // 폴더별 p!ng 개수 (셀마다 filter 돌리지 않게 한 번만 집계)
  const countByFolder = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of entries) { const k = e.folder ?? ''; m.set(k, (m.get(k) ?? 0) + 1); }
    return m;
  }, [entries]);

  // 드래그 이동량 계산용 터치 시작점 (네이티브: 터치 이벤트 경로, 웹: PanResponder 경로)
  const touchStartRef = useRef({ x: 0, y: 0 });

  // ── 폴더 드래그 재정렬: 길게 눌러 집어서 원하는 위치로 끌어다 놓기 ──
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState({ dx: 0, dy: 0 });
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const dragIndexRef = useRef(0);
  const gridWRef = useRef(340);
  const cellHRef = useRef(150);

  // PanResponder는 한 번만 생성하고, 최신 상태는 ref를 통해 참조 (stale closure 방지)
  const dragHandlersRef = useRef({
    move: (_dx: number, _dy: number) => {},
    release: (_dx: number, _dy: number) => {},
  });

  function computeDragTarget(dx: number, dy: number): number {
    const i = dragIndexRef.current;
    const slotW = gridWRef.current * 0.52;              // 칸 폭(48%) + 열 간격(4%)
    const rowH = cellHRef.current + 12;                 // 카드 높이 + rowGap
    const col = i % 2;
    const row = Math.floor(i / 2);
    const nc = Math.min(1, Math.max(0, col + Math.round(dx / slotW)));
    const nr = Math.max(0, row + Math.round(dy / rowH));
    return Math.min(allFolders.length - 1, nr * 2 + nc);
  }

  dragHandlersRef.current = {
    move(dx, dy) {
      setDragPos({ dx, dy });
      setHoverIdx(computeDragTarget(dx, dy));
    },
    release(dx, dy) {
      if (dragIdRef.current == null) return; // 두 경로(터치/팬)가 모두 발화해도 한 번만 처리
      const from = dragIndexRef.current;
      const target = computeDragTarget(dx, dy);
      dragIdRef.current = null;
      setDragId(null);
      setHoverIdx(null);
      setDragPos({ dx: 0, dy: 0 });
      if (target !== from) {
        const list = [...allFolders];
        const [moved] = list.splice(from, 1);
        list.splice(target, 0, moved);
        // 숨긴 폴더 항목은 순서 목록 뒤에 붙여 보존
        const hiddenEntries = customFolders.filter((f) => hiddenFolders.includes(f.id));
        const next = [...list, ...hiddenEntries];
        setCustomFolders(next);
        saveFolders(next).catch(() => notify('순서 저장에 실패했어요.'));
      }
    },
  };

  const dragPan = useRef(
    PanResponder.create({
      // 길게 눌러 드래그가 시작된 경우에만 제스처를 가로챈다 (평소엔 탭·스크롤 그대로)
      onMoveShouldSetPanResponderCapture: () => dragIdRef.current != null,
      onPanResponderMove: (_e, g) => dragHandlersRef.current.move(g.dx, g.dy),
      onPanResponderRelease: (_e, g) => dragHandlersRef.current.release(g.dx, g.dy),
      onPanResponderTerminate: (_e, g) => dragHandlersRef.current.release(g.dx, g.dy),
    })
  ).current;

  function startDrag(folderId: string, index: number) {
    dragIdRef.current = folderId;
    dragIndexRef.current = index;
    setDragId(folderId);
    setDragPos({ dx: 0, dy: 0 });
    setHoverIdx(index);
  }

  // 드래그 중 미리보기 순서: 다른 폴더들이 빈 자리로 비켜나도록 각 카드의 이동 오프셋 계산
  const previewOrder: DiaryFolder[] | null = (dragId && hoverIdx != null)
    ? (() => {
        const list = [...allFolders];
        const from = list.findIndex((f) => f.id === dragId);
        if (from < 0) return null;
        const [m] = list.splice(from, 1);
        list.splice(hoverIdx, 0, m);
        return list;
      })()
    : null;

  function slotOffset(fromIdx: number, toIdx: number) {
    const pitchX = gridWRef.current * 0.52; // 칸 폭(48%) + 열 간격(4%)
    const rowH = cellHRef.current + 12;
    return {
      x: ((toIdx % 2) - (fromIdx % 2)) * pitchX,
      y: (Math.floor(toIdx / 2) - Math.floor(fromIdx / 2)) * rowH,
    };
  }

  // ── 그룹 드래그 재정렬 (폴더와 동일, 순서는 내 계정에 저장) ──
  const [groupOrder, setGroupOrder] = useState<number[]>(() => getCachedMe()?.group_order ?? []);
  const orderedGroups = useMemo(() => [
    ...groupOrder.map((id) => groups.find((g) => g.id === id)).filter(Boolean) as typeof groups,
    ...groups.filter((g) => !groupOrder.includes(g.id)),
  ], [groupOrder, groups]);

  const [gDragId, setGDragId] = useState<number | null>(null);
  const [gDragPos, setGDragPos] = useState({ dx: 0, dy: 0 });
  const [gHoverIdx, setGHoverIdx] = useState<number | null>(null);
  const gDragIdRef = useRef<number | null>(null);
  const gDragIndexRef = useRef(0);
  const gCellHRef = useRef(148);
  const gHandlersRef = useRef({ move: (_x: number, _y: number) => {}, release: (_x: number, _y: number) => {} });

  function computeGroupTarget(dx: number, dy: number): number {
    const i = gDragIndexRef.current;
    const slotW = gridWRef.current * 0.52;
    const rowH = gCellHRef.current + 12;
    const nc = Math.min(1, Math.max(0, (i % 2) + Math.round(dx / slotW)));
    const nr = Math.max(0, Math.floor(i / 2) + Math.round(dy / rowH));
    return Math.min(orderedGroups.length - 1, nr * 2 + nc);
  }

  gHandlersRef.current = {
    move(dx, dy) {
      setGDragPos({ dx, dy });
      setGHoverIdx(computeGroupTarget(dx, dy));
    },
    release(dx, dy) {
      if (gDragIdRef.current == null) return;
      const from = gDragIndexRef.current;
      const target = computeGroupTarget(dx, dy);
      gDragIdRef.current = null;
      setGDragId(null);
      setGHoverIdx(null);
      setGDragPos({ dx: 0, dy: 0 });
      if (target !== from) {
        const list = [...orderedGroups];
        const [moved] = list.splice(from, 1);
        list.splice(target, 0, moved);
        const ids = list.map((g) => g.id);
        setGroupOrder(ids);
        saveGroupOrder(ids).catch(() => notify('순서 저장에 실패했어요.'));
      }
    },
  };

  const gDragPan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: () => gDragIdRef.current != null,
      onPanResponderMove: (_e, g) => gHandlersRef.current.move(g.dx, g.dy),
      onPanResponderRelease: (_e, g) => gHandlersRef.current.release(g.dx, g.dy),
      onPanResponderTerminate: (_e, g) => gHandlersRef.current.release(g.dx, g.dy),
    })
  ).current;

  function startGroupDrag(groupId: number, index: number) {
    gDragIdRef.current = groupId;
    gDragIndexRef.current = index;
    setGDragId(groupId);
    setGDragPos({ dx: 0, dy: 0 });
    setGHoverIdx(index);
  }

  // 그룹 드래그 중 미리보기(비켜나기) 순서
  const gPreviewOrder = (gDragId != null && gHoverIdx != null)
    ? (() => {
        const list = [...orderedGroups];
        const from = list.findIndex((g) => g.id === gDragId);
        if (from < 0) return null;
        const [m] = list.splice(from, 1);
        list.splice(gHoverIdx, 0, m);
        return list;
      })()
    : null;

  function gSlotOffset(fromIdx: number, toIdx: number) {
    const pitchX = gridWRef.current * 0.52;
    const rowH = gCellHRef.current + 12;
    return {
      x: ((toIdx % 2) - (fromIdx % 2)) * pitchX,
      y: (Math.floor(toIdx / 2) - Math.floor(fromIdx / 2)) * rowH,
    };
  }

  // 폴더 커버·사용자 폴더(서버 저장분)를 로그인(토큰 준비) 후 불러오기 — 토큰 늦게 붙어도 재실행
  useEffect(() => {
    if (!token) return;
    getMe()
      .then((me) => { setFolderCovers(me.folder_covers); setCustomFolders(me.folders); setHiddenFolders(me.hidden_folders); setGroupOrder(me.group_order); })
      .catch(() => {});
  }, [token]);

  // 폴더 커버 썸네일을 미리 받아 캐시를 데운다 — 폴더 화면 첫 진입이 즉시 뜨게
  useEffect(() => {
    Object.values(folderCovers || {}).forEach((u) => {
      const t = thumbUrl(u, 480);
      if (t) Image.prefetch(t).catch(() => {});
    });
  }, [folderCovers]);

  /** 새 폴더 만들기 → DB(user_metadata) 저장 */
  async function createFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    const folder: DiaryFolder = { id: `c_${Date.now()}`, name, emoji: newFolderEmoji };
    const next = [...customFolders, folder];
    setCustomFolders(next);
    setFolderModalOpen(false);
    setNewFolderName('');
    setNewFolderEmoji('📁');
    try {
      await saveFolders(next);
    } catch (e: any) {
      notify(e?.message ?? '폴더 저장에 실패했어요.');
    }
  }

  /** 폴더 수정 시트 열기 */
  function openEditFolder(folder: DiaryFolder) {
    setEditFolder(folder);
    setEditName(folder.name);
    setEditEmoji(folder.emoji);
  }

  /** 폴더 이름/아이콘 저장 (기본 폴더는 override로, 사용자 폴더는 직접 수정) → DB 저장 */
  async function saveFolderEdit() {
    if (!editFolder) return;
    const name = editName.trim();
    if (!name) return;
    const id = editFolder.id;
    const exists = customFolders.some((f) => f.id === id);
    const next = exists
      ? customFolders.map((f) => (f.id === id ? { ...f, name, emoji: editEmoji } : f))
      : [...customFolders, { id, name, emoji: editEmoji }];
    setCustomFolders(next);
    if (selectedFolder?.id === id) setSelectedFolder({ ...selectedFolder, name, emoji: editEmoji });
    setEditFolder(null);
    try {
      await saveFolders(next);
    } catch (e: any) {
      notify(e?.message ?? '폴더 저장에 실패했어요.');
    }
  }

  /** 폴더 삭제 실행 — 사용자 폴더는 제거, 기본 폴더는 숨김 처리 → DB 저장 */
  async function performDelete(target: DiaryFolder) {
    const id = target.id;
    const isCustom = id.startsWith('c_');
    const nextCustom = customFolders.filter((f) => f.id !== id);
    setCustomFolders(nextCustom);
    let nextHidden = hiddenFolders;
    if (!isCustom) {
      nextHidden = [...hiddenFolders.filter((h) => h !== id), id];
      setHiddenFolders(nextHidden);
    }
    if (selectedFolder?.id === id) setSelectedFolder(null);
    setDeleteTarget(null);
    try {
      await saveFolders(nextCustom);
      if (!isCustom) await saveHiddenFolders(nextHidden);
    } catch (e: any) {
      notify(e?.message ?? '폴더 삭제에 실패했어요.');
    }
  }

  /** 폴더 커버 사진 제거 → 이모지 아이콘으로 복귀 */
  async function removeFolderCover(folderId: string) {
    setFolderCovers((prev) => {
      const next = { ...prev };
      delete next[folderId];
      return next;
    });
    try {
      const covers = await setFolderCover(folderId, '');
      setFolderCovers(covers);
    } catch (e: any) {
      notify(e?.message ?? '커버 제거에 실패했어요.');
    }
  }

  /** 폴더 커버 사진 변경 → Storage 업로드 후 내 계정(user_metadata)에 저장 */
  async function pickFolderCover(folderId: string) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 2],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const localUri = result.assets[0].uri;
    const prevCover = folderCovers[folderId]; // 실패 시 되돌리기용
    setFolderCovers((prev) => ({ ...prev, [folderId]: localUri })); // 낙관적 표시
    try {
      const url = await uploadPhoto(localUri);
      const covers = await setFolderCover(folderId, url);
      setFolderCovers(covers);
    } catch (e: any) {
      // 실패하면 원래 커버로 복구 (바뀐 것처럼 보이는 착시 방지)
      setFolderCovers((prev) => {
        const next = { ...prev };
        if (prevCover) next[folderId] = prevCover; else delete next[folderId];
        return next;
      });
      notify(e?.message ?? '커버 저장에 실패했어요. 다시 시도해주세요.');
    }
  }

  /** 그룹 커버 사진 변경 → Storage 업로드 후 DB 저장 (모든 멤버 공유) */
  async function pickGroupCover(groupId: number) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 2],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const localUri = result.assets[0].uri;
    setGroupCovers((prev) => ({ ...prev, [groupId]: localUri })); // 낙관적 표시
    try {
      const url = await uploadPhoto(localUri);
      await updateGroupPhoto(groupId, url);
      await refreshGroups(); // group.photo_url 갱신
    } catch (e: any) {
      notify(e?.message ?? '그룹 커버 저장에 실패했어요.');
    }
  }
  // 공유 대상 그룹 선택 상태 (시트 열 때 초기화)
  const [shareGroupIds, setShareGroupIds] = useState<Set<number>>(new Set());

  function openShare(entry: DiaryEntry) {
    if (entry.visibility === 'friends') {
      setShareGroupIds(new Set(
        entry.sharedGroups && entry.sharedGroups.length ? entry.sharedGroups : groups.map((g) => g.id)
      ));
    } else {
      setShareGroupIds(new Set());
    }
    setShareEntry(entry);
  }

  function toggleShareGroup(id: number) {
    setShareGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function saveShare() {
    if (!shareEntry) return;
    const ids = Array.from(shareGroupIds);
    updateEntry({
      ...shareEntry,
      visibility: ids.length > 0 ? 'friends' : 'private',
      sharedGroups: ids.length > 0 ? ids : null,
    });
    setShareEntry(null);
    notify(ids.length > 0 ? `${ids.length} 개 그룹에 공개했어요.` : '비공개로 전환했어요.');
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={resetToFirstScreen} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.logo, { color: accent }]}>p!ng</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('Notifications')}>
          <IconBell size={22} dot={hasUnreadNotif} color={mode === 'dark' ? '#eef1f7' : '#111827'} />
        </TouchableOpacity>
      </View>

      {/* Tab switcher — 폴더 상세에서는 숨겨서 커버가 위까지 차게 */}
      {!(tab === 'personal' && selectedFolder) && (
      <View style={styles.tabRow}>
        <View style={styles.tabPill}>
          {(['personal', 'group'] as const).map((t) => {
            // 개인 = 자물쇠(나만 보는 공간), 그룹 = 사람들
            const Icon = t === 'personal' ? IconLock : IconUsers;
            return (
              <TouchableOpacity
                key={t}
                style={[styles.tabItem, tab === t && styles.tabItemActive]}
                onPress={() => setTab(t)}
              >
                <Icon size={17} color={tab === t ? accent : '#9ca3af'} />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      )}

      {lightboxPhoto && (
        <PhotoLightbox photo={lightboxPhoto} onClose={() => setLightboxPhoto(null)} />
      )}

      {zoomedGroup && (
        <PopWrap style={styles.zoomOverlayWrap} onBackdropPress={() => setZoomedGroup(null)}>
          <View style={styles.zoomCard}>
            {zoomedGroup.photo
              ? <Image source={{ uri: zoomedGroup.photo }} style={styles.zoomPhoto} />
              : <Text style={styles.zoomEmoji}>{zoomedGroup.emoji}</Text>
            }
            <Text style={styles.zoomName}>{zoomedGroup.name}</Text>
          </View>
        </PopWrap>
      )}

      <View style={{ flex: 1 }} {...swipePan.panHandlers}>
      <FadeIn
        key={tab === 'group' ? 'group' : selectedFolder ? `folder-${selectedFolder.id}` : `personal-${personalView}`}
        style={{ flex: 1 }}
      >
      {tab === 'personal' ? (
        <>
          {selectedFolder ? (
            /* ── 폴더 내 p!ng 목록 ── */
            <>
              {folderCovers[selectedFolder.id] ? (
                <View>
                  <Animated.Image source={{ uri: thumbUrl(folderCovers[selectedFolder.id], 960)! }} style={[styles.folderCoverBanner, { height: coverHeight }]} />
                  <LinearGradient
                    colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']}
                    locations={[0, 0.45, 1]}
                    style={styles.folderCoverScrim}
                    pointerEvents="none"
                  />
                  <View style={styles.folderCoverBar}>
                    <TouchableOpacity onPress={() => setSelectedFolder(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <IconChev dir="left" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={[styles.folderCoverName, { flex: 1, textAlign: 'center' }]} numberOfLines={1}>{selectedFolder.name}</Text>
                    <TouchableOpacity onPress={() => openEditFolder(selectedFolder)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <IconPencil size={19} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.folderHeader}>
                  <TouchableOpacity style={styles.folderBackBtn} onPress={() => setSelectedFolder(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <IconChev dir="left" size={20} color="#6b7280" />
                  </TouchableOpacity>
                  <Text style={styles.folderHeaderTitle}>{selectedFolder.name}</Text>
                  <View style={styles.folderHeaderActions}>
                    <TouchableOpacity
                      onPress={() => openEditFolder(selectedFolder)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <IconPencil size={17} color="#6b7280" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              <Animated.ScrollView
                contentContainerStyle={styles.list}
                scrollEventThrottle={16}
                refreshControl={refreshControl}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { y: coverScroll } } }],
                  { useNativeDriver: false },
                )}
              >
                {entries.filter((e) => e.folder === selectedFolder.id).length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>아직 p!ng가 없어요</Text>
                    <Text style={styles.emptySubText}>오른쪽 아래 버튼을 눌러 첫 p!ng를 써보세요</Text>
                  </View>
                )}
                {entries.filter((e) => e.folder === selectedFolder.id).map((entry) => (
                  <TouchableOpacity
                    key={entry.id}
                    style={styles.entryCard}
                    onPress={() => navigation.navigate('DiaryDetail', { entry })}
                  >
                    <View style={styles.entryHeader}>
                      <Text style={styles.entryTitle} numberOfLines={1}>{entry.title}</Text>
                      <View style={styles.entryHeaderRight}>
                        <Text style={styles.entryDate}>{entryDateLabel(entry)}</Text>
                        <TouchableOpacity
                          style={styles.cardShareBtn}
                          onPress={(e) => { e.stopPropagation(); openShare(entry); }}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                            <Path d="M16 6l-4-4-4 4" />
                            <Line x1="12" y1="2" x2="12" y2="15" />
                          </Svg>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.entryBody}>
                      {entry.photo && (
                        <TouchableOpacity onPress={() => setLightboxPhoto(entry.photo)}>
                          <PhotoThumb photo={entry.photo} size={48} radius={10} />
                        </TouchableOpacity>
                      )}
                      <Text style={styles.entryPreview} numberOfLines={3}>{stripPhotoMarkers(entry.body)}</Text>
                    </View>
                    <View style={styles.tagRow}>
                      {entry.tags.map((t) => <Tag key={t} label={t} />)}
                    </View>
                  </TouchableOpacity>
                ))}
              </Animated.ScrollView>
            </>
          ) : (
            /* ── 폴더 목록 / 전체 보기 ── */
            <>
              <View style={styles.viewToggleRow}>
                <View style={styles.viewTogglePill}>
                  <TouchableOpacity
                    style={[styles.viewToggleBtn, personalView === 'folder' && { backgroundColor: accent }]}
                    onPress={() => setPersonalView('folder')}
                  >
                    <IconFolder size={15} color={personalView === 'folder' ? '#fff' : '#9ca3af'} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.viewToggleBtn, personalView === 'all' && { backgroundColor: accent }]}
                    onPress={() => setPersonalView('all')}
                  >
                    <IconList size={15} color={personalView === 'all' ? '#fff' : '#9ca3af'} />
                  </TouchableOpacity>
                </View>
              </View>

              {personalView === 'folder' ? (
            <ScrollView contentContainerStyle={styles.folderList} scrollEnabled={!dragId} refreshControl={refreshControl}>
              <View
                style={styles.folderGrid}
                {...dragPan.panHandlers}
                // 네이티브에선 꾹 누른 카드가 제스처를 쥐고 있어 PanResponder 가로채기가 안 됨 —
                // 버블링되는 터치 이벤트로 이동량을 직접 계산한다 (웹 마우스는 PanResponder가 담당)
                onTouchStart={(e) => { touchStartRef.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY }; }}
                onTouchMove={(e) => {
                  if (dragIdRef.current != null) {
                    dragHandlersRef.current.move(e.nativeEvent.pageX - touchStartRef.current.x, e.nativeEvent.pageY - touchStartRef.current.y);
                  }
                }}
                onTouchEnd={(e) => {
                  if (dragIdRef.current != null) {
                    dragHandlersRef.current.release(e.nativeEvent.pageX - touchStartRef.current.x, e.nativeEvent.pageY - touchStartRef.current.y);
                  }
                }}
                onLayout={(e) => { gridWRef.current = e.nativeEvent.layout.width; }}
              >
                {allFolders.map((folder, index) => {
                  const count = countByFolder.get(folder.id) ?? 0;
                  const cover = folderCovers[folder.id];
                  const isDragging = dragId === folder.id;
                  // 드래그 중이면 다른 카드들은 미리보기 위치로 비켜난다
                  let shift = { x: 0, y: 0 };
                  if (previewOrder && !isDragging) {
                    const p = previewOrder.findIndex((f) => f.id === folder.id);
                    if (p >= 0 && p !== index) shift = slotOffset(index, p);
                  }
                  return (
                    <TouchableOpacity
                      key={folder.id}
                      style={[
                        styles.gridCell,
                        (shift.x !== 0 || shift.y !== 0) && {
                          transform: [{ translateX: shift.x }, { translateY: shift.y }],
                        },
                        isDragging && {
                          transform: [{ translateX: dragPos.dx }, { translateY: dragPos.dy }, { scale: 1.05 }],
                          zIndex: 20, elevation: 10, opacity: 0.92,
                        },
                      ]}
                      activeOpacity={0.85}
                      onPress={() => !dragId && setSelectedFolder(folder)}
                      onLongPress={() => startDrag(folder.id, index)}
                      delayLongPress={300}
                      onLayout={index === 0 ? (e) => { cellHRef.current = e.nativeEvent.layout.height; } : undefined}
                    >
                      {/* 애플뮤직처럼: 커버만 둥근 카드, 이름은 사진 아래 */}
                      <View
                        style={[
                          styles.folderCoverWrap, styles.glowCard, { height: 146 },
                          { boxShadow: `0 2px 12px 0 ${hexToRgba(accent, 0.27)}` },
                          isDragging && { borderColor: accent, borderWidth: 2 },
                        ]}
                      >
                        {cover ? (
                          <Image source={{ uri: thumbUrl(cover, 480)! }} style={styles.folderCoverImg} />
                        ) : (
                          <View style={styles.folderCoverEmpty}>
                            <Text style={styles.folderCoverEmoji}>{folder.emoji}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.folderMeta}>
                        <Text style={styles.folderName} numberOfLines={1}>{folder.name}</Text>
                        <Text style={styles.folderCount}>{count} 개</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
              ) : (
              <ScrollView contentContainerStyle={styles.list} refreshControl={refreshControl}>
                {entries.length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>아직 p!ng가 없어요</Text>
                    <Text style={styles.emptySubText}>오른쪽 아래 버튼을 눌러 첫 p!ng를 써보세요</Text>
                  </View>
                )}
                {entries.map((entry) => (
                  <TouchableOpacity
                    key={entry.id}
                    style={styles.entryCard}
                    onPress={() => navigation.navigate('DiaryDetail', { entry })}
                  >
                    <View style={styles.entryHeader}>
                      <Text style={styles.entryTitle} numberOfLines={1}>{entry.title}</Text>
                      <View style={styles.entryHeaderRight}>
                        <Text style={styles.entryDate}>{entryDateLabel(entry)}</Text>
                        <TouchableOpacity
                          style={styles.cardShareBtn}
                          onPress={(e) => { e.stopPropagation(); openShare(entry); }}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                            <Path d="M16 6l-4-4-4 4" />
                            <Line x1="12" y1="2" x2="12" y2="15" />
                          </Svg>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.entryBody}>
                      {entry.photo && (
                        <TouchableOpacity onPress={() => setLightboxPhoto(entry.photo)}>
                          <PhotoThumb photo={entry.photo} size={48} radius={10} />
                        </TouchableOpacity>
                      )}
                      <Text style={styles.entryPreview} numberOfLines={3}>{stripPhotoMarkers(entry.body)}</Text>
                    </View>
                    <View style={styles.tagRow}>
                      {entry.tags.map((t) => <Tag key={t} label={t} />)}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              )}
            </>
          )}

          <TouchableOpacity
            style={[styles.fab, { backgroundColor: accent }]}
            onPress={() => {
              // 폴더 안에서는 바로 그 폴더로 지정된 새 글 작성
              if (selectedFolder) navigation.navigate('DiaryWrite', { folder: selectedFolder.id });
              else setFabMenuOpen(true);
            }}
          >
            <IconPlus color="#ffffff" size={22} />
          </TouchableOpacity>
        </>
      ) : (
        <ScrollView contentContainerStyle={styles.folderList} scrollEnabled={!gDragId} refreshControl={refreshControl}>
          <Text style={[styles.sectionLabel, { marginBottom: 10 }]}>참여 중인 그룹</Text>
          {groups.length === 0 && (
            <Text style={styles.groupEmptyHint}>아직 참여 중인 그룹이 없어요.{'\n'}새 그룹을 만들거나 초대 코드로 참여해보세요.</Text>
          )}
          <View
            style={styles.folderGrid}
            {...gDragPan.panHandlers}
            onTouchStart={(e) => { touchStartRef.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY }; }}
            onTouchMove={(e) => {
              if (gDragIdRef.current != null) {
                gHandlersRef.current.move(e.nativeEvent.pageX - touchStartRef.current.x, e.nativeEvent.pageY - touchStartRef.current.y);
              }
            }}
            onTouchEnd={(e) => {
              if (gDragIdRef.current != null) {
                gHandlersRef.current.release(e.nativeEvent.pageX - touchStartRef.current.x, e.nativeEvent.pageY - touchStartRef.current.y);
              }
            }}
          >
            {orderedGroups.map((group, index) => {
              const cover = group.photo_url ?? groupCovers[group.id];
              const isDragging = gDragId === group.id;
              let shift = { x: 0, y: 0 };
              if (gPreviewOrder && !isDragging) {
                const p = gPreviewOrder.findIndex((g) => g.id === group.id);
                if (p >= 0 && p !== index) shift = gSlotOffset(index, p);
              }
              return (
                <TouchableOpacity
                  key={group.id}
                  style={[
                    styles.gridCell,
                    (shift.x !== 0 || shift.y !== 0) && { transform: [{ translateX: shift.x }, { translateY: shift.y }] },
                    isDragging && {
                      transform: [{ translateX: gDragPos.dx }, { translateY: gDragPos.dy }, { scale: 1.05 }],
                      zIndex: 20, elevation: 10, opacity: 0.92,
                    },
                  ]}
                  activeOpacity={0.85}
                  onPress={() => !gDragId && navigation.navigate('Group', { group })}
                  onLongPress={() => startGroupDrag(group.id, index)}
                  delayLongPress={300}
                  onLayout={index === 0 ? (e) => { gCellHRef.current = e.nativeEvent.layout.height; } : undefined}
                >
                  {/* 폴더 카드와 동일: 커버만 둥근 카드, 이름은 사진 아래 */}
                  <View
                    style={[
                      styles.folderCoverWrap, styles.glowCard, { height: 146 },
                      { boxShadow: `0 2px 12px 0 ${hexToRgba(accent, 0.27)}` },
                      isDragging && { borderColor: accent, borderWidth: 2 },
                    ]}
                  >
                    {cover ? (
                      <Image source={{ uri: thumbUrl(cover, 480)! }} style={styles.folderCoverImg} />
                    ) : (
                      <View style={styles.folderCoverEmpty}>
                        <IconUsers size={30} color="#9ca3af" />
                      </View>
                    )}
                  </View>
                  <View style={styles.folderMeta}>
                    <Text style={styles.folderName} numberOfLines={1}>{group.name}</Text>
                    <Text style={styles.folderCount}>{group.member_count ?? 1} 명</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={[styles.gridCell, styles.groupAddCard]} onPress={() => navigation.navigate('GroupCreate')}>
              <Text style={styles.newGroupPlus}>+</Text>
              <Text style={styles.newGroupText}>새 그룹{'\n'}만들기 / 참여</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
      </FadeIn>
      </View>

      {shareEntry && (
        <SheetWrap style={styles.overlayWrap}>
          <TouchableOpacity style={styles.overlayBg} activeOpacity={1} onPress={() => setShareEntry(null)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleWrap}>
                <Text style={styles.sheetTitle}>그룹에 공유</Text>
                <Text style={styles.sheetSub}>
                  {groups.length === 0
                    ? '아직 참여 중인 그룹이 없어요. 그룹을 만들거나 참여해보세요.'
                    : '공개할 그룹을 골라주세요. 아무것도 고르지 않으면 비공개예요.'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShareEntry(null)}>
                <IconX size={18} color="#9ca3af" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
              {groups.map((g) => {
                const active = shareGroupIds.has(g.id);
                return (
                  <TouchableOpacity
                    key={g.id}
                    style={[styles.shareGroupRow, active && { borderColor: accent, backgroundColor: hexToRgba(accent, 0.08) }]}
                    onPress={() => toggleShareGroup(g.id)}
                  >
                    <Text style={[styles.shareGroupName, active && { color: accent, fontWeight: '600' }]} numberOfLines={1}>
                      {g.name}
                    </Text>
                    <View style={[styles.shareCheck, active && { borderColor: accent, backgroundColor: accent }]}>
                      {active && <Text style={styles.shareCheckMark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: accent }]} onPress={saveShare}>
              <Text style={[styles.confirmBtnText, { color: '#fff' }]}>
                {shareGroupIds.size > 0 ? `${shareGroupIds.size} 개 그룹에 공개` : '비공개로 저장'}
              </Text>
            </TouchableOpacity>
          </View>
        </SheetWrap>
      )}

      {/* + 버튼 선택 시트: p!ng / 폴더 */}
      {fabMenuOpen && (
        <SheetWrap style={styles.overlayWrap}>
          <TouchableOpacity style={styles.overlayBg} activeOpacity={1} onPress={() => setFabMenuOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: 14 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.fabChoiceList}>
              <TouchableOpacity
                style={styles.fabChoice}
                onPress={() => { setFabMenuOpen(false); navigation.navigate('DiaryWrite'); }}
              >
                <View style={styles.fabChoiceIcon}><IconPencil size={22} color={accent} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fabChoiceTitle}>p!ng</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.fabChoice}
                onPress={() => { setFabMenuOpen(false); setFolderModalOpen(true); }}
              >
                <View style={styles.fabChoiceIcon}><IconFolder size={22} color={accent} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fabChoiceTitle}>폴더 만들기</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </SheetWrap>
      )}

      {/* 새 폴더 만들기 모달 */}
      {folderModalOpen && (
        <SheetWrap style={styles.overlayWrap}>
          <TouchableOpacity style={styles.overlayBg} activeOpacity={1} onPress={() => setFolderModalOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.fabSheetTitle}>새 폴더</Text>
            <TextInput
              style={styles.folderInput}
              value={newFolderName}
              onChangeText={setNewFolderName}
              placeholder="폴더 이름 (예: 운동, 회고)"
              placeholderTextColor="#9ca3af"
              maxLength={20}
            />
            <Text style={styles.folderEmojiLabel}>아이콘</Text>
            <View style={styles.emojiGrid}>
              {FOLDER_EMOJIS.map((em) => (
                <TouchableOpacity
                  key={em}
                  style={[styles.emojiChip, newFolderEmoji === em && { borderColor: accent, backgroundColor: hexToRgba(accent, 0.1) }]}
                  onPress={() => setNewFolderEmoji(em)}
                >
                  <Text style={{ fontSize: 20 }}>{em}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: newFolderName.trim() ? accent : '#e5e7eb' }]}
              disabled={!newFolderName.trim()}
              onPress={createFolder}
            >
              <Text style={[styles.confirmBtnText, { color: newFolderName.trim() ? '#fff' : '#9ca3af' }]}>폴더 만들기</Text>
            </TouchableOpacity>
          </View>
        </SheetWrap>
      )}

      {/* 폴더 수정 시트 */}
      {editFolder && (
        <SheetWrap style={styles.overlayWrap}>
          <TouchableOpacity style={styles.overlayBg} activeOpacity={1} onPress={() => setEditFolder(null)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.fabSheetTitle}>폴더 수정</Text>
            <TextInput
              style={styles.folderInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="폴더 이름"
              placeholderTextColor="#9ca3af"
              maxLength={20}
            />
            <Text style={styles.folderEmojiLabel}>커버 사진</Text>
            <View style={styles.coverEditRow}>
              {folderCovers[editFolder.id] ? (
                <Image source={{ uri: thumbUrl(folderCovers[editFolder.id], 160)! }} style={styles.coverThumb} />
              ) : (
                <View style={styles.coverThumbEmpty}>
                  <IconCamera size={20} color="#9ca3af" />
                </View>
              )}
              <TouchableOpacity style={styles.coverPickBtn} onPress={() => pickFolderCover(editFolder.id)}>
                <Text style={styles.coverPickText}>{folderCovers[editFolder.id] ? '사진 변경' : '사진 선택'}</Text>
              </TouchableOpacity>
              {folderCovers[editFolder.id] && (
                <TouchableOpacity style={styles.coverRemoveBtn} onPress={() => removeFolderCover(editFolder.id)}>
                  <Text style={styles.coverRemoveText}>제거</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.folderEmojiLabel}>아이콘 <Text style={styles.folderEmojiHint}>(커버 사진이 없을 때 표시)</Text></Text>
            <View style={styles.emojiGrid}>
              {FOLDER_EMOJIS.map((em) => (
                <TouchableOpacity
                  key={em}
                  style={[styles.emojiChip, editEmoji === em && { borderColor: accent, backgroundColor: hexToRgba(accent, 0.1) }]}
                  onPress={() => setEditEmoji(em)}
                >
                  <Text style={{ fontSize: 20 }}>{em}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: editName.trim() ? accent : '#e5e7eb' }]}
              disabled={!editName.trim()}
              onPress={saveFolderEdit}
            >
              <Text style={[styles.confirmBtnText, { color: editName.trim() ? '#fff' : '#9ca3af' }]}>저장</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteFolderBtn}
              onPress={() => { const t = editFolder; setEditFolder(null); setDeleteTarget(t); }}
            >
              <Text style={styles.deleteFolderText}>폴더 삭제</Text>
            </TouchableOpacity>
          </View>
        </SheetWrap>
      )}

      {/* 폴더 삭제 확인 (폰 프레임 안) */}
      {deleteTarget && (
        <SheetWrap style={styles.overlayWrap}>
          <TouchableOpacity style={styles.overlayBg} activeOpacity={1} onPress={() => setDeleteTarget(null)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.fabSheetTitle}>폴더 삭제</Text>
            <Text style={styles.deleteConfirmMsg}>
              '{deleteTarget.name}' 폴더를 삭제할까요?
              {!deleteTarget.id.startsWith('c_') && '\n기본 폴더는 숨겨지고, 담긴 p!ng는 전체 목록에서 볼 수 있어요.'}
            </Text>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: '#ef4444' }]}
              onPress={() => performDelete(deleteTarget)}
            >
              <Text style={[styles.confirmBtnText, { color: '#ffffff' }]}>삭제</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteFolderBtn} onPress={() => setDeleteTarget(null)}>
              <Text style={[styles.deleteFolderText, { color: '#6b7280' }]}>취소</Text>
            </TouchableOpacity>
          </View>
        </SheetWrap>
      )}
    </SafeAreaView>
  );
}

const lightStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  logo: { fontSize: 27, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  bellBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
  },
  tabRow: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12 },
  tabPill: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 12, padding: 4 },
  tabItem: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  tabItemActive: {
    backgroundColor: 'white', // 'white' 키워드 = 테마 틴트 없이 진짜 흰색 (themed.ts 참고)
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
  tabText: { fontSize: 13, color: '#9ca3af', fontWeight: '500' },
  tabTextActive: { color: '#111827', fontWeight: '600' },
  list: { paddingHorizontal: 20, paddingTop: 12, gap: 10, paddingBottom: 80 },
  emptyState: { alignItems: 'center', paddingTop: 48, gap: 6 },
  emptyText: { fontSize: 14, color: '#9ca3af' },
  emptySubText: { fontSize: 12, color: '#d1d5db' },
  entryCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#f3f4f6',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1,
    gap: 8,
  },
  entryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  entryTitle: { fontSize: 14, fontWeight: '600', color: '#1f2937', flex: 1 },
  entryHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 },
  entryDate: { fontSize: 11, color: '#9ca3af', flexShrink: 0 },
  cardShareBtn: {
    width: 20, height: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  entryBody: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  entryPreview: { fontSize: 12, color: '#9ca3af', flex: 1, lineHeight: 18 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
  viewToggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    paddingHorizontal: 20,
  },
  viewTogglePill: {
    flexDirection: 'row', gap: 4,
    backgroundColor: '#f3f4f6',
    borderRadius: 11, padding: 4,
    alignSelf: 'flex-end',
  },
  viewToggleBtn: {
    paddingHorizontal: 13, paddingVertical: 7, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  viewToggleInner: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  viewToggleText: { fontSize: 12, fontWeight: '600', color: '#9ca3af' },
  folderHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
  },
  folderBackBtn: { width: 60 },
  folderBackText: { fontSize: 13, color: '#6b7280' },
  folderHeaderTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  folderList: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 80 },
  folderGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  folderCard: {
    width: '47%',
    backgroundColor: '#ffffff', borderRadius: 18,
    borderWidth: 1, borderColor: '#f3f4f6',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1,
    overflow: 'hidden',
  },
  // 카드에서 배경으로 은은하게 번지는 글로우 (accent 색이 밖으로 퍼져 사라짐, 색은 인라인 주입)
  gridCell: { width: '48%' },
  glowCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    overflow: 'hidden',
    // 테마색 글로우는 인라인 boxShadow로 주입 (accent가 밖으로 번지며 사라짐)
  },
  folderCoverWrap: {
    width: '100%', height: 112,
    position: 'relative',
  },
  folderCoverImg: { width: '100%', height: '100%' },
  folderCoverEmpty: {
    width: '100%', height: '100%',
    backgroundColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center',
  },
  folderCoverEmoji: { fontSize: 32 },
  folderCoverBanner: { width: '100%', height: 176 },
  folderCoverOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.28)',
    justifyContent: 'flex-end',
  },
  folderCoverScrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  // 커버 하단 한 줄: 왼쪽 뒤로가기 · 오른쪽 폴더명+수정
  folderCoverBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingVertical: 14,
  },
  folderCoverName: {
    fontSize: 19, fontWeight: '800', color: '#fff', letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  folderCameraChip: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  folderHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 60, justifyContent: 'flex-end' },
  folderEditChip: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  folderEditChipLight: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center',
  },
  reorderBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 9, marginBottom: 12,
  },
  reorderBannerText: { flex: 1, fontSize: 12, color: '#374151' },
  reorderCancel: { fontSize: 12.5, fontWeight: '600' },
  folderAddCoverBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999, borderWidth: 1, borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  folderAddCoverText: { fontSize: 11, color: '#6b7280', fontWeight: '600' },
  // 애플뮤직처럼 사진 아래에 놓이는 이름/개수 (이름 옆에 살짝 띄워서)
  folderMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, paddingTop: 7 },
  folderName: { flexShrink: 1, fontSize: 14, fontWeight: '600', color: '#111827', lineHeight: 18 },
  folderCount: { flexShrink: 0, fontSize: 12, color: '#9ca3af', lineHeight: 18 },
  sectionLabel: { fontSize: 12, color: '#9ca3af', marginBottom: 2, paddingHorizontal: 4 },
  groupCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#f3f4f6',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1,
    gap: 8,
  },
  groupTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  groupLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  groupIconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
  },
  groupName: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  groupSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  memberAvatars: { flexDirection: 'row' },
  memberDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#e5e7eb', borderWidth: 2, borderColor: '#ffffff',
    alignItems: 'center', justifyContent: 'center',
  },
  memberDotExtra: { backgroundColor: '#d1d5db' },
  memberDotExtraText: { fontSize: 9, color: '#6b7280', fontWeight: '600' },
  groupPreview: { fontSize: 12, color: '#9ca3af' },
  newGroupCard: {
    borderWidth: 2, borderColor: '#e5e7eb', borderStyle: 'dashed',
    borderRadius: 16, paddingVertical: 24, alignItems: 'center', gap: 6,
  },
  newGroupPlus: { fontSize: 24, color: '#9ca3af' },
  newGroupText: { fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 18 },
  // 그룹 커버 위 카메라(사진 변경) 버튼
  groupCamBtn: {
    position: 'absolute', top: 6, right: 6,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  // 폴더 그리드 톤에 맞춘 '새 그룹' 추가 카드 (커버 카드와 같은 높이 146·둥글기 18)
  groupAddCard: {
    height: 146,
    alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 2, borderColor: '#e5e7eb', borderStyle: 'dashed',
    borderRadius: 18, backgroundColor: '#ffffff',
  },
  groupEmptyHint: { fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 20, paddingVertical: 16 },
  zoomOverlayWrap: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center', justifyContent: 'center',
  },
  zoomCard: { alignItems: 'center', gap: 14 },
  zoomPhoto: { width: 180, height: 180, borderRadius: 32 },
  zoomEmoji: { fontSize: 100 },
  zoomName: { fontSize: 16, fontWeight: '600', color: '#ffffff' },

  overlayWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' },
  overlayBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 32,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  sheetTitleWrap: { flex: 1, gap: 3 },
  sheetTitle: { fontSize: 16, fontWeight: '600', color: '#111827', letterSpacing: -0.2 },
  sheetSub: { fontSize: 12.5, color: '#9ca3af', letterSpacing: -0.1, lineHeight: 17 },
  sheetDesc: { fontSize: 12.5, color: '#9ca3af', letterSpacing: -0.1, lineHeight: 19, marginBottom: 14 },
  sheetClose: { fontSize: 16, color: '#9ca3af', paddingLeft: 12 },
  groupRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: '#f3f4f6',
    marginBottom: 8,
  },
  groupEmoji: { fontSize: 22 },
  groupInfo: { flex: 1 },
  groupMembers: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  checkbox: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1.5,
    borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center',
  },
  checkmark: { fontSize: 12, color: '#fff', fontWeight: '600' },
  confirmBtn: { marginTop: 8, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  confirmBtnText: { fontSize: 14, fontWeight: '600' },

  // 공유 그룹 선택
  shareGroupRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#f3f4f6',
    marginBottom: 8,
  },
  shareGroupName: { flex: 1, fontSize: 14, color: '#374151' },
  shareCheck: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#d1d5db',
    alignItems: 'center', justifyContent: 'center',
  },
  shareCheckMark: { fontSize: 12, color: '#fff', fontWeight: '700' },
  deleteFolderBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 4 },
  deleteFolderText: { fontSize: 13, color: '#ef4444', fontWeight: '600' },
  deleteConfirmMsg: { fontSize: 13, color: '#6b7280', lineHeight: 20, marginBottom: 16 },

  // + 선택 시트
  fabSheetTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 4, marginBottom: 14 },
  fabChoiceList: { gap: 10, paddingTop: 10 },
  fabChoice: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, paddingHorizontal: 14,
    borderRadius: 14, borderWidth: 1, borderColor: '#f3f4f6',
    backgroundColor: '#f9fafb',
  },
  fabChoiceEmoji: { fontSize: 26 },
  fabChoiceIcon: { width: 30, alignItems: 'center' },
  fabChoiceTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },

  // 폴더 만들기 모달
  folderInput: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827',
    marginBottom: 16,
  },
  folderEmojiLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  folderEmojiHint: { fontSize: 11, fontWeight: '400', color: '#9ca3af' },
  coverEditRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  coverThumb: { width: 56, height: 40, borderRadius: 8, backgroundColor: '#f3f4f6' },
  coverThumbEmpty: {
    width: 56, height: 40, borderRadius: 8, backgroundColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center',
  },
  coverPickBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#f9fafb',
  },
  coverPickText: { fontSize: 13, color: '#374151', fontWeight: '600' },
  coverRemoveBtn: { paddingHorizontal: 8, paddingVertical: 8 },
  coverRemoveText: { fontSize: 13, color: '#ef4444', fontWeight: '600' },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  emojiChip: {
    width: 44, height: 44, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#f3f4f6', backgroundColor: '#f9fafb',
    alignItems: 'center', justifyContent: 'center',
  },
});
