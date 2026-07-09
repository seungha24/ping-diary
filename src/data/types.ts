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
  photo: string | null;
  persona: string;
  folder?: string;
  author?: string;
  authorId?: string;   // 그룹 공유글 작성자 user_id (차단용)
  avatar?: string;
  createdAt: string;   // ISO 8601
  aiComment?: string;
  visibility?: 'private' | 'friends';  // 'friends'면 참여 그룹 피드에 공개
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
    dates: [10], tags: ['일상', '커피'], photo: 'asset:capy_sleep', persona: '선생님', folder: 'daily',
    createdAt: '2026-06-09T09:30:00',
    aiComment: '오늘 하루가 평범하다고 느꼈겠지만, 작은 것에서 소중함을 발견하는 눈을 가졌다는 게 정말 귀한 일이에요. 커피 한 잔의 루틴이 하루를 여는 의식이 된다면, 그 작은 행위가 당신의 정서적 안정에 큰 역할을 하고 있을 거예요. 평범한 날들이 쌓여 인생이 된다는 걸 잊지 마세요.',
  },
  {
    id: 2, title: '오랜 친구를 만난 날',
    body: '3년 만에 지현이를 만났다. 시간이 흘러도 변하지 않는 것들이 있다는 걸 느꼈다.',
    dates: [8], tags: ['일상', '산책'], photo: null, persona: '엄마', folder: 'daily',
    createdAt: '2026-06-08T14:00:00',
    aiComment: '3년이라는 시간이 흘렀어도 변하지 않는 우정을 느꼈다니 얼마나 따뜻한 하루였을까. 그런 관계를 소중히 지켜온 네가 대견하고, 지현이도 같은 마음이었을 거야. 그 인연 앞으로도 잘 챙겨나가렴.',
  },
  {
    id: 3, title: '비 오는 날의 단상',
    body: '온종일 비가 내렸다. 창문 너머로 빗소리를 들으며 책을 읽었다.',
    dates: [5], tags: ['독서', '음악'], photo: 'ph:9', persona: '상담사', folder: 'reading',
    createdAt: '2026-06-12T06:00:00',
    aiComment: '빗소리와 함께하는 독서라니, 마음이 자연스럽게 내면으로 향하는 시간이었겠어요. 그런 고요한 순간들이 감정을 정리하고 자신을 돌아보는 데 큰 도움이 된답니다.',
  },
];

