import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Alert, Image, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '../navigation/RootNavigator';
import Tag from '../components/Tag';
import IconChev from '../components/icons/IconChev';
import { useTheme, THEMES } from '../context/ThemeContext';

const INTEREST_TAGS = ['일상', '산책', '독서', '커피', '여행', '음악', '요리', '영화'];
type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { accent, themeKey, setTheme } = useTheme();

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState('김지연');
  const [editingUsername, setEditingUsername] = useState(false);
  const [username, setUsername] = useState('jiyeon_ping');
  const [tempName, setTempName] = useState(displayName);
  const [tempUsername, setTempUsername] = useState(username);

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
      setAvatarUri(result.assets[0].uri);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>프로필</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileRow}>
          {/* 프사 */}
          <TouchableOpacity style={styles.avatarWrap} onPress={pickAvatar}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={{ fontSize: 32 }}>👤</Text>
              </View>
            )}
            <View style={styles.avatarBadge}>
              <Text style={styles.avatarBadgeText}>📷</Text>
            </View>
          </TouchableOpacity>

          {/* 이름 / 아이디 */}
          <View style={styles.profileInfo}>
            {editingName ? (
              <View style={styles.inlineRow}>
                <TextInput
                  style={styles.inlineInput}
                  value={tempName}
                  onChangeText={setTempName}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={() => { setDisplayName(tempName); setEditingName(false); }}
                />
                <TouchableOpacity onPress={() => { setDisplayName(tempName); setEditingName(false); }}>
                  <Text style={styles.saveBtn}>저장</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => { setTempName(displayName); setEditingName(true); }}>
                <Text style={styles.displayName}>{displayName} ✎</Text>
              </TouchableOpacity>
            )}

            {editingUsername ? (
              <View style={styles.inlineRow}>
                <Text style={styles.atSign}>@</Text>
                <TextInput
                  style={[styles.inlineInput, { fontSize: 13 }]}
                  value={tempUsername}
                  onChangeText={setTempUsername}
                  autoFocus
                  returnKeyType="done"
                  autoCapitalize="none"
                  onSubmitEditing={() => { setUsername(tempUsername); setEditingUsername(false); }}
                />
                <TouchableOpacity onPress={() => { setUsername(tempUsername); setEditingUsername(false); }}>
                  <Text style={styles.saveBtn}>저장</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => { setTempUsername(username); setEditingUsername(true); }}>
                <Text style={styles.usernameText}>@{username} ✎</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>관심사 태그</Text>
          <View style={styles.tagWrap}>
            {INTEREST_TAGS.map((t) => <Tag key={t} label={t} />)}
            <TouchableOpacity style={styles.addTagBtn}>
              <Text style={styles.addTagText}>+ 추가</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.divider} />

        {/* 테마 색상 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>테마 색상</Text>
          <View style={styles.themeRow}>
            {THEMES.map((t) => (
              <TouchableOpacity
                key={t.key}
                onPress={() => setTheme(t.key)}
                style={[styles.themeCircle, { backgroundColor: t.color }, themeKey === t.key && styles.themeCircleActive]}
              >
                {themeKey === t.key && <View style={styles.themeCheck} />}
              </TouchableOpacity>
            ))}
          </View>
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
            onPress={() => Alert.alert('로그아웃', '로그아웃하시겠어요?', [
              { text: '취소', style: 'cancel' },
              { text: '로그아웃', onPress: () => {} },
            ])}
          >
            <Text style={[styles.menuText, styles.menuTextDanger]}>로그아웃</Text>
            <IconChev dir="right" size={18} color="#d1d5db" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
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
  displayName: { fontSize: 18, fontWeight: '800', color: '#111827' },
  usernameText: { fontSize: 13, color: '#9ca3af' },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inlineInput: {
    fontSize: 16, fontWeight: '700', color: '#111827',
    borderBottomWidth: 1.5, borderBottomColor: '#111827',
    paddingVertical: 2, flex: 1,
  },
  atSign: { fontSize: 13, color: '#9ca3af' },
  saveBtn: { fontSize: 13, fontWeight: '700', color: '#111827' },
  divider: { height: 1, backgroundColor: '#f3f4f6' },
  section: { gap: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#374151' },
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
  themeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
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
