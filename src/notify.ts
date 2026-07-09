import { Platform } from 'react-native';

// 전역 토스트 리스너. ToastHost가 등록하면 폰 프레임 안 인앱 토스트로 표시된다.
type Listener = (message: string) => void;
let listener: Listener | null = null;

/** ToastHost 전용 — 리스너 등록/해제 */
export function setNotifyListener(l: Listener | null) {
  listener = l;
}

/**
 * 공통 알림. 리스너(ToastHost)가 있으면 인앱 토스트로,
 * 없으면 웹은 window.alert, 네이티브는 Alert로 폴백한다.
 */
export function notify(message: string) {
  if (listener) {
    listener(message);
    return;
  }
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(message);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('react-native').Alert.alert(message);
  }
}
