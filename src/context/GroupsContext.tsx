import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { fetchGroups, ServerGroup } from '../api';
import { loadCache, saveCache, CACHE_KEYS } from '../data/listCache';

interface GroupsContextValue {
  groups: ServerGroup[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const GroupsContext = createContext<GroupsContextValue>({
  groups: [],
  loading: true,
  refresh: async () => {},
});

export function GroupsProvider({ children }: { children: React.ReactNode }) {
  // authed(불리언) 기준 — 토큰 문자열은 1시간마다 자동 갱신되므로 그때마다 재조회하지 않게
  const { ready, authed } = useAuth();
  const [groups, setGroups] = useState<ServerGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!authed) { setGroups([]); setLoading(false); return; }
    try {
      const list = await fetchGroups();
      setGroups(list);
      saveCache(CACHE_KEYS.groups, list);
    } catch {
      // 갱신 실패 시 기존(캐시) 목록 유지
    } finally {
      setLoading(false);
    }
  }, [authed]);

  useEffect(() => {
    if (!ready) return;
    // 캐시 먼저 (0초 표시) → 서버 갱신
    if (authed) {
      loadCache<ServerGroup[]>(CACHE_KEYS.groups).then((cached) => {
        if (cached?.length) { setGroups(cached); setLoading(false); }
      });
    }
    refresh();
  }, [ready, authed, refresh]);

  return (
    <GroupsContext.Provider value={{ groups, loading, refresh }}>
      {children}
    </GroupsContext.Provider>
  );
}

export function useGroups() {
  return useContext(GroupsContext);
}
