import {
  parseJoinCode, joinLinkFor, capturePendingJoinCode, consumePendingJoinCode,
} from '../joinLink';

describe('joinLink (그룹 초대 링크)', () => {
  it('웹 초대 링크에서 코드를 추출한다', () => {
    expect(parseJoinCode('https://ping-diary.vercel.app/join/9D42PC')).toBe('9D42PC');
  });

  it('네이티브 딥링크에서 코드를 추출한다', () => {
    expect(parseJoinCode('pingdiary://join/9D42PC')).toBe('9D42PC');
  });

  it('join 경로가 아니면 null을 돌려준다', () => {
    expect(parseJoinCode('https://ping-diary.vercel.app/')).toBeNull();
    expect(parseJoinCode('pingdiary://auth#kakao_at=x')).toBeNull();
    expect(parseJoinCode(null)).toBeNull();
    expect(parseJoinCode('')).toBeNull();
  });

  it('joinLinkFor는 공유용 웹 링크를 만든다', () => {
    expect(joinLinkFor('9D42PC')).toBe('https://ping-diary.vercel.app/join/9D42PC');
  });

  it('캡처한 코드는 한 번만 꺼내진다', () => {
    capturePendingJoinCode('https://ping-diary.vercel.app/join/ABC123');
    expect(consumePendingJoinCode()).toBe('ABC123');
    expect(consumePendingJoinCode()).toBeNull();
  });

  it('join 경로가 아닌 URL은 캡처하지 않는다', () => {
    capturePendingJoinCode('https://ping-diary.vercel.app/?logout');
    expect(consumePendingJoinCode()).toBeNull();
  });
});
