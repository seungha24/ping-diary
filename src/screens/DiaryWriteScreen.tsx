import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, Modal, Image, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import Tag from '../components/Tag';
import IconChev from '../components/icons/IconChev';
import { PERSONAS, MONTHS, DAYS } from '../data/types';
import { useTheme, hexToRgba } from '../context/ThemeContext';
import { useEntries } from '../context/EntriesContext';
import { uploadPhoto } from '../api';
import { notify } from '../notify';
import { RootStackParamList } from '../navigation/RootNavigator';

type WriteRoute = RouteProp<RootStackParamList, 'DiaryWrite'>;

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
  const { addEntry, updateEntry } = useEntries();
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
  const [calYear] = useState(2026);
  const [calMonth, setCalMonth] = useState(5);
  const [selectedDates, setSelectedDates] = useState<number[]>(editEntry?.dates ?? [today.getDate()]);

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
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: accent }]}
            onPress={() => {
              if (editEntry) {
                updateEntry({ ...editEntry, title, body, tags, persona, dates: selectedDates, photo, visibility });
              } else {
                addEntry({
                  id: Date.now(),
                  title,
                  body,
                  tags,
                  persona,
                  dates: selectedDates,
                  photo,
                  visibility,
                  createdAt: new Date().toISOString(),
                });
              }
              playPing();
              navigation.goBack();
            }}
          >
            <Text style={styles.saveBtnText}>{editEntry ? '저장' : 'p!ng'}</Text>
          </TouchableOpacity>
          <View style={styles.autoSaveBadge}>
            <View style={styles.autoSaveDot} />
            <Text style={styles.autoSaveText}>자동저장됨</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Date picker button */}
        <TouchableOpacity style={styles.dateBtn} onPress={() => setCalOpen(true)}>
          <View style={styles.dateDot} />
          <Text style={styles.dateBtnText}>{dateLabel()}</Text>
          <IconChev dir="right" size={14} color="#9ca3af" />
        </TouchableOpacity>

        {/* Tags */}
        <View style={styles.tagRow}>
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

        {/* AI prompt */}
        <View style={[styles.promptCard, { backgroundColor: hexToRgba(accent, 0.1), borderColor: hexToRgba(accent, 0.2) }]}>
          <Text style={[styles.promptQuote, { color: accent }]}>❝</Text>
          <Text style={styles.promptText}>{PROMPTS[promptIndex]}</Text>
          <TouchableOpacity onPress={() => setPromptIndex((i) => (i + 1) % PROMPTS.length)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.promptRefresh, { color: accent }]}>↻</Text>
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
              : <Text style={styles.photoAddText}>📷 사진 추가</Text>}
          </TouchableOpacity>
        )}

        {/* Visibility */}
        <View style={styles.visRow}>
          <TouchableOpacity
            style={[styles.visBtn, visibility === 'private' && { borderColor: accent, backgroundColor: `${accent}0d` }]}
            onPress={() => setVisibility('private')}
          >
            <Text style={styles.visEmoji}>🔒</Text>
            <Text style={[styles.visLabel, visibility === 'private' && { color: accent, fontWeight: '700' }]}>나만 보기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.visBtn, visibility === 'friends' && { borderColor: accent, backgroundColor: `${accent}0d` }]}
            onPress={() => setVisibility('friends')}
          >
            <Text style={styles.visEmoji}>👥</Text>
            <Text style={[styles.visLabel, visibility === 'friends' && { color: accent, fontWeight: '700' }]}>그룹 공개</Text>
          </TouchableOpacity>
        </View>
        {visibility === 'friends' && (
          <Text style={styles.visHint}>참여 중인 그룹의 피드에 이 p!ng가 공개돼요.</Text>
        )}

        {/* AI comment card */}
        <TouchableOpacity style={styles.aiCard} onPress={() => setPersonaModalOpen(true)} activeOpacity={0.85}>
          <View style={[styles.aiCardIcon, { backgroundColor: hexToRgba(accent, 0.12) }]}>
            <Text style={{ fontSize: 15 }}>💬</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.aiCardTitle}>AI 코멘트</Text>
            <Text style={styles.aiCardSub}>
              {PERSONAS.find((p) => p.label === persona)?.emoji} {persona} · 24시간 뒤 도착
            </Text>
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
                    <Text style={styles.personaEmoji}>{p.emoji}</Text>
                    <Text style={[styles.personaLabel, persona === p.label && styles.personaLabelActive]}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
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
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  cancelText: { fontSize: 14, color: '#9ca3af' },
  headerTitle: { fontSize: 14, fontWeight: '700', color: '#1f2937' },
  headerRight: { alignItems: 'flex-end', gap: 5 },
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
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
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
    flex: 1, alignItems: 'center', paddingVertical: 10,
    borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb', gap: 4,
  },
  personaCardActive: { backgroundColor: '#111827', borderColor: '#111827' },
  personaEmoji: { fontSize: 18 },
  personaLabel: { fontSize: 11, color: '#6b7280' },
  personaLabelActive: { color: '#ffffff' },
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
