import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './config';
import { DiaryEntry } from './data/types';

/**
 * 서버 통신 클라이언트.
 * 토큰은 메모리 캐시 + 영구 저장(웹 localStorage / 네이티브 AsyncStorage)에 write-through 한다.
 * 읽기는 동기 유지(메모리 우선). 네이티브는 앱 시작 시 hydrateToken()으로 복원.
 */
const mem: Record<string, string> = {};

function webLocalStorage(): Storage | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {}
  return null;
}

const storage = {
  get(key: string): string | null {
    const ls = webLocalStorage();
    if (ls) {
      const v = ls.getItem(key);
      if (v != null) return v;
    }
    return mem[key] ?? null;
  },
  set(key: string, value: string) {
    mem[key] = value;
    const ls = webLocalStorage();
    if (ls) ls.setItem(key, value);
    if (Platform.OS !== 'web') AsyncStorage.setItem(key, value).catch(() => {});
  },
  remove(key: string) {
    delete mem[key];
    const ls = webLocalStorage();
    if (ls) ls.removeItem(key);
    if (Platform.OS !== 'web') AsyncStorage.removeItem(key).catch(() => {});
  },
};

const TOKEN_KEY = 'ping_diary_token';
const EMAIL_KEY = 'ping_diary_email';

/** 저장된 액세스 토큰 반환 (동기) */
export function getToken(): string | null {
  return storage.get(TOKEN_KEY);
}

/** 로그인한 사용자 이메일 반환 (동기) */
export function getUserEmail(): string | null {
  return storage.get(EMAIL_KEY);
}

/** 액세스 토큰 저장 */
export function setToken(token: string) {
  storage.set(TOKEN_KEY, token);
}

/** 사용자 이메일 저장 */
export function setUserEmail(email: string) {
  storage.set(EMAIL_KEY, email);
}

/** 액세스 토큰·이메일 삭제 (로그아웃) */
export function clearToken() {
  storage.remove(TOKEN_KEY);
  storage.remove(EMAIL_KEY);
  clearMeCache();
}

/** 앱 시작 시 네이티브 영구 저장소에서 토큰·이메일을 메모리로 복원 */
export async function hydrateToken(): Promise<string | null> {
  if (Platform.OS !== 'web') {
    try {
      const t = await AsyncStorage.getItem(TOKEN_KEY);
      if (t) mem[TOKEN_KEY] = t;
      const e = await AsyncStorage.getItem(EMAIL_KEY);
      if (e) mem[EMAIL_KEY] = e;
    } catch {}
  }
  return getToken();
}

/** 서버 원본(diary_entries 행)을 앱의 DiaryEntry로 변환 */
function fromServer(row: any): DiaryEntry {
  return {
    id: row.id,
    title: row.title ?? '',
    body: row.content ?? '',
    dates: row.dates ?? [],
    tags: row.tags ?? [],
    photo: row.photo_url ?? null,
    persona: row.persona ?? '',
    folder: row.folder ?? undefined,
    createdAt: row.created_at,
    aiComment: row.ai_comment ?? undefined,
    visibility: row.visibility === 'friends' ? 'friends' : 'private',
  };
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data && data.error) || `요청 실패 (${res.status})`);
  }
  return data;
}

