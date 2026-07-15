// 가벼운 햅틱(진동) 헬퍼.
// expo-haptics가 없는 환경(웹, 모듈이 안 실린 구버전 빌드)에서는 조용히 무시해
// OTA로 이 코드가 먼저 내려가도 크래시가 나지 않게 한다.
import { Platform } from 'react-native';

/** 실패해도 조용히 넘어가는 공통 실행기 — 햅틱이 UI 흐름을 막지 않게 */
async function tryHaptic(fn: (h: any) => Promise<void>): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const Haptics = require('expo-haptics');
    await fn(Haptics);
  } catch {}
}

/**
 * 약한 햅틱을 한 번 울린다 (iOS Light 임팩트 / 안드로이드 짧은 틱).
 * 발행 효과음, 복사 같은 가벼운 액션용.
 */
export async function lightHaptic(): Promise<void> {
  return tryHaptic((h) => h.impactAsync(h.ImpactFeedbackStyle.Light));
}

/**
 * 선택 변경 햅틱 (iOS selection 틱).
 * 탭 전환, 토글, 페르소나·옵션 선택처럼 값이 바뀌는 순간용.
 */
export async function selectionHaptic(): Promise<void> {
  return tryHaptic((h) => h.selectionAsync());
}

/**
 * 성공 알림 햅틱 (iOS Success 노티피케이션).
 * 그룹 생성·참여 성공처럼 작업이 잘 끝났음을 알릴 때.
 */
export async function successHaptic(): Promise<void> {
  return tryHaptic((h) => h.notificationAsync(h.NotificationFeedbackType.Success));
}

/**
 * 경고 알림 햅틱 (iOS Warning 노티피케이션).
 * 삭제·나가기처럼 되돌리기 어려운 액션을 실행하는 순간용.
 */
export async function warningHaptic(): Promise<void> {
  return tryHaptic((h) => h.notificationAsync(h.NotificationFeedbackType.Warning));
}
