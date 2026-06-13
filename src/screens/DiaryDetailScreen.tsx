import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import Tag from '../components/Tag';
import { PhotoBlock } from '../components/PhotoThumb';
import IconChev from '../components/icons/IconChev';
import IconEdit from '../components/icons/IconEdit';
import IconTrash from '../components/icons/IconTrash';
import { GROUPS } from '../data/types';
import { useTheme } from '../context/ThemeContext';
import { useEntries } from '../context/EntriesContext';
import Svg, { Path, Line } from 'react-native-svg';

type Nav = NativeStackNavigationProp<RootStackParamList>;

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
  const navigation = useNavigation<Nav>();
  const { entry } = useRoute<Route>().params;
  const { accent } = useTheme();
  const { deleteEntry } = useEntries();
  const remaining = useCountdown(entry.createdAt);
  const isUnlocked = remaining <= 0;
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sharedGroups, setSharedGroups] = useState<Set<string>>(new Set());

  function handleEdit() {
    navigation.navigate('DiaryWrite', { entry });
  }

  function toggleGroup(name: string) {
    setSharedGroups((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <IconChev dir="left" size={18} color="#9ca3af" />
          <Text style={styles.backText}>목록</Text>
        </TouchableOpacity>
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.shareIconBtn, { backgroundColor: accent }]} onPress={() => setShareOpen(true)}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <Path d="M16 6l-4-4-4 4" />
              <Line x1="12" y1="2" x2="12" y2="15" />
            </Svg>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={handleEdit}>
            <IconEdit size={16} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setDeleteOpen(true)}>
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

      {shareOpen && (
        <View style={styles.overlayWrap}>
          <TouchableOpacity style={styles.overlayBg} activeOpacity={1} onPress={() => setShareOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>그룹에 공유</Text>
              <TouchableOpacity onPress={() => setShareOpen(false)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.sheetSub}>공유할 그룹을 선택하세요</Text>
            {GROUPS.map((g) => {
              const selected = sharedGroups.has(g.name);
              return (
                <TouchableOpacity
                  key={g.name}
                  style={[styles.groupRow, selected && { borderColor: accent, backgroundColor: `${accent}0d` }]}
                  onPress={() => toggleGroup(g.name)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.groupEmoji}>{g.emoji}</Text>
                  <View style={styles.groupInfo}>
                    <Text style={styles.groupName}>{g.name}</Text>
                    <Text style={styles.groupMembers}>멤버 {g.members.length}명</Text>
                  </View>
                  <View style={[styles.checkbox, selected && { backgroundColor: accent, borderColor: accent }]}>
                    {selected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: sharedGroups.size > 0 ? accent : '#e5e7eb' }]}
              onPress={() => setShareOpen(false)}
              disabled={sharedGroups.size === 0}
            >
              <Text style={[styles.confirmBtnText, { color: sharedGroups.size > 0 ? '#fff' : '#9ca3af' }]}>
                {sharedGroups.size > 0 ? `${sharedGroups.size}개 그룹에 공유` : '그룹을 선택하세요'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {deleteOpen && (
        <View style={styles.overlayWrap}>
          <TouchableOpacity style={styles.overlayBg} activeOpacity={1} onPress={() => setDeleteOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.deleteContent}>
              <Text style={styles.deleteEmoji}>🗑️</Text>
              <Text style={styles.deleteTitle}>일기를 삭제할까요?</Text>
              <Text style={styles.deleteSub}>삭제하면 되돌릴 수 없어요</Text>
              <TouchableOpacity
                style={styles.deleteConfirmBtn}
                onPress={() => { deleteEntry(entry.id); navigation.goBack(); }}
              >
                <Text style={styles.deleteConfirmText}>삭제</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteCancelBtn} onPress={() => setDeleteOpen(false)}>
                <Text style={styles.deleteCancelText}>취소</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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

  shareIconBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },

  overlayWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' },
  overlayBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 32,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  sheetTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  sheetClose: { fontSize: 16, color: '#9ca3af' },
  sheetSub: { fontSize: 12, color: '#9ca3af', marginBottom: 12 },

  groupRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: '#f3f4f6',
    marginBottom: 8,
  },
  groupEmoji: { fontSize: 22 },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  groupMembers: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  checkbox: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1.5,
    borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center',
  },
  checkmark: { fontSize: 12, color: '#fff', fontWeight: '700' },

  confirmBtn: {
    marginTop: 8, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnText: { fontSize: 14, fontWeight: '700' },

  deleteContent: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  deleteEmoji: { fontSize: 36, marginBottom: 4 },
  deleteTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  deleteSub: { fontSize: 13, color: '#9ca3af', marginBottom: 8 },
  deleteConfirmBtn: {
    width: '100%', backgroundColor: '#ef4444', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  deleteConfirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  deleteCancelBtn: {
    width: '100%', backgroundColor: '#f3f4f6', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  deleteCancelText: { fontSize: 14, fontWeight: '600', color: '#374151' },
});
