import { sortByNewest } from '../data/entrySort';
import { DiaryEntry } from '../data/types';

/**
 * 테스트용 최소 DiaryEntry를 만든다.
 * @param id 엔트리 id
 * @param createdAt 일기 날짜 (ISO 문자열)
 * @returns DiaryEntry 객체
 */
function makeEntry(id: number, createdAt: string): DiaryEntry {
  return {
    id,
    title: `t${id}`,
    body: '',
    dates: [],
    tags: [],
    photo: null,
    persona: '',
    createdAt,
  };
}

describe('sortByNewest', () => {
  it('일기 날짜(createdAt) 최신순으로 정렬한다', () => {
    const list = [
      makeEntry(1, '2026-07-01T10:00:00Z'),
      makeEntry(2, '2026-07-10T10:00:00Z'),
      makeEntry(3, '2026-07-05T10:00:00Z'),
    ];
    expect(sortByNewest(list).map((e) => e.id)).toEqual([2, 3, 1]);
  });

  it('날짜가 같으면 id가 큰(나중에 만든) 글이 먼저 온다', () => {
    const list = [
      makeEntry(1, '2026-07-10T10:00:00Z'),
      makeEntry(5, '2026-07-10T10:00:00Z'),
    ];
    expect(sortByNewest(list).map((e) => e.id)).toEqual([5, 1]);
  });

  it('원본 배열을 변경하지 않는다', () => {
    const list = [
      makeEntry(1, '2026-07-01T10:00:00Z'),
      makeEntry(2, '2026-07-10T10:00:00Z'),
    ];
    sortByNewest(list);
    expect(list.map((e) => e.id)).toEqual([1, 2]);
  });

  it('빈 배열도 안전하게 처리한다', () => {
    expect(sortByNewest([])).toEqual([]);
  });
});
