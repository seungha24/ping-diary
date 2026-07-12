import { Animated } from 'react-native';
import { forSafeFade, calmFadeSpec, MIN_SCENE_OPACITY } from '../navigation/tabTransition';

/**
 * interpolate 호출에 넘어간 설정을 그대로 돌려주는 가짜 progress를 만든다.
 * @returns Animated.Value처럼 쓸 수 있는 목 객체
 */
function mockProgress(): Animated.Value {
  return { interpolate: (config: unknown) => config } as unknown as Animated.Value;
}

describe('탭 전환 안전 페이드 (tabTransition)', () => {
  it('opacity가 하한선(0.6) 밑으로 내려가지 않는다 — 회색 빈 화면 방지 회귀 테스트', () => {
    const { sceneStyle } = forSafeFade({ current: { progress: mockProgress() } });
    const config = (sceneStyle as any).opacity;
    expect(Math.min(...config.outputRange)).toBeGreaterThanOrEqual(MIN_SCENE_OPACITY);
    expect(MIN_SCENE_OPACITY).toBeGreaterThan(0);
  });

  it('활성 화면(progress 0)에서는 opacity가 1이다', () => {
    const { sceneStyle } = forSafeFade({ current: { progress: mockProgress() } });
    const config = (sceneStyle as any).opacity;
    const idx = config.inputRange.indexOf(0);
    expect(config.outputRange[idx]).toBe(1);
  });

  it('차분한 타이밍: timing 애니메이션, 260ms', () => {
    expect(calmFadeSpec.animation).toBe('timing');
    expect(calmFadeSpec.config.duration).toBe(260);
  });
});
