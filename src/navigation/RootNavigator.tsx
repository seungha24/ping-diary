import React, { useRef, useEffect } from 'react';
import {
  NavigationContainer, DefaultTheme, DarkTheme, useNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, BottomTabBar } from '@react-navigation/bottom-tabs';
import { StyleSheet, Platform, Linking } from 'react-native';
import { usePostHog } from 'posthog-react-native';
import { selectionHaptic } from '../haptics';
import { parseJoinCode, consumePendingJoinCode } from '../joinLink';

import HomeScreen from '../screens/HomeScreen';
import CalendarScreen from '../screens/CalendarScreen';
import StatsScreen from '../screens/StatsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import DiaryWriteScreen from '../screens/DiaryWriteScreen';
import DiaryDetailScreen from '../screens/DiaryDetailScreen';
import GroupScreen from '../screens/GroupScreen';
import GroupCreateScreen from '../screens/GroupCreateScreen';
import NotificationScreen from '../screens/NotificationScreen';
import NotifSettingsScreen from '../screens/NotifSettingsScreen';
import AccountSettingsScreen from '../screens/AccountSettingsScreen';

import IconHome from '../components/icons/IconHome';
import IconCal from '../components/icons/IconCal';
import IconChart from '../components/icons/IconChart';
import IconPerson from '../components/icons/IconPerson';

import AdBanner from '../components/AdBanner';
import { fetchEntries, fetchGroupEntries } from '../api';
import { mapGroupEntry } from '../screens/GroupScreen';
import { DiaryEntry } from '../data/types';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles, accentTintedWhite } from '../theme/themed';

/** 네비게이션에서 넘기는 그룹 정보 (서버 그룹 기반) */
export interface GroupNav {
  id: number;
  name: string;
  member_count?: number;
  invite_code?: string;
  created_by?: string | null; // 방장(만든 사람) — 삭제 메뉴 노출 판별용
}

export type RootStackParamList = {
  Splash: undefined;
  Main: undefined;
  DiaryWrite: { entry?: DiaryEntry; folder?: string } | undefined;
  DiaryDetail: { entry: DiaryEntry; groupId?: number };
  Group: { group: GroupNav };
  GroupCreate: { joinCode?: string } | undefined;
  Notifications: undefined;
  NotifSettings: undefined;
  AccountSettings: undefined;
};

