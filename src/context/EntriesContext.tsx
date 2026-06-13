import React, { createContext, useContext, useState } from 'react';
import { DiaryEntry, INITIAL_ENTRIES } from '../data/types';

interface EntriesContextValue {
  entries: DiaryEntry[];
  addEntry: (entry: DiaryEntry) => void;
  updateEntry: (entry: DiaryEntry) => void;
  deleteEntry: (id: number) => void;
}

const EntriesContext = createContext<EntriesContextValue>({
  entries: INITIAL_ENTRIES,
  addEntry: () => {},
  updateEntry: () => {},
  deleteEntry: () => {},
});

export function EntriesProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<DiaryEntry[]>(INITIAL_ENTRIES);

  function addEntry(entry: DiaryEntry) {
    setEntries((prev) => [entry, ...prev]);
  }

  function updateEntry(updated: DiaryEntry) {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }

  function deleteEntry(id: number) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <EntriesContext.Provider value={{ entries, addEntry, updateEntry, deleteEntry }}>
      {children}
    </EntriesContext.Provider>
  );
}

export function useEntries() {
  return useContext(EntriesContext);
}
