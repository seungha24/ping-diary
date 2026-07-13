// 내 일기(개인) 리마인더 — 매일 정해진 시간에 "일기 쓸 시간" 로컬 알림.
// 그룹 리마인더(groupNotif.ts)와 동일한 패턴: 기기 저장 + expo-notifications 예약.
// 웹은 예약 알림 미지원 → 저장만 하고 스케줄은 no-op.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PersonalReminderSetting {
  enabled: boolean;
  hour: number;    // 0~23 (매일 이 시각에 알림)
  minute?: number; // 0~59 (없으면 정각)
}

const KEY = 'ping_personal_reminder';
const REMINDER_ID = 'personal-diary-reminder';

function webStorage(): Storage | null {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') return localStorage;
  } catch {}
  return null;
}

/** 저장된 리마인더 설정 (없으면 null) */
export async function loadPersonalReminder(): Promise<PersonalReminderSetting | null> {
  try {
    const s = webStorage();
    const raw = s ? s.getItem(KEY) : await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** 리마인더 설정 저장 (기기 로컬) */
export async function savePersonalReminder(setting: PersonalReminderSetting): Promise<void> {
  const raw = JSON.stringify(setting);
  const s = webStorage();
  if (s) { try { s.setItem(KEY, raw); } catch {} return; }
  try { await AsyncStorage.setItem(KEY, raw); } catch {}
}

/**
 * 설정에 맞춰 매일 반복 로컬 알림을 다시 예약한다.
 * 켤 때 권한이 없으면 요청까지 시도. 웹/구버전 빌드에선 조용히 no-op.
 */
export async function applyPersonalReminder(setting: PersonalReminderSetting): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const Notifications = await import('expo-notifications');

    // 기존 예약 제거 후 다시 등록
    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});
    if (!setting.enabled) return;

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') return;

    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_ID,
      content: {
        title: '오늘의 p!ng 남길 시간이에요 ✍️',
        body: '오늘 하루는 어땠나요? 짧게라도 기록해보세요',
        sound: false,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: setting.hour,
        minute: setting.minute ?? 0,
      },
    });
  } catch {
    // 네이티브 모듈 없는 빌드 등 — 무시
  }
}