export type TabParamList = {
  Home: { reset?: number } | undefined;
  Calendar: { month?: number } | undefined;
  Stats: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// 배너 광고를 노출할 탭 (감성 화면인 작성·상세는 탭바가 없어 자동 제외)
const AD_ROUTES = new Set(['Home', 'Stats']);

function MainTabs() {
  const { accent, mode } = useTheme();
  const styles = useThemedStyles(lightStyles);
  return (
    <Tab.Navigator
      // 비활성 탭을 화면 트리에서 떼어내지 않는다 — detach가 shift 전환과 얽히면
      // 화면이 다시 붙지 않아 빈(회색) 화면으로 남는 버그가 있었음 (특히 통계 탭)
      detachInactiveScreens={false}
      // 탭 전환 시 가벼운 selection 햅틱
      screenListeners={{ tabPress: () => { selectionHaptic(); } }}
      tabBar={(props) => (
        <>
          {AD_ROUTES.has(props.state.routes[props.state.index].name) && <AdBanner />}
          <BottomTabBar {...props} />
        </>
      )}
      screenOptions={({ route }) => ({
        headerShown: false,
        // 내장 'shift' 전환: 양방향 대칭 (커스텀 페이드는 역방향에서 나가는 화면이 비쳐 보였음)
        animation: 'shift',
        // 전환 중 씬 뒤에 비치는 배경을 페이지 배경과 '완전히 같은 색'으로 —
        // 빈 프레임이 생겨도 색이 같아 눈에 보이지 않는다 (기본값 회색 노출 방지)
        sceneStyle: { backgroundColor: mode === 'dark' ? '#0e131e' : accentTintedWhite(accent) },
        // 렌더 동결(freeze)도 끈다 — 동결 해제 타이밍이 어긋나면 빈 화면이 남는 원인이 됨.
        // 모든 탭을 항상 그려두는 대신 안정성을 택함
        freezeOnBlur: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: '#9ca3af',
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'Home') return <IconHome color={color} size={size} />;
          if (route.name === 'Calendar') return <IconCal color={color} size={size} />;
          if (route.name === 'Stats') return <IconChart color={color} size={size} />;
          return <IconPerson color={color} size={size} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: '홈' }} />
      <Tab.Screen name="Calendar" component={CalendarScreen} options={{ tabBarLabel: '달력' }} />
      <Tab.Screen name="Stats" component={StatsScreen} options={{ tabBarLabel: '통계' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: '프로필' }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { mode, accent } = useTheme();
  // 전환 중 비치는 배경을 모드에 맞춰서: 다크는 네이비, 라이트는 페이지와 같은 테마 틴트
  const lightBg = accentTintedWhite(accent);
  const navTheme = mode === 'dark'
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: '#0e131e', card: '#171f2e', border: '#2c384f' } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: lightBg } };
  const contentStyle = { backgroundColor: mode === 'dark' ? '#0e131e' : lightBg };
  // PostHog 화면 추적: 프로바이더가 컨테이너 밖이라 autocapture 대신 라우트 변경 시 직접 전송
  const posthog = usePostHog();
  const navRef = useNavigationContainerRef<RootStackParamList>();
  const routeNameRef = useRef<string | undefined>(undefined);
  // 푸시 알림 탭 → 해당 글로 이동 (댓글: 내 일기, 그룹 새 글: 그룹 피드의 글)
  const handledNotifId = useRef<string | null>(null);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let sub: { remove: () => void } | undefined;
    let cancelled = false;

    async function openFromNotification(data: any) {
      try {
        if (data?.type === 'comment' && data.entryId != null) {
          const mine = await fetchEntries();
          const e = mine.find((x) => Number(x.id) === Number(data.entryId));
          if (e) navRef.navigate('DiaryDetail', { entry: e });
        } else if (data?.type === 'group_entry' && data.groupId != null) {
          const rows = await fetchGroupEntries(Number(data.groupId));
          const row = rows.find((r) => Number(r.id) === Number(data.entryId));
          if (row) navRef.navigate('DiaryDetail', { entry: mapGroupEntry(row), groupId: Number(data.groupId) });
        }
      } catch {
        // 로그인 전이거나 글이 삭제된 경우 — 조용히 무시 (앱은 평소처럼 열림)
      }
    }

    (async () => {
      try {
        const Notifications = await import('expo-notifications');
        const handle = (resp: any) => {
          const id = resp?.notification?.request?.identifier;
          if (!id || handledNotifId.current === id) return; // 같은 응답 중복 처리 방지
          handledNotifId.current = id;
          openFromNotification(resp?.notification?.request?.content?.data);
        };
        sub = Notifications.addNotificationResponseReceivedListener(handle);
        // 알림 탭으로 앱이 '켜진' 경우(콜드 스타트)
        const last = await Notifications.getLastNotificationResponseAsync();
        if (!cancelled && last) handle(last);
      } catch {
        // 구버전 빌드(모듈 없음)·웹 — 무시
      }
    })();
    return () => { cancelled = true; try { sub?.remove(); } catch {} };
  }, []);

  const trackScreen = () => {
    const name = navRef.getCurrentRoute()?.name;
    if (name && name !== routeNameRef.current) {
      routeNameRef.current = name;
      posthog?.screen(name);
    }
  };

  // 초대 링크로 들어온 경우 참여 화면으로 보내 자동 참여시킨다
  const openJoin = (code: string | null) => {
    if (code) navRef.navigate('GroupCreate', { joinCode: code });
  };
  // 네이티브: 앱이 켜져 있는 동안 pingdiary://join/CODE 링크를 받으면 처리
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Linking.addEventListener('url', ({ url }) => openJoin(parseJoinCode(url)));
    return () => sub.remove();
  }, []);
  const onNavReady = () => {
    trackScreen();
    if (Platform.OS === 'web') {
      openJoin(consumePendingJoinCode()); // 웹: /join/CODE로 들어와 보관해 둔 코드
    } else {
      // 네이티브: 초대 링크로 앱이 '켜진' 경우 (콜드 스타트)
      Linking.getInitialURL().then((u) => openJoin(parseJoinCode(u))).catch(() => {});
    }
  };

  return (
    <NavigationContainer ref={navRef} theme={navTheme} onReady={onNavReady} onStateChange={trackScreen}>
      <Stack.Navigator initialRouteName="Main" screenOptions={{ headerShown: false, contentStyle }}>
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="DiaryWrite" component={DiaryWriteScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="DiaryDetail" component={DiaryDetailScreen} />
        <Stack.Screen name="Group" component={GroupScreen} />
        <Stack.Screen name="GroupCreate" component={GroupCreateScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="Notifications" component={NotificationScreen} />
        <Stack.Screen name="NotifSettings" component={NotifSettingsScreen} />
        <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const lightStyles = StyleSheet.create({
  tabBar: {
    borderTopColor: '#f3f4f6',
    borderTopWidth: 1,
    height: 92,
    paddingBottom: 34,
    paddingTop: 6,
    backgroundColor: '#ffffff',
  },
  tabLabel: { fontSize: 11, lineHeight: 16, fontWeight: '500', paddingBottom: 2 },
});
