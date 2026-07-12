// 하단 탭 전환 애니메이션 정의.
// bottom-tabs 기본 forFade는 전환이 중간에 끊기면 화면이 opacity 0 근처에서 멈춰
// 회색 빈 화면이 되는 문제가 있어, opacity 하한선을 둔 커스텀 페이드를 쓴다.
// (관련 타입들은 @react-navigation/bottom-tabs 루트에서 export되지 않아 필요한 만큼 로컬 정의)
import { Animated, Easing } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

/** bottom-tabs의 BottomTabSceneInterpolationProps와 동일 형태 (progress: -1 이전 / 0 활성 / 1 이후) */
export interface TabSceneInterpolationProps {
  current: { progress: Animated.Value };
}

/** bottom-tabs의 BottomTabSceneInterpolatedStyle과 동일 형태 */
export interface TabSceneInterpolatedStyle {
  sceneStyle: Animated.WithAnimatedValue<StyleProp<ViewStyle>>;
}

/** 화면이 완전히 투명해지지 않도록 하는 opacity 하한선 */
export const MIN_SCENE_OPACITY = 0.6;

/** 차분한 페이드 타이밍 — 기본(150ms linear-in)이 급하게 느껴져 260ms ease-out으로 */
export const calmFadeSpec = {
  animation: 'timing' as const,
  config: { duration: 260, easing: Easing.out(Easing.cubic) },
};

/**
 * 안전 페이드 인터폴레이터. 활성(0)에서 opacity 1, 비활성(±1)에서도 하한선 밑으로
 * 내려가지 않아, 애니메이션이 어디서 멈춰도 화면이 최소 60%는 보인다.
 * (전환이 끝나면 비활성 씬은 내비게이터가 detach하므로 겹쳐 남지 않음)
 * @param props 현재 씬의 진행도
 * @returns 씬에 적용할 애니메이션 스타일
 */
export function forSafeFade({ current }: TabSceneInterpolationProps): TabSceneInterpolatedStyle {
  return {
    sceneStyle: {
      opacity: current.progress.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: [MIN_SCENE_OPACITY, 1, MIN_SCENE_OPACITY],
      }),
    },
  };
}
