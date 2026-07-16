import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput,
  StyleSheet, SafeAreaView, Modal, Image, ActivityIndicator, Keyboard,
  PanResponder, Animated as RNAnimated, Platform,
} from 'react-native';
import TouchableOpacity from '../components/Touchable';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path, Rect, Circle, Polyline } from 'react-native-svg';
import Tag from '../components/Tag';
import IconChev from '../components/icons/IconChev';
import { PERSONAS, MONTHS, DAYS, DiaryEntry, DiaryFolder, mergeFolders, parseBodySegments, extractQuestion, stripPhotoMarkers } from '../data/types';

// ── 블록 에디터: 본문을 텍스트/사진 블록으로 편집, 저장 시 [photo:URL] 마커로 직렬화 ──
type EditorBlock = { type: 'text'; text: string } | { type: 'photo'; url: string };

/** 텍스트 블록끼리 병합하고, 사진 앞뒤에 텍스트 블록을 보장 */
function normalizeBlocks(list: EditorBlock[]): EditorBlock[] {
  const out: EditorBlock[] = [];
  for (const b of list) {
    const last = out[out.length - 1];
    if (b.type === 'text' && last && last.type === 'text') {
      last.text = last.text && b.text ? `${last.text}\n${b.text}` : (last.text || b.text);
      continue;
    }
    if (b.type === 'photo' && (!last || last.type === 'photo')) {
      out.push({ type: 'text', text: '' });
    }
    out.push({ ...b });
  }
  if (out.length === 0 || out[0].type === 'photo') out.unshift({ type: 'text', text: '' });
  if (out[out.length - 1].type === 'photo') out.push({ type: 'text', text: '' });
  return out;
}

/** 기존 일기 → 블록 (대표 사진은 맨 앞, 갤러리 사진은 맨 뒤 블록으로 흡수) */
function entryToBlocks(entry?: Pick<DiaryEntry, 'body' | 'photo' | 'photos'>): EditorBlock[] {
  if (!entry) return [{ type: 'text', text: '' }];
  const segs = parseBodySegments(entry.body || '');
  const bodyUrls = new Set(segs.filter((s) => s.type === 'photo').map((s: any) => s.url));
  const pre: EditorBlock[] = entry.photo && !bodyUrls.has(entry.photo)
    ? [{ type: 'photo', url: entry.photo }] : [];
  const post: EditorBlock[] = (entry.photos ?? [])
    .filter((u) => !bodyUrls.has(u) && u !== entry.photo)
    .map((u) => ({ type: 'photo' as const, url: u }));
  const mid: EditorBlock[] = segs.map((s: any) =>
    s.type === 'text' ? { type: 'text' as const, text: s.text } : { type: 'photo' as const, url: s.url }
  );
  return normalizeBlocks([...pre, ...mid, ...post]);
}

/** 블록 → 저장용 본문 */
function blocksToBody(blocks: EditorBlock[]): string {
  return blocks
    .map((b) => (b.type === 'text' ? b.text : `\n[photo:${b.url}]\n`))
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
import { PersonaIcon, IconFolder, IconPencil } from '../components/icons/Line';
import KeyboardDismissButton from '../components/KeyboardDismissButton';
import { AspectPhoto } from '../components/PhotoThumb';
import PhotoLightbox from '../components/PhotoLightbox';
import { useTheme, hexToRgba } from '../context/ThemeContext';
import { useEntries } from '../context/EntriesContext';
import { useGroups } from '../context/GroupsContext';
import { uploadPhoto, getCachedMe, patchEntry, generateComment } from '../api';
import { saveDraft, listDrafts, deleteDraft, DiaryDraft } from '../data/draftStore';
import { notify } from '../notify';
import { playPing } from '../sound';
import { selectionHaptic } from '../haptics';
import { pickMainPhoto } from '../data/photo';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useThemedStyles } from '../theme/themed';
import FadeIn from '../components/FadeIn';
import SheetWrap from '../components/SheetWrap';

type WriteRoute = RouteProp<RootStackParamList, 'DiaryWrite'>;

/** 단순 라인 아이콘들 (Feather 스타일) */
type IconProps = { color: string; size?: number };
function IconCamera({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <Circle cx="12" cy="13" r="4" />
    </Svg>
  );
}
function IconAlbum({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="3" width="18" height="18" rx="3" />
      <Circle cx="8.5" cy="8.5" r="1.5" />
      <Path d="M21 15l-5-5L5 21" />
    </Svg>
  );
}
function IconLock({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Svg>
  );
}
function IconUsers({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <Circle cx="9" cy="7" r="4" />
      <Path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  );
}
function IconMessage({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </Svg>
  );
}
function IconRefresh({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="23 4 23 10 17 10" />
      <Polyline points="1 20 1 14 7 14" />
      <Path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </Svg>
  );
}
function IconQuote({ color, size = 16 }: IconProps) {
  return (
    // 180도 회전 → 여는 따옴표(“) 방향
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ transform: [{ rotate: '180deg' }] }}>
      <Path d="M7 7h5v5c0 2.4-1.7 4.3-4.1 4.9l-.4-1.5c1.3-.3 2.2-1.1 2.4-2.3H7V7zm7 0h5v5c0 2.4-1.7 4.3-4.1 4.9l-.4-1.5c1.3-.3 2.2-1.1 2.4-2.3H14V7z" />
    </Svg>
  );
}

