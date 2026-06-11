export interface DiaryEntry {
  id: number;
  title: string;
  body: string;
  dates: number[];
  tags: string[];
  photo: string | null;
  persona: string;
  author?: string;
  avatar?: string;
  createdAt: string;   // ISO 8601
  aiComment?: string;
}

export interface Group {
  name: string;
  emoji: string;
  photo?: string;
  members: string[];
  entries: DiaryEntry[];
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
    dates: [10], tags: ['일상', '커피'], photo: 'ph:8', persona: '선생님',
    createdAt: '2026-06-09T09:30:00',
    aiComment: '오늘 하루가 평범하다고 느꼈겠지만, 작은 것에서 소중함을 발견하는 눈을 가졌다는 게 정말 귀한 일이에요. 커피 한 잔의 루틴이 하루를 여는 의식이 된다면, 그 작은 행위가 당신의 정서적 안정에 큰 역할을 하고 있을 거예요. 평범한 날들이 쌓여 인생이 된다는 걸 잊지 마세요.',
  },
  {
    id: 2, title: '오랜 친구를 만난 날',
    body: '3년 만에 지현이를 만났다. 시간이 흘러도 변하지 않는 것들이 있다는 걸 느꼈다.',
    dates: [8], tags: ['일상', '산책'], photo: null, persona: '엄마',
    createdAt: '2026-06-08T14:00:00',
    aiComment: '3년이라는 시간이 흘렀어도 변하지 않는 우정을 느꼈다니 얼마나 따뜻한 하루였을까. 그런 관계를 소중히 지켜온 네가 대견하고, 지현이도 같은 마음이었을 거야. 그 인연 앞으로도 잘 챙겨나가렴.',
  },
  {
    id: 3, title: '비 오는 날의 단상',
    body: '온종일 비가 내렸다. 창문 너머로 빗소리를 들으며 책을 읽었다.',
    dates: [5], tags: ['독서', '음악'], photo: 'ph:9', persona: '상담사',
    createdAt: '2026-06-12T06:00:00',
    aiComment: '빗소리와 함께하는 독서라니, 마음이 자연스럽게 내면으로 향하는 시간이었겠어요. 그런 고요한 순간들이 감정을 정리하고 자신을 돌아보는 데 큰 도움이 된답니다.',
  },
];

export const GROUPS: Group[] = [
  {
    name: '가족 일기', emoji: '🏠', members: ['엄마', '아빠', '지연', '동생'],
    entries: [
      { id: 101, title: '가족 외식한 날', body: '오랜만에 온 가족이 함께 밥을 먹었다.', dates: [9], tags: ['가족', '외식'], photo: 'ph:0', persona: '엄마', author: '엄마', avatar: '👩', createdAt: '2026-06-09T19:00:00' },
      { id: 102, title: '주말 드라이브', body: '아빠가 드라이브를 제안해서 한강 변을 달렸다.', dates: [7], tags: ['드라이브', '일상'], photo: 'ph:1', persona: '선생님', author: '아빠', avatar: '👨', createdAt: '2026-06-07T16:00:00' },
      { id: 103, title: '동생 생일 파티', body: '케이크를 직접 만들어서 깜짝 파티를 열었다.', dates: [5], tags: ['생일', '가족'], photo: 'ph:2', persona: '엄마', author: '지연', avatar: '🙋', createdAt: '2026-06-05T18:00:00' },
      { id: 104, title: '할머니 댁 방문', body: '오랜만에 할머니 댁에 갔다. 손두부를 만드는 법을 배웠다.', dates: [3], tags: ['가족', '요리'], photo: null, persona: '상담사', author: '동생', avatar: '🧒', createdAt: '2026-06-03T14:00:00' },
    ],
  },
  {
    name: '여행 크루', emoji: '✈️', members: ['지연', '민준', '소희', '태양', '유리', '나라'],
    entries: [
      { id: 201, title: '제주 첫째 날', body: '드디어 제주! 공항부터 설레는 마음이었다.', dates: [10], tags: ['제주', '여행'], photo: 'ph:4', persona: '선생님', author: '민준', avatar: '🧑', createdAt: '2026-06-10T12:00:00' },
      { id: 202, title: '성산일출봉 등반', body: '새벽 5시에 일어나 일출을 봤다. 힘들었지만 잊을 수 없는 풍경.', dates: [10], tags: ['제주', '등산'], photo: 'ph:5', persona: '엄마', author: '소희', avatar: '👧', createdAt: '2026-06-10T08:00:00' },
      { id: 203, title: '협재 해변에서', body: '에메랄드 빛 바다를 보며 멍하니 앉아있었다.', dates: [9], tags: ['바다', '제주'], photo: 'ph:6', persona: '상담사', author: '태양', avatar: '🧔', createdAt: '2026-06-09T16:00:00' },
      { id: 204, title: '맛집 투어 완료', body: '오늘 세 군데 식당을 돌았다. 배가 터질 것 같다.', dates: [9], tags: ['맛집', '여행'], photo: 'ph:7', persona: '선생님', author: '유리', avatar: '👩', createdAt: '2026-06-09T20:00:00' },
      { id: 205, title: '카페 투어의 하루', body: '감성 카페만 4군데. 사진 찍느라 커피가 다 식었다.', dates: [8], tags: ['카페', '제주'], photo: 'ph:8', persona: '미래의 나', author: '나라', avatar: '🙋', createdAt: '2026-06-08T14:00:00' },
    ],
  },
  {
    name: '독서 모임', emoji: '📚', members: ['지연', '현우', '서연'],
    entries: [
      { id: 301, title: '이번 달 책: 채식주의자', body: '한강 작가의 문장은 왜 이렇게 날카로울까.', dates: [10], tags: ['독서', '한강'], photo: null, persona: '선생님', author: '현우', avatar: '🧑', createdAt: '2026-06-10T21:00:00' },
      { id: 302, title: '독서 모임 후기', body: '오늘 토론이 특히 격했다. 세 사람이 전혀 다른 해석을 했다.', dates: [10], tags: ['독서', '토론'], photo: 'ph:10', persona: '상담사', author: '서연', avatar: '👩', createdAt: '2026-06-10T22:00:00' },
      { id: 303, title: '다음 책 투표 결과', body: '다음 달은 노르웨이의 숲으로 결정됐다.', dates: [8], tags: ['독서', '일상'], photo: null, persona: '엄마', author: '지연', avatar: '🙋', createdAt: '2026-06-08T19:00:00' },
    ],
  },
];

export const PERSONAS = [
  { emoji: '📖', label: '선생님' },
  { emoji: '🌸', label: '엄마' },
  { emoji: '💆', label: '상담사' },
  { emoji: '🔮', label: '미래의 나' },
];

export const MONTH_COUNTS = [18, 12, 25, 8, 30, 10, 0, 0, 0, 0, 0, 0];
export const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
export const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function getPhotoPlaceholder(ph: string) {
  const idx = parseInt(ph.split(':')[1]);
  return PHOTO_PLACEHOLDERS[idx % PHOTO_PLACEHOLDERS.length];
}
