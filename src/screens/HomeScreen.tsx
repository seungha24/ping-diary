import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
  Modal, Pressable, Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import Tag from '../components/Tag';
import IconPlus from '../components/icons/IconPlus';
import IconBell from '../components/icons/IconBell';
import { PhotoThumb } from '../components/PhotoThumb';
import PhotoLightbox from '../components/PhotoLightbox';
import { GROUPS, DiaryEntry } from '../data/types';
import { useTheme } from '../context/ThemeContext';
import { useEntries } from '../context/EntriesContext';
import Svg, { Path, Line } from 'react-native-svg';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { accent } = useTheme();
  const { entries } = useEntries();
  const [tab, setTab] = useState<'personal' | 'group'>('personal');
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [zoomedGroup, setZoomedGroup] = useState<{ emoji: string; photo?: string; name: string } | null>(null);
  const [shareEntry, setShareEntry] = useState<DiaryEntry | null>(null);
  const [sharedGroups, setSharedGroups] = useState<Set<string>>(new Set());

  function openShare(entry: DiaryEntry) {
    setSharedGroups(new Set());
    setShareEntry(entry);
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>p!ng</Text>
        <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('Notifications')}>
          <IconBell size={22} dot />
        </TouchableOpacity>
      </View>

      {/* Tab switcher */}
      <View style={styles.tabRow}>
        <View style={styles.tabPill}>
          {(['personal', 'group'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tabItem, tab === t && styles.tabItemActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && { color: accent, fontWeight: '700' }]}>
                {t === 'personal' ? '개인' : '그룹'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {lightboxPhoto && (
        <PhotoLightbox photo={lightboxPhoto} onClose={() => setLightboxPhoto(null)} />
      )}

      <Modal visible={!!zoomedGroup} transparent animationType="fade">
        <Pressable style={styles.zoomOverlay} onPress={() => setZoomedGroup(null)}>
          <View style={styles.zoomCard}>
            {zoomedGroup?.photo
              ? <Image source={{ uri: zoomedGroup.photo }} style={styles.zoomPhoto} />
              : <Text style={styles.zoomEmoji}>{zoomedGroup?.emoji}</Text>
            }
            <Text style={styles.zoomName}>{zoomedGroup?.name}</Text>
          </View>
        </Pressable>
      </Modal>

      {tab === 'personal' ? (
        <>
          <ScrollView contentContainerStyle={styles.list}>
            {entries.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>아직 일기가 없어요</Text>
                <Text style={styles.emptySubText}>오른쪽 아래 버튼을 눌러 첫 일기를 써보세요</Text>
              </View>
            )}
            {entries.map((entry) => (
              <TouchableOpacity
                key={entry.id}
                style={styles.entryCard}
                onPress={() => navigation.navigate('DiaryDetail', { entry })}
              >
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle} numberOfLines={1}>{entry.title}</Text>
                  <View style={styles.entryHeaderRight}>
                    <Text style={styles.entryDate}>6월 {entry.dates.join(',')}일</Text>
                    <TouchableOpacity
                      style={styles.cardShareBtn}
                      onPress={(e) => { e.stopPropagation(); openShare(entry); }}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                        <Path d="M16 6l-4-4-4 4" />
                        <Line x1="12" y1="2" x2="12" y2="15" />
                      </Svg>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.entryBody}>
                  {entry.photo && (
                    <TouchableOpacity onPress={() => setLightboxPhoto(entry.photo)}>
                      <PhotoThumb photo={entry.photo} size={48} radius={10} />
                    </TouchableOpacity>
                  )}
                  <Text style={styles.entryPreview} numberOfLines={3}>{entry.body}</Text>
                </View>
                <View style={styles.tagRow}>
                  {entry.tags.map((t) => <Tag key={t} label={t} />)}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.fab, { backgroundColor: accent }]}
            onPress={() => navigation.navigate('DiaryWrite')}
          >
            <IconPlus color="#ffffff" size={22} />
          </TouchableOpacity>
        </>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          <Text style={styles.sectionLabel}>참여 중인 그룹</Text>
          {GROUPS.map((group) => (
            <TouchableOpacity
              key={group.name}
              style={styles.groupCard}
              onPress={() => navigation.navigate('Group', { group })}
            >
              <View style={styles.groupTop}>
                <View style={styles.groupLeft}>
                  <TouchableOpacity
                    style={styles.groupIconBox}
                    onPress={(e) => { e.stopPropagation(); setZoomedGroup({ emoji: group.emoji, photo: group.photo, name: group.name }); }}
                  >
                    {group.photo
                      ? <Image source={{ uri: group.photo }} style={{ width: 44, height: 44, borderRadius: 12 }} />
                      : <Text style={{ fontSize: 20 }}>{group.emoji}</Text>
                    }
                  </TouchableOpacity>
                  <View>
                    <Text style={styles.groupName}>{group.name} · {group.members.length}명</Text>
                    <Text style={styles.groupSub}>최근 일기 {group.entries.length}개</Text>
                  </View>
                </View>
                <View style={styles.memberAvatars}>
                  {group.members.slice(0, 3).map((_, j) => (
                    <View key={j} style={[styles.memberDot, { marginLeft: j > 0 ? -8 : 0 }]}>
                      <Text style={{ fontSize: 11 }}>{['👩', '👨', '🙋'][j]}</Text>
                    </View>
                  ))}
                  {group.members.length > 3 && (
                    <View style={[styles.memberDot, styles.memberDotExtra, { marginLeft: -8 }]}>
                      <Text style={styles.memberDotExtraText}>+{group.members.length - 3}</Text>
                    </View>
                  )}
                </View>
              </View>
              {group.entries[0] && (
                <Text style={styles.groupPreview} numberOfLines={1}>
                  {group.entries[0].author} · {group.entries[0].title}
                </Text>
              )}
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.newGroupCard} onPress={() => navigation.navigate('GroupCreate')}>
            <Text style={styles.newGroupPlus}>+</Text>
            <Text style={styles.newGroupText}>새 그룹 만들기</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {shareEntry && (
        <View style={styles.overlayWrap}>
          <TouchableOpacity style={styles.overlayBg} activeOpacity={1} onPress={() => setShareEntry(null)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleWrap}>
                <Text style={styles.sheetTitle}>그룹에 공유</Text>
                <Text style={styles.sheetSub} numberOfLines={1}>{shareEntry.title}</Text>
              </View>
              <TouchableOpacity onPress={() => setShareEntry(null)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
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
              onPress={() => setShareEntry(null)}
              disabled={sharedGroups.size === 0}
            >
              <Text style={[styles.confirmBtnText, { color: sharedGroups.size > 0 ? '#fff' : '#9ca3af' }]}>
                {sharedGroups.size > 0 ? `${sharedGroups.size}개 그룹에 공유` : '그룹을 선택하세요'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  logo: { fontSize: 22, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  bellBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
  },
  tabRow: { paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  tabPill: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 12, padding: 4 },
  tabItem: { flex: 1, paddingVertical: 7, borderRadius: 9, alignItems: 'center' },
  tabItemActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
  tabText: { fontSize: 13, color: '#9ca3af', fontWeight: '500' },
  tabTextActive: { color: '#111827', fontWeight: '700' },
  list: { padding: 16, gap: 10, paddingBottom: 80 },
  emptyState: { alignItems: 'center', paddingTop: 48, gap: 6 },
  emptyText: { fontSize: 14, color: '#9ca3af' },
  emptySubText: { fontSize: 12, color: '#d1d5db' },
  entryCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#f3f4f6',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1,
    gap: 8,
  },
  entryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  entryTitle: { fontSize: 14, fontWeight: '700', color: '#1f2937', flex: 1 },
  entryHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 },
  entryDate: { fontSize: 11, color: '#9ca3af', flexShrink: 0 },
  cardShareBtn: {
    width: 20, height: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  entryBody: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  entryPreview: { fontSize: 12, color: '#9ca3af', flex: 1, lineHeight: 18 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
  sectionLabel: { fontSize: 12, color: '#9ca3af', marginBottom: 2, paddingHorizontal: 4 },
  groupCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#f3f4f6',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1,
    gap: 8,
  },
  groupTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  groupLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  groupIconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
  },
  groupName: { fontSize: 14, fontWeight: '700', color: '#1f2937' },
  groupSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  memberAvatars: { flexDirection: 'row' },
  memberDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#e5e7eb', borderWidth: 2, borderColor: '#ffffff',
    alignItems: 'center', justifyContent: 'center',
  },
  memberDotExtra: { backgroundColor: '#d1d5db' },
  memberDotExtraText: { fontSize: 9, color: '#6b7280', fontWeight: '600' },
  groupPreview: { fontSize: 12, color: '#9ca3af' },
  newGroupCard: {
    borderWidth: 2, borderColor: '#e5e7eb', borderStyle: 'dashed',
    borderRadius: 16, paddingVertical: 24, alignItems: 'center', gap: 6,
  },
  newGroupPlus: { fontSize: 24, color: '#9ca3af' },
  newGroupText: { fontSize: 13, color: '#9ca3af' },
  zoomOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center', justifyContent: 'center',
  },
  zoomCard: { alignItems: 'center', gap: 14 },
  zoomPhoto: { width: 180, height: 180, borderRadius: 32 },
  zoomEmoji: { fontSize: 100 },
  zoomName: { fontSize: 16, fontWeight: '700', color: '#ffffff' },

  overlayWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' },
  overlayBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 32,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  sheetTitleWrap: { flex: 1, gap: 2 },
  sheetTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  sheetSub: { fontSize: 12, color: '#9ca3af' },
  sheetClose: { fontSize: 16, color: '#9ca3af', paddingLeft: 12 },
  groupRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: '#f3f4f6',
    marginBottom: 8,
  },
  groupEmoji: { fontSize: 22 },
  groupInfo: { flex: 1 },
  groupMembers: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  checkbox: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1.5,
    borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center',
  },
  checkmark: { fontSize: 12, color: '#fff', fontWeight: '700' },
  confirmBtn: { marginTop: 8, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  confirmBtnText: { fontSize: 14, fontWeight: '700' },
});