/** AI 프롬프트 질문 (새로고침으로 순환) — 부드러운 반말 톤 */
const PROMPTS = [
  '오늘 솔직히 어땠어?',
  '오늘 뭐가 제일 별로였어?',
  '요즘 뭐가 제일 재밌어?',
  '오늘 뭐 먹었어? 맛있었어?',
  '오늘 누구 때문에 웃었어?',
  '오늘 언제 시간이 제일 빨리 갔어?',
  '오늘 제일 귀찮았던 건 뭐였어?',
  '요즘 돈을 어디에 제일 많이 써?',
  '요즘 잠은 잘 자? 어제 몇 시에 잤어?',
  '요즘 무슨 생각하면서 지내?',
  '오늘 후회되는 거 하나 있어?',
  '요즘 누가 제일 자주 생각나?',
  '오늘 아무한테도 말 안 한 거, 있지 않아?',
  '요즘 뭐가 제일 불안해?',
  '오늘 나한테 잘한 거 하나만 적어보는 건 어때?',
  '별일 없었으면, 별일 없는 하루는 어땠어?',
  '오늘 같은 하루가 반복돼도 괜찮을까?',
  '요즘의 나, 몇 점일까?',
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function DiaryWriteScreen() {
  const styles = useThemedStyles(lightStyles);
  const navigation = useNavigation();
  const route = useRoute<WriteRoute>();
  const editEntry = route.params?.entry;
  const { accent } = useTheme();
  const { addEntry, updateEntry, updateLocal } = useEntries();
  const today = new Date();
  const [title, setTitle] = useState(editEntry?.title ?? '');
  // 본문: 텍스트/사진 블록 에디터 (사진이 입력창 사이에 실제로 보임)
  // 본문 맨 앞의 [q:질문] 마커는 분리해서 '오늘의 질문' 선택 상태로
  const initQ = extractQuestion(editEntry?.body ?? '');
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(initQ.question);
  const [movingPhotoUrl, setMovingPhotoUrl] = useState<string | null>(null); // 사진 드래그 이동 중
  const [blocks, setBlocks] = useState<EditorBlock[]>(
    () => entryToBlocks(editEntry ? { ...editEntry, body: initQ.rest } : undefined)
  );
  // ── 사진 꾹 눌러 드래그로 위치 이동 ──
  // 끌 때는 사진만 손가락을 따라오고, '놓는 순간' 이동 거리로 목적지를 한 번에 계산한다.
  // (드래그 중 실시간 자리 교체는 재정렬로 인덱스·높이가 계속 밀려 버벅임·오배치의 원인이었음)
  const blocksRef = useRef<EditorBlock[]>([]);
  const blockHeights = useRef<Record<number, number>>({}); // 블록 index → 측정 높이 (onLayout)
  const dragY = useRef(new RNAnimated.Value(0)).current;   // 드래그 중 사진의 화면상 이동량
  const drag = useRef({ active: false, url: '', dy: 0 });
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const BLOCK_GAP = 12;

  function endPhotoDrag() {
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
    if (!drag.current.active) return;
    const { url, dy } = drag.current;
    drag.current.active = false;
    setMovingPhotoUrl(null);
    dragY.setValue(0); // 재정렬과 동시에 원위치 (스프링을 쓰면 이동 후 위치에 이중 오프셋이 생김)

    // 이동 거리(dy)로 몇 블록을 건너뛰는지 계산해 한 번에 재배치
    const list = blocksRef.current;
    const from = list.findIndex((b) => b.type === 'photo' && (b as any).url === url);
    if (from < 0) return;
    let remaining = Math.abs(dy);
    let target = from;
    const dir = dy < 0 ? -1 : 1;
    while (true) {
      const nextIdx = target + dir;
      if (nextIdx < 0 || nextIdx >= list.length) break;
      const h = (blockHeights.current[nextIdx] ?? 0) + BLOCK_GAP;
      if (h <= BLOCK_GAP || remaining < h * 0.6) break; // 다음 블록의 60% 못 넘으면 멈춤
      remaining -= h;
      target = nextIdx;
    }
    if (target !== from) {
      setBlocks((prev) => {
        const next = [...prev];
        const i = next.findIndex((b) => b.type === 'photo' && (b as any).url === url);
        if (i < 0) return prev;
        const [photo] = next.splice(i, 1);
        next.splice(Math.min(target, next.length), 0, photo);
        return normalizeBlocks(next);
      });
    }
  }

  const photoDragPan = useRef(
    PanResponder.create({
      // 드래그 모드가 켜진 뒤의 움직임만 가로챈다 (평소엔 스크롤·탭 그대로)
      onMoveShouldSetPanResponderCapture: () => drag.current.active,
      onPanResponderTerminationRequest: () => !drag.current.active,
      onPanResponderMove: (_, g) => {
        if (!drag.current.active) return;
        drag.current.dy = g.dy;
        dragY.setValue(g.dy); // 시각적 이동만 — 재정렬은 놓을 때 한 번
      },
      onPanResponderRelease: () => endPhotoDrag(),
      onPanResponderTerminate: () => endPhotoDrag(),
    })
  ).current;

  /** 사진에 손가락을 올렸을 때: 280ms 유지하면 드래그 모드 시작 */
  function startHold(url: string) {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => {
      drag.current = { active: true, url, dy: 0 };
      dragY.setValue(0);
      setMovingPhotoUrl(url); // 스크롤 잠금 + 들어올린 스타일
    }, 280);
  }
  function cancelHold() {
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
  }
  blocksRef.current = blocks;
  const focusRef = useRef({ block: 0, sel: { start: 0, end: 0 } }); // 사진 삽입 위치(커서)
  const [tags, setTags] = useState<string[]>(editEntry?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [persona, setPersona] = useState(editEntry?.persona ?? '선생님');
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null); // 사진 확대
  // 대표(썸네일)로 지정한 사진. 지정 안 했거나 그 사진이 지워지면 첫 사진이 대표가 된다
  const [coverPhoto, setCoverPhoto] = useState<string | null>(editEntry?.photo ?? null);

  const resolveMainPhoto = () =>
    pickMainPhoto(blocks.filter((b) => b.type === 'photo').map((b: any) => b.url as string), coverPhoto);
  const [uploading, setUploading] = useState(false);
  const [visibility, setVisibility] = useState<'private' | 'friends'>(editEntry?.visibility ?? 'private');
  // 그룹 공개 시 공유할 그룹 선택
  const { groups } = useGroups();
  const [shareGroupIds, setShareGroupIds] = useState<Set<number>>(() => {
    if (editEntry?.visibility === 'friends') {
      // sharedGroups=null은 "모든 그룹 공개"(레거시) — 전체 선택으로 시드해 의미 보존
      if (editEntry.sharedGroups?.length) return new Set(editEntry.sharedGroups);
      return new Set(groups.map((g) => g.id));
    }
    return new Set();
  });
  const [groupPickOpen, setGroupPickOpen] = useState(false);
  // 시트 열기 전 상태 백업 — 바깥 탭(취소) 시 복원해 실수로 공개되는 것 방지
  const shareBackupRef = useRef<{ ids: Set<number>; visibility: 'private' | 'friends' } | null>(null);

  function openGroupPick() {
    shareBackupRef.current = { ids: new Set(shareGroupIds), visibility };
    // 처음 열 때(선택 없음)는 모든 그룹 체크로 시작
    if (shareGroupIds.size === 0 && groups.length > 0) {
      setShareGroupIds(new Set(groups.map((g) => g.id)));
    }
    Keyboard.dismiss();
    setGroupPickOpen(true);
  }

  /** 바깥 탭 = 취소: 열기 전 선택·공개 상태로 되돌리고 닫는다 (확정은 아래 버튼만) */
  function cancelGroupPick() {
    if (shareBackupRef.current) {
      setShareGroupIds(shareBackupRef.current.ids);
      setVisibility(shareBackupRef.current.visibility);
    }
    setGroupPickOpen(false);
  }

  function toggleShareGroup(id: number) {
    setShareGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function confirmGroupPick() {
    setVisibility(shareGroupIds.size > 0 ? 'friends' : 'private');
    setGroupPickOpen(false);
  }
  const [calOpen, setCalOpen] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);
  const [personaModalOpen, setPersonaModalOpen] = useState(false);
  const [folder, setFolder] = useState<string | undefined>(editEntry?.folder ?? route.params?.folder ?? undefined);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  // 달력은 수정 시 원래 작성월, 새 글은 이번 달로 기본 설정
  const initDate = editEntry ? new Date(editEntry.createdAt) : today;
  const [calYear, setCalYear] = useState(initDate.getFullYear());
  const [calMonth, setCalMonth] = useState(initDate.getMonth());
  const [selectedDates, setSelectedDates] = useState<number[]>(editEntry?.dates ?? [today.getDate()]);

  // ── 임시저장함 (새 글에서만) ──
  const [drafts, setDrafts] = useState<DiaryDraft[]>([]);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null); // 이어쓰는 중인 초안 id
  const [draftSaved, setDraftSaved] = useState(false);

  useEffect(() => {
    if (editEntry) return;
    let cancelled = false;
    listDrafts().then((list) => { if (!cancelled) setDrafts(list); }).catch(() => {});
    return () => { cancelled = true; };
  }, [editEntry]);

  // 임시저장 후 내용을 더 고치면 '저장됨 ✓' 해제 (최신 내용까지 저장된 것처럼 보이지 않게)
  useEffect(() => { setDraftSaved(false); }, [title, blocks, tags]);

  /** 현재 작성 중인 내용을 임시저장함에 저장한다 (이어쓰던 초안이면 갱신). 성공 여부 반환 */
  async function handleSaveDraft(): Promise<boolean> {
    const draftBody = (selectedPrompt ? `[q:${selectedPrompt}]\n` : '') + blocksToBody(blocks);
    if (!title.trim() && !draftBody.trim()) {
      notify('내용을 입력한 뒤 임시저장할 수 있어요.');
      return false;
    }
    const firstPhoto = resolveMainPhoto();
    try {
      const saved = await saveDraft({
        id: draftId,
        title, body: draftBody, tags, persona, folder,
        dates: selectedDates,
        calYear, calMonth, // 날짜가 속한 연·월도 저장 (다른 달에 복원해도 원래 달 유지)
        photo: firstPhoto,
        photos: [],
        visibility,
      });
      setDraftId(saved.id);
      setDrafts(await listDrafts());
      setDraftSaved(true);
      notify('임시저장했어요. 임시저장함에서 이어쓸 수 있어요.');
      return true;
    } catch {
      notify('임시저장에 실패했어요.');
      return false;
    }
  }

  // ── 취소 시 임시저장 확인 ──
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const allowLeaveRef = useRef(false); // 발행·명시적 나가기 등 '허용된' 이탈 표시

  // 모달 쓸어내리기·뒤로가기 등 어떤 경로로 나가더라도, 쓰던 내용이 있으면 먼저 확인을 띄운다
  useEffect(() => {
    const unsub = (navigation as any).addListener('beforeRemove', (e: any) => {
      if (allowLeaveRef.current || editEntry) return;
      const hasContent = title.trim().length > 0 || blocksToBody(blocks).trim().length > 0;
      if (!hasContent || draftSaved) return;
      e.preventDefault();
      setExitConfirmOpen(true);
    });
    return unsub;
  }, [navigation, title, blocks, draftSaved, editEntry]);

  /** 취소: 새 글에 쓰다 만 내용이 있으면 임시저장 여부를 먼저 묻는다 */
  function handleCancel() {
    const hasContent = title.trim().length > 0 || blocksToBody(blocks).trim().length > 0;
    if (!editEntry && hasContent && !draftSaved) {
      setExitConfirmOpen(true);
      return;
    }
    navigation.goBack();
  }

  /** 임시저장하고 나가기 (저장 실패 시엔 화면에 남는다) */
  async function saveDraftAndExit() {
    const ok = await handleSaveDraft();
    setExitConfirmOpen(false);
    if (ok) { allowLeaveRef.current = true; navigation.goBack(); }
  }

  /** 임시저장함의 초안을 작성 화면으로 불러온다 */
  function restoreDraft(d: DiaryDraft) {
    setTitle(d.title);
    const dq = extractQuestion(d.body);
    setSelectedPrompt(dq.question);
    setBlocks(entryToBlocks({ body: dq.rest, photo: null, photos: [] }));
    setCoverPhoto(d.photo ?? null); // 초안이 기억하는 대표 사진 복원
    setTags(d.tags);
    setPersona(d.persona);
    setFolder(d.folder);
    setSelectedDates(d.dates);
    // 초안이 기억하는 연·월로 달력 복원 (없는 구초안은 현재 달 유지)
    if (typeof d.calYear === 'number') setCalYear(d.calYear);
    if (typeof d.calMonth === 'number') setCalMonth(d.calMonth);
    setVisibility(d.visibility);
    setDraftId(d.id);
    setDraftSaved(false);
    setDraftsOpen(false);
  }

  /** 초안 하나를 임시저장함에서 삭제한다 */
  async function removeDraft(id: string) {
    try {
      await deleteDraft(id);
      if (id === draftId) setDraftId(null);
      setDrafts(await listDrafts());
    } catch {
      notify('삭제에 실패했어요.');
    }
  }

  /** 초안 저장 시각을 "7 월 12 일 14:03" 형태로 표시한다 */
  function draftTimeLabel(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${d.getMonth() + 1} 월 ${d.getDate()} 일 ${hh}:${mm}`;
  }

  // 홈 화면과 동일한 순서(사용자 재정렬 반영)로 폴더 목록 구성
  const cachedMe = getCachedMe();
  const allFolders: DiaryFolder[] = mergeFolders(
    (cachedMe?.folders ?? []) as DiaryFolder[],
    cachedMe?.hidden_folders ?? []
  );
  const currentFolder = allFolders.find((f) => f.id === folder);

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);
  const calGrid: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (calGrid.length % 7 !== 0) calGrid.push(null);

  function toggleDate(day: number) {
    setSelectedDates((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  }

  // 달 이동: 12월↔1월에서 연도 롤오버 + 이전 달에서 고른 날짜는 무효화
  // (3월에서 고른 15일이 달만 넘긴 채 저장하면 4월 15일로 기록되는 것 방지)
  function shiftCalMonth(delta: number) {
    const next = new Date(calYear, calMonth + delta, 1);
    setCalYear(next.getFullYear());
    setCalMonth(next.getMonth());
    setSelectedDates([]);
  }

  function addTag() {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput('');
  }

  // 앨범에서 선택(여러 장 가능) → 커서 위치에 삽입
  async function insertPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true, // 여러 장 선택 (allowsEditing과는 동시 사용 불가)
      orderedSelection: true,        // 고른 순서대로 번호 표시·삽입
      selectionLimit: 10,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;
    await insertAssets(result.assets);
  }

  // 카메라로 바로 촬영 → 커서 위치에 삽입
  async function insertCameraPhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      notify('카메라 접근을 허용해야 촬영할 수 있어요. 설정 > p!ng에서 켤 수 있어요.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (result.canceled || !result.assets?.length) return;
    await insertAssets(result.assets);
  }

  // 공통: 업로드 → 커서 위치에 순서대로 사진 블록 삽입
  async function insertAssets(assets: { uri: string }[]) {
    setUploading(true);
    try {
      // 고른 순서 보장을 위해 순차 업로드
      const urls: string[] = [];
      for (const a of assets) urls.push(await uploadPhoto(a.uri));
      setBlocks((prev) => {
        const next = prev.map((b) => ({ ...b }));
        // 커서가 있던 텍스트 블록에서 분할 삽입 (없으면 마지막 텍스트 블록 끝에)
        let idx = focusRef.current.block;
        if (idx < 0 || idx >= next.length || next[idx].type !== 'text') {
          idx = next.map((b) => b.type).lastIndexOf('text');
        }
        const t = next[idx] as { type: 'text'; text: string };
        const pos = Math.min(focusRef.current.sel?.start ?? t.text.length, t.text.length);
        const before = t.text.slice(0, pos).replace(/\n$/, '');
        const after = t.text.slice(pos).replace(/^\n/, '');
        next.splice(idx, 1,
          { type: 'text', text: before },
          ...urls.map((url) => ({ type: 'photo' as const, url })),
          { type: 'text', text: after },
        );
        return normalizeBlocks(next); // 연속 사진 사이 빈 텍스트 블록은 자동 삽입됨
      });
    } catch (e: any) {
      notify(e?.message ?? '사진 업로드에 실패했어요. 다시 시도해주세요.');
    } finally {
      setUploading(false);
    }
  }

  // 사진 블록 제거 (앞뒤 텍스트는 자동 병합)
  function removePhotoBlock(i: number) {
    setMovingPhotoUrl((cur) => (cur === (blocks[i] as any)?.url ? null : cur));
    setBlocks((prev) => normalizeBlocks(prev.filter((_, j) => j !== i)));
  }

  // 사진 위치 이동: 꾹 눌러 이동 모드 진입 → 위/아래로 원하는 자리까지 (url로 추적, 재정렬해도 유지)
  function movePhotoByUrl(url: string, dir: 1 | -1) {
    setBlocks((prev) => {
      const i = prev.findIndex((b) => b.type === 'photo' && b.url === url);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return normalizeBlocks(next);
    });
  }

  function dateLabel() {
    if (selectedDates.length === 0) return '날짜 선택';
    if (selectedDates.length === 1) return `${MONTHS[calMonth]} ${selectedDates[0]} 일`;
    return `${MONTHS[calMonth]} ${selectedDates[0]} 일 ~ ${selectedDates[selectedDates.length - 1]} 일`;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel}>
          <Text style={styles.cancelText}>취소</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editEntry ? 'p!ng 수정' : '오늘의 p!ng'}</Text>
        <View style={styles.headerRight}>
          {!editEntry && (
            <TouchableOpacity style={styles.draftBtn} onPress={handleSaveDraft}>
              <Text style={styles.draftBtnText}>{draftSaved ? '저장됨 ✓' : '임시저장'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: accent }]}
            onPress={async () => {
              // 달력에서 고른 연·월·일을 일기 날짜(createdAt)로 반영 (시각은 원래 것 유지)
              // 날짜를 안 골랐으면 달력을 둘러보기만 한 것이므로 원래 날짜 유지
              const base = editEntry ? new Date(editEntry.createdAt) : new Date();
              const diaryDate = selectedDates.length > 0
                ? new Date(calYear, calMonth, selectedDates[0], base.getHours(), base.getMinutes(), base.getSeconds())
                : base;
              const createdAtISO = isNaN(diaryDate.getTime()) ? base.toISOString() : diaryDate.toISOString();
              const storedBody = (selectedPrompt ? `[q:${selectedPrompt}]\n` : '') + blocksToBody(blocks); // 질문+블록 → 마커 본문
              // 제목을 안 쓰면 일기 날짜가 제목이 된다 (예: "7 월 14 일의 p!ng")
              const titleDate = new Date(createdAtISO);
              const finalTitle = title.trim() || `${MONTHS[titleDate.getMonth()]} ${titleDate.getDate()} 일의 p!ng`;
              // 대표로 지정한 사진(없으면 본문 첫 사진)이 목록 썸네일이 된다
              const mainPhoto = resolveMainPhoto();

              if (editEntry) {
                const personaChanged = editEntry.persona !== persona;
                const needRegen = personaChanged && !!editEntry.aiComment;
                const updated = {
                  // 날짜를 안 골랐으면(달력만 둘러본 경우) 기존 날짜 배지 유지
                  ...editEntry, title: finalTitle, body: storedBody, tags, persona, folder,
                  dates: selectedDates.length > 0 ? selectedDates : (editEntry.dates ?? []),
                  photo: mainPhoto, photos: [], visibility,
                  sharedGroups: visibility === 'friends' && shareGroupIds.size > 0 ? Array.from(shareGroupIds) : null,
                  createdAt: createdAtISO,
                };
                updateLocal(updated); // 화면 즉시 반영
                playPing();
                allowLeaveRef.current = true;
                navigation.goBack();
                try {
                  const saved = await patchEntry(updated); // 내용·페르소나·폴더 저장
                  updateLocal(saved);
                  // 페르소나가 바뀌었고 이미 코멘트가 있으면 새 말투로 다시 생성
                  if (needRegen) {
                    const regen = await generateComment(saved.id, persona);
                    updateLocal(regen);
                  }
                } catch (e: any) {
                  notify(e?.message ?? '저장에 실패했어요. 잠시 후 다시 시도해주세요.');
                }
              } else {
                addEntry({
                  id: Date.now() + Math.random(), // 낙관적 임시 id (같은 ms 더블 저장 충돌 방지)
                  title: finalTitle,
                  body: storedBody,
                  tags,
                  persona,
                  folder,
                  dates: selectedDates,
                  photo: mainPhoto,
                  photos: [],
                  visibility,
                  sharedGroups: visibility === 'friends' && shareGroupIds.size > 0 ? Array.from(shareGroupIds) : null,
                  createdAt: createdAtISO,
                });
                if (draftId) deleteDraft(draftId).catch(() => {}); // 발행했으니 이 초안만 정리
                playPing();
                allowLeaveRef.current = true;
                navigation.goBack();
              }
            }}
          >
            <Text style={styles.saveBtnText}>{editEntry ? '저장' : 'p!ng'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 드래그 제스처는 래퍼에서 캡처 (드래그 모드일 때만 — 평소 스크롤·탭은 그대로) */}
      <View style={{ flex: 1 }} {...photoDragPan.panHandlers}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        // iOS: 키보드가 올라오면 그만큼 인셋을 줘서 커서/글자가 가려지지 않게
        automaticallyAdjustKeyboardInsets
        // 사진 드래그 중에는 스크롤이 손가락을 뺏지 않게 잠금
        scrollEnabled={!movingPhotoUrl}
      >
        {/* 임시저장함 배너 (새 글에서만) */}
        {!editEntry && drafts.length > 0 && (
          <FadeIn>
            {/* 배너 전체가 버튼 — 어디를 눌러도 임시저장함이 열린다 */}
            <TouchableOpacity
              style={[styles.draftBanner, { borderColor: hexToRgba(accent, 0.3), backgroundColor: hexToRgba(accent, 0.07) }]}
              onPress={() => { Keyboard.dismiss(); setDraftsOpen(true); }}
              activeOpacity={0.8}
            >
              <IconPencil size={14} color={accent} />
              <Text style={styles.draftBannerText} numberOfLines={1}>
                임시저장함에 {drafts.length} 개의 글이 있어요
              </Text>
              <IconChev dir="right" size={14} color={accent} />
            </TouchableOpacity>
          </FadeIn>
        )}

        {/* Date + Tags (같은 줄) */}
        <View style={styles.dateTagRow}>
          <TouchableOpacity style={styles.dateBtn} onPress={() => { Keyboard.dismiss(); setCalOpen(true); }}>
            <View style={styles.dateDot} />
            <Text style={styles.dateBtnText}>{dateLabel()}</Text>
            <IconChev dir="right" size={14} color="#9ca3af" />
          </TouchableOpacity>

          <View style={[styles.tagRow, styles.tagRowInline]}>
          {tags.map((t) => (
            <TouchableOpacity key={t} onPress={() => setTags(tags.filter((x) => x !== t))}>
              <View style={[styles.tagRemovable, { backgroundColor: hexToRgba(accent, 0.12), borderColor: hexToRgba(accent, 0.28) }]}>
                <Text style={[styles.tagHash, { color: accent }]}>#</Text>
                <Text style={[styles.tagLabel, { color: accent }]}>{t}</Text>
                <Text style={[styles.tagX, { color: accent }]}>×</Text>
              </View>
            </TouchableOpacity>
          ))}
          <TextInput
            style={styles.tagInput}
            value={tagInput}
            onChangeText={setTagInput}
            onSubmitEditing={addTag}
            placeholder="+ 태그 추가"
            placeholderTextColor="#9ca3af"
            returnKeyType="done"
          />
          </View>
        </View>

        {/* 오늘의 질문 — 탭하면 '이 질문에 답하기'로 선택되고 일기에 함께 저장됨 */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setSelectedPrompt((cur) => (cur ? null : PROMPTS[promptIndex]))}
          style={[
            styles.promptCard,
            { backgroundColor: hexToRgba(accent, selectedPrompt ? 0.18 : 0.1), borderColor: hexToRgba(accent, selectedPrompt ? 0.5 : 0.2) },
          ]}
        >
          <IconQuote color={accent} size={20} />
          <View style={{ flex: 1 }}>
            <Text style={styles.promptText}>{selectedPrompt ?? PROMPTS[promptIndex]}</Text>
            <Text style={[styles.promptSelectHint, { color: accent }]}>
              {selectedPrompt ? '✓ 이 질문에 답하는 중 · 탭하면 해제' : '탭하면 이 질문에 답하는 일기가 돼요'}
            </Text>
          </View>
          {!selectedPrompt && (
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); setPromptIndex((i) => (i + 1) % PROMPTS.length); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <IconRefresh color={accent} size={16} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Title */}
        <TextInput
          style={styles.titleInput}
          value={title}
          onChangeText={setTitle}
          placeholder="제목을 입력하세요"
          placeholderTextColor="#d1d5db"
        />

        {/* Body — 텍스트/사진 블록 에디터 (사진이 글 사이에 실제로 보임) */}
        {blocks.map((b, i) =>
          b.type === 'text' ? (
            <TextInput
              key={`t${i}`}
              style={[
                styles.bodyInput,
                // multiline이 내용에 맞춰 자동으로 늘어나므로 '최소 높이'만 지정.
                // (예전엔 인덱스별 측정 높이를 주입했는데, 블록 순서가 바뀌면 남의 높이가 남아 여백이 튀었음)
                { minHeight: blocks.length === 1 ? 180 : (b.text === '' ? 22 : 40) },
              ]}
              value={b.text}
              multiline
              scrollEnabled={false}
              textAlignVertical="top"
              placeholder={i === 0 ? '오늘의 일상을 자유롭게 p!ng해보세요...' : undefined}
              placeholderTextColor="#d1d5db"
              onChangeText={(t) =>
                setBlocks((prev) => prev.map((x, j) => (j === i ? { type: 'text', text: t } : x)))
              }
              onFocus={() => { focusRef.current.block = i; }}
              onSelectionChange={(e) => { focusRef.current = { block: i, sel: e.nativeEvent.selection }; }}
              onLayout={(e) => { blockHeights.current[i] = e.nativeEvent.layout.height; }}
            />
          ) : (
            <RNAnimated.View
              key={`p-${b.url}`}
              onLayout={(e) => { blockHeights.current[i] = e.nativeEvent.layout.height; }}
              // 손가락을 280ms 유지하면 드래그 모드 — 그대로 끌어서 위치 이동
              onTouchStart={() => startHold(b.url)}
              onTouchMove={() => { if (!drag.current.active) cancelHold(); }}
              onTouchEnd={() => { cancelHold(); endPhotoDrag(); }}
              style={[
                styles.blockPhotoWrap,
                movingPhotoUrl === b.url && {
                  transform: [{ translateY: dragY }, { scale: 1.03 }],
                  zIndex: 10, elevation: 8,
                  shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
                  borderWidth: 2, borderColor: accent, borderRadius: 14,
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => { if (!movingPhotoUrl) setLightboxPhoto(b.url); }}
              >
                <AspectPhoto photo={b.url} minRatio={1} />
              </TouchableOpacity>
              {movingPhotoUrl !== b.url && (
                <TouchableOpacity style={styles.photoRemove} onPress={() => removePhotoBlock(i)}>
                  <Text style={styles.photoRemoveText}>✕</Text>
                </TouchableOpacity>
              )}
              {/* 대표 사진 선택: 사진이 2장 이상일 때만 배지 노출 (1장이면 자동 대표) */}
              {movingPhotoUrl !== b.url && blocks.filter((x) => x.type === 'photo').length > 1 && (
                resolveMainPhoto() === b.url ? (
                  <View style={[styles.mainPhotoBadge, { backgroundColor: accent }]}>
                    <Text style={styles.mainPhotoBadgeText}>★ 대표</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.mainPhotoBadge}
                    onPress={() => { selectionHaptic(); setCoverPhoto(b.url); }}
                  >
                    <Text style={styles.mainPhotoBadgeText}>대표로</Text>
                  </TouchableOpacity>
                )
              )}
            </RNAnimated.View>
          )
        )}

        {/* 사진 추가: 촬영 또는 앨범에서 골라 커서 위치에 삽입 */}
        <View style={styles.photoBtnRow}>
          <TouchableOpacity style={styles.inlinePhotoBtn} onPress={insertCameraPhoto} disabled={uploading}>
            {uploading
              ? <ActivityIndicator color="#9ca3af" size="small" />
              : (
                <>
                  <IconCamera color="#6b7280" size={14} />
                  <Text style={styles.inlinePhotoBtnText}>촬영</Text>
                </>
              )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.inlinePhotoBtn} onPress={insertPhoto} disabled={uploading}>
            {uploading
              ? <ActivityIndicator color="#9ca3af" size="small" />
              : (
                <>
                  <IconAlbum color="#6b7280" size={14} />
                  <Text style={styles.inlinePhotoBtnText}>앨범</Text>
                </>
              )}
          </TouchableOpacity>
        </View>

        {/* Visibility */}
        <View style={styles.visRow}>
          <TouchableOpacity
            style={[styles.visBtn, visibility === 'private' && { borderColor: accent, backgroundColor: `${accent}0d` }]}
            onPress={() => setVisibility('private')}
          >
            <IconLock color={visibility === 'private' ? accent : '#6b7280'} size={15} />
            <Text style={[styles.visLabel, visibility === 'private' && { color: accent, fontWeight: '600' }]}>나만 보기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.visBtn, visibility === 'friends' && { borderColor: accent, backgroundColor: `${accent}0d` }]}
            onPress={openGroupPick}
          >
            <IconUsers color={visibility === 'friends' ? accent : '#6b7280'} size={15} />
            <Text style={[styles.visLabel, visibility === 'friends' && { color: accent, fontWeight: '600' }]}>
              그룹 공개{visibility === 'friends' && shareGroupIds.size > 0 ? ` · ${shareGroupIds.size}` : ''}
            </Text>
          </TouchableOpacity>
        </View>
        {visibility === 'friends' && (
          <Text style={styles.visHint}>
            선택한 {shareGroupIds.size} 개 그룹의 피드에 이 p!ng가 공개돼요. 버튼을 다시 누르면 바꿀 수 있어요.
          </Text>
        )}

        {/* Folder card */}
        <TouchableOpacity style={styles.aiCard} onPress={() => { Keyboard.dismiss(); setFolderModalOpen(true); }} activeOpacity={0.85}>
          <View style={[styles.aiCardIcon, { backgroundColor: hexToRgba(accent, 0.12) }]}>
            <IconFolder color={accent} size={16} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.aiCardTitle}>폴더</Text>
            <Text style={styles.aiCardSub}>{currentFolder ? currentFolder.name : '폴더 없음'}</Text>
          </View>
          <IconChev dir="right" size={16} color="#9ca3af" />
        </TouchableOpacity>

        {/* AI comment card */}
        <TouchableOpacity style={styles.aiCard} onPress={() => { Keyboard.dismiss(); setPersonaModalOpen(true); }} activeOpacity={0.85}>
          <View style={[styles.aiCardIcon, { backgroundColor: hexToRgba(accent, 0.12) }]}>
            <IconMessage color={accent} size={16} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.aiCardTitle}>p0ng</Text>
            <Text style={styles.aiCardSub}>{persona} · 10 시간 뒤 도착</Text>
          </View>
          <IconChev dir="right" size={16} color="#9ca3af" />
        </TouchableOpacity>
      </ScrollView>
      </View>

      {/* 페르소나 선택 모달 */}
      {/* 임시저장함 모달 */}
      {draftsOpen && (
      <SheetWrap style={styles.overlayWrap}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDraftsOpen(false)}>
          <TouchableOpacity activeOpacity={1}>
            <View style={styles.personaModal}>
              <Text style={styles.personaModalTitle}>임시저장함</Text>
              <Text style={styles.personaModalSub}>이어 쓸 글을 골라주세요</Text>
              {drafts.length === 0 ? (
                <Text style={styles.draftEmptyText}>임시저장된 글이 없어요.</Text>
              ) : (
                <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                  {drafts.map((d) => (
                    <TouchableOpacity
                      key={d.id}
                      style={[styles.draftRow, d.id === draftId && { borderColor: accent, backgroundColor: hexToRgba(accent, 0.08) }]}
                      onPress={() => restoreDraft(d)}
                    >
                      <View style={styles.draftRowBody}>
                        <Text style={styles.draftRowTitle} numberOfLines={1}>
                          {d.title.trim() || stripPhotoMarkers(extractQuestion(d.body).rest).trim() || '(제목 없음)'}
                        </Text>
                        <Text style={styles.draftRowTime}>{draftTimeLabel(d.savedAt)}</Text>
                      </View>
                      <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={() => removeDraft(d.id)}>
                        <Text style={styles.draftRowDelete}>삭제</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </SheetWrap>
      )}

      {personaModalOpen && (
      <SheetWrap style={styles.overlayWrap}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPersonaModalOpen(false)}>
          <TouchableOpacity activeOpacity={1}>
            <View style={styles.personaModal}>
              <Text style={styles.personaModalTitle}>p0ng 페르소나</Text>
              <Text style={styles.personaModalSub}>어떤 말투로 p0ng을 받을까요? (AI가 페르소나의 말투로 써줘요)</Text>
              <View style={styles.personaGrid}>
                {PERSONAS.map((p) => (
                  <TouchableOpacity
                    key={p.label}
                    style={[styles.personaCard, persona === p.label && { backgroundColor: accent, borderColor: accent }]}
                    onPress={() => { selectionHaptic(); setPersona(p.label); setPersonaModalOpen(false); }}
                  >
                    <PersonaIcon persona={p.label} size={20} color={persona === p.label ? '#ffffff' : '#6b7280'} />
                    <Text style={[styles.personaLabel, persona === p.label && styles.personaLabelActive]}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </SheetWrap>
      )}

      {/* 폴더 선택 모달 */}
      {folderModalOpen && (
      <SheetWrap style={styles.overlayWrap}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setFolderModalOpen(false)}>
          <TouchableOpacity activeOpacity={1}>
            <View style={styles.personaModal}>
              <Text style={styles.personaModalTitle}>폴더 선택</Text>
              <Text style={styles.personaModalSub}>이 p!ng를 어떤 폴더에 넣을까요?</Text>
              <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                {allFolders.map((f) => {
                  const active = folder === f.id;
                  return (
                    <TouchableOpacity
                      key={f.id}
                      style={[styles.folderRow, active && { borderColor: accent, backgroundColor: hexToRgba(accent, 0.08) }]}
                      onPress={() => { setFolder(f.id); setFolderModalOpen(false); }}
                    >
                      <Text style={[styles.folderRowLabel, active && { color: accent, fontWeight: '600' }]}>{f.name}</Text>
                      {active && <Text style={[styles.folderRowCheck, { color: accent }]}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </SheetWrap>
      )}

      {/* 그룹 공개 대상 선택 모달 */}
      {groupPickOpen && (
      <SheetWrap style={styles.overlayWrap}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={cancelGroupPick}>
          <TouchableOpacity activeOpacity={1}>
            <View style={styles.personaModal}>
              <Text style={styles.personaModalTitle}>그룹 공개</Text>
              <Text style={styles.personaModalSub}>
                {groups.length === 0
                  ? '아직 참여 중인 그룹이 없어요. 그룹을 만들거나 참여해보세요.'
                  : '공개할 그룹을 골라주세요. 아무것도 고르지 않으면 나만 보기예요.'}
              </Text>
              <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
                {groups.map((g) => {
                  const active = shareGroupIds.has(g.id);
                  return (
                    <TouchableOpacity
                      key={g.id}
                      style={[styles.folderRow, active && { borderColor: accent, backgroundColor: hexToRgba(accent, 0.08) }]}
                      onPress={() => toggleShareGroup(g.id)}
                    >
                      <Text style={[styles.folderRowLabel, active && { color: accent, fontWeight: '600' }]} numberOfLines={1}>
                        {g.name}
                      </Text>
                      {active && <Text style={[styles.folderRowCheck, { color: accent }]}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity
                style={[styles.groupPickConfirm, { backgroundColor: accent }]}
                onPress={confirmGroupPick}
              >
                <Text style={styles.groupPickConfirmText}>
                  {shareGroupIds.size > 0 ? `${shareGroupIds.size} 개 그룹에 공개` : '나만 보기로 저장'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </SheetWrap>
      )}

      {/* Calendar modal */}
      {calOpen && (
      <SheetWrap style={styles.overlayWrap}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCalOpen(false)}>
          <TouchableOpacity activeOpacity={1}>
            <View style={styles.calModal}>
              <View style={styles.calHeader}>
                <TouchableOpacity onPress={() => shiftCalMonth(-1)} style={styles.calNavBtn}>
                  <IconChev dir="left" size={16} color="#6b7280" />
                </TouchableOpacity>
                <Text style={styles.calTitle}>{calYear} 년 {MONTHS[calMonth]}</Text>
                <TouchableOpacity onPress={() => shiftCalMonth(1)} style={styles.calNavBtn}>
                  <IconChev dir="right" size={16} color="#6b7280" />
                </TouchableOpacity>
              </View>
              <View style={styles.calDayRow}>
                {DAYS.map((d) => (
                  <Text key={d} style={styles.calDayLabel}>{d}</Text>
                ))}
              </View>
              <View style={styles.calGrid}>
                {calGrid.map((day, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.calCell,
                      day !== null && selectedDates.includes(day) && { backgroundColor: accent },
                    ]}
                    onPress={() => day && toggleDate(day)}
                    disabled={day === null}
                  >
                    {day !== null && (
                      <Text style={[
                        styles.calCellText,
                        selectedDates.includes(day) && styles.calCellTextActive,
                      ]}>
                        {day}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              {selectedDates.length > 0 && (
                <View style={styles.calFooter}>
                  <View style={styles.dateDotSmall} />
                  <Text style={styles.calFooterText}>{dateLabel()} 선택됨</Text>
                </View>
              )}
              <TouchableOpacity style={styles.calConfirmBtn} onPress={() => setCalOpen(false)}>
                <Text style={styles.calConfirmText}>확인</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </SheetWrap>
      )}

      {/* 취소 시 임시저장 확인 */}
      {exitConfirmOpen && (
      <SheetWrap style={styles.overlayWrap}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setExitConfirmOpen(false)}>
          <TouchableOpacity activeOpacity={1}>
            <View style={styles.exitCard}>
              <Text style={styles.exitTitle}>쓰던 p!ng을 임시저장할까요?</Text>
              <Text style={styles.exitSub}>임시저장하면 임시저장함에서 이어쓸 수 있어요.</Text>
              <TouchableOpacity style={[styles.exitSaveBtn, { backgroundColor: accent }]} onPress={saveDraftAndExit}>
                <Text style={styles.exitSaveText}>임시저장하고 나가기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exitDiscardBtn} onPress={() => { setExitConfirmOpen(false); allowLeaveRef.current = true; navigation.goBack(); }}>
                <Text style={styles.exitDiscardText}>저장 안 하고 나가기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exitKeepBtn} onPress={() => setExitConfirmOpen(false)}>
                <Text style={styles.exitKeepText}>계속 쓰기</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </SheetWrap>
      )}

      {lightboxPhoto && (
        <PhotoLightbox photo={lightboxPhoto} onClose={() => setLightboxPhoto(null)} />
      )}

      {/* 키보드 위에 뜨는 '자판 내리기' 버튼 (모든 플랫폼)
          InputAccessoryView는 presentation:'modal' 화면에서 안 보이는 iOS 버그가 있어 쓰지 않는다 */}
      <KeyboardDismissButton />
    </SafeAreaView>
  );
}

const lightStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  cancelText: { fontSize: 14, color: '#9ca3af' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // 임시저장
  draftBtn: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f9fafb',
  },
  draftBtnText: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  draftBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  draftBannerText: { flex: 1, fontSize: 12.5, color: '#374151' },
  draftBannerAction: { fontSize: 12.5, fontWeight: '600' },
  // 임시저장함 모달
  draftEmptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 20 },
  draftRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#f3f4f6', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8,
  },
  draftRowBody: { flex: 1, gap: 2 },
  draftRowTitle: { fontSize: 13.5, color: '#111827', fontWeight: '600' },
  draftRowTime: { fontSize: 11.5, color: '#9ca3af' },
  draftRowDelete: { fontSize: 12.5, color: '#ef4444', fontWeight: '600' },
  saveBtn: { paddingHorizontal: 22, paddingVertical: 9, borderRadius: 999, backgroundColor: '#111827' },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  content: { padding: 20, gap: 14, paddingBottom: 48 },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 9,
    backgroundColor: '#f3f4f6', borderRadius: 12, alignSelf: 'flex-start',
  },
  dateDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1f2937' },
  dateBtnText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  dateTagRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  tagRowInline: { flex: 1 },
  tagRemovable: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 99,
  },
  tagHash: { fontSize: 11, color: '#9ca3af' },
  tagLabel: { fontSize: 11, color: '#4b5563' },
  tagX: { fontSize: 11, color: '#9ca3af', marginLeft: 2 },
  tagInput: {
    fontSize: 12, color: '#374151',
    borderWidth: 1, borderColor: '#d1d5db', borderStyle: 'dashed',
    borderRadius: 99, paddingHorizontal: 10, paddingVertical: 7,
    minWidth: 80,
  },
  promptCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
  },
  promptQuote: { fontSize: 16, fontWeight: '700', marginTop: -2 },
  promptText: { fontSize: 13, color: '#4b5563', flex: 1, lineHeight: 19, fontWeight: '500' },
  promptSelectHint: { fontSize: 10.5, fontWeight: '600', marginTop: 3 },
  promptRefresh: { fontSize: 17, fontWeight: '600' },
  titleInput: {
    fontSize: 18, fontWeight: '600', color: '#1f2937',
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingVertical: 6,
  },
  bodyCard: {
    backgroundColor: '#f9fafb', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb',
    padding: 14, minHeight: 140,
  },
  bodyInput: { fontSize: 15, color: '#374151', lineHeight: 24, paddingVertical: 4 },
  photoBox: { position: 'relative', borderRadius: 14, overflow: 'hidden' },
  photoImg: { width: '100%', height: 180 },
  photoRemove: {
    position: 'absolute', top: 8, right: 8,
    width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  photoRemoveText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  // 사진 위치 이동 바 (꾹 누르면 나타남)
  mainPhotoBadge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  mainPhotoBadgeText: { color: '#fff', fontSize: 10.5, fontWeight: '600' },
  photoThumbRow: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'flex-start' },
  photoThumbCol: { alignItems: 'center', gap: 3 },
  photoThumbWrap: { position: 'relative' },
  setMainText: { fontSize: 11, fontWeight: '600' },
  photoThumbImg: { width: 64, height: 64, borderRadius: 12 },
  photoThumbRemove: {
    position: 'absolute', top: -6, right: -6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  photoThumbRemoveText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  photoThumbAdd: {
    width: 64, height: 64, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e5e7eb', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb',
  },
  photoThumbAddPlus: { fontSize: 22, color: '#9ca3af' },
  photoHint: { fontSize: 11.5, color: '#9ca3af', marginTop: 6 },
  blockPhotoWrap: { position: 'relative', borderRadius: 14, overflow: 'hidden', marginVertical: 2 },
  photoBtnRow: { flexDirection: 'row', gap: 8 },
  inlinePhotoBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    alignSelf: 'flex-start', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#f9fafb',
  },
  inlinePhotoBtnText: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  photoAddBtn: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderStyle: 'dashed',
    borderRadius: 14, paddingVertical: 16, alignItems: 'center',
  },
  photoAddInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  photoAddText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  visRow: { flexDirection: 'row', gap: 8 },
  visBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#f9fafb',
  },
  visEmoji: { fontSize: 15 },
  visLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  visHint: { fontSize: 11, color: '#9ca3af', marginTop: -4 },
  aiSection: { gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  aiTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aiDot: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: '#111827',
    alignItems: 'center', justifyContent: 'center',
  },
  aiDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffffff' },
  aiTitle: { fontSize: 13, fontWeight: '600', color: '#374151', flex: 1 },
  aiSub: { fontSize: 11, color: '#9ca3af' },
  personaRow: { flexDirection: 'row', gap: 8 },
  personaCard: {
    flexGrow: 1, flexBasis: '44%', minWidth: 72, alignItems: 'center', paddingVertical: 12,
    borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb', gap: 4,
  },
  personaCardActive: { backgroundColor: '#111827', borderColor: '#111827' },
  personaEmoji: { fontSize: 18 },
  personaLabel: { fontSize: 11, color: '#6b7280' },
  personaLabelActive: { color: '#ffffff' },
  folderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#f3f4f6',
    marginBottom: 8,
  },
  folderRowLabel: { fontSize: 14, color: '#374151', flex: 1 },
  folderRowCheck: { fontSize: 15, fontWeight: '700' },
  groupPickConfirm: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 10 },
  groupPickConfirmText: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
  // AI 코멘트 컴팩트 카드
  aiCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#f3f4f6',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, marginTop: 4,
  },
  aiCardIcon: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  aiCardTitle: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  aiCardSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  // 페르소나 모달
  personaModal: {
    backgroundColor: '#ffffff', borderRadius: 20, padding: 20, width: 300,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  personaModalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  personaModalSub: { fontSize: 12, color: '#9ca3af', marginTop: 3, marginBottom: 16 },
  personaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  // Calendar modal
  overlayWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  calModal: {
    backgroundColor: '#ffffff', borderRadius: 20, padding: 20,
    width: 300,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  calNavBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  calTitle: { fontSize: 15, fontWeight: '600', color: '#1f2937' },
  calDayRow: { flexDirection: 'row', marginBottom: 4 },
  calDayLabel: { flex: 1, textAlign: 'center', fontSize: 11, color: '#9ca3af', paddingVertical: 2 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: {
    width: '14.28%', height: 36,
    alignItems: 'center', justifyContent: 'center', borderRadius: 8,
  },
  calCellActive: { backgroundColor: '#111827' },
  calCellText: { fontSize: 13, color: '#374151' },
  calCellTextActive: { color: '#ffffff', fontWeight: '600' },
  calFooter: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingTop: 10, marginTop: 6, borderTopWidth: 1, borderTopColor: '#f3f4f6',
  },
  dateDotSmall: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#1f2937' },
  calFooterText: { fontSize: 12, color: '#6b7280' },
  calConfirmBtn: {
    marginTop: 12, backgroundColor: '#111827', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  calConfirmText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  // 취소 시 임시저장 확인 카드
  exitCard: {
    backgroundColor: '#ffffff', borderRadius: 20, padding: 22, width: 300, gap: 8,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  exitTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  exitSub: { fontSize: 13, color: '#6b7280', lineHeight: 19, marginBottom: 8 },
  exitSaveBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  exitSaveText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  exitDiscardBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', backgroundColor: '#f3f4f6' },
  exitDiscardText: { fontSize: 14, fontWeight: '600', color: '#ef4444' },
  exitKeepBtn: { paddingVertical: 10, alignItems: 'center' },
  exitKeepText: { fontSize: 13, color: '#9ca3af', fontWeight: '500' },
});
