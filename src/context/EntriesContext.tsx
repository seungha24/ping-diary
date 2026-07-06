import React, { createContext, useContext, useEffect, useState } from 'react';
import { DiaryEntry, INITIAL_ENTRIES } from '../data/types';
import { useAuth } from './AuthContext';
import { fetchEntries, createEntry, patchEntry, removeEntry } from '../api';

interface EntriesContextValue {
  entries: DiaryEntry[];
  loading: boolean;
  addEntry: (entry: DiaryEntry) => void;
  updateEntry: (entry: DiaryEntry) => void;
  deleteEntry: (id: number) => void;
}

const EntriesContext = createContext<EntriesContextValue>({
  entries: [],
  loading: true,
  addEntry: () => {},
  updateEntry: () => {},
  deleteEntry: () => {},
});

export function EntriesProvider({ children }: { children: React.ReactNode }) {
  const { ready, token } = useAuth();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // 인증 완료 후 서버에서 일기 로드 (비어 있으면 데모 데이터로 최초 1회 시드)
  useEffect(() => {
    let cancelled = false;
    if (!ready) return;

    async function load() {
      if (!token) {
        // 토큰 확보 실패 시 로컬 데모 데이터로 폴백
        if (!cancelled) { setEntries(INITIAL_ENTRIES); setLoading(false); }
        return;
      }
      try {
        let list = await fetchEntries();
        if (list.length === 0) {
          // 데모 계정 최초 접속 — 기본 일기를 서버에 시드
          for (const seed of [...INITIAL_ENTRIES].reverse()) {
            try { await createEntry(seed); } catch {}
          }
          list = await fetchEntries();
        }
        if (!cancelled) { setEntries(list); setLoading(false); }
      } catch {
        if (!cancelled) { setEntries(INITIAL_ENTRIES); setLoading(false); }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [ready, token]);

  // 낙관적 추가: 화면에 먼저 반영하고 서버 저장 후 실제 엔트리로 교체
  function addEntry(entry: DiaryEntry) {
    setEntries((prev) => [entry, ...prev]);
    createEntry(entry)
      .then((saved) => {
        setEntries((prev) => prev.map((e) => (e.id === entry.id ? saved : e)));
      })
      .catch(() => {
        // 저장 실패 시 낙관적 항목 롤백
        setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      });
  }

  // 낙관적 수정: 화면에 먼저 반영하고 서버에 저장
  function updateEntry(updated: DiaryEntry) {
    const backup = entries;
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    patchEntry(updated)
      .then((saved) => {
        setEntries((prev) => prev.map((e) => (e.id === updated.id ? saved : e)));
      })
      .catch(() => {
        // 저장 실패 시 롤백
        setEntries(backup);
      });
  }

  // 낙관적 삭제
  function deleteEntry(id: number) {
    const backup = entries;
    setEntries((prev) => prev.filter((e) => e.id !== id));
    removeEntry(id).catch(() => {
      // 실패 시 복구
      setEntries(backup);
    });
  }

  return (
    <EntriesContext.Provider value={{ entries, loading, addEntry, updateEntry, deleteEntry }}>
      {children}
    </EntriesContext.Provider>
  );
}

export function useEntries() {
  return useContext(EntriesContext);
}
