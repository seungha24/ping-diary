// 실제 데이터 기반 알림 스토어.
// - 내 일기에 AI 코멘트가 달리면 → 'ai' 알림
// - 그룹 멤버가 새 p!ng를 공유하면 → 'diary' 알림
// - 내 일기·내 댓글에 멤버가 댓글/답글을 달면 → 'comment' 알림
// 읽음 상태는 localStorage에 보관해 화면을 나가도 유지된다.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchEntries, fetchGroups, fetchGroupEntries, fetchCommentInbox, getCachedMe, getMe } from '../api';
import { DiaryEntry } from './types';

export interface Notif {
  id: string;                 // 'ai-{entryId}' | 'diary-{groupId}-{entryId}' | 'comment-{commentId}'
  type: 'ai' | 'diary' | 'comment';
  title: string;
  body: string;
  time: string;               // ISO
  read: boolean;
  entry?: DiaryEntry;         // 탭하면 이동할 일기
  groupId?: number;           // 그룹 새 글 알림이면 그 그룹 id (댓글 그룹 구분용)
}

let notifs: Notif[] = [];
let refreshing = false;
// 갱신 중에 '모두 읽음'이 호출되면 갱신이 끝난 뒤 한 번 더 적용한다
// (알림창을 첫 로딩이 끝나기 전에 들어갔다 나가도 빨간 점이 확실히 사라지게)
let markAllPending = false;
const listeners = new Set<() => void>();

const READ_KEY = 'ping_notif_read';
let memoryRead: string[] = [];

function storage(): Storage | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {}
  return null;
}

function loadReadSet(): Set<string> {
  const s = storage();
  if (s) {
    try { return new Set(JSON.parse(s.getItem(READ_KEY) || '[]')); } catch {}
  }
  return new Set(memoryRead);
}

function persistReadSet(set: Set<string>) {
  const arr = Array.from(set).slice(-500); // 무한 성장 방지
  memoryRead = arr;
  const s = storage();
  if (s) {
    try { s.setItem(READ_KEY, JSON.stringify(arr)); } catch {}
  }
  // 네이티브(폰)는 AsyncStorage에 영구 저장 (앱 재시작에도 읽음 유지)
  if (Platform.OS !== 'web') {
    AsyncStorage.setItem(READ_KEY, JSON.stringify(arr)).catch(() => {});
  }
}

// 네이티브: 앱 시작 후 첫 갱신 전에 AsyncStorage에서 읽음 목록 복원
let hydrated = Platform.OS === 'web';
async function hydrateReadSet() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = await AsyncStorage.getItem(READ_KEY);
    if (raw) memoryRead = JSON.parse(raw);
  } catch {}
}

function emit() {
  listeners.forEach((fn) => fn());
}

