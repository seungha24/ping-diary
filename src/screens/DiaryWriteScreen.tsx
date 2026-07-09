import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, Modal, Image, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path, Rect, Circle, Polyline } from 'react-native-svg';
import Tag from '../components/Tag';
import IconChev from '../components/icons/IconChev';
import { PERSONAS, MONTHS, DAYS, FOLDERS, DiaryFolder } from '../data/types';
import { PersonaIcon, IconFolder } from '../components/icons/Line';
import { useTheme, hexToRgba } from '../context/ThemeContext';
import { useEntries } from '../context/EntriesContext';
import { uploadPhoto, getCachedMe, patchEntry, generateComment } from '../api';
import { notify } from '../notify';
import { RootStackParamList } from '../navigation/RootNavigator';

type WriteRoute = RouteProp<RootStackParamList, 'DiaryWrite'>;

/** 단순 라인 아이콘들 (Feather 스타일) */
type IconProps = { color: string; size?: number };
function IconCamera({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <Circle cx="12" cy="13" r="4" />
    </Svg>
  );
}
function IconLock({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Svg>
  );
}
function IconUsers({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <Circle cx="9" cy="7" r="4" />
      <Path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  );
}
function IconMessage({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </Svg>
  );
}
function IconRefresh({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="23 4 23 10 17 10" />
      <Polyline points="1 20 1 14 7 14" />
      <Path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </Svg>
  );
}
function IconQuote({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M7 7h5v5c0 2.4-1.7 4.3-4.1 4.9l-.4-1.5c1.3-.3 2.2-1.1 2.4-2.3H7V7zm7 0h5v5c0 2.4-1.7 4.3-4.1 4.9l-.4-1.5c1.3-.3 2.2-1.1 2.4-2.3H14V7z" />
    </Svg>
  );
}

/** AI 프롬프트 질문 (새로고침으로 순환) */
const PROMPTS = [
  '오늘 가장 기억에 남는 순간은 무엇인가요?',
  '오늘 나를 웃게 한 일이 있었나요?',
  '지금 가장 고마운 사람은 누구인가요?',
  '오늘의 나에게 한마디 해준다면?',
  '요즘 가장 신경 쓰이는 일은 무엇인가요?',
  '오늘 하루를 색으로 표현한다면?',
];

