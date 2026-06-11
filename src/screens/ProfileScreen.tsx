import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import Tag from '../components/Tag';
import IconChev from '../components/icons/IconChev';
import { INITIAL_ENTRIES } from '../data/types';

const INTEREST_TAGS = ['일상', '산책', '독서', '커피', '여행', '음악', '요리', '영화'];
type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const count = INITIAL_ENTRIES.length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>프로필</Text>
        <TouchableOpacity>
          <Text style={styles.editBtn}>편집</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileRow}>
          <View style={styles.avatarCircle}>
            <Text style={{ fontSize: 32 }}>👤</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.displayName}>김지연</Text>
            <Text style={styles.username}>@jiyeon_ping</Text>
            <Text style={styles.joinDate}>가입일 · 2025년 3월</Text>
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

        <View style={styles.statsGrid}>
          {[['총 일기', `${count}개`], ['이번 달', `${count}개`]].map(([label, val]) => (
            <View key={label} style={styles.statCard}>
              <Text style={styles.statVal}>{val}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
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
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
  },
  profileInfo: { gap: 3 },
  displayName: { fontSize: 18, fontWeight: '800', color: '#111827' },
  username: { fontSize: 13, color: '#9ca3af' },
  joinDate: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f3f4f6' },
  section: { gap: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#374151' },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  addTagBtn: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99,
    borderWidth: 1, borderColor: '#d1d5db', borderStyle: 'dashed',
  },
  addTagText: { fontSize: 12, color: '#9ca3af' },
  statsGrid: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, backgroundColor: '#f9fafb', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#f3f4f6', alignItems: 'center', gap: 4,
  },
  statVal: { fontSize: 20, fontWeight: '700', color: '#374151' },
  statLabel: { fontSize: 12, color: '#9ca3af' },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f9fafb',
  },
  menuText: { fontSize: 14, color: '#374151' },
  menuTextDanger: { color: '#ef4444' },
});
