// 알림(목업) 공유 스토어. 화면 간 읽음 상태를 유지하고, 홈 종 배지도 이 상태를 구독한다.
export interface Notif {
  id: number;
  type: 'diary' | 'invite' | 'reminder' | 'ai';
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const INITIAL: Notif[] = [
  { id: 1, type: 'ai',       title: 'AI 코멘트가 도착했어요',      body: '선생님 · 오늘도 평범한 하루',     time: '방금 전',  read: false },
  { id: 2, type: 'diary',    title: '엄마가 새 p!ng를 작성했어요', body: '가족 p!ng · 가족 외식한 날',      time: '1시간 전', read: false },
  { id: 3, type: 'ai',       title: 'AI 코멘트가 도착했어요',      body: '엄마 · 오랜 친구를 만난 날',      time: '2시간 전', read: false },
  { id: 4, type: 'diary',    title: '민준이 새 p!ng를 작성했어요', body: '여행크루 · 제주 첫째 날',         time: '3시간 전', read: false },
  { id: 5, type: 'reminder', title: '가족 p!ng 알림',            body: '오늘 p!ng를 아직 쓰지 않았어요!', time: '4시간 전', read: false },
  { id: 6, type: 'invite',   title: '독서모임에 초대받았어요',     body: '지연님이 그룹에 초대했어요',       time: '어제',     read: true  },
  { id: 7, type: 'diary',    title: '소희가 새 p!ng를 작성했어요', body: '여행크루 · 성산일출봉 등반',      time: '어제',     read: true  },
  { id: 8, type: 'reminder', title: '여행크루 알림',             body: '매주 월요일 p!ng 알림이에요',     time: '2일 전',   read: true  },
  { id: 9, type: 'diary',    title: '아빠가 새 p!ng를 작성했어요', body: '가족 p!ng · 주말 드라이브',       time: '3일 전',   read: true  },
];

let notifs: Notif[] = INITIAL.map((n) => ({ ...n }));
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

export function getNotifs(): Notif[] {
  return notifs;
}

export function getUnreadCount(): number {
  return notifs.filter((n) => !n.read).length;
}

export function markAllRead() {
  notifs = notifs.map((n) => (n.read ? n : { ...n, read: true }));
  emit();
}

export function markRead(id: number) {
  notifs = notifs.map((n) => (n.id === id ? { ...n, read: true } : n));
  emit();
}

/** 변경 구독. 반환값을 호출하면 구독 해제. */
export function subscribeNotifs(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
