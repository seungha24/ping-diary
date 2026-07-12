// 가벼운 햅틱(진동) 헬퍼.
// expo-haptics가 없는 환경(웹, 모듈이 안 실린 구버전 빌드)에서는 조용히 무시해
// OTA로 이 코드가 먼저 내려가도 크래시가 나지 않게 한다.
import { Platform } from 'react-native';

/**
 * 약한 햅틱을 한 번 울린다 (iOS Light 임팩트 / 안드로이드 짧은 틱).
 * 실패해도 조용히 넘어간다 — 효과음·발행 흐름을 막지 않기 위해.
 */
export async function lightHaptic(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const Haptics = require('expo-haptics');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
}
