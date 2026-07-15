// 그룹 초대 링크 헬퍼.
// 공유 링크(https://ping-diary.vercel.app/join/CODE, pingdiary://join/CODE)를 누르면
// 앱/웹에서 코드 입력 없이 바로 그룹에 참여되도록 코드를 추출·보관한다.

/** 공유 메시지에 넣을 초대 링크 (웹에서 열리고, 웹이 앱 여부를 안내) */
export const JOIN_LINK_BASE = 'https://ping-diary.vercel.app/join/';

export function joinLinkFor(code: string): string {
  return `${JOIN_LINK_BASE}${encodeURIComponent(code)}`;
}

/** URL에서 초대 코드를 추출한다. join 경로가 아니면 null. */
export function parseJoinCode(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/(?:^|\/)join\/([A-Za-z0-9]+)/);
  return m ? m[1] : null;
}

// 웹: 로그인 전에 /join/CODE로 들어오면 코드를 보관해 뒀다가 로그인 후 참여시킨다.
// 카카오/네이버 로그인은 전체 페이지 리다이렉트로 주소가 초기화되므로
// 메모리가 아니라 sessionStorage에 남겨 살아남게 한다.
const PENDING_KEY = 'ping_diary_pending_join';
let pendingCode: string | null = null;

/**
 * 현재 주소(또는 전달받은 URL)에서 초대 코드를 캡처해 보관한다.
 * 웹 앱 시작 시 한 번 호출. 캡처하면 주소창의 /join 경로는 지운다 (새로고침 중복 방지).
 */
export function capturePendingJoinCode(url?: string): void {
  const target =
    url ?? (typeof window !== 'undefined' ? window.location?.href : null);
  const code = parseJoinCode(target);
  if (!code) return;
  pendingCode = code;
  try { sessionStorage.setItem(PENDING_KEY, code); } catch {}
  if (!url && typeof window !== 'undefined') {
    try { window.history.replaceState(null, '', '/'); } catch {}
  }
}

/** 보관된 초대 코드를 꺼내고 비운다 (1회성). */
export function consumePendingJoinCode(): string | null {
  let code = pendingCode;
  if (!code) {
    try { code = sessionStorage.getItem(PENDING_KEY); } catch {}
  }
  pendingCode = null;
  try { sessionStorage.removeItem(PENDING_KEY); } catch {}
  return code;
}
