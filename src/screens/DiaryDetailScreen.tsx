import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/RootNavigator';
import Tag from '../components/Tag';
import { PhotoBlock } from '../components/PhotoThumb';
import IconChev from '../components/icons/IconChev';
import IconEdit from '../components/icons/IconEdit';
import IconTrash from '../components/icons/IconTrash';

type Route = RouteProp<RootStackParamList, 'DiaryDetail'>;

function formatRemaining(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const PERSONA_EMOJI: Record<string, string> = {
  '선생님': '📖', '엄마': '🌸', '상담사': '💆', '미래의 나': '🔮',
};

function useCountdown(createdAt: string) {
  const unlockAt = new Date(createdAt).getTime() + 24 * 60 * 60 * 1000;
  const [remaining, setRemaining] = useState(unlockAt - Date.now());
  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => setRemaining(unlockAt - Date.now()), 1000);
    return () => clearInterval(id);
  }, [unlockAt]);
  return remaining;
}

export default function DiaryDetailScreen() {
  const navigation = useNavigation();
  const { entry } = useRoute<Route>().params;
  const remaining = useCountdown(entry.createdAt);
  const isUnlocked = remaining <= 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <IconChev dir="left" size={18} color="#9ca3af" />
          <Text style={styles.backText}>목록</Text>
        </TouchableOpacity>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.iconBtn}>
            <IconEdit size={16} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <IconTrash size={16} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.date}>6월 {entry.dates.join(', ')}일</Text>
        <Text style={styles.title}>{entry.title}</Text>

        {entry.photo && (
          <View style={styles.photoWrapper}>
            <PhotoBlock photo={entry.photo} height={200} />
          </View>
        )}

        <View style={styles.meta}>
          {entry.tags.map((t) => <Tag key={t} label={t} />)}
        </View>

        <View style={styles.divider} />

        <Text style={styles.body}>{entry.body}</Text>

        {/* AI 코멘트 */}
        <View style={styles.aiSection}>
          <View style={styles.aiTitleRow}>
            <View style={styles.aiDot}><View style={styles.aiDotInner} /></View>
            <Text style={styles.aiTitle}>AI 코멘트</Text>
            <Text style={styles.aiPersona}>{PERSONA_EMOJI[entry.persona]} {entry.persona}</Text>
          </View>

          {isUnlocked && entry.aiComment ? (
            <View style={styles.aiCommentBox}>
              <Text style={styles.aiCommentText}>{entry.aiComment}</Text>
            </View>
          ) : isUnlocked ? (
            <View style={styles.aiLockedBox}>
              <Text style={styles.aiLockedEmoji}>✨</Text>
              <Text style={styles.aiLockedText}>코멘트가 준비되지 않았어요</Text>
            </View>
          ) : (
            <View style={styles.aiLockedBox}>
              <Text style={styles.aiLockedEmoji}>🔒</Text>
              <Text style={styles.aiLockedText}>일기 작성 24시간 후 공개돼요</Text>
              <Text style={styles.aiCountdown}>{formatRemaining(remaining)}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: 13, color: '#6b7280' },
  actions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
  },
  content: { padding: 24, gap: 14, paddingBottom: 48 },
  date: { fontSize: 12, color: '#9ca3af' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', lineHeight: 30, letterSpacing: -0.3 },
  photoWrapper: { borderRadius: 16, overflow: 'hidden' },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  divider: { height: 1, backgroundColor: '#f3f4f6' },
  body: { fontSize: 15, color: '#374151', lineHeight: 26 },

  aiSection: { gap: 10, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  aiTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aiDot: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: '#111827',
    alignItems: 'center', justifyContent: 'center',
  },
  aiDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffffff' },
  aiTitle: { fontSize: 13, fontWeight: '700', color: '#374151', flex: 1 },
  aiPersona: { fontSize: 12, color: '#9ca3af' },
  aiCommentBox: {
    backgroundColor: '#f9fafb', borderRadius: 14,
    borderWidth: 1, borderColor: '#e5e7eb', padding: 16,
  },
  aiCommentText: { fontSize: 14, color: '#374151', lineHeight: 22 },
  aiLockedBox: {
    backgroundColor: '#f9fafb', borderRadius: 14,
    borderWidth: 1, borderColor: '#e5e7eb', borderStyle: 'dashed',
    padding: 20, alignItems: 'center', gap: 6,
  },
  aiLockedEmoji: { fontSize: 28 },
  aiLockedText: { fontSize: 13, color: '#9ca3af' },
  aiCountdown: { fontSize: 20, fontWeight: '800', color: '#374151', letterSpacing: 2 },
});
