// 일기 임시저장(초안) 스토어. 웹은 localStorage, 그 외엔 메모리 폴백.
export interface DiaryDraft {
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

const KEY = 'ping_diary_draft';
let memory: DiaryDraft | null = null;

function storage(): Storage | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {}
  return null;
}

export function saveDraft(draft: DiaryDraft) {
  memory = draft;
  const s = storage();
  if (s) {
    try { s.setItem(KEY, JSON.stringify(draft)); } catch {}
  }
}

export function getDraft(): DiaryDraft | null {
  const s = storage();
  if (s) {
    try {
      const raw = s.getItem(KEY);
      if (raw) return JSON.parse(raw) as DiaryDraft;
    } catch {}
  }
  return memory;
}

export function clearDraft() {
  memory = null;
  const s = storage();
  if (s) {
    try { s.removeItem(KEY); } catch {}
  }
}
