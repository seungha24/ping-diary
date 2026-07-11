import { DiaryEntry } from './types';

/**
 * 일기 목록을 최신순(일기 날짜 createdAt 내림차순)으로 정렬한 새 배열을 반환한다.
 * 날짜가 같으면 id 내림차순(나중에 만든 글이 위)으로 안정적으로 정렬한다.
 * @param entries 정렬할 일기 배열 (원본은 변경하지 않음)
 * @returns 최신순으로 정렬된 새 배열
 */
export function sortByNewest(entries: DiaryEntry[]): DiaryEntry[] {
  return [...entries].sort((a, b) => {
    const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (diff !== 0) return diff;
    return b.id - a.id;
  });
}
