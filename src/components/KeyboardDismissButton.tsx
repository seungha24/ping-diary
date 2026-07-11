// 키보드가 열려 있을 때 키보드 바로 위에 떠서 자판을 내려주는 원형 버튼 (전 플랫폼).
// iOS의 InputAccessoryView는 presentation:'modal' 화면 안에서 나타나지 않는 버그가 있어
// 키보드 이벤트/뷰포트 기반의 플로팅 버튼으로 통일했다.
import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, TouchableOpacity, StyleSheet } from 'react-native';
import IconChev from './icons/IconChev';

/**
 * 웹 visualViewport 수치로 키보드가 화면을 가린 높이(px)를 계산한다.
 * @param innerHeight window.innerHeight (레이아웃 뷰포트 높이)
 * @param viewportHeight visualViewport.height (키보드가 열리면 줄어듦)
 * @param offsetTop visualViewport.offsetTop (스크롤로 밀린 값)
 * @returns 키보드가 차지한 높이. 80px 이하면 키보드가 없다고 보고 0을 반환
 */
export function computeKeyboardInset(innerHeight: number, viewportHeight: number, offsetTop: number): number {
  const inset = innerHeight - viewportHeight - offsetTop;
  return inset > 80 ? inset : 0;
}

/**
 * 키보드 위 '자판 내리기' 플로팅 버튼 (웹·안드로이드 전용).
 * 입력창에 포커스가 있고 키보드가 열려 있을 때만 나타난다.
 * @returns 키보드가 닫혀 있으면 null
 */
export default function KeyboardDismissButton() {
  const [bottom, setBottom] = useState<number | null>(null);

  useEffect(() => {
    // 웹: visualViewport로 키보드 높이를 계산해 버튼을 키보드 바로 위에 띄움
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || typeof document === 'undefined') return;
      const vv = (window as any).visualViewport;
      if (!vv) return;
      const update = () => {
        const el = document.activeElement;
        const focused = !!el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT');
        const inset = computeKeyboardInset(window.innerHeight, vv.height, vv.offsetTop);
        setBottom(focused && inset > 0 ? inset + 12 : null);
      };
      // blur 직후에는 뷰포트가 아직 안 돌아왔을 수 있어 잠깐 뒤에 다시 계산
      const updateLater = () => { setTimeout(update, 60); };
      vv.addEventListener('resize', update);
      vv.addEventListener('scroll', update);
      document.addEventListener('focusin', updateLater);
      document.addEventListener('focusout', updateLater);
      return () => {
        vv.removeEventListener('resize', update);
        vv.removeEventListener('scroll', update);
        document.removeEventListener('focusin', updateLater);
        document.removeEventListener('focusout', updateLater);
      };
    }
    // iOS: 키보드가 화면을 덮으므로 키보드 높이만큼 띄운다 (모달 시트 안에서도 동작)
    if (Platform.OS === 'ios') {
      const show = Keyboard.addListener('keyboardWillShow', (e) =>
        setBottom(e.endCoordinates.height + 12)
      );
      const hide = Keyboard.addListener('keyboardWillHide', () => setBottom(null));
      return () => { show.remove(); hide.remove(); };
    }
    // 안드로이드: 키보드가 열리면 화면이 줄어들므로(adjustResize) 하단 고정으로 충분
    if (Platform.OS === 'android') {
      const show = Keyboard.addListener('keyboardDidShow', () => setBottom(12));
      const hide = Keyboard.addListener('keyboardDidHide', () => setBottom(null));
      return () => { show.remove(); hide.remove(); };
    }
  }, []);

  if (bottom === null) return null;

  /** 자판을 내린다 (웹에서는 활성 입력창 blur까지 보장) */
  function dismiss() {
    Keyboard.dismiss();
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      (document.activeElement as HTMLElement | null)?.blur?.();
    }
  }

  return (
    <TouchableOpacity
      style={[styles.btn, Platform.OS === 'web' ? ({ position: 'fixed' } as any) : null, { bottom }]}
      onPress={dismiss}
      activeOpacity={0.85}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <IconChev dir="down" size={20} color="#6b7280" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute', right: 16, zIndex: 50,
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
});
