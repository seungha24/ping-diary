import { Platform, Share } from 'react-native';

// expo-clipboard는 네이티브 모듈이라 구형 빌드(모듈 미포함)에서는 호출 시 던질 수 있다.
// require 단계와 호출 단계 모두 try로 감싸고, 실패하면 호출부가 공유 시트로 폴백한다.
let ExpoClipboard: { setStringAsync?: (t: string) => Promise<boolean> } | null = null;
try {
  ExpoClipboard = require('expo-clipboard');
} catch {}

/** 클립보드에 복사. 성공 여부 반환 — 실패 시 호출부에서 공유 시트 등으로 폴백 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}
    return false;
  }
  try {
    if (ExpoClipboard?.setStringAsync) {
      await ExpoClipboard.setStringAsync(text);
      return true;
    }
  } catch {}
  return false;
}

/** 공유: 네이티브는 내장 공유 시트, 웹은 navigator.share. 성공 여부 반환 */
export async function shareText(message: string, title?: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({ title, text: message });
        return true;
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') return true; // 사용자가 시트를 닫은 건 실패가 아님
    }
    return false;
  }
  try {
    await Share.share(Platform.OS === 'ios' ? { message } : { message, title });
    return true;
  } catch {}
  return false;
}
