export interface DiaryFolder {
  id: string;
  name: string;
  emoji: string;
}

export const FOLDERS: DiaryFolder[] = [
  { id: 'daily',   name: '일상',   emoji: '☁️' },
  { id: 'travel',  name: '여행',   emoji: '✈️' },
  { id: 'reading', name: '독서',   emoji: '📚' },
  { id: 'food',    name: '맛집',   emoji: '🍜' },
  { id: 'music',   name: '음악',   emoji: '🎵' },
  { id: 'etc',     name: '기타',   emoji: '📁' },
];

export interface DiaryEntry {
  id: number;
  title: string;
  body: string;
  dates: number[];
  tags: string[];
  photo: string | null;        // 대표(크게 보이는) 사진
  photos?: string[];           // 추가 사진 (작게 보이는 것들, 최대 3)
  persona: string;
  folder?: string;
  author?: string;
  authorId?: string;   // 그룹 공유글 작성자 user_id (차단용)
  avatar?: string;
  /** 작성자 프로필 사진 URL (그룹 피드) */
  avatarUrl?: string | null;
  createdAt: string;   // ISO 8601
  aiComment?: string;
  visibility?: 'private' | 'friends';  // 'friends'면 참여 그룹 피드에 공개
  sharedGroups?: number[] | null;      // 공유할 그룹 id 목록. null이면 모든 그룹(기존 동작)
}

export const PHOTO_PLACEHOLDERS = [
  { bg: '#d1e8d1', emoji: '🍽️' },
  { bg: '#d1d8f0', emoji: '🚗' },
  { bg: '#f0d8d1', emoji: '🎂' },
  { bg: '#e8e0d1', emoji: '🏡' },
  { bg: '#d1eef0', emoji: '🌅' },
  { bg: '#e8d1f0', emoji: '⛰️' },
  { bg: '#d1f0e0', emoji: '🏖️' },
  { bg: '#f0ead1', emoji: '🍜' },
  { bg: '#f0d1e8', emoji: '☕' },
  { bg: '#d8d1f0', emoji: '📖' },
  { bg: '#d1f0f0', emoji: '💬' },
  { bg: '#f0f0d1', emoji: '📚' },
];

export const BAND_COLORS = ['#fca5a5', '#93c5fd', '#fcd34d', '#c4b5fd', '#6ee7b7'];

export const INITIAL_ENTRIES: DiaryEntry[] = [
  {
    id: 1, title: '오늘도 평범한 하루',
    body: '아침에 커피 한 잔을 마시며 하루를 시작했다. 특별할 것 없지만 그래서 더 소중한 날들.',
    dates: [10], tags: ['일상', '커피'], photo: null, persona: '선생님', folder: 'daily',
    createdAt: '2026-06-09T09:30:00',
    aiComment: '오늘 하루가 평범하다고 느꼈겠지만, 작은 것에서 소중함을 발견하는 눈을 가졌다는 게 정말 귀한 일이에요. 커피 한 잔의 루틴이 하루를 여는 의식이 된다면, 그 작은 행위가 당신의 정서적 안정에 큰 역할을 하고 있을 거예요. 평범한 날들이 쌓여 인생이 된다는 걸 잊지 마세요.',
  },
  {
    id: 2, title: '오랜 친구를 만난 날',
    body: '3 년 만에 지현이를 만났다. 시간이 흘러도 변하지 않는 것들이 있다는 걸 느꼈다.',
    dates: [8], tags: ['일상', '산책'], photo: null, persona: '엄마', folder: 'daily',
    createdAt: '2026-06-08T14:00:00',
    aiComment: '3 년이라는 시간이 흘렀어도 변하지 않는 우정을 느꼈다니 얼마나 따뜻한 하루였을까. 그런 관계를 소중히 지켜온 네가 대견하고, 지현이도 같은 마음이었을 거야. 그 인연 앞으로도 잘 챙겨나가렴.',
  },
  {
    id: 3, title: '비 오는 날의 단상',
    body: '온종일 비가 내렸다. 창문 너머로 빗소리를 들으며 책을 읽었다.',
    dates: [5], tags: ['독서', '음악'], photo: 'ph:9', persona: '상담사', folder: 'reading',
    createdAt: '2026-06-12T06:00:00',
    aiComment: '빗소리와 함께하는 독서라니, 마음이 자연스럽게 내면으로 향하는 시간이었겠어요. 그런 고요한 순간들이 감정을 정리하고 자신을 돌아보는 데 큰 도움이 된답니다.',
  },
];

