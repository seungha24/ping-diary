import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// 목록 로컬 캐시 — 앱을 열면 마지막 목록을 즉시 보여주고 뒤에서 최신으로 갱신한다.
// (서버가 해외에 있어 목록 호출이 수 초 걸리는 것의 체감 해결책)
export const CACHE_KEYS = {
  entries: 'ping_cache_entries',
  groups: 'ping_cache_groups',
  feeds: 'ping_cache_feeds', // { [groupId]: rows }
} as const;

function webLS(): Storage | null {
  try { if (typeof localStorage !== 'undefined') return localStorage; } catch {}
  return null;
}

export async function loadCache<T>(key: string): Promise<T | null> {
  try {
    const raw = Platform.OS === 'web' ? webLS()?.getItem(key) ?? null : await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}

export function saveCache(key: string, value: unknown): void {
  try {
    const raw = JSON.stringify(value);
    if (Platform.OS === 'web') webLS()?.setItem(key, raw);
    else AsyncStorage.setItem(key, raw).catch(() => {});
  } catch {}
}

/** 로그아웃 시 호출 — 다른 계정에 이전 계정 목록이 보이지 않게 */
export function clearListCaches(): void {
  for (const key of Object.values(CACHE_KEYS)) {
    if (Platform.OS === 'web') webLS()?.removeItem(key);
    else AsyncStorage.removeItem(key).catch(() => {});
  }
}