/** 회원가입 */
export async function signup(email: string, password: string) {
  return request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

/** 로그인 → 토큰·이메일 저장 후 토큰 반환 */
export async function login(email: string, password: string): Promise<string> {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  if (data.user?.email) storage.set(EMAIL_KEY, data.user.email);
  return data.token;
}

/** 비밀번호 변경 (로그인 상태) */
export async function changePassword(password: string): Promise<void> {
  await request('/auth/password', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

/** 계정 및 모든 데이터 삭제 (탈퇴) */
export async function deleteAccount(): Promise<void> {
  await request('/auth/account', { method: 'DELETE' });
}

/** 내 p!ng 목록 조회 */
export async function fetchEntries(): Promise<DiaryEntry[]> {
  const rows = await request('/entries');
  return Array.isArray(rows) ? rows.map(fromServer) : [];
}

/** p!ng 작성 (서버 저장 후 저장된 엔트리 반환) */
export async function createEntry(entry: DiaryEntry): Promise<DiaryEntry> {
  const row = await request('/entries', {
    method: 'POST',
    body: JSON.stringify({
      content: entry.body || entry.title || '(내용 없음)',
      title: entry.title ?? '',
      tags: entry.tags ?? [],
      dates: entry.dates ?? [],
      persona: entry.persona ?? '',
      folder: entry.folder ?? '',
      photo_url: entry.photo ?? null,
      visibility: entry.visibility ?? 'private',
    }),
  });
  return fromServer(row);
}

/** p!ng 수정 (서버 저장 후 갱신된 엔트리 반환) */
export async function patchEntry(entry: DiaryEntry): Promise<DiaryEntry> {
  const row = await request(`/entries/${entry.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      content: entry.body || entry.title || '(내용 없음)',
      title: entry.title ?? '',
      tags: entry.tags ?? [],
      dates: entry.dates ?? [],
      persona: entry.persona ?? '',
      folder: entry.folder ?? '',
      photo_url: entry.photo ?? null,
      visibility: entry.visibility ?? 'private',
    }),
  });
  return fromServer(row);
}

/** p!ng 삭제 */
export async function removeEntry(id: number): Promise<void> {
  await request(`/entries/${id}`, { method: 'DELETE' });
}

/** AI 코멘트 즉시 생성 (미리보기/데모용) */
export async function generateComment(id: number): Promise<DiaryEntry> {
  const row = await request(`/entries/${id}/comment`, { method: 'POST' });
  return fromServer(row);
}

/** 이미지 업로드 → 공개 URL 반환 (웹/네이티브 모두 지원) */
export async function uploadPhoto(uri: string): Promise<string> {
  const token = getToken();
  const form = new FormData();

  if (uri.startsWith('data:') || uri.startsWith('blob:') || uri.startsWith('http')) {
    // 웹: uri를 blob으로 변환해 첨부
    const blob = await (await fetch(uri)).blob();
    form.append('file', blob, 'photo.jpg');
  } else {
    // 네이티브: RN FormData 파일 객체
    const name = uri.split('/').pop() || 'photo.jpg';
    const m = /\.(\w+)$/.exec(name);
    const ext = m ? m[1].toLowerCase() : 'jpg';
    const type = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    // @ts-ignore React Native FormData 파일 형식
    form.append('file', { uri, name, type });
  }

  const res = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || '이미지 업로드에 실패했습니다');
  return data.url;
}

// ── 그룹 ──
export interface ServerGroup {
  id: number;
  name: string;
  invite_code: string;
  member_count?: number;
  created_at?: string;
  photo_url?: string | null;
}

/** 내가 속한 그룹 목록 */
export async function fetchGroups(): Promise<ServerGroup[]> {
  const rows = await request('/groups');
  return Array.isArray(rows) ? rows : [];
}

/** 그룹 생성 */
export async function createGroup(name: string): Promise<ServerGroup> {
  return request('/groups', { method: 'POST', body: JSON.stringify({ name }) });
}

/** 초대 코드로 그룹 참여 */
export async function joinGroup(inviteCode: string): Promise<{ id: number; name: string }> {
  return request('/groups/join', {
    method: 'POST',
    body: JSON.stringify({ invite_code: inviteCode }),
  });
}

/** 그룹에 공유된 p!ng 조회 */
export async function fetchGroupEntries(id: number): Promise<any[]> {
  const rows = await request(`/groups/${id}/entries`);
  return Array.isArray(rows) ? rows : [];
}

/** 그룹 나가기 */
export async function leaveGroup(id: number): Promise<void> {
  await request(`/groups/${id}/leave`, { method: 'POST' });
}

/** 그룹 커버 사진 변경 (멤버 공유, DB 저장) */
export async function updateGroupPhoto(id: number, photo_url: string | null): Promise<ServerGroup> {
  return request(`/groups/${id}/photo`, {
    method: 'PATCH',
    body: JSON.stringify({ photo_url }),
  });
}

export interface UserFolder { id: string; name: string; emoji: string }

export interface Me {
  email: string | null;
  folder_covers: Record<string, string>;
  theme: string | null;
  folders: UserFolder[];
  hidden_folders: string[];
  blocked_users: string[];
  display_name: string | null;
  username: string | null;
}

// 프로필 캐시 — 화면 진입마다 재요청 대신 즉시 표시 + 백그라운드 갱신
const ME_KEY = 'ping_diary_me';
let meCache: Me | null = null;
let meInflight: Promise<Me> | null = null;

/** 캐시된 프로필 (동기). 저장된 값이 있으면 즉시 반환, 없으면 null */
export function getCachedMe(): Me | null {
  if (meCache) return meCache;
  const ls = webLocalStorage();
  if (ls) {
    const v = ls.getItem(ME_KEY);
    if (v) { try { meCache = JSON.parse(v); } catch {} }
  }
  return meCache;
}

function persistMe(me: Me) {
  meCache = me;
  const ls = webLocalStorage();
  if (ls) { try { ls.setItem(ME_KEY, JSON.stringify(me)); } catch {} }
}

/** 저장(프로필/폴더/테마 변경) 후 캐시 일부 갱신 → 다음 화면에서 최신 즉시 표시 */
export function patchMeCache(partial: Partial<Me>) {
  const base = getCachedMe();
  if (base) persistMe({ ...base, ...partial });
}

/** 프로필 캐시 삭제 (로그아웃 시) */
export function clearMeCache() {
  meCache = null;
  const ls = webLocalStorage();
  if (ls) ls.removeItem(ME_KEY);
}

/** 내 프로필 (폴더 커버·테마·사용자 폴더 등). 동시 호출은 하나로 합침 */
export async function getMe(): Promise<Me> {
  if (meInflight) return meInflight;
  meInflight = (async () => {
    const r = await request('/auth/me');
    const me: Me = {
      email: r?.email ?? null,
      folder_covers: r?.folder_covers ?? {},
      theme: r?.theme ?? null,
      folders: Array.isArray(r?.folders) ? r.folders : [],
      hidden_folders: Array.isArray(r?.hidden_folders) ? r.hidden_folders : [],
      blocked_users: Array.isArray(r?.blocked_users) ? r.blocked_users : [],
      display_name: r?.display_name ?? null,
      username: r?.username ?? null,
    };
    persistMe(me);
    return me;
  })();
  try { return await meInflight; }
  finally { meInflight = null; }
}

/** 숨긴(삭제한) 기본 폴더 id 목록 저장 */
export async function saveHiddenFolders(hidden: string[]): Promise<string[]> {
  const r = await request('/auth/hidden-folders', { method: 'PATCH', body: JSON.stringify({ hidden }) });
  const next = Array.isArray(r?.hidden_folders) ? r.hidden_folders : [];
  patchMeCache({ hidden_folders: next });
  return next;
}

/** 차단한 사용자 id 목록 저장 (user_metadata, DB) */
export async function saveBlockedUsers(blocked: string[]): Promise<string[]> {
  const r = await request('/auth/blocked-users', { method: 'PATCH', body: JSON.stringify({ blocked }) });
  const next = Array.isArray(r?.blocked_users) ? r.blocked_users : [];
  patchMeCache({ blocked_users: next });
  return next;
}

/** 부적절 콘텐츠 신고 (AI 코멘트/그룹 공유글 등) */
export async function reportContent(type: string, target_id: string | number, reason?: string): Promise<void> {
  await request('/reports', { method: 'POST', body: JSON.stringify({ type, target_id, reason }) });
}

/** 표시 이름·아이디 저장 (내 계정 user_metadata, DB) */
export async function saveProfile(p: { display_name?: string; username?: string }): Promise<{ display_name: string | null; username: string | null }> {
  const r = await request('/auth/profile', { method: 'PATCH', body: JSON.stringify(p) });
  const next = { display_name: r?.display_name ?? null, username: r?.username ?? null };
  patchMeCache(next);
  return next;
}

/** 사용자가 만든 폴더 목록 저장 (user_metadata, DB) */
export async function saveFolders(folders: UserFolder[]): Promise<UserFolder[]> {
  const r = await request('/auth/folders', { method: 'PATCH', body: JSON.stringify({ folders }) });
  const next = Array.isArray(r?.folders) ? r.folders : [];
  patchMeCache({ folders: next });
  return next;
}

/** 선택한 테마를 내 계정(user_metadata)에 저장 */
export async function setThemeServer(theme: string): Promise<void> {
  await request('/auth/theme', { method: 'PATCH', body: JSON.stringify({ theme }) });
  patchMeCache({ theme });
}

/** 폴더 커버 사진 저장 (내 계정 user_metadata, DB 저장) */
export async function setFolderCover(folder_id: string, photo_url: string | null): Promise<Record<string, string>> {
  const r = await request('/auth/folder-covers', {
    method: 'PATCH',
    body: JSON.stringify({ folder_id, photo_url }),
  });
  const next = r?.folder_covers ?? {};
  patchMeCache({ folder_covers: next });
  return next;
}
