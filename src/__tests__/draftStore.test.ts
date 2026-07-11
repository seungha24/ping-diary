import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  listDrafts, saveDraft, deleteDraft, DiaryDraftInput, __resetDraftCacheForTests,
} from '../data/draftStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest')
);

/**
 * 테스트용 초안 입력값을 만든다.
 * @param title 초안 제목
 * @returns DiaryDraftInput 객체
 */
function makeInput(title: string): DiaryDraftInput {
  return {
    title,
    body: `${title} 내용`,
    tags: [],
    persona: '',
    dates: [1],
    photo: null,
    photos: [],
    visibility: 'private',
  };
}

describe('draftStore (임시저장함)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    __resetDraftCacheForTests();
  });

  it('초안을 여러 개 저장하고 목록으로 돌려준다', async () => {
    await saveDraft(makeInput('첫 번째'));
    await saveDraft(makeInput('두 번째'));
    const list = await listDrafts();
    expect(list).toHaveLength(2);
    expect(list.map((d) => d.title)).toContain('첫 번째');
    expect(list.map((d) => d.title)).toContain('두 번째');
  });

  it('id를 넘기면 새로 추가하지 않고 해당 초안을 갱신한다', async () => {
    const saved = await saveDraft(makeInput('원본'));
    await saveDraft({ ...makeInput('수정본'), id: saved.id });
    const list = await listDrafts();
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe('수정본');
    expect(list[0].id).toBe(saved.id);
  });

  it('초안을 삭제하면 목록에서 사라진다', async () => {
    const a = await saveDraft(makeInput('남길 글'));
    const b = await saveDraft(makeInput('지울 글'));
    await deleteDraft(b.id);
    const list = await listDrafts();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(a.id);
  });

  it('저장소를 다시 읽어도(앱 재시작 상황) 초안이 유지된다', async () => {
    await saveDraft(makeInput('영구 저장'));
    __resetDraftCacheForTests(); // 메모리 캐시를 비워 저장소에서 다시 읽게 함
    const list = await listDrafts();
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe('영구 저장');
  });

  it('예전 단일 임시저장본이 있으면 목록으로 이관한다', async () => {
    const legacy = { ...makeInput('옛날 초안'), savedAt: '2026-07-01T00:00:00Z' };
    await AsyncStorage.setItem('ping_diary_draft', JSON.stringify(legacy));
    const list = await listDrafts();
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe('옛날 초안');
    expect(list[0].id).toBeTruthy();
    expect(await AsyncStorage.getItem('ping_diary_draft')).toBeNull();
  });
});
