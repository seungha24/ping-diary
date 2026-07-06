// 운영 기본값은 Railway 배포 서버. 로컬 개발 시 EXPO_PUBLIC_API_BASE_URL로 오버라이드.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'https://ping-diary-server-production.up.railway.app';
