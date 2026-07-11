import React, { createContext, useContext, useEffect, useState } from 'react';
import { DiaryEntry, INITIAL_ENTRIES } from '../data/types';
import { sortByNewest } from '../data/entrySort';
import { useAuth } from './AuthContext';
import { fetchEntries, createEntry, patchEntry, removeEntry } from '../api';
import { notify } from '../notify';

interface EntriesContextValue {
  entries: DiaryEntry[];
  loading: boolean;
  addEntry: (entry: DiaryEntry) => void;
  updateEntry: (entry: DiaryEntry) => void;
  updateLocal: (entry: DiaryEntry) => void;
  deleteEntry: (id: number) => void;
}

const EntriesContext = createContext<EntriesContextValue>({
  entries: [],
  loading: true,
  addEntry: () => {},
  updateEntry: () => {},
  updateLocal: () => {},
  deleteEntry: () => {},
});

export function EntriesProvider({ children }: { children: React.ReactNode }) {
  const { ready, token } = useAuth();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // 인증 완료 후 서버에서 p!ng 로드
  useEffect(() => {
    let cancelled = false;
    if (!ready) return;

    async function load() {
      if (!token) {
        if (!cancelled) { setEntries([]); setLoading(false); }
        return;
      }
      try {
        let list = await fetchEntries();
        // 예전에 자동 시드됐던 데모 글 정리 (제목+본문이 데모와 정확히 일치하는 것만 삭제)
        const demoIds = list
          .filter((e) => INITIAL_ENTRIES.some((s) => s.title === e.title && s.body === e.body))
          .map((e) => e.id);
        if (demoIds.length > 0) {
          await Promise.all(demoIds.map((id) => removeEntry(id).catch(() => {})));
          list = list.filter((e) => !demoIds.includes(e.id));
        }
        if (!cancelled) { setEntries(sortByNewest(list)); setLoading(false); }
      } catch {
        if (!cancelled) { setEntries([]); setLoading(false); }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [ready, token]);

  // 낙관적 추가: 화면에 먼저 반영하고 서버 저장 후 실제 엔트리로 교체 (항상 최신순 유지)
  function addEntry(entry: DiaryEntry) {
    setEntries((prev) => sortByNewest([entry, ...prev]));
    createEntry(entry)
      .then((saved) => {
        setEntries((prev) => sortByNewest(prev.map((e) => (e.id === entry.id ? saved : e))));
        notify('p!ng 업로드 완료!');
      })
      .catch(() => {
        // 저장 실패 시 낙관적 항목 롤백
        setEntries((prev) => prev.filter((e) => e.id !== entry.id));
        notify('p!ng 저장에 실패했어요. 네트워크를 확인해주세요.');
      });
  }

  // 낙관적 수정: 화면에 먼저 반영하고 서버에 저장 (날짜가 바뀌었을 수 있으니 재정렬)
  function updateEntry(updated: DiaryEntry) {
    const backup = entries;
    setEntries((prev) => sortByNewest(prev.map((e) => (e.id === updated.id ? updated : e))));
    patchEntry(updated)
      .then((saved) => {
        setEntries((prev) => sortByNewest(prev.map((e) => (e.id === updated.id ? saved : e))));
      })
      .catch(() => {
        // 저장 실패 시 롤백
        setEntries(backup);
        notify('수정 저장에 실패했어요.');
      });
  }

  // 서버 결과를 로컬 상태에만 반영 (별도 네트워크 호출 없음)
  function updateLocal(updated: DiaryEntry) {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }

  // 낙관적 삭제
  function deleteEntry(id: number) {
    const backup = entries;
    setEntries((prev) => prev.filter((e) => e.id !== id));
    removeEntry(id).catch(() => {
      // 실패 시 복구
      setEntries(backup);
      notify('삭제에 실패했어요.');
    });
  }

  return (
    <EntriesContext.Provider value={{ entries, loading, addEntry, updateEntry, updateLocal, deleteEntry }}>
      {children}
    </EntriesContext.Provider>
  );
}

export function useEntries() {
  return useContext(EntriesContext);
}
