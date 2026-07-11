import ErrorBoundary, { describeError } from '../components/ErrorBoundary';

describe('ErrorBoundary', () => {
  it('에러가 나면 상태에 에러를 기록한다 (복구 화면 전환)', () => {
    const err = new Error('테스트 에러');
    expect(ErrorBoundary.getDerivedStateFromError(err)).toEqual({ error: err });
  });

  describe('describeError', () => {
    it('Error 객체는 message를 보여준다', () => {
      expect(describeError(new Error('무언가 잘못됨'))).toBe('무언가 잘못됨');
    });

    it('message 없는 값은 문자열로 변환한다', () => {
      expect(describeError('문자열 에러')).toBe('문자열 에러');
    });

    it('null/undefined는 알 수 없는 오류로 표시한다', () => {
      expect(describeError(null)).toBe('알 수 없는 오류');
      expect(describeError(undefined)).toBe('알 수 없는 오류');
    });
  });
});
