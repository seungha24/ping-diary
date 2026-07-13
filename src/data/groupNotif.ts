// 그룹별 알림 설정 — 저장(기기) + 실제 동작(로컬 예약 알림 / 서버 푸시 뮤트).
// - '알림 끄기': 서버 푸시에서 제외 (saveMutedGroups는 화면 쪽에서 호출)
// - '매주/격주/N일마다': 폰 로컬 예약 알림으로 "p!ng 남길 시간" 리마인더 (저녁 8시)
// 웹은 예약 알림 미지원 → 저장만 하고 스케줄은 no-op.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type GroupNotifFrequency = 'interval' | 'weekly' | 'biweekly' | 'off';

export interface GroupNotifSetting {
  frequency: GroupNotifFrequency;
  days: number[];        // weekly용 요일 (0=일 ~ 6=토)
  intervalDays: number;  // interval용 N일
}

const KEY = 'ping_group_notif_settings'; // { [groupId]: GroupNotifSetting }
const REMINDER_HOUR = 20; // 리마인더 발송 시각 (저녁 8시)

function webStorage(): Storage | null {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') return localStorage;
  } catch {}
  return null;
}

async function readAll(): Promise<Record<string, GroupNotifSetting>> {
  try {
    const s = webStorage();
    const raw = s ? s.getItem(KEY) : await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function writeAll(map: Record<string, GroupNotifSetting>): Promise<void> {
  const raw = JSON.stringify(map);
  const s = webStorage();
  if (s) { try { s.setItem(KEY, raw); } catch {} return; }
  try { await AsyncStorage.setItem(KEY, raw); } catch {}
}

/** 그룹의 저장된 알림 설정 (없으면 null) */
export async function loadGroupNotifSetting(groupId: number): Promise<GroupNotifSetting | null> {
  const map = await readAll();
  return map[String(groupId)] ?? null;
}

/** 그룹 알림 설정 저장 (기기 로컬 — 재시작해도 유지) */
export async function saveGroupNotifSetting(groupId: number, setting: GroupNotifSetting): Promise<void> {
  const map = await readAll();
  map[String(groupId)] = setting;
  await writeAll(map);
}

/**
 * 설정에 맞춰 이 그룹의 로컬 리마인더 알림을 다시 예약한다.
 * 기존 예약(id가 group-{id}-로 시작)은 모두 취소 후 새로 등록.
 * 웹/권한 없음/구버전 빌드에서는 조용히 no-op.
 */
export async function applyGroupReminderSchedule(
  groupId: number,
  groupName: string,
  setting: GroupNotifSetting
): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const Notifications = await import('expo-notifications');

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return; // 권한은 로그인 시 registerPush에서 요청됨

    // 이 그룹의 기존 리마인더 제거
    const prefix = `group-${groupId}-`;
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => n.identifier.startsWith(prefix))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );

    if (setting.frequency === 'off') return;

    const content = {
      title: `${groupName}에 p!ng 남길 시간이에요 ✍️`,
      body: '오늘의 이야기를 그룹 친구들과 나눠보세요',
      sound: false as const,
    };

    if (setting.frequency === 'weekly') {
      // 선택한 요일마다 반복 (expo weekday: 1=일 ~ 7=토)
      await Promise.all(
        setting.days.map((d) =>
          Notifications.scheduleNotificationAsync({
            identifier: `${prefix}day-${d}`,
            content,
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
              weekday: d + 1,
              hour: REMINDER_HOUR,
              minute: 0,
            },
          })
        )
      );
      return;
    }

    // 격주=14일, 직접 입력=N일 간격 반복 (지금부터 N일 후 첫 알림)
    const days = setting.frequency === 'biweekly' ? 14 : Math.max(1, setting.intervalDays);
    await Notifications.scheduleNotificationAsync({
      identifier: `${prefix}interval`,
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: days * 24 * 60 * 60,
        repeats: true,
      },
    });
  } catch {
    // 네이티브 모듈 없는 빌드 등 — 무시
  }
}
