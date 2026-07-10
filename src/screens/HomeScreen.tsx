import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
  Modal, Pressable, Image, TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '../navigation/RootNavigator';
import Tag from '../components/Tag';
import IconPlus from '../components/icons/IconPlus';
import IconBell from '../components/icons/IconBell';
import { getUnreadCount as getNotifUnread, subscribeNotifs } from '../data/notifStore';
import { PhotoThumb } from '../components/PhotoThumb';
import PhotoLightbox from '../components/PhotoLightbox';
import { FOLDERS, DiaryEntry, DiaryFolder, entryDateLabel } from '../data/types';
import { useTheme, hexToRgba } from '../context/ThemeContext';
import { useEntries } from '../context/EntriesContext';
import { useGroups } from '../context/GroupsContext';
import { useAuth } from '../context/AuthContext';
import { uploadPhoto, updateGroupPhoto, getMe, getCachedMe, setFolderCover, saveFolders, saveHiddenFolders } from '../api';
import { notify } from '../notify';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import { IconFolder, IconList, IconUsers, IconPencil, IconX, IconCamera } from '../components/icons/Line';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** 폴더 만들기 시 고를 수 있는 아이콘들 */
const FOLDER_EMOJIS = ['📁', '📔', '✈️', '📚', '🍜', '🎵', '💼', '🏃', '🎨', '❤️', '🌱', '⭐', '☕', '🐾', '🎮', '🌸'];

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { accent } = useTheme();
  const { entries, updateEntry } = useEntries();
  const { groups, refresh: refreshGroups } = useGroups();
  const { token } = useAuth();
  const [tab, setTab] = useState<'personal' | 'group'>('personal');
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [zoomedGroup, setZoomedGroup] = useState<{ emoji: string; photo?: string; name: string } | null>(null);
  // 알림 읽음 상태 구독 → 종 배지(빨간 점)를 안 읽은 알림이 있을 때만 표시
  const [, forceNotif] = useState(0);
  useEffect(() => subscribeNotifs(() => forceNotif((v) => v + 1)), []);
  const hasUnreadNotif = getNotifUnread() > 0;
  const [selectedFolder, setSelectedFolder] = useState<DiaryFolder | null>(null);
  const [personalView, setPersonalView] = useState<'folder' | 'all'>('folder');
  // 캐시된 프로필로 초기화 → 폴더 커버·목록이 즉시 표시(시간차 제거), 아래 useEffect가 갱신
  const [folderCovers, setFolderCovers] = useState<Record<string, string>>(() => getCachedMe()?.folder_covers ?? {});
  const [shareEntry, setShareEntry] = useState<DiaryEntry | null>(null);

  const [groupCovers, setGroupCovers] = useState<Record<number, string>>({});
  const [customFolders, setCustomFolders] = useState<DiaryFolder[]>(() => (getCachedMe()?.folders ?? []) as DiaryFolder[]);
  const [hiddenFolders, setHiddenFolders] = useState<string[]>(() => getCachedMe()?.hidden_folders ?? []);
  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderEmoji, setNewFolderEmoji] = useState('📁');
  // 폴더 이름/아이콘 수정
  const [editFolder, setEditFolder] = useState<DiaryFolder | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('📁');
  const [deleteTarget, setDeleteTarget] = useState<DiaryFolder | null>(null);

  // 기본 폴더(이름/아이콘 override 반영, 숨긴 폴더 제외) + 사용자가 만든 폴더
  const createdFolders = customFolders.filter((f) => f.id.startsWith('c_'));
  const allFolders: DiaryFolder[] = [
    ...FOLDERS.filter((f) => !hiddenFolders.includes(f.id)).map((f) => {
      const ov = customFolders.find((c) => c.id === f.id);
      return ov ? { ...f, name: ov.name, emoji: ov.emoji } : f;
    }),
    ...createdFolders,
  ];

  // 폴더 커버·사용자 폴더(서버 저장분)를 로그인(토큰 준비) 후 불러오기 — 토큰 늦게 붙어도 재실행
  useEffect(() => {
    if (!token) return;
    getMe()
      .then((me) => { setFolderCovers(me.folder_covers); setCustomFolders(me.folders); setHiddenFolders(me.hidden_folders); })
      .catch(() => {});
  }, [token]);

  /** 새 폴더 만들기 → DB(user_metadata) 저장 */
  async function createFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    const folder: DiaryFolder = { id: `c_${Date.now()}`, name, emoji: newFolderEmoji };
    const next = [...customFolders, folder];
    setCustomFolders(next);
    setFolderModalOpen(false);
    setNewFolderName('');
    setNewFolderEmoji('📁');
    try {
      await saveFolders(next);
    } catch (e: any) {
      notify(e?.message ?? '폴더 저장에 실패했어요.');
    }
  }

  /** 폴더 수정 시트 열기 */
  function openEditFolder(folder: DiaryFolder) {
    setEditFolder(folder);
    setEditName(folder.name);
    setEditEmoji(folder.emoji);
  }

  /** 폴더 이름/아이콘 저장 (기본 폴더는 override로, 사용자 폴더는 직접 수정) → DB 저장 */
  async function saveFolderEdit() {
    if (!editFolder) return;
    const name = editName.trim();
    if (!name) return;
    const id = editFolder.id;
    const exists = customFolders.some((f) => f.id === id);
    const next = exists
      ? customFolders.map((f) => (f.id === id ? { ...f, name, emoji: editEmoji } : f))
      : [...customFolders, { id, name, emoji: editEmoji }];
    setCustomFolders(next);
    if (selectedFolder?.id === id) setSelectedFolder({ ...selectedFolder, name, emoji: editEmoji });
    setEditFolder(null);
    try {
      await saveFolders(next);
    } catch (e: any) {
      notify(e?.message ?? '폴더 저장에 실패했어요.');
    }
  }

  /** 폴더 삭제 실행 — 사용자 폴더는 제거, 기본 폴더는 숨김 처리 → DB 저장 */
  async function performDelete(target: DiaryFolder) {
    const id = target.id;
    const isCustom = id.startsWith('c_');
    const nextCustom = customFolders.filter((f) => f.id !== id);
    setCustomFolders(nextCustom);
    let nextHidden = hiddenFolders;
    if (!isCustom) {
      nextHidden = [...hiddenFolders.filter((h) => h !== id), id];
      setHiddenFolders(nextHidden);
    }
    if (selectedFolder?.id === id) setSelectedFolder(null);
    setDeleteTarget(null);
    try {
      await saveFolders(nextCustom);
      if (!isCustom) await saveHiddenFolders(nextHidden);
    } catch (e: any) {
      notify(e?.message ?? '폴더 삭제에 실패했어요.');
    }
  }

  /** 폴더 커버 사진 제거 → 이모지 아이콘으로 복귀 */
  async function removeFolderCover(folderId: string) {
    setFolderCovers((prev) => {
      const next = { ...prev };
      delete next[folderId];
      return next;
    });
    try {
      const covers = await setFolderCover(folderId, '');
      setFolderCovers(covers);
    } catch (e: any) {
      notify(e?.message ?? '커버 제거에 실패했어요.');
    }
  }

  /** 폴더 커버 사진 변경 → Storage 업로드 후 내 계정(user_metadata)에 저장 */
  async function pickFolderCover(folderId: string) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 2],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const localUri = result.assets[0].uri;
    setFolderCovers((prev) => ({ ...prev, [folderId]: localUri })); // 낙관적 표시
    try {
      const url = await uploadPhoto(localUri);
      const covers = await setFolderCover(folderId, url);
      setFolderCovers(covers);
    } catch (e: any) {
      notify(e?.message ?? '커버 저장에 실패했어요.');
    }
  }

  /** 그룹 커버 사진 변경 → Storage 업로드 후 DB 저장 (모든 멤버 공유) */
  async function pickGroupCover(groupId: number) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 2],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const localUri = result.assets[0].uri;
    setGroupCovers((prev) => ({ ...prev, [groupId]: localUri })); // 낙관적 표시
    try {
      const url = await uploadPhoto(localUri);
      await updateGroupPhoto(groupId, url);
      await refreshGroups(); // group.photo_url 갱신
    } catch (e: any) {
      notify(e?.message ?? '그룹 커버 저장에 실패했어요.');
    }
  }
  function openShare(entry: DiaryEntry) {
    setShareEntry(entry);
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>p!ng</Text>
        <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('Notifications')}>
          <IconBell size={22} dot={hasUnreadNotif} />
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
            /* ── 폴더 내 p!ng 목록 ── */
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
                    <Text style={styles.emptyText}>아직 p!ng가 없어요</Text>
                    <Text style={styles.emptySubText}>오른쪽 아래 버튼을 눌러 첫 p!ng를 써보세요</Text>
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
                        <Text style={styles.entryDate}>{entryDateLabel(entry)}</Text>
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
                    <View style={styles.viewToggleInner}>
                      <IconFolder size={14} color={personalView === 'folder' ? '#fff' : '#9ca3af'} />
                      <Text style={[styles.viewToggleText, personalView === 'folder' && { color: '#fff' }]}>폴더</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.viewToggleBtn, personalView === 'all' && { backgroundColor: accent }]}
                    onPress={() => setPersonalView('all')}
                  >
                    <View style={styles.viewToggleInner}>
                      <IconList size={14} color={personalView === 'all' ? '#fff' : '#9ca3af'} />
                      <Text style={[styles.viewToggleText, personalView === 'all' && { color: '#fff' }]}>전체</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {personalView === 'folder' ? (
            <ScrollView contentContainerStyle={styles.folderList}>
              <Text style={styles.folderHint}>폴더를 길게 누르면 이름·아이콘 수정, 삭제를 할 수 있어요</Text>
              <View style={styles.folderGrid}>
                {allFolders.map((folder) => {
                  const count = entries.filter((e) => e.folder === folder.id).length;
                  const cover = folderCovers[folder.id];
                  return (
                    <TouchableOpacity
                      key={folder.id}
                      style={[styles.gridCell, styles.glowCard, { shadowColor: accent, borderColor: hexToRgba(accent, 0.45) }]}
                      activeOpacity={0.85}
                      onPress={() => setSelectedFolder(folder)}
                      onLongPress={() => openEditFolder(folder)}
                      delayLongPress={300}
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
                      <View style={[styles.folderCardBody, { backgroundColor: hexToRgba(accent, 0.1) }]}>
                        <Text style={styles.folderName} numberOfLines={1}>{folder.name}</Text>
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
                    <Text style={styles.emptyText}>아직 p!ng가 없어요</Text>
                    <Text style={styles.emptySubText}>오른쪽 아래 버튼을 눌러 첫 p!ng를 써보세요</Text>
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
                        <Text style={styles.entryDate}>{entryDateLabel(entry)}</Text>
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
            onPress={() => {
              // 폴더 안에서는 바로 그 폴더로 지정된 새 글 작성
              if (selectedFolder) navigation.navigate('DiaryWrite', { folder: selectedFolder.id });
              else setFabMenuOpen(true);
            }}
          >
            <IconPlus color="#ffffff" size={22} />
          </TouchableOpacity>
        </>
      ) : (
        <ScrollView contentContainerStyle={styles.folderList}>
          <Text style={[styles.sectionLabel, { marginBottom: 10 }]}>참여 중인 그룹</Text>
          {groups.length > 0 && (
            <Text style={styles.folderHint}>그룹을 길게 누르면 대표 사진을 바꿀 수 있어요</Text>
          )}
          {groups.length === 0 && (
            <Text style={styles.groupEmptyHint}>아직 참여 중인 그룹이 없어요.{'\n'}새 그룹을 만들거나 초대 코드로 참여해보세요.</Text>
          )}
          <View style={styles.folderGrid}>
            {groups.map((group) => {
              const cover = group.photo_url ?? groupCovers[group.id];
              return (
                <TouchableOpacity
                  key={group.id}
                  style={[styles.gridCell, styles.glowCard, { shadowColor: accent, borderColor: hexToRgba(accent, 0.45) }]}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('Group', { group })}
                  onLongPress={() => pickGroupCover(group.id)}
                  delayLongPress={300}
                >
                  <View style={styles.folderCoverWrap}>
                    {cover ? (
                      <Image source={{ uri: cover }} style={styles.folderCoverImg} />
                    ) : (
                      <View style={styles.folderCoverEmpty}>
                        <IconUsers size={30} color="#9ca3af" />
                      </View>
                    )}
                  </View>
                  <View style={[styles.folderCardBody, { backgroundColor: hexToRgba(accent, 0.1) }]}>
                    <Text style={styles.folderName} numberOfLines={1}>{group.name}</Text>
                    <Text style={styles.folderCount}>{group.member_count ?? 1}명</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={[styles.gridCell, styles.groupAddCard]} onPress={() => navigation.navigate('GroupCreate')}>
              <Text style={styles.newGroupPlus}>+</Text>
              <Text style={styles.newGroupText}>새 그룹{'\n'}만들기 / 참여</Text>
            </TouchableOpacity>
          </View>
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
                <IconX size={18} color="#9ca3af" />
              </TouchableOpacity>
            </View>
            <Text style={styles.sheetSub}>
              {shareEntry.visibility === 'friends'
                ? '이미 참여 중인 그룹 피드에 공개돼 있어요.'
                : '공개하면 참여 중인 모든 그룹 피드에 이 p!ng가 표시돼요.'}
            </Text>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: shareEntry.visibility === 'friends' ? '#e5e7eb' : accent }]}
              onPress={() => {
                const next: 'private' | 'friends' = shareEntry.visibility === 'friends' ? 'private' : 'friends';
                updateEntry({ ...shareEntry, visibility: next });
                setShareEntry(null);
              }}
            >
              <Text style={[styles.confirmBtnText, { color: shareEntry.visibility === 'friends' ? '#374151' : '#fff' }]}>
                {shareEntry.visibility === 'friends' ? '그룹 공개 해제' : '그룹에 공개하기'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* + 버튼 선택 시트: p!ng / 폴더 */}
      {fabMenuOpen && (
        <View style={styles.overlayWrap}>
          <TouchableOpacity style={styles.overlayBg} activeOpacity={1} onPress={() => setFabMenuOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={{ height: 8 }} />
            <TouchableOpacity
              style={styles.fabChoice}
              onPress={() => { setFabMenuOpen(false); navigation.navigate('DiaryWrite'); }}
            >
              <View style={styles.fabChoiceIcon}><IconPencil size={22} color={accent} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fabChoiceTitle}>p!ng</Text>
                <Text style={styles.fabChoiceSub}>새 p!ng를 작성해요</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.fabChoice}
              onPress={() => { setFabMenuOpen(false); setFolderModalOpen(true); }}
            >
              <View style={styles.fabChoiceIcon}><IconFolder size={22} color={accent} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fabChoiceTitle}>폴더 만들기</Text>
                <Text style={styles.fabChoiceSub}>p!ng를 정리할 폴더를 추가해요</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 새 폴더 만들기 모달 */}
      {folderModalOpen && (
        <View style={styles.overlayWrap}>
          <TouchableOpacity style={styles.overlayBg} activeOpacity={1} onPress={() => setFolderModalOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.fabSheetTitle}>새 폴더</Text>
            <TextInput
              style={styles.folderInput}
              value={newFolderName}
              onChangeText={setNewFolderName}
              placeholder="폴더 이름 (예: 운동, 회고)"
              placeholderTextColor="#9ca3af"
              maxLength={20}
            />
            <Text style={styles.folderEmojiLabel}>아이콘</Text>
            <View style={styles.emojiGrid}>
              {FOLDER_EMOJIS.map((em) => (
                <TouchableOpacity
                  key={em}
                  style={[styles.emojiChip, newFolderEmoji === em && { borderColor: accent, backgroundColor: hexToRgba(accent, 0.1) }]}
                  onPress={() => setNewFolderEmoji(em)}
                >
                  <Text style={{ fontSize: 20 }}>{em}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: newFolderName.trim() ? accent : '#e5e7eb' }]}
              disabled={!newFolderName.trim()}
              onPress={createFolder}
            >
              <Text style={[styles.confirmBtnText, { color: newFolderName.trim() ? '#fff' : '#9ca3af' }]}>폴더 만들기</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 폴더 수정 시트 */}
      {editFolder && (
        <View style={styles.overlayWrap}>
          <TouchableOpacity style={styles.overlayBg} activeOpacity={1} onPress={() => setEditFolder(null)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.fabSheetTitle}>폴더 수정</Text>
            <TextInput
              style={styles.folderInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="폴더 이름"
              placeholderTextColor="#9ca3af"
              maxLength={20}
            />
            <Text style={styles.folderEmojiLabel}>커버 사진</Text>
            <View style={styles.coverEditRow}>
              {folderCovers[editFolder.id] ? (
                <Image source={{ uri: folderCovers[editFolder.id] }} style={styles.coverThumb} />
              ) : (
                <View style={styles.coverThumbEmpty}>
                  <IconCamera size={20} color="#9ca3af" />
                </View>
              )}
              <TouchableOpacity style={styles.coverPickBtn} onPress={() => pickFolderCover(editFolder.id)}>
                <Text style={styles.coverPickText}>{folderCovers[editFolder.id] ? '사진 변경' : '사진 선택'}</Text>
              </TouchableOpacity>
              {folderCovers[editFolder.id] && (
                <TouchableOpacity style={styles.coverRemoveBtn} onPress={() => removeFolderCover(editFolder.id)}>
                  <Text style={styles.coverRemoveText}>제거</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.folderEmojiLabel}>아이콘 <Text style={styles.folderEmojiHint}>(커버 사진이 없을 때 표시)</Text></Text>
            <View style={styles.emojiGrid}>
              {FOLDER_EMOJIS.map((em) => (
                <TouchableOpacity
                  key={em}
                  style={[styles.emojiChip, editEmoji === em && { borderColor: accent, backgroundColor: hexToRgba(accent, 0.1) }]}
                  onPress={() => setEditEmoji(em)}
                >
                  <Text style={{ fontSize: 20 }}>{em}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: editName.trim() ? accent : '#e5e7eb' }]}
              disabled={!editName.trim()}
              onPress={saveFolderEdit}
            >
              <Text style={[styles.confirmBtnText, { color: editName.trim() ? '#fff' : '#9ca3af' }]}>저장</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteFolderBtn}
              onPress={() => { const t = editFolder; setEditFolder(null); setDeleteTarget(t); }}
            >
              <Text style={styles.deleteFolderText}>폴더 삭제</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 폴더 삭제 확인 (폰 프레임 안) */}
      {deleteTarget && (
        <View style={styles.overlayWrap}>
          <TouchableOpacity style={styles.overlayBg} activeOpacity={1} onPress={() => setDeleteTarget(null)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.fabSheetTitle}>폴더 삭제</Text>
            <Text style={styles.deleteConfirmMsg}>
              '{deleteTarget.name}' 폴더를 삭제할까요?
              {!deleteTarget.id.startsWith('c_') && '\n기본 폴더는 숨겨지고, 담긴 p!ng는 전체 목록에서 볼 수 있어요.'}
            </Text>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: '#ef4444' }]}
              onPress={() => performDelete(deleteTarget)}
            >
              <Text style={[styles.confirmBtnText, { color: '#ffffff' }]}>삭제</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteFolderBtn} onPress={() => setDeleteTarget(null)}>
              <Text style={[styles.deleteFolderText, { color: '#6b7280' }]}>취소</Text>
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
  viewToggleInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
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
  folderHint: { fontSize: 11, color: '#b8bcc4', marginBottom: 12, paddingHorizontal: 2 },
  folderGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  folderCard: {
    width: '47%',
    backgroundColor: '#ffffff', borderRadius: 18,
    borderWidth: 1, borderColor: '#f3f4f6',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1,
    overflow: 'hidden',
  },
  // 카드에서 배경으로 은은하게 번지는 글로우 (accent 색이 밖으로 퍼져 사라짐, 색은 인라인 주입)
  gridCell: { width: '48%' },
  glowCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  folderCoverWrap: {
    width: '100%', height: 112,
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
  folderCardBody: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: 6, paddingHorizontal: 11, paddingVertical: 8,
  },
  folderName: { flex: 1, fontSize: 14, fontWeight: '700', color: '#111827' },
  folderCount: { flexShrink: 0, fontSize: 12, color: '#9ca3af' },
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
  newGroupText: { fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 18 },
  // 그룹 커버 위 카메라(사진 변경) 버튼
  groupCamBtn: {
    position: 'absolute', top: 6, right: 6,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  // 폴더 그리드 톤에 맞춘 '새 그룹' 추가 카드
  groupAddCard: {
    minHeight: 148,
    alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 2, borderColor: '#e5e7eb', borderStyle: 'dashed',
    borderRadius: 20, backgroundColor: '#ffffff',
  },
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
  deleteFolderBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 4 },
  deleteFolderText: { fontSize: 13, color: '#ef4444', fontWeight: '600' },
  deleteConfirmMsg: { fontSize: 13, color: '#6b7280', lineHeight: 20, marginBottom: 16 },

  // + 선택 시트
  fabSheetTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginTop: 4, marginBottom: 14 },
  fabChoice: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, paddingHorizontal: 14,
    borderRadius: 14, borderWidth: 1, borderColor: '#f3f4f6',
    backgroundColor: '#f9fafb', marginBottom: 10,
  },
  fabChoiceEmoji: { fontSize: 26 },
  fabChoiceIcon: { width: 30, alignItems: 'center' },
  fabChoiceTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  fabChoiceSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },

  // 폴더 만들기 모달
  folderInput: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827',
    marginBottom: 16,
  },
  folderEmojiLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  folderEmojiHint: { fontSize: 11, fontWeight: '400', color: '#9ca3af' },
  coverEditRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  coverThumb: { width: 56, height: 40, borderRadius: 8, backgroundColor: '#f3f4f6' },
  coverThumbEmpty: {
    width: 56, height: 40, borderRadius: 8, backgroundColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center',
  },
  coverPickBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#f9fafb',
  },
  coverPickText: { fontSize: 13, color: '#374151', fontWeight: '600' },
  coverRemoveBtn: { paddingHorizontal: 8, paddingVertical: 8 },
  coverRemoveText: { fontSize: 13, color: '#ef4444', fontWeight: '600' },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  emojiChip: {
    width: 44, height: 44, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#f3f4f6', backgroundColor: '#f9fafb',
    alignItems: 'center', justifyContent: 'center',
  },
});
