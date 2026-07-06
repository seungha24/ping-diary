import { Platform } from 'react-native';

/** 웹/네이티브 공통 알림 (웹은 window.alert, 네이티브는 Alert) */
export function notify(message: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(message);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('react-native').Alert.alert(message);
  }
}