async function playPing() {
  try {
    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/ping.wav'),
      { shouldPlay: true },
    );
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) sound.unloadAsync();
    });
  } catch (_) {}
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function DiaryWriteScreen() {
  const navigation = useNavigation();
  const route = useRoute<WriteRoute>();
  const editEntry = route.params?.entry;
  const { accent } = useTheme();
  const { addEntry, updateEntry, updateLocal } = useEntries();
  const today = new Date();
  const [title, setTitle] = useState(editEntry?.title ?? '');
  const [body, setBody] = useState(editEntry?.body ?? '');
  const [tags, setTags] = useState<string[]>(editEntry?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [persona, setPersona] = useState(editEntry?.persona ?? '선생님');
  const [photo, setPhoto] = useState<string | null>(editEntry?.photo ?? null);
  const [uploading, setUploading] = useState(false);
  const [visibility, setVisibility] = useState<'private' | 'friends'>(editEntry?.visibility ?? 'private');
  const [calOpen, setCalOpen] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);
  const [personaModalOpen, setPersonaModalOpen] = useState(false);
  const [folder, setFolder] = useState<string | undefined>(editEntry?.folder ?? undefined);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [calYear] = useState(2026);
  const [calMonth, setCalMonth] = useState(5);
  const [selectedDates, setSelectedDates] = useState<number[]>(editEntry?.dates ?? [today.getDate()]);

  // 홈 화면과 동일하게 기본 폴더(숨김 제외·이름/이모지 오버라이드) + 사용자 생성 폴더
  const cachedMe = getCachedMe();
  const customFolders = (cachedMe?.folders ?? []) as DiaryFolder[];
  const hiddenFolders = cachedMe?.hidden_folders ?? [];
  const allFolders: DiaryFolder[] = [
    ...FOLDERS.filter((f) => !hiddenFolders.includes(f.id)).map((f) => {
      const ov = customFolders.find((c) => c.id === f.id);
      return ov ? { ...f, name: ov.name, emoji: ov.emoji } : f;
    }),
    ...customFolders.filter((f) => f.id.startsWith('c_')),
  ];
  const currentFolder = allFolders.find((f) => f.id === folder);

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);
  const calGrid: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (calGrid.length % 7 !== 0) calGrid.push(null);

  function toggleDate(day: number) {
    setSelectedDates((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  }

  function addTag() {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput('');
  }

  // 사진 선택 → 서버 업로드 → 공개 URL 저장
  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setUploading(true);
    try {
      const url = await uploadPhoto(result.assets[0].uri);
      setPhoto(url);
    } catch (e: any) {
      notify(e?.message ?? '사진 업로드에 실패했어요. 다시 시도해주세요.');
    } finally {
      setUploading(false);
    }
  }

  function dateLabel() {
    if (selectedDates.length === 0) return '날짜 선택';
    if (selectedDates.length === 1) return `6월 ${selectedDates[0]}일`;
    return `6월 ${selectedDates[0]}일 ~ ${selectedDates[selectedDates.length - 1]}일`;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>취소</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editEntry ? 'p!ng 수정' : '오늘의 p!ng'}</Text>
        <View style={styles.headerRight}>
          <View style={styles.autoSaveBadge}>
            <View style={styles.autoSaveDot} />
            <Text style={styles.autoSaveText}>자동저장됨</Text>
          </View>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: accent }]}
            onPress={async () => {
              if (editEntry) {
                const personaChanged = editEntry.persona !== persona;
                const needRegen = personaChanged && !!editEntry.aiComment;
                const updated = { ...editEntry, title, body, tags, persona, folder, dates: selectedDates, photo, visibility };
                updateLocal(updated); // 화면 즉시 반영
                playPing();
                navigation.goBack();
                try {
                  const saved = await patchEntry(updated); // 내용·페르소나·폴더 저장
                  updateLocal(saved);
                  // 페르소나가 바뀌었고 이미 코멘트가 있으면 새 말투로 다시 생성
                  if (needRegen) {
                    const regen = await generateComment(saved.id, persona);
                    updateLocal(regen);
                  }
                } catch (e: any) {
                  notify(e?.message ?? '저장에 실패했어요. 잠시 후 다시 시도해주세요.');
                }
              } else {
                addEntry({
                  id: Date.now(),
                  title,
                  body,
                  tags,
                  persona,
                  folder,
                  dates: selectedDates,
                  photo,
                  visibility,
                  createdAt: new Date().toISOString(),
                });
                playPing();
                navigation.goBack();
              }
            }}
          >
            <Text style={styles.saveBtnText}>{editEntry ? '저장' : 'p!ng'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Date + Tags (같은 줄) */}
        <View style={styles.dateTagRow}>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setCalOpen(true)}>
            <View style={styles.dateDot} />
            <Text style={styles.dateBtnText}>{dateLabel()}</Text>
            <IconChev dir="right" size={14} color="#9ca3af" />
          </TouchableOpacity>

          <View style={[styles.tagRow, styles.tagRowInline]}>
          {tags.map((t) => (
            <TouchableOpacity key={t} onPress={() => setTags(tags.filter((x) => x !== t))}>
              <View style={[styles.tagRemovable, { backgroundColor: hexToRgba(accent, 0.12), borderColor: hexToRgba(accent, 0.28) }]}>
                <Text style={[styles.tagHash, { color: accent }]}>#</Text>
                <Text style={[styles.tagLabel, { color: accent }]}>{t}</Text>
                <Text style={[styles.tagX, { color: accent }]}>×</Text>
              </View>
            </TouchableOpacity>
          ))}
          <TextInput
            style={styles.tagInput}
            value={tagInput}
            onChangeText={setTagInput}
            onSubmitEditing={addTag}
            placeholder="+ 태그 추가"
            placeholderTextColor="#9ca3af"
            returnKeyType="done"
          />
          </View>
        </View>

        {/* AI prompt */}
        <View style={[styles.promptCard, { backgroundColor: hexToRgba(accent, 0.1), borderColor: hexToRgba(accent, 0.2) }]}>
          <IconQuote color={accent} size={15} />
          <Text style={styles.promptText}>{PROMPTS[promptIndex]}</Text>
          <TouchableOpacity onPress={() => setPromptIndex((i) => (i + 1) % PROMPTS.length)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <IconRefresh color={accent} size={16} />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <TextInput
          style={styles.titleInput}
          value={title}
          onChangeText={setTitle}
          placeholder="제목을 입력하세요"
          placeholderTextColor="#d1d5db"
        />

        {/* Body */}
        <TextInput
          style={styles.bodyInput}
          value={body}
          onChangeText={setBody}
          placeholder="오늘의 일상을 자유롭게 p!ng해보세요..."
          placeholderTextColor="#d1d5db"
          multiline
          textAlignVertical="top"
        />

        {/* Photo */}
        {photo ? (
          <View style={styles.photoBox}>
            <Image source={{ uri: photo }} style={styles.photoImg} resizeMode="cover" />
            <TouchableOpacity style={styles.photoRemove} onPress={() => setPhoto(null)}>
              <Text style={styles.photoRemoveText}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.photoAddBtn} onPress={pickPhoto} disabled={uploading}>
            {uploading
              ? <ActivityIndicator color="#9ca3af" size="small" />
              : (
                <View style={styles.photoAddInner}>
                  <IconCamera color="#6b7280" size={16} />
                  <Text style={styles.photoAddText}>사진 추가</Text>
                </View>
              )}
          </TouchableOpacity>
        )}

        {/* Visibility */}
        <View style={styles.visRow}>
          <TouchableOpacity
            style={[styles.visBtn, visibility === 'private' && { borderColor: accent, backgroundColor: `${accent}0d` }]}
            onPress={() => setVisibility('private')}
          >
            <IconLock color={visibility === 'private' ? accent : '#6b7280'} size={15} />
            <Text style={[styles.visLabel, visibility === 'private' && { color: accent, fontWeight: '700' }]}>나만 보기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.visBtn, visibility === 'friends' && { borderColor: accent, backgroundColor: `${accent}0d` }]}
            onPress={() => setVisibility('friends')}
          >
            <IconUsers color={visibility === 'friends' ? accent : '#6b7280'} size={15} />
            <Text style={[styles.visLabel, visibility === 'friends' && { color: accent, fontWeight: '700' }]}>그룹 공개</Text>
          </TouchableOpacity>
        </View>
        {visibility === 'friends' && (
          <Text style={styles.visHint}>참여 중인 그룹의 피드에 이 p!ng가 공개돼요.</Text>
        )}

        {/* Folder card */}
        <TouchableOpacity style={styles.aiCard} onPress={() => setFolderModalOpen(true)} activeOpacity={0.85}>
          <View style={[styles.aiCardIcon, { backgroundColor: hexToRgba(accent, 0.12) }]}>
            <IconFolder color={accent} size={16} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.aiCardTitle}>폴더</Text>
            <Text style={styles.aiCardSub}>{currentFolder ? `${currentFolder.emoji} ${currentFolder.name}` : '폴더 없음'}</Text>
          </View>
          <IconChev dir="right" size={16} color="#9ca3af" />
        </TouchableOpacity>

        {/* AI comment card */}
        <TouchableOpacity style={styles.aiCard} onPress={() => setPersonaModalOpen(true)} activeOpacity={0.85}>
          <View style={[styles.aiCardIcon, { backgroundColor: hexToRgba(accent, 0.12) }]}>
            <IconMessage color={accent} size={16} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.aiCardTitle}>AI 코멘트</Text>
            <Text style={styles.aiCardSub}>{persona} · 24시간 뒤 도착</Text>
          </View>
          <IconChev dir="right" size={16} color="#9ca3af" />
        </TouchableOpacity>
      </ScrollView>

      {/* 페르소나 선택 모달 */}
      <Modal visible={personaModalOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPersonaModalOpen(false)}>
          <TouchableOpacity activeOpacity={1}>
            <View style={styles.personaModal}>
              <Text style={styles.personaModalTitle}>AI 코멘트 페르소나</Text>
              <Text style={styles.personaModalSub}>어떤 말투로 코멘트를 받을까요?</Text>
              <View style={styles.personaGrid}>
                {PERSONAS.map((p) => (
                  <TouchableOpacity
                    key={p.label}
                    style={[styles.personaCard, persona === p.label && { backgroundColor: accent, borderColor: accent }]}
                    onPress={() => { setPersona(p.label); setPersonaModalOpen(false); }}
                  >
                    <PersonaIcon persona={p.label} size={20} color={persona === p.label ? '#ffffff' : '#6b7280'} />
                    <Text style={[styles.personaLabel, persona === p.label && styles.personaLabelActive]}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 폴더 선택 모달 */}
      <Modal visible={folderModalOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setFolderModalOpen(false)}>
          <TouchableOpacity activeOpacity={1}>
            <View style={styles.personaModal}>
              <Text style={styles.personaModalTitle}>폴더 선택</Text>
              <Text style={styles.personaModalSub}>이 p!ng를 어떤 폴더에 넣을까요?</Text>
              <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                {allFolders.map((f) => {
                  const active = folder === f.id;
                  return (
                    <TouchableOpacity
                      key={f.id}
                      style={[styles.folderRow, active && { borderColor: accent, backgroundColor: hexToRgba(accent, 0.08) }]}
                      onPress={() => { setFolder(f.id); setFolderModalOpen(false); }}
                    >
                      <Text style={styles.folderRowEmoji}>{f.emoji}</Text>
                      <Text style={[styles.folderRowLabel, active && { color: accent, fontWeight: '700' }]}>{f.name}</Text>
                      {active && <Text style={[styles.folderRowCheck, { color: accent }]}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Calendar modal */}
      <Modal visible={calOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCalOpen(false)}>
          <TouchableOpacity activeOpacity={1}>
            <View style={styles.calModal}>
              <View style={styles.calHeader}>
                <TouchableOpacity onPress={() => setCalMonth((m) => Math.max(0, m - 1))} style={styles.calNavBtn}>
                  <IconChev dir="left" size={16} color="#6b7280" />
                </TouchableOpacity>
                <Text style={styles.calTitle}>{calYear}년 {MONTHS[calMonth]}</Text>
                <TouchableOpacity onPress={() => setCalMonth((m) => Math.min(11, m + 1))} style={styles.calNavBtn}>
                  <IconChev dir="right" size={16} color="#6b7280" />
                </TouchableOpacity>
              </View>
              <View style={styles.calDayRow}>
                {DAYS.map((d) => (
                  <Text key={d} style={styles.calDayLabel}>{d}</Text>
                ))}
              </View>
              <View style={styles.calGrid}>
                {calGrid.map((day, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.calCell,
                      day !== null && selectedDates.includes(day) && { backgroundColor: accent },
                    ]}
                    onPress={() => day && toggleDate(day)}
                    disabled={day === null}
                  >
                    {day !== null && (
                      <Text style={[
                        styles.calCellText,
                        selectedDates.includes(day) && styles.calCellTextActive,
                      ]}>
                        {day}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              {selectedDates.length > 0 && (
                <View style={styles.calFooter}>
                  <View style={styles.dateDotSmall} />
                  <Text style={styles.calFooterText}>{dateLabel()} 선택됨</Text>
                </View>
              )}
              <TouchableOpacity style={styles.calConfirmBtn} onPress={() => setCalOpen(false)}>
                <Text style={styles.calConfirmText}>확인</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  cancelText: { fontSize: 14, color: '#9ca3af' },
  headerTitle: { fontSize: 14, fontWeight: '700', color: '#1f2937' },
  headerRight: { alignItems: 'flex-end', gap: 6 },
  autoSaveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  autoSaveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80' },
  autoSaveText: { fontSize: 11, color: '#9ca3af' },
  saveBtn: { paddingHorizontal: 22, paddingVertical: 9, borderRadius: 999, backgroundColor: '#111827' },
  saveBtnText: { fontSize: 14, fontWeight: '800', color: '#ffffff' },
  content: { padding: 20, gap: 14, paddingBottom: 48 },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 9,
    backgroundColor: '#f3f4f6', borderRadius: 12, alignSelf: 'flex-start',
  },
  dateDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1f2937' },
  dateBtnText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  dateTagRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  tagRowInline: { flex: 1, paddingTop: 2 },
  tagRemovable: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 99,
  },
  tagHash: { fontSize: 11, color: '#9ca3af' },
  tagLabel: { fontSize: 11, color: '#4b5563' },
  tagX: { fontSize: 11, color: '#9ca3af', marginLeft: 2 },
  tagInput: {
    fontSize: 12, color: '#374151',
    borderWidth: 1, borderColor: '#d1d5db', borderStyle: 'dashed',
    borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4,
    minWidth: 80,
  },
  promptCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
  },
  promptQuote: { fontSize: 16, fontWeight: '800', marginTop: -2 },
  promptText: { fontSize: 13, color: '#4b5563', flex: 1, lineHeight: 19, fontWeight: '500' },
  promptRefresh: { fontSize: 17, fontWeight: '700' },
  titleInput: {
    fontSize: 18, fontWeight: '700', color: '#1f2937',
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingVertical: 6,
  },
  bodyCard: {
    backgroundColor: '#f9fafb', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb',
    padding: 14, minHeight: 140,
  },
  bodyInput: { fontSize: 15, color: '#374151', lineHeight: 24, minHeight: 180, paddingVertical: 4 },
  photoBox: { position: 'relative', borderRadius: 14, overflow: 'hidden' },
  photoImg: { width: '100%', height: 180 },
  photoRemove: {
    position: 'absolute', top: 8, right: 8,
    width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  photoRemoveText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  photoAddBtn: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderStyle: 'dashed',
    borderRadius: 14, paddingVertical: 16, alignItems: 'center',
  },
  photoAddInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  photoAddText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  visRow: { flexDirection: 'row', gap: 8 },
  visBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#f9fafb',
  },
  visEmoji: { fontSize: 15 },
  visLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  visHint: { fontSize: 11, color: '#9ca3af', marginTop: -4 },
  aiSection: { gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  aiTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aiDot: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: '#111827',
    alignItems: 'center', justifyContent: 'center',
  },
  aiDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffffff' },
  aiTitle: { fontSize: 13, fontWeight: '700', color: '#374151', flex: 1 },
  aiSub: { fontSize: 11, color: '#9ca3af' },
  personaRow: { flexDirection: 'row', gap: 8 },
  personaCard: {
    flexGrow: 1, flexBasis: '44%', minWidth: 72, alignItems: 'center', paddingVertical: 12,
    borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb', gap: 4,
  },
  personaCardActive: { backgroundColor: '#111827', borderColor: '#111827' },
  personaEmoji: { fontSize: 18 },
  personaLabel: { fontSize: 11, color: '#6b7280' },
  personaLabelActive: { color: '#ffffff' },
  folderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#f3f4f6',
    marginBottom: 8,
  },
  folderRowEmoji: { fontSize: 18, width: 22, textAlign: 'center' },
  folderRowLabel: { fontSize: 14, color: '#374151', flex: 1 },
  folderRowCheck: { fontSize: 15, fontWeight: '800' },
  // AI 코멘트 컴팩트 카드
  aiCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#f3f4f6',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, marginTop: 4,
  },
  aiCardIcon: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  aiCardTitle: { fontSize: 14, fontWeight: '700', color: '#1f2937' },
  aiCardSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  // 페르소나 모달
  personaModal: {
    backgroundColor: '#ffffff', borderRadius: 20, padding: 20, width: 300,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  personaModalTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  personaModalSub: { fontSize: 12, color: '#9ca3af', marginTop: 3, marginBottom: 16 },
  personaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  // Calendar modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  calModal: {
    backgroundColor: '#ffffff', borderRadius: 20, padding: 20,
    width: 300,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  calNavBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  calTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937' },
  calDayRow: { flexDirection: 'row', marginBottom: 4 },
  calDayLabel: { flex: 1, textAlign: 'center', fontSize: 11, color: '#9ca3af', paddingVertical: 2 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: {
    width: '14.28%', height: 36,
    alignItems: 'center', justifyContent: 'center', borderRadius: 8,
  },
  calCellActive: { backgroundColor: '#111827' },
  calCellText: { fontSize: 13, color: '#374151' },
  calCellTextActive: { color: '#ffffff', fontWeight: '600' },
  calFooter: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingTop: 10, marginTop: 6, borderTopWidth: 1, borderTopColor: '#f3f4f6',
  },
  dateDotSmall: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#1f2937' },
  calFooterText: { fontSize: 12, color: '#6b7280' },
  calConfirmBtn: {
    marginTop: 12, backgroundColor: '#111827', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  calConfirmText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
});
