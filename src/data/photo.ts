/** 대표 사진 결정: 지정한 사진이 본문에 남아 있으면 그 사진, 아니면 첫 사진 */
export function pickMainPhoto(urls: string[], cover: string | null): string | null {
  if (cover && urls.includes(cover)) return cover;
  return urls[0] ?? null;
}
