import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { fetchGroups, ServerGroup } from '../api';

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
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [authed]);

  useEffect(() => {
    if (!ready) return;
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
