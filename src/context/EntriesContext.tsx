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
  refresh: () => Promise<void>; // 당겨서 새로고침 등 수동 재조회
}

const EntriesContext = createContext<EntriesContextValue>({
  entries: [],
  loading: true,
  addEntry: () => {},
  updateEntry: () => {},
  updateLocal: () => {},
  deleteEntry: () => {},
  refresh: async () => {},
});

export function EntriesProvider({ children }: { children: React.ReactNode }) {
  // authed(불리언) 기준 — 토큰 문자열은 1시간마다 자동 갱신되므로 그때마다 전체 리로드하지 않게
  const { ready, authed } = useAuth();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // 인증 완료 후 서버에서 p!ng 로드
  useEffect(() => {
    let cancelled = false;
    if (!ready) return;

    async function load() {
      if (!authed) {
        if (!cancelled) { setEntries([]); setLoading(false); }
        return;
      }
      try {
        let list = await fetchEntries();
        // 예전에 자동 시드됐던 데모 글 정리 (제목+본문이 데모와 정확히 일치하는 것만 삭제)
        // 서버 행이 헤어 스페이스(U+200A) 삽입 전/후 어느 시점에 시드됐어도 매칭되도록 정규화해 비교
        const normDemo = (t: string) => (t || '').replace(/ /g, '');
        const demoIds = list
          .filter((e) => INITIAL_ENTRIES.some((s) => normDemo(s.title) === normDemo(e.title) && normDemo(s.body) === normDemo(e.body)))
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
  }, [ready, authed]);

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
    // 실패 시 이 항목만 되돌린다 — 전체 스냅샷 복원은 그 사이 반영된 다른 변경까지 지워버림
    const original = entries.find((e) => e.id === updated.id);
    setEntries((prev) => sortByNewest(prev.map((e) => (e.id === updated.id ? updated : e))));
    patchEntry(updated)
      .then((saved) => {
        setEntries((prev) => sortByNewest(prev.map((e) => (e.id === updated.id ? saved : e))));
      })
      .catch(() => {
        if (original) setEntries((prev) => sortByNewest(prev.map((e) => (e.id === updated.id ? original : e))));
        notify('수정 저장에 실패했어요.');
      });
  }

  // 서버 결과를 로컬 상태에만 반영 (별도 네트워크 호출 없음)
  function updateLocal(updated: DiaryEntry) {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }

  // 낙관적 삭제
  function deleteEntry(id: number) {
    // 실패 시 지운 항목만 되살린다 (전체 스냅샷 복원 금지 — updateEntry와 동일한 이유)
    const removed = entries.find((e) => e.id === id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    removeEntry(id).catch(() => {
      if (removed) setEntries((prev) => sortByNewest([removed, ...prev.filter((e) => e.id !== id)]));
      notify('삭제에 실패했어요.');
    });
  }

  // 당겨서 새로고침 등 수동 재조회 (실패 시 기존 목록 유지)
  async function refresh() {
    try {
      const list = await fetchEntries();
      setEntries(sortByNewest(list));
    } catch {}
  }

  return (
    <EntriesContext.Provider value={{ entries, loading, addEntry, updateEntry, updateLocal, deleteEntry, refresh }}>
      {children}
    </EntriesContext.Provider>
  );
}

export function useEntries() {
  return useContext(EntriesContext);
}
