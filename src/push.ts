import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { savePushToken, removePushToken } from './api';

const PUSH_TOKEN_KEY = 'ping_diary_push_token';

/**
 * 푸시 알림 등록: 권한 요청 → Expo 푸시 토큰 발급 → 서버에 저장.
 * 웹/시뮬레이터/구버전 빌드(네이티브 모듈 없음)에서는 조용히 아무것도 안 한다.
 */
export async function registerPush(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const Device = await import('expo-device');
    if (!Device.isDevice) return; // 시뮬레이터는 푸시 불가

    const Notifications = await import('expo-notifications');

    // 앱이 켜져 있을 때도 배너로 표시
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') return;

    const token = (
      await Notifications.getExpoPushTokenAsync({
        projectId: '849142d5-a5ce-43e8-b9af-08c41f5f226b',
      })
    ).data;
    await savePushToken(token);
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token); // 로그아웃 시 해제용
  } catch {
    // 네이티브 모듈이 없는 빌드(v1.0.1 이하)나 네트워크 오류 — 무시
  }
}

/**
 * 로그아웃 시 이 기기의 푸시 토큰을 현재 계정에서 해제.
 * 반드시 clearToken() 전에 호출해야 한다 (인증이 필요한 요청이므로).
 */
export async function unregisterPush(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (token) {
      await removePushToken(token);
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    }
  } catch {
    // 실패해도 로그아웃은 진행 — 다음 계정이 등록할 때 서버 스윕이 정리함
  }
}
