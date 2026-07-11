// 일기 임시저장함(초안 여러 개) 스토어.
// 웹은 localStorage, 네이티브는 AsyncStorage에 영구 저장한다 (앱을 껐다 켜도 유지).
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DiaryDraft {
  id: string;
  title: string;
  body: string;
  tags: string[];
  persona: string;
  folder?: string;
  dates: number[];
  photo: string | null;
  photos?: string[];
  visibility: 'private' | 'friends';
  savedAt: string; // ISO
}

/** 저장 시 넘기는 형태: id 없으면 새 초안, 있으면 해당 초안 갱신. savedAt은 자동 기록 */
export type DiaryDraftInput = Omit<DiaryDraft, 'id' | 'savedAt'> & { id?: string | null };

const LEGACY_KEY = 'ping_diary_draft'; // 예전 단일 임시저장본
const KEY = 'ping_diary_drafts';

let cache: DiaryDraft[] | null = null;

/**
 * 웹 환경이면 localStorage를 반환한다 (네이티브에선 null).
 * @returns localStorage 또는 null
 */
function webStorage(): Storage | null {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') return localStorage;
  } catch {}
  return null;
}

/**
 * 저장소에서 원본 문자열을 읽는다.
 * @param key 저장소 키
 * @returns 저장된 문자열 또는 null
 */
async function readRaw(key: string): Promise<string | null> {
  const s = webStorage();
  if (s) {
    try { return s.getItem(key); } catch { return null; }
  }
  try { return await AsyncStorage.getItem(key); } catch { return null; }
}

/**
 * 초안 목록을 저장소에 기록하고 메모리 캐시를 갱신한다.
 * @param list 저장할 초안 배열
 */
async function writeAll(list: DiaryDraft[]): Promise<void> {
  cache = list;
  const raw = JSON.stringify(list);
  const s = webStorage();
  if (s) {
    try { s.setItem(KEY, raw); } catch {}
    return;
  }
  try { await AsyncStorage.setItem(KEY, raw); } catch {}
}

/**
 * 저장소에서 초안 목록을 읽는다. 예전 단일 임시저장본이 있으면 목록으로 이관한다.
 * @returns 초안 배열 (캐시 사용)
 */
async function readAll(): Promise<DiaryDraft[]> {
  if (cache) return cache;
  let list: DiaryDraft[] = [];
  try {
    const raw = await readRaw(KEY);
    if (raw) list = JSON.parse(raw) as DiaryDraft[];
  } catch {}

  // 예전 단일 임시저장본 이관 (한 번만)
  try {
    const legacyRaw = await readRaw(LEGACY_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw);
      list = [{ ...legacy, id: newDraftId() }, ...list];
      const s = webStorage();
      if (s) { try { s.removeItem(LEGACY_KEY); } catch {} }
      else { try { await AsyncStorage.removeItem(LEGACY_KEY); } catch {} }
      await writeAll(list);
    }
  } catch {}

  cache = list;
  return list;
}

/**
 * 초안 id를 생성한다 (시각 + 난수 조합).
 * @returns 새 초안 id 문자열
 */
function newDraftId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 임시저장함의 초안 목록을 최근 저장순으로 반환한다.
 * @returns savedAt 내림차순으로 정렬된 초안 배열
 */
export async function listDrafts(): Promise<DiaryDraft[]> {
  const list = await readAll();
  return [...list].sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
}

/**
 * 초안을 저장한다. id가 있으면 해당 초안을 갱신하고, 없으면 새 초안으로 추가한다.
 * @param input 저장할 초안 내용 (id는 선택)
 * @returns 저장된 초안 (id·savedAt 포함)
 */
export async function saveDraft(input: DiaryDraftInput): Promise<DiaryDraft> {
  const list = await readAll();
  const draft: DiaryDraft = {
    ...input,
    id: input.id ?? newDraftId(),
    savedAt: new Date().toISOString(),
  };
  const idx = list.findIndex((d) => d.id === draft.id);
  const next = idx >= 0
    ? list.map((d) => (d.id === draft.id ? draft : d))
    : [draft, ...list];
  await writeAll(next);
  return draft;
}

/**
 * 초안 하나를 임시저장함에서 삭제한다.
 * @param id 삭제할 초안 id
 */
export async function deleteDraft(id: string): Promise<void> {
  const list = await readAll();
  await writeAll(list.filter((d) => d.id !== id));
}

/**
 * 테스트 전용: 메모리 캐시를 비워 저장소에서 다시 읽게 한다.
 */
export function __resetDraftCacheForTests(): void {
  cache = null;
}
