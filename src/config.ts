// 운영 기본값은 Railway 배포 서버. 로컬 개발 시 EXPO_PUBLIC_API_BASE_URL로 오버라이드.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'https://ping-diary-server-production.up.railway.app';

// 카카오 AdFit 웹 배너 광고단위 ID (DAN-xxxx). 미설정이면 배너를 렌더하지 않는다.
export const ADFIT_UNIT_WEB = process.env.EXPO_PUBLIC_ADFIT_UNIT_WEB ?? '';

// PostHog 프로젝트 API 키(공개용 write-only 키 — 클라이언트 포함 안전, anon 키와 동일한 성격).
// EXPO_PUBLIC_*로 오버라이드 가능. 빈 값이면 분석 비활성화(no-op).
export const POSTHOG_KEY =
  process.env.EXPO_PUBLIC_POSTHOG_KEY ??
  'phc_vaZvAJVBBKTju3LeFsQy8BEgiEZvK9MrhBFhqEGEbgEW';
// PostHog 클라우드 호스트. 미국(us) 기본, 유럽은 https://eu.i.posthog.com.
export const POSTHOG_HOST =
  process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
