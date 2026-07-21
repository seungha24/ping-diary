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

/**
 * 재조회로 받은 서버 목록에 진행 중인 낙관적 변경을 합쳐 최신순으로 반환한다.
 * - pendingAdd: 저장 중인 새 글 id. 서버 응답에 아직 없으면 현재 목록(prev)에서 유지한다.
 * - pendingDel: 삭제 중인 글 id. 서버 응답에 아직 있어도 제외한다.
 * 이렇게 해야 저장/삭제가 끝나기 전에 재조회가 끼어들어도 목록이 튀지 않는다.
 * @param prev 현재 화면에 있는 목록 (낙관적 변경 포함)
 * @param server 서버에서 새로 받은 목록
 * @param pendingAdd 저장 진행 중인 새 글 id 집합
 * @param pendingDel 삭제 진행 중인 글 id 집합
 * @returns 병합·정렬된 새 배열
 */
export function mergeRefreshed(
  prev: DiaryEntry[],
  server: DiaryEntry[],
  pendingAdd: Set<number>,
  pendingDel: Set<number>,
): DiaryEntry[] {
  const serverIds = new Set(server.map((e) => e.id));
  const keptAdds = prev.filter((e) => pendingAdd.has(e.id) && !serverIds.has(e.id));
  const filtered = server.filter((e) => !pendingDel.has(e.id));
  return sortByNewest([...keptAdds, ...filtered]);
}
