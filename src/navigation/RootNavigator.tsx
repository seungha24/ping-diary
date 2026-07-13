import React, { useRef } from 'react';
import {
  NavigationContainer, DefaultTheme, DarkTheme, useNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, BottomTabBar } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';
import { usePostHog } from 'posthog-react-native';

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
import { DiaryEntry } from '../data/types';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles, accentTintedWhite } from '../theme/themed';

/** 네비게이션에서 넘기는 그룹 정보 (서버 그룹 기반) */
export interface GroupNav {
  id: number;
  name: string;
  member_count?: number;
  invite_code?: string;
}

export type RootStackParamList = {
  Splash: undefined;
  Main: undefined;
  DiaryWrite: { entry?: DiaryEntry; folder?: string } | undefined;
  DiaryDetail: { entry: DiaryEntry };
  Group: { group: GroupNav };
  GroupCreate: undefined;
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
        // 전환 중 씬 뒤에 비치는 배경을 명시 — 기본값(회색)이 새어 보이는 것 방지
        sceneStyle: { backgroundColor: mode === 'dark' ? '#0e131e' : '#ffffff' },
        // 블러된 탭은 렌더 동결 → 전환 중 무거운 화면 이중 렌더로 인한 버벅임 제거
        freezeOnBlur: true,
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
  const trackScreen = () => {
    const name = navRef.getCurrentRoute()?.name;
    if (name && name !== routeNameRef.current) {
      routeNameRef.current = name;
      posthog?.screen(name);
    }
  };
  return (
    <NavigationContainer ref={navRef} theme={navTheme} onReady={trackScreen} onStateChange={trackScreen}>
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
