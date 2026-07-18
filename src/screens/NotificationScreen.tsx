import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, ActivityIndicator, RefreshControl,
} from 'react-native';
import TouchableOpacity from '../components/Touchable';
import { useNavigation } from '@react-navigation/native';
import IconChev from '../components/icons/IconChev';
import { IconBellOff, IconPencil, IconSparkle, IconMessage } from '../components/icons/Line';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/themed';
import FadeIn from '../components/FadeIn';
import {
  Notif, getNotifs, getUnreadCount, subscribeNotifs, refreshNotifs, timeAgo,
  markAllRead as storeMarkAllRead, markRead as storeMarkRead,
} from '../data/notifStore';

// 알림 종류별 아이콘·색 (이모지 대신 라인 아이콘)
// 인라인 색이라 다크 자동 매핑을 안 타므로 다크 배경(bgDark)을 함께 정의
const TYPE_ICON: Record<Notif['type'], { bg: string; bgDark: string; color: string; Icon: React.ComponentType<{ size?: number; color?: string }> }> = {
  ai:      { bg: '#f3e8ff', bgDark: '#2a2545', color: '#8b5cf6', Icon: IconSparkle },
  diary:   { bg: '#e0f2fe', bgDark: '#1a2a45', color: '#0ea5e9', Icon: IconPencil },
  comment: { bg: '#dcfce7', bgDark: '#1a3a2a', color: '#22c55e', Icon: IconMessage },
};

export default function NotificationScreen() {
  const styles = useThemedStyles(lightStyles);
  const navigation = useNavigation();
  const { accent, mode } = useTheme();
  const [, forceUpdate] = useState(0);
  const [loading, setLoading] = useState(getNotifs().length === 0);
  const [refreshing, setRefreshing] = useState(false);

  /** 아래로 당겨서 새로고침 */
  async function handleRefresh() {
    setRefreshing(true);
    try { await refreshNotifs(); } finally { setRefreshing(false); }
  }

  // 공유 스토어 구독 → 어느 화면에서 읽음 처리해도 반영
  useEffect(() => subscribeNotifs(() => forceUpdate((v) => v + 1)), []);
  // 실제 데이터(내 AI 코멘트·그룹 새 글)로 알림 갱신
  useEffect(() => {
    refreshNotifs().finally(() => setLoading(false));
  }, []);
  // 알림창을 봤다면 나갈 때 자동으로 모두 읽음 처리 (종 아이콘 빨간 점 제거)
  useEffect(() => {
    return () => { storeMarkAllRead(); };
  }, []);

  const notifs = getNotifs();
  const unreadCount = getUnreadCount();
  const markAllRead = storeMarkAllRead;
  const markRead = storeMarkRead;

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
          <Text style={styles.unreadBannerText}>읽지 않은 알림 {unreadCount} 개</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#9ca3af" colors={[accent]} />}
      >
        <FadeIn key={loading ? 'loading' : 'loaded'}>
        {notifs.length === 0 ? (
          <View style={styles.empty}>
            {loading ? (
              <ActivityIndicator color="#d1d5db" size="small" />
            ) : (
              <>
                <IconBellOff size={40} color="#d1d5db" />
                <Text style={styles.emptyText}>알림이 없어요</Text>
                <Text style={styles.emptySubText}>p0ng이 도착하거나{'\n'}새 p!ng·댓글이 달리면 알려드릴게요</Text>
              </>
            )}
          </View>
        ) : (
          notifs.map((n) => {
            const t = TYPE_ICON[n.type];
            const Icon = t.Icon;
            return (
            <TouchableOpacity
              key={n.id}
              style={[styles.notifCard, !n.read && styles.notifCardUnread]}
              onPress={() => {
                markRead(n.id);
                if (n.entry) (navigation as any).navigate('DiaryDetail', { entry: n.entry, groupId: n.groupId });
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: mode === 'dark' ? t.bgDark : t.bg }]}>
                <Icon size={19} color={t.color} />
              </View>
              <View style={styles.notifBody}>
                <Text style={[styles.notifTitle, !n.read && styles.notifTitleUnread]}>
                  {n.title}
                </Text>
                <Text style={styles.notifSub}>{n.body}</Text>
                <Text style={styles.notifTime}>{timeAgo(n.time)}</Text>
              </View>
              {!n.read && <View style={[styles.unreadDot, { backgroundColor: accent }]} />}
            </TouchableOpacity>
            );
          })
        )}
        </FadeIn>
      </ScrollView>
    </SafeAreaView>
  );
}

const lightStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
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
  notifTitleUnread: { color: '#111827', fontWeight: '600' },
  notifSub: { fontSize: 12, color: '#9ca3af' },
  notifTime: { fontSize: 11, color: '#d1d5db', marginTop: 1 },

  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#3b82f6', flexShrink: 0,
  },

  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontSize: 14, color: '#9ca3af' },
  emptySubText: { fontSize: 12, color: '#d1d5db', textAlign: 'center', lineHeight: 18 },
});
