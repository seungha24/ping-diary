// 축소 이미지 URL 헬퍼.
// 스토리지의 원본(1600px, 수백 KB)을 작은 카드에 그대로 내리면 첫 로딩이 느리다 —
// 우리 스토리지 사진이면 서버의 /upload/thumb로 바꿔 ~20KB 축소본을 받는다.
import { API_BASE_URL } from './config';

const PHOTOS_PUBLIC = '/storage/v1/object/public/photos/';

/** 우리 스토리지의 사진이면 서버 썸네일 URL로 변환, 아니면 원본 그대로 */
export function thumbUrl(url: string | null | undefined, w: 160 | 480 | 960 = 480): string | null {
  if (!url) return null;
  const i = url.indexOf(PHOTOS_PUBLIC);
  if (i === -1) return url;
  const file = url.slice(i + PHOTOS_PUBLIC.length);
  if (!/^[\w.-]+$/.test(file)) return url; // 하위 경로(이미 썸네일 등)는 그대로
  return `${API_BASE_URL}/upload/thumb?f=${encodeURIComponent(file)}&w=${w}`;
}
