// 운영 기본값은 Railway 배포 서버. 로컬 개발 시 EXPO_PUBLIC_API_BASE_URL로 오버라이드.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'https://ping-diary-server-production.up.railway.app';

// 카카오 AdFit 웹 배너 광고단위 ID (DAN-xxxx). 미설정이면 배너를 렌더하지 않는다.
export const ADFIT_UNIT_WEB = process.env.EXPO_PUBLIC_ADFIT_UNIT_WEB ?? '';
