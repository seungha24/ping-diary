import { hexToRgba, THEMES } from '../context/ThemeContext';

describe('hexToRgba', () => {
  test('hex와 alpha를 rgba 문자열로 변환한다', () => {
    expect(hexToRgba('#111827', 0.5)).toBe('rgba(17,24,39,0.5)');
  });

  test('흰색/검정 경계값', () => {
    expect(hexToRgba('#ffffff', 1)).toBe('rgba(255,255,255,1)');
    expect(hexToRgba('#000000', 0)).toBe('rgba(0,0,0,0)');
  });
});

describe('THEMES 데이터', () => {
  test('모든 테마는 key/label/color를 가지며 color는 #hex 형식', () => {
    expect(THEMES.length).toBeGreaterThan(0);
    for (const t of THEMES) {
      expect(t.key).toBeTruthy();
      expect(t.label).toBeTruthy();
      expect(t.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  test('테마 key는 중복되지 않는다', () => {
    const keys = THEMES.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
