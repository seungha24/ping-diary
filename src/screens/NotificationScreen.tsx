import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import IconChev from '../components/icons/IconChev';

interface Notif {
  id: number;
  type: 'diary' | 'invite' | 'reminder' | 'ai';
  title: string;
  body: string;
  time: string;
  read: boolean;
  emoji: string;
}

const MOCK_NOTIFS: Notif[] = [
  { id: 1, type: 'ai',       emoji: '📖', title: 'AI 코멘트가 도착했어요',             body: '선생님 · 오늘도 평범한 하루',        time: '방금 전',   read: false },
  { id: 2, type: 'diary',    emoji: '👩', title: '엄마가 새 p!ng를 작성했어요',        body: '가족 p!ng · 가족 외식한 날',         time: '1시간 전',  read: false },
  { id: 3, type: 'ai',       emoji: '🌸', title: 'AI 코멘트가 도착했어요',             body: '엄마 · 오랜 친구를 만난 날',        time: '2시간 전',  read: false },
  { id: 4, type: 'diary',    emoji: '🧑', title: '민준이 새 p!ng를 작성했어요',        body: '여행크루 · 제주 첫째 날',           time: '3시간 전',  read: false },
  { id: 5, type: 'reminder', emoji: '🔔', title: '가족 p!ng 알림',                   body: '오늘 p!ng를 아직 쓰지 않았어요!',    time: '4시간 전',  read: false },
  { id: 6, type: 'invite',   emoji: '👥', title: '독서모임에 초대받았어요',            body: '지연님이 그룹에 초대했어요',          time: '어제',      read: true  },
  { id: 7, type: 'diary',    emoji: '👧', title: '소희가 새 p!ng를 작성했어요',        body: '여행크루 · 성산일출봉 등반',         time: '어제',      read: true  },
  { id: 8, type: 'reminder', emoji: '🔔', title: '여행크루 알림',                    body: '매주 월요일 p!ng 알림이에요',         time: '2일 전',    read: true  },
  { id: 9, type: 'diary',    emoji: '👨', title: '아빠가 새 p!ng를 작성했어요',        body: '가족 p!ng · 주말 드라이브',          time: '3일 전',    read: true  },
];

const TYPE_COLOR: Record<Notif['type'], string> = {
  diary:    '#e0f2fe',
  invite:   '#fef9c3',
  reminder: '#f3e8ff',
  ai:       '#dcfce7',
};

export default function NotificationScreen() {
  const navigation = useNavigation();
  const [notifs, setNotifs] = useState<Notif[]>(MOCK_NOTIFS);

  const unreadCount = notifs.filter((n) => !n.read).length;

  function markAllRead() {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function markRead(id: number) {
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <IconChev dir="left" size={18} color="#9ca3af" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>알림</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.markAllText}>모두 읽음</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <Text style={styles.unreadBannerText}>읽지 않은 알림 {unreadCount}개</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {notifs.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🔕</Text>
            <Text style={styles.emptyText}>알림이 없어요</Text>
          </View>
        ) : (
          notifs.map((n) => (
            <TouchableOpacity
              key={n.id}
              style={[styles.notifCard, !n.read && styles.notifCardUnread]}
              onPress={() => markRead(n.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: TYPE_COLOR[n.type] }]}>
                <Text style={styles.iconEmoji}>{n.emoji}</Text>
              </View>
              <View style={styles.notifBody}>
                <Text style={[styles.notifTitle, !n.read && styles.notifTitleUnread]}>
                  {n.title}
                </Text>
                <Text style={styles.notifSub}>{n.body}</Text>
                <Text style={styles.notifTime}>{n.time}</Text>
              </View>
              {!n.read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  markAllText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },

  unreadBanner: {
    backgroundColor: '#f0f9ff', paddingHorizontal: 20, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#e0f2fe',
  },
  unreadBannerText: { fontSize: 12, color: '#0369a1', fontWeight: '600' },

  list: { paddingVertical: 8, paddingBottom: 40 },

  notifCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f9fafb',
  },
  notifCardUnread: { backgroundColor: '#fafafa' },

  iconBox: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  iconEmoji: { fontSize: 20 },

  notifBody: { flex: 1, gap: 3 },
  notifTitle: { fontSize: 13, color: '#6b7280', fontWeight: '500', lineHeight: 18 },
  notifTitleUnread: { color: '#111827', fontWeight: '700' },
  notifSub: { fontSize: 12, color: '#9ca3af' },
  notifTime: { fontSize: 11, color: '#d1d5db', marginTop: 1 },

  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#3b82f6', flexShrink: 0,
  },

  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontSize: 14, color: '#9ca3af' },
});