export const PERSONAS = [
  { emoji: '📖', label: '선생님' },
  { emoji: '🌸', label: '엄마' },
  { emoji: '🖋️', label: '소설가' },
  { emoji: '📜', label: '전기 작가' },
  { emoji: '✒️', label: '시인' },
  { emoji: '🫂', label: '언제나 내 편' },
  { emoji: '😤', label: '투덜이' },
  { emoji: '🐱', label: '고양이' },
];

export const MONTH_COUNTS = [18, 12, 25, 8, 30, 10, 0, 0, 0, 0, 0, 0];
export const MONTHS = ['1 월', '2 월', '3 월', '4 월', '5 월', '6 월', '7 월', '8 월', '9 월', '10 월', '11 월', '12 월'];
export const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function getPhotoPlaceholder(ph: string) {
  const idx = parseInt(ph.split(':')[1]);
  return PHOTO_PLACEHOLDERS[idx % PHOTO_PLACEHOLDERS.length];
}

/**
 * 저장된 폴더 목록(사용자 순서·이름·이모지)과 기본 폴더를 합친다.
 * - 저장 목록에 있는 폴더는 그 순서대로
 * - 저장 목록에 없는 기본 폴더는 기본 순서로 뒤에 (단, 저장 목록에 기본 폴더가
 *   하나도 없으면 예전 동작처럼 기본 폴더 먼저 → 만든 폴더 순)
 */
export function mergeFolders(stored: DiaryFolder[], hidden: string[]): DiaryFolder[] {
  const storedVisible = stored.filter((f) => !hidden.includes(f.id));
  const rest = FOLDERS.filter((d) => !hidden.includes(d.id) && !stored.some((s) => s.id === d.id));
  const hasDefaultsInStored = stored.some((s) => FOLDERS.some((d) => d.id === s.id));
  return hasDefaultsInStored ? [...storedVisible, ...rest] : [...rest, ...storedVisible];
}

// ── 본문 마커: [q:질문] (오늘의 질문), [photo:URL] (본문 사진) ──

const QUESTION_RE = /^\[q:([^\]]+)\]\s*/;

/** 본문 맨 앞의 '오늘의 질문' 마커 분리 */
export function extractQuestion(body: string): { question: string | null; rest: string } {
  const m = (body || '').match(QUESTION_RE);
  return m ? { question: m[1], rest: (body || '').slice(m[0].length) } : { question: null, rest: body || '' };
}

/** 목록 미리보기 등에서 마커(질문·사진) 제거 */
export function stripPhotoMarkers(text: string): string {
  return (text || '')
    .replace(QUESTION_RE, '')
    .replace(/\[photo:[^\]\s]+\]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export type BodySegment = { type: 'text'; text: string } | { type: 'photo'; url: string };

/** 본문을 텍스트/사진 세그먼트로 분해 (상세 화면 렌더용) */
export function parseBodySegments(body: string): BodySegment[] {
  const segments: BodySegment[] = [];
  const re = /\[photo:([^\]\s]+)\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const text = body.slice(last, m.index).trim();
    if (text) segments.push({ type: 'text', text });
    segments.push({ type: 'photo', url: m[1] });
    last = m.index + m[0].length;
  }
  const tail = body.slice(last).trim();
  if (tail) segments.push({ type: 'text', text: tail });
  return segments;
}

/** 일기 날짜 라벨 — 작성 시각(createdAt)의 실제 월 + 선택 일자들 */
export function entryDateLabel(entry: { createdAt: string; dates: number[] }): string {
  const month = new Date(entry.createdAt).getMonth() + 1;
  const days = entry.dates && entry.dates.length ? entry.dates.join(', ') : '';
  return days ? `${month} 월 ${days} 일` : `${month} 월`;
}
