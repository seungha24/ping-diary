import React, { useState, useEffect, useCallback } from 'react';
import * as Updates from 'expo-updates';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, Image, Linking } from 'react-native';
import TouchableOpacity from '../components/Touchable';
import ThemeSwitch from '../components/ThemeSwitch';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '../navigation/RootNavigator';
import IconChev from '../components/icons/IconChev';
import PingLogo from '../components/PingLogo';
import { useTheme, THEMES } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getMe, getCachedMe, uploadPhoto, saveProfile } from '../api';
import { notify } from '../notify';
import { IconUser, IconPencil } from '../components/icons/Line';
import { useThemedStyles } from '../theme/themed';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const styles = useThemedStyles(lightStyles);
  const navigation = useNavigation<Nav>();
  const { accent, themeKey, setTheme, mode, setMode } = useTheme();
  const { email, token, logout } = useAuth();
  const emailPrefix = (email ?? '').split('@')[0] || '사용자';

  const [avatarUri, setAvatarUri] = useState<string | null>(() => getCachedMe()?.avatar_url ?? null);
  // 캐시된 프로필을 초기값으로 → 즉시 표시(시간차 제거), 아래 useEffect가 백그라운드 갱신
  const [displayName, setDisplayName] = useState(() => getCachedMe()?.display_name || emailPrefix);
  const [username, setUsername] = useState(() => getCachedMe()?.username || emailPrefix);

  // 로그인 후 DB에 저장된 이름/아이디 불러오기 (없으면 이메일 앞부분)
  useEffect(() => {
    if (!token) return;
    getMe()
      .then((me) => {
        if (me.display_name) setDisplayName(me.display_name);
        if (me.username) setUsername(me.username);
        if (me.avatar_url) setAvatarUri(me.avatar_url);
      })
      .catch(() => {});
  }, [token]);

  // 계정설정에서 이름/아이디를 바꾸고 돌아왔을 때 즉시 반영 (saveProfile이 캐시를 갱신해 둠)
  useFocusEffect(useCallback(() => {
    const me = getCachedMe();
    if (me?.display_name) setDisplayName(me.display_name);
    if (me?.username) setUsername(me.username);
    if (me?.avatar_url) setAvatarUri(me.avatar_url);
  }, []));

  async function pickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const prev = avatarUri;
      setAvatarUri(result.assets[0].uri); // 즉시 미리보기
      try {
        const url = await uploadPhoto(result.assets[0].uri);
        await saveProfile({ avatar_url: url });
        setAvatarUri(url);
      } catch (e: any) {
        setAvatarUri(prev); // 실패 시 원복
        notify(e?.message ?? '프로필 사진 저장에 실패했어요.');
      }
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <PingLogo />
        <View style={{ width: 36, height: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileRow}>
          {/* 프사 */}
          <TouchableOpacity style={styles.avatarWrap} onPress={pickAvatar}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarCircle}>
                <IconUser size={34} color="#9ca3af" />
              </View>
            )}
            <View style={styles.avatarBadge}>
              <IconPencil size={11} color="#6b7280" />
            </View>
          </TouchableOpacity>

          {/* 이름 / 아이디 */}
          <View style={styles.profileInfo}>
            <Text style={styles.displayName}>{displayName}</Text>
            <Text style={styles.usernameText}>@{username}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* 테마 색상 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>테마 색상</Text>
          <View style={styles.themeRow}>
            {THEMES.map((t) => (
              <View key={t.key} style={styles.themeCell}>
                <TouchableOpacity
                  onPress={() => setTheme(t.key)}
                  style={[styles.themeCircle, { backgroundColor: t.color }, themeKey === t.key && styles.themeCircleActive]}
                >
                  {themeKey === t.key && <View style={styles.themeCheck} />}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.divider} />

        {/* 다크 모드 */}
        <View style={styles.darkModeRow}>
          <Text style={styles.sectionTitle}>다크 모드</Text>
          <ThemeSwitch
            value={mode === 'dark'}
            onChange={(v) => setMode(v ? 'dark' : 'light')}
            accent={accent}
          />
        </View>

        <View style={styles.divider} />

        <View>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('NotifSettings')}>
            <Text style={styles.menuText}>알림 설정</Text>
            <IconChev dir="right" size={18} color="#d1d5db" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('AccountSettings')}>
            <Text style={styles.menuText}>계정 설정</Text>
            <IconChev dir="right" size={18} color="#d1d5db" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Linking.openURL('https://ping-diary.vercel.app/privacy.html')}
          >
            <Text style={styles.menuText}>개인정보 처리방침</Text>
            <IconChev dir="right" size={18} color="#d1d5db" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => logout()}
          >
            <Text style={[styles.menuText, styles.menuTextDanger]}>로그아웃</Text>
            <IconChev dir="right" size={18} color="#d1d5db" />
          </TouchableOpacity>
        </View>

        {/* 현재 실행 중인 버전/업데이트 확인용 */}
        <Text style={styles.versionText}>
          v1.0.0{Updates.isEnabled && Updates.createdAt
            ? ` · 업데이트 ${new Date(Updates.createdAt).getMonth() + 1}/${new Date(Updates.createdAt).getDate()} ${String(new Date(Updates.createdAt).getHours()).padStart(2, '0')}:${String(new Date(Updates.createdAt).getMinutes()).padStart(2, '0')}`
            : ' · 기본 번들'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const lightStyles = StyleSheet.create({
  versionText: { fontSize: 11, color: '#d1d5db', textAlign: 'center', paddingVertical: 16 },
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6', backgroundColor: '#ffffff',
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#111827' },
  editBtn: { fontSize: 14, color: '#6b7280' },
  content: { padding: 20, gap: 20, paddingBottom: 48 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarWrap: { position: 'relative', width: 72, height: 72 },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
  },
  avatarImage: { width: 72, height: 72, borderRadius: 36 },
  avatarBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e5e7eb',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarBadgeText: { fontSize: 11 },
  profileInfo: { flex: 1, gap: 4 },
  displayName: { fontSize: 18, fontWeight: '700', color: '#111827' },
  usernameText: { fontSize: 13, color: '#9ca3af' },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inlineInput: {
    fontSize: 16, fontWeight: '600', color: '#111827',
    borderBottomWidth: 1.5, borderBottomColor: '#111827',
    paddingVertical: 2, flex: 1,
  },
  atSign: { fontSize: 13, color: '#9ca3af' },
  saveBtn: { fontSize: 13, fontWeight: '600', color: '#111827' },
  divider: { height: 1, backgroundColor: '#f3f4f6' },
  section: { gap: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#374151' },
  darkModeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  addTagBtn: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99,
    borderWidth: 1, borderColor: '#d1d5db', borderStyle: 'dashed',
  },
  addTagText: { fontSize: 12, color: '#9ca3af' },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f9fafb',
  },
  menuText: { fontSize: 14, color: '#374151' },
  menuTextDanger: { color: '#ef4444' },
  themeRow: { flexDirection: 'row', flexWrap: 'wrap' },
  themeCell: { width: '20%', alignItems: 'center', marginBottom: 14 },
  themeCircle: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  themeCircleActive: {
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4,
    transform: [{ scale: 1.15 }],
  },
  themeCheck: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
});
