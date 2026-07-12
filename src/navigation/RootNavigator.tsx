import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';

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

import { DiaryEntry } from '../data/types';
import { calmFadeSpec, forSafeFade } from './tabTransition';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/themed';

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

function MainTabs() {
  const { accent } = useTheme();
  const styles = useThemedStyles(lightStyles);
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        // 차분한 페이드 + opacity 하한선: 전환이 끊겨도 회색 빈 화면이 안 됨 (tabTransition.ts)
        animation: 'fade',
        transitionSpec: calmFadeSpec,
        sceneStyleInterpolator: forSafeFade,
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
  const { mode } = useTheme();
  // 전환 중 비치는 배경을 모드에 맞춰서 다크에서 흰 번쩍임이 없게
  const navTheme = mode === 'dark'
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: '#0e131e', card: '#171f2e', border: '#2c384f' } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: '#ffffff' } };
  const contentStyle = { backgroundColor: mode === 'dark' ? '#0e131e' : '#ffffff' };
  return (
    <NavigationContainer theme={navTheme}>
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
