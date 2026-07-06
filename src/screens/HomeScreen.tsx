import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
  Modal, Pressable, Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '../navigation/RootNavigator';
import Tag from '../components/Tag';
import IconPlus from '../components/icons/IconPlus';
import IconBell from '../components/icons/IconBell';
import { PhotoThumb } from '../components/PhotoThumb';
import PhotoLightbox from '../components/PhotoLightbox';
import { FOLDERS, DiaryEntry, DiaryFolder } from '../data/types';
import { useTheme } from '../context/ThemeContext';
import { useEntries } from '../context/EntriesContext';
import { useGroups } from '../context/GroupsContext';
import Svg, { Path, Line, Circle } from 'react-native-svg';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { accent } = useTheme();
  const { entries } = useEntries();
  const { groups } = useGroups();
  const [tab, setTab] = useState<'personal' | 'group'>('personal');
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [zoomedGroup, setZoomedGroup] = useState<{ emoji: string; photo?: string; name: string } | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<DiaryFolder | null>(null);
  const [personalView, setPersonalView] = useState<'folder' | 'all'>('folder');
  const [folderCovers, setFolderCovers] = useState<Record<string, string>>({});
  const [shareEntry, setShareEntry] = useState<DiaryEntry | null>(null);

  async function pickFolderCover(folderId: string) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 2],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setFolderCovers((prev) => ({ ...prev, [folderId]: result.assets[0].uri }));
    }
  }
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
          {selectedFolder ? (
            /* ── 폴더 내 일기 목록 ── */
            <>
              {folderCovers[selectedFolder.id] ? (
                <TouchableOpacity onPress={() => pickFolderCover(selectedFolder.id)} activeOpacity={0.9}>
                  <Image source={{ uri: folderCovers[selectedFolder.id] }} style={styles.folderCoverBanner} />
                  <View style={styles.folderCoverOverlay}>
                    <View style={styles.folderHeader}>
                      <TouchableOpacity style={styles.folderBackBtn} onPress={() => setSelectedFolder(null)}>
                        <Text style={[styles.folderBackText, { color: '#fff' }]}>← 폴더</Text>
                      </TouchableOpacity>
                      <Text style={[styles.folderHeaderTitle, { color: '#fff' }]}>{selectedFolder.emoji} {selectedFolder.name}</Text>
                      <View style={[styles.folderBackBtn, styles.folderCameraChip]}>
                        <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                          <Circle cx="12" cy="13" r="4"/>
                        </Svg>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.folderHeader}>
                  <TouchableOpacity style={styles.folderBackBtn} onPress={() => setSelectedFolder(null)}>
                    <Text style={styles.folderBackText}>← 폴더</Text>
                  </TouchableOpacity>
                  <Text style={styles.folderHeaderTitle}>{selectedFolder.emoji} {selectedFolder.name}</Text>
                  <TouchableOpacity style={[styles.folderBackBtn, { alignItems: 'flex-end' }]} onPress={() => pickFolderCover(selectedFolder.id)}>
                    <View style={styles.folderAddCoverBtn}>
                      <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                        <circle cx="12" cy="13" r="4"/>
                      </Svg>
                      <Text style={styles.folderAddCoverText}>커버</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
              <ScrollView contentContainerStyle={styles.list}>
                {entries.filter((e) => e.folder === selectedFolder.id).length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>아직 일기가 없어요</Text>
                    <Text style={styles.emptySubText}>오른쪽 아래 버튼을 눌러 첫 일기를 써보세요</Text>
                  </View>
                )}
                {entries.filter((e) => e.folder === selectedFolder.id).map((entry) => (
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
            </>
          ) : (
            /* ── 폴더 목록 / 전체 보기 ── */
            <>
              <View style={styles.viewToggleRow}>
                <View style={styles.viewTogglePill}>
                  <TouchableOpacity
                    style={[styles.viewToggleBtn, personalView === 'folder' && { backgroundColor: accent }]}
                    onPress={() => setPersonalView('folder')}
                  >
                    <Text style={[styles.viewToggleText, personalView === 'folder' && { color: '#fff' }]}>📁  폴더</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.viewToggleBtn, personalView === 'all' && { backgroundColor: accent }]}
                    onPress={() => setPersonalView('all')}
                  >
                    <Text style={[styles.viewToggleText, personalView === 'all' && { color: '#fff' }]}>📋  전체</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {personalView === 'folder' ? (
            <ScrollView contentContainerStyle={styles.folderList}>
              <View style={styles.folderGrid}>
                {FOLDERS.map((folder) => {
                  const count = entries.filter((e) => e.folder === folder.id).length;
                  const cover = folderCovers[folder.id];
                  return (
                    <TouchableOpacity
                      key={folder.id}
                      style={styles.folderCard}
                      onPress={() => setSelectedFolder(folder)}
                    >
                      <View style={styles.folderCoverWrap}>
                        {cover ? (
                          <Image source={{ uri: cover }} style={styles.folderCoverImg} />
                        ) : (
                          <View style={styles.folderCoverEmpty}>
                            <Text style={styles.folderCoverEmoji}>{folder.emoji}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.folderCardBody}>
                        <Text style={styles.folderName}>{folder.name}</Text>
                        <Text style={styles.folderCount}>{count}개</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
              ) : (
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
              )}
            </>
          )}

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
          {groups.length === 0 && (
            <Text style={styles.groupEmptyHint}>아직 참여 중인 그룹이 없어요.{'\n'}새 그룹을 만들거나 초대 코드로 참여해보세요.</Text>
          )}
          {groups.map((group) => (
            <TouchableOpacity
              key={group.id}
              style={styles.groupCard}
              onPress={() => navigation.navigate('Group', { group })}
            >
              <View style={styles.groupTop}>
                <View style={styles.groupLeft}>
                  <View style={styles.groupIconBox}>
                    <Text style={{ fontSize: 20 }}>👥</Text>
                  </View>
                  <View>
                    <Text style={styles.groupName}>{group.name} · {group.member_count ?? 1}명</Text>
                    <Text style={styles.groupSub}>초대코드 {group.invite_code}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.newGroupCard} onPress={() => navigation.navigate('GroupCreate')}>
            <Text style={styles.newGroupPlus}>+</Text>
            <Text style={styles.newGroupText}>새 그룹 만들기 / 참여</Text>
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
            {groups.length === 0 && (
              <Text style={styles.groupEmptyHint}>참여 중인 그룹이 없어요.</Text>
            )}
            {groups.map((g) => {
              const key = String(g.id);
              const selected = sharedGroups.has(key);
              return (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.groupRow, selected && { borderColor: accent, backgroundColor: `${accent}0d` }]}
                  onPress={() => toggleGroup(key)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.groupEmoji}>👥</Text>
                  <View style={styles.groupInfo}>
                    <Text style={styles.groupName}>{g.name}</Text>
                    <Text style={styles.groupMembers}>멤버 {g.member_count ?? 1}명</Text>
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
  viewToggleRow: {
    paddingHorizontal: 20, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  viewTogglePill: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 12, padding: 3,
    alignSelf: 'flex-start',
  },
  viewToggleBtn: {
    paddingHorizontal: 18, paddingVertical: 7, borderRadius: 10,
  },
  viewToggleText: { fontSize: 13, fontWeight: '600', color: '#9ca3af' },
  folderHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  folderBackBtn: { width: 60 },
  folderBackText: { fontSize: 13, color: '#6b7280' },
  folderHeaderTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  folderList: { padding: 16, paddingBottom: 80 },
  folderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  folderCard: {
    width: '47%',
    backgroundColor: '#ffffff', borderRadius: 18,
    borderWidth: 1, borderColor: '#f3f4f6',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1,
    overflow: 'hidden',
  },
  folderCoverWrap: {
    width: '100%', height: 90,
    position: 'relative',
  },
  folderCoverImg: { width: '100%', height: '100%' },
  folderCoverEmpty: {
    width: '100%', height: '100%',
    backgroundColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center',
  },
  folderCoverEmoji: { fontSize: 32 },
  folderCoverBanner: { width: '100%', height: 130 },
  folderCoverOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.28)',
    justifyContent: 'flex-end',
  },
  folderCameraChip: {
    alignItems: 'flex-end', justifyContent: 'center',
  },
  folderAddCoverBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999, borderWidth: 1, borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  folderAddCoverText: { fontSize: 11, color: '#6b7280', fontWeight: '600' },
  folderCardBody: { padding: 12, gap: 3 },
  folderName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  folderCount: { fontSize: 12, color: '#9ca3af' },
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
  groupEmptyHint: { fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 20, paddingVertical: 16 },
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