/** 상대 시간 라벨 ("방금 전", "3 시간 전", "어제", "6 월 9 일") */
export function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (!t) return '';
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min} 분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 시간 전`;
  const day = Math.floor(hr / 24);
  if (day === 1) return '어제';
  if (day < 7) return `${day} 일 전`;
  const d = new Date(iso);
  return `${d.getMonth() + 1} 월 ${d.getDate()} 일`;
}

/** 서버 데이터로 알림 목록 재구성. 이미 갱신 중이면 그 갱신을 함께 기다린다 (당겨서 새로고침용) */
let inflight: Promise<void> | null = null;
export function refreshNotifs(): Promise<void> {
  if (!inflight) {
    inflight = doRefresh().finally(() => { inflight = null; });
  }
  return inflight;
}

async function doRefresh() {
  refreshing = true;
  try {
    await hydrateReadSet(); // 폰: 저장된 읽음 목록 먼저 복원
    const me = getCachedMe() ?? await getMe().catch(() => null);
    const myId = me?.id ?? null;

    const [entries, groups, inbox] = await Promise.all([
      fetchEntries().catch(() => []),
      fetchGroups().catch(() => []),
      fetchCommentInbox().catch(() => []),
    ]);

    const items: Notif[] = [];

    // 코멘트 내용이 바뀌면(페르소나 변경 등으로 재생성) 알림 id도 바뀌어
    // 다시 '안 읽음'으로 뜨도록 내용 해시를 id에 포함한다
    const tinyHash = (s: string): string => {
      let h = 0;
      for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
      return (h >>> 0).toString(36);
    };

    // 1) 내 일기에 도착한 AI 코멘트
    for (const e of entries) {
      if (e.aiComment) {
        items.push({
          id: `ai-${e.id}-${tinyHash(e.aiComment)}`,
          type: 'ai',
          title: 'p0ng이 도착했어요',
          body: `${e.persona || 'AI'} · ${e.title || '제목 없음'}`,
          time: e.createdAt,
          read: false,
          entry: e,
        });
      }
    }

    // 2) 그룹 멤버들의 새 p!ng (내 글 제외)
    const feeds = await Promise.all(
      groups.map(async (g) => {
        const rows = await fetchGroupEntries(g.id).catch(() => []);
        return rows
          .filter((r: any) => !myId || r.user_id !== myId)
          .map((r: any): Notif => ({
            id: `diary-${g.id}-${r.id}`,
            type: 'diary',
            title: `${r.author || '멤버'}님이 새 p!ng를 작성했어요`,
            body: `${g.name} · ${r.title || (r.content || '').slice(0, 24)}`,
            time: r.created_at,
            read: false,
            groupId: g.id,
            // 그룹 피드 행 → DiaryEntry (GroupScreen과 동일한 매핑)
            entry: {
              id: r.id,
              title: r.title || '',
              body: r.content || '',
              dates: r.dates || [],
              tags: r.tags || [],
              photo: r.photo_url || null,
              photos: Array.isArray(r.photos) ? r.photos : [],
              persona: r.persona || '',
              author: r.author || '멤버',
              authorId: r.user_id,
              avatarUrl: r.author_avatar || null,
              createdAt: r.created_at,
              aiComment: r.ai_comment ?? undefined,
              commentCount: r.comment_count ?? 0,
              // 그룹 피드의 글은 전부 '친구 공개' — 상세의 댓글 섹션 표시 조건에 필요
              visibility: 'friends',
              sharedGroups: Array.isArray(r.shared_groups) ? r.shared_groups : null,
            },
          }));
      })
    );
    feeds.forEach((list) => items.push(...list));

    // 3) 내 일기에 달린 댓글 + 내 댓글에 달린 답글
    // 탭하면 이동할 일기: 내 일기면 entries에서, 남의 일기면 그룹 피드에서 찾는다
    const entryById = new Map<number, DiaryEntry>();
    for (const e of entries) entryById.set(Number(e.id), e);
    for (const list of feeds) for (const n of list) if (n.entry) entryById.set(Number(n.entry.id), n.entry);
    for (const c of inbox) {
      items.push({
        id: `comment-${c.id}`,
        type: 'comment',
        title: c.reason === 'thread'
          ? `${c.author || '멤버'}님도 댓글을 남겼어요`
          : c.parent_id != null
            ? `${c.author || '멤버'}님이 답글을 남겼어요`
            : `${c.author || '멤버'}님이 댓글을 남겼어요`,
        body: `${c.entry_title || '내 p!ng'} · ${c.content.slice(0, 40)}`,
        time: c.created_at,
        read: false,
        groupId: c.group_id ?? undefined,
        entry: entryById.get(Number(c.entry_id)),
      });
    }

    // 최신순 정렬 + 상한
    items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    const readSet = loadReadSet();
    notifs = items.slice(0, 50).map((n) => ({ ...n, read: readSet.has(n.id) }));
    // 갱신 도중 '모두 읽음'이 호출됐다면 새로 만든 목록에도 적용
    if (markAllPending) {
      markAllPending = false;
      notifs.forEach((n) => readSet.add(n.id));
      persistReadSet(readSet);
      notifs = notifs.map((n) => (n.read ? n : { ...n, read: true }));
    }
    emit();
  } finally {
    refreshing = false;
  }
}

export function getNotifs(): Notif[] {
  return notifs;
}

export function getUnreadCount(): number {
  return notifs.filter((n) => !n.read).length;
}

export function markAllRead() {
  if (refreshing) markAllPending = true; // 갱신이 끝난 뒤에도 한 번 더 적용
  const readSet = loadReadSet();
  notifs.forEach((n) => readSet.add(n.id));
  persistReadSet(readSet);
  notifs = notifs.map((n) => (n.read ? n : { ...n, read: true }));
  emit();
}

export function markRead(id: string) {
  const readSet = loadReadSet();
  readSet.add(id);
  persistReadSet(readSet);
  notifs = notifs.map((n) => (n.id === id ? { ...n, read: true } : n));
  emit();
}

/** 변경 구독. 반환값을 호출하면 구독 해제. */
export function subscribeNotifs(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
