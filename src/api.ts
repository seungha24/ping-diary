import { API_BASE_URL } from './config';
import { DiaryEntry } from './data/types';

/**
 * 서버 통신 클라이언트.
 * - 웹에서는 localStorage, 네이티브에서는 메모리에 토큰을 보관한다.
 *   (네이티브 영구 저장이 필요해지면 @react-native-async-storage/async-storage로 교체)
 */
const mem: Record<string, string> = {};
const storage = {
  get(key: string): string | null {
    try {
      if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
    } catch {}
    return mem[key] ?? null;
  },
  set(key: string, value: string) {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    } catch {}
    mem[key] = value;
  },
};

const TOKEN_KEY = 'ping_diary_token';

/** 저장된 액세스 토큰 반환 */
export function getToken(): string | null {
  return storage.get(TOKEN_KEY);
}

/** 액세스 토큰 저장 */
export function setToken(token: string) {
  storage.set(TOKEN_KEY, token);
}

/** 액세스 토큰 삭제 (로그아웃) */
export function clearToken() {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(TOKEN_KEY);
  } catch {}
  delete mem[TOKEN_KEY];
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

/** 로그인 → 토큰 저장 후 반환 */
export async function login(email: string, password: string): Promise<string> {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  return data.token;
}

/** 내 일기 목록 조회 */
export async function fetchEntries(): Promise<DiaryEntry[]> {
  const rows = await request('/entries');
  return Array.isArray(rows) ? rows.map(fromServer) : [];
}

/** 일기 작성 (서버 저장 후 저장된 엔트리 반환) */
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
      visibility: 'private',
    }),
  });
  return fromServer(row);
}

/** 일기 수정 (서버 저장 후 갱신된 엔트리 반환) */
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
    }),
  });
  return fromServer(row);
}

/** 일기 삭제 */
export async function removeEntry(id: number): Promise<void> {
  await request(`/entries/${id}`, { method: 'DELETE' });
}
