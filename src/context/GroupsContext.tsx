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
  const { ready, token } = useAuth();
  const [groups, setGroups] = useState<ServerGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!token) { setGroups([]); setLoading(false); return; }
    try {
      const list = await fetchGroups();
      setGroups(list);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!ready) return;
    refresh();
  }, [ready, token, refresh]);

  return (
    <GroupsContext.Provider value={{ groups, loading, refresh }}>
      {children}
    </GroupsContext.Provider>
  );
}

export function useGroups() {
  return useContext(GroupsContext);
}
