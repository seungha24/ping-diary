import { mergeRefreshed } from '../data/entrySort';
import { DiaryEntry } from '../data/types';

const E = (id: number, day: string): DiaryEntry => ({
  id, title: `e${id}`, body: '', dates: [], tags: [], photo: null, photos: [],
  persona: '', createdAt: `2026-07-${day}T00:00:00Z`, visibility: 'private', sharedGroups: null,
} as DiaryEntry);

describe('mergeRefreshed (재조회 + 진행 중 낙관적 변경 병합)', () => {
  it('저장 중인 새 글이 서버 응답에 없어도 유지된다', () => {
    const prev = [E(999, '21'), E(1, '20')];        // 999 = 방금 쓴 낙관적 새 글
    const server = [E(1, '20')];                     // 서버엔 아직 없음
    const out = mergeRefreshed(prev, server, new Set([999]), new Set());
    expect(out.map((e) => e.id)).toEqual([999, 1]);  // 사라지지 않고 최신순 유지
  });

  it('저장이 끝나 서버에 반영되면 중복 없이 서버본을 쓴다', () => {
    const prev = [E(999, '21'), E(1, '20')];
    const server = [E(999, '21'), E(1, '20')];       // 서버에도 이제 있음
    const out = mergeRefreshed(prev, server, new Set([999]), new Set());
    expect(out.map((e) => e.id)).toEqual([999, 1]);
    expect(out.length).toBe(2);
  });

  it('삭제 중인 글은 서버 응답에 남아 있어도 제외된다', () => {
    const prev = [E(1, '20')];                        // 화면에선 이미 지움
    const server = [E(2, '21'), E(1, '20')];          // 서버엔 아직 있음
    const out = mergeRefreshed(prev, server, new Set(), new Set([1]));
    expect(out.map((e) => e.id)).toEqual([2]);        // 되살아나지 않음
  });

  it('진행 중 변경이 없으면 서버 목록을 그대로 최신순 정렬', () => {
    const server = [E(1, '20'), E(2, '21')];
    const out = mergeRefreshed([], server, new Set(), new Set());
    expect(out.map((e) => e.id)).toEqual([2, 1]);
  });
});