export const GROUPS: Group[] = [
  {
    name: '가족 p!ng', emoji: '🏠', members: ['엄마', '아빠', '지연', '동생'],
    entries: [
      { id: 101, title: '가족 외식한 날', body: '오랜만에 온 가족이 함께 밥을 먹었다.', dates: [9], tags: ['가족', '외식'], photo: 'ph:0', persona: '엄마', author: '엄마', avatar: '👩', createdAt: '2026-06-09T19:00:00', aiComment: '온 가족이 함께하는 식사 자리가 얼마나 소중한지 느껴져. 바쁜 일상 속에서도 이런 시간을 만들어낸 게 정말 대견하고, 그 온기가 오래오래 이어지길 바란단다.' },
      { id: 102, title: '주말 드라이브', body: '아빠가 드라이브를 제안해서 한강 변을 달렸다.', dates: [7], tags: ['드라이브', '일상'], photo: 'ph:1', persona: '선생님', author: '아빠', avatar: '👨', createdAt: '2026-06-07T16:00:00', aiComment: '한강을 따라 달리는 드라이브는 단순한 이동이 아니라 일상의 리셋이에요. 창문 너머 풍경을 함께 바라보는 그 순간이 가족 사이의 거리를 좁혀주는 특별한 시간이 됐을 거예요.' },
      { id: 103, title: '동생 생일 파티', body: '케이크를 직접 만들어서 깜짝 파티를 열었다.', dates: [5], tags: ['생일', '가족'], photo: 'ph:2', persona: '엄마', author: '지연', avatar: '🙋', createdAt: '2026-06-05T18:00:00', aiComment: '직접 케이크를 만들어 깜짝 파티를 열었다니, 그 정성과 사랑이 얼마나 깊은지 느껴져. 동생도 분명 평생 기억할 생일이 됐을 거야.' },
      { id: 104, title: '할머니 댁 방문', body: '오랜만에 할머니 댁에 갔다. 손두부를 만드는 법을 배웠다.', dates: [3], tags: ['가족', '요리'], photo: null, persona: '상담사', author: '동생', avatar: '🧒', createdAt: '2026-06-03T14:00:00', aiComment: '손두부 만드는 법을 배우는 건 단순한 요리 배우기가 아니에요. 할머니의 시간과 삶의 방식을 이어받는 소중한 경험이에요. 그 따뜻한 기억을 꼭 간직해요.' },
    ],
  },
  {
    name: '여행 크루', emoji: '✈️', members: ['지연', '민준', '소희', '태양', '유리', '나라'],
    entries: [
      { id: 201, title: '제주 첫째 날', body: '드디어 제주! 공항부터 설레는 마음이었다.', dates: [10], tags: ['제주', '여행'], photo: 'ph:4', persona: '선생님', author: '민준', avatar: '🧑', createdAt: '2026-06-10T12:00:00', aiComment: '설렘을 글로 담아내는 능력이 돋보여요. 여행의 시작을 이렇게 온전히 느끼는 사람은 분명 끝도 아름답게 마무리할 거예요.' },
      { id: 202, title: '성산일출봉 등반', body: '새벽 5시에 일어나 일출을 봤다. 힘들었지만 잊을 수 없는 풍경.', dates: [10], tags: ['제주', '등산'], photo: 'ph:5', persona: '엄마', author: '소희', avatar: '👧', createdAt: '2026-06-10T08:00:00', aiComment: '힘들어도 포기하지 않고 정상에서 일출을 맞이한 그 순간, 정말 대단해. 몸은 힘들었어도 마음은 충분히 빛났을 거야.' },
      { id: 203, title: '협재 해변에서', body: '에메랄드 빛 바다를 보며 멍하니 앉아있었다.', dates: [9], tags: ['바다', '제주'], photo: 'asset:capy_water', persona: '상담사', author: '태양', avatar: '🧔', createdAt: '2026-06-09T16:00:00', aiComment: '멍하니 바다를 바라보는 시간, 그게 사실 최고의 힐링이에요. 아무것도 하지 않아도 괜찮다는 걸 바다가 말해주고 있었던 거예요.' },
      { id: 204, title: '맛집 투어 완료', body: '오늘 세 군데 식당을 돌았다. 배가 터질 것 같다.', dates: [9], tags: ['맛집', '여행'], photo: 'asset:capy_burger', persona: '선생님', author: '유리', avatar: '👩', createdAt: '2026-06-09T20:00:00', aiComment: '맛집 세 곳을 완주한 건 단순한 식욕이 아니라 여행을 제대로 즐기겠다는 의지예요. 배가 부른 것도 소중한 여행의 기억이 됩니다.' },
      { id: 205, title: '카페 투어의 하루', body: '감성 카페만 4군데. 사진 찍느라 커피가 다 식었다.', dates: [8], tags: ['카페', '제주'], photo: 'ph:8', persona: '미래의 나', author: '나라', avatar: '🙋', createdAt: '2026-06-08T14:00:00', aiComment: '지금 이 순간들을 열심히 기록하고 있는 너, 나중에 이 사진들과 글들이 얼마나 소중해질지 몰라. 식어버린 커피도 그날의 기억이 되니까 후회하지 마.' },
    ],
  },
  {
    name: '독서 모임', emoji: '📚', members: ['지연', '현우', '서연'],
    entries: [
      { id: 301, title: '이번 달 책: 채식주의자', body: '한강 작가의 문장은 왜 이렇게 날카로울까.', dates: [10], tags: ['독서', '한강'], photo: null, persona: '선생님', author: '현우', avatar: '🧑', createdAt: '2026-06-10T21:00:00', aiComment: '문장의 날카로움에서 감동을 받는다는 건, 단순히 책을 읽는 게 아니라 글쓴이의 고통과 감정에 공명하는 거예요. 그런 섬세한 감수성이 현우 씨만의 강점이에요.' },
      { id: 302, title: '독서 모임 후기', body: '오늘 토론이 특히 격했다. 세 사람이 전혀 다른 해석을 했다.', dates: [10], tags: ['독서', '토론'], photo: 'ph:10', persona: '상담사', author: '서연', avatar: '👩', createdAt: '2026-06-10T22:00:00', aiComment: '같은 책을 읽고 세 가지 다른 해석이 나왔다는 건 모임이 정말 살아있다는 증거예요. 정답을 찾는 게 아니라 서로의 시각을 나누는 그 과정 자체가 진짜 독서의 깊이랍니다.' },
      { id: 303, title: '다음 책 투표 결과', body: '다음 달은 노르웨이의 숲으로 결정됐다.', dates: [8], tags: ['독서', '일상'], photo: null, persona: '엄마', author: '지연', avatar: '🙋', createdAt: '2026-06-08T19:00:00', aiComment: '노르웨이의 숲은 많은 사람들의 마음에 오래 남는 책이야. 다음 달 모임이 어떤 이야기로 채워질지 벌써부터 기대되는구나. 잘 골랐어.' },
    ],
  },
];

export const PERSONAS = [
  { emoji: '📖', label: '선생님' },
  { emoji: '🌸', label: '엄마' },
  { emoji: '🖋️', label: '소설가' },
  { emoji: '📜', label: '전기 작가' },
  { emoji: '✒️', label: '시인' },
];

export const MONTH_COUNTS = [18, 12, 25, 8, 30, 10, 0, 0, 0, 0, 0, 0];
export const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
export const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function getPhotoPlaceholder(ph: string) {
  const idx = parseInt(ph.split(':')[1]);
  return PHOTO_PLACEHOLDERS[idx % PHOTO_PLACEHOLDERS.length];
}

/** 일기 날짜 라벨 — 작성 시각(createdAt)의 실제 월 + 선택 일자들 */
export function entryDateLabel(entry: { createdAt: string; dates: number[] }): string {
  const month = new Date(entry.createdAt).getMonth() + 1;
  const days = entry.dates && entry.dates.length ? entry.dates.join(', ') : '';
  return days ? `${month}월 ${days}일` : `${month}월`;
}
