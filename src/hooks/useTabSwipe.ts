import { useRef } from 'react';
import { PanResponder } from 'react-native';
import { useNavigation } from '@react-navigation/native';

/**
 * 좌우 스와이프로 탭 이동 (홈 화면의 개인↔그룹 스와이프와 같은 제스처 기준).
 * 화면 루트 View에 스프레드로 붙인다: <SafeAreaView {...swipe}>
 * @param next 왼쪽으로 밀었을 때(다음 페이지) 이동할 탭 이름
 * @param prev 오른쪽으로 밀었을 때(이전 페이지) 이동할 탭 이름
 */
export default function useTabSwipe(next?: string, prev?: string) {
  const navigation = useNavigation<any>();
  const targets = useRef({ next, prev });
  targets.current = { next, prev };
  const pan = useRef(
    PanResponder.create({
      // 수평 이동이 수직의 2배 이상일 때만 반응 → 세로 스크롤과 충돌 없음
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 28 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
      onPanResponderRelease: (_, g) => {
        const { next: n, prev: p } = targets.current;
        if (g.dx <= -40 && n) navigation.navigate(n);
        else if (g.dx >= 40 && p) navigation.navigate(p);
      },
    })
  ).current;
  return pan.panHandlers;
}
