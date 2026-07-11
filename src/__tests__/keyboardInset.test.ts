import { computeKeyboardInset } from '../components/KeyboardDismissButton';

describe('computeKeyboardInset (웹 키보드 높이 계산)', () => {
  it('키보드가 열려 뷰포트가 줄어들면 가려진 높이를 반환한다', () => {
    // 전체 812px 화면에서 키보드가 336px 차지 → 뷰포트 476px
    expect(computeKeyboardInset(812, 476, 0)).toBe(336);
  });

  it('스크롤로 밀린 offsetTop을 빼고 계산한다', () => {
    expect(computeKeyboardInset(812, 476, 100)).toBe(236);
  });

  it('차이가 80px 이하면 키보드가 없다고 보고 0을 반환한다', () => {
    expect(computeKeyboardInset(812, 812, 0)).toBe(0); // 키보드 닫힘
    expect(computeKeyboardInset(812, 750, 0)).toBe(0); // 주소창 등 작은 변화
  });
});
