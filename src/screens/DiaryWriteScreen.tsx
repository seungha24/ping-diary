import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Audio } from 'expo-av';
import Tag from '../components/Tag';
import IconChev from '../components/icons/IconChev';
import { PERSONAS, MONTHS, DAYS } from '../data/types';

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
  const today = new Date();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [persona, setPersona] = useState('선생님');
  const [calOpen, setCalOpen] = useState(false);
  const [calYear] = useState(2026);
  const [calMonth, setCalMonth] = useState(5);
  const [selectedDates, setSelectedDates] = useState<number[]>([today.getDate()]);

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
        <Text style={styles.headerTitle}>오늘의 일기</Text>
        <View style={styles.headerRight}>
          <View style={styles.autoSaveBadge}>
            <View style={styles.autoSaveDot} />
            <Text style={styles.autoSaveText}>자동저장</Text>
          </View>
          <TouchableOpacity style={styles.saveBtn} onPress={() => { playPing(); navigation.goBack(); }}>
            <Text style={styles.saveBtnText}>p!ng</Text>
          </TouchableOpacity>
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
              <View style={styles.tagRemovable}>
                <Text style={styles.tagHash}>#</Text>
                <Text style={styles.tagLabel}>{t}</Text>
                <Text style={styles.tagX}>×</Text>
              </View>
            </TouchableOpacity>
          ))}
          <TextInput
            style={styles.tagInput}
            value={tagInput}
            onChangeText={setTagInput}
            onSubmitEditing={addTag}
            placeholder="# 태그 추가"
            placeholderTextColor="#9ca3af"
            returnKeyType="done"
          />
        </View>

        {/* AI prompt */}
        <View style={styles.promptCard}>
          <Text style={styles.promptQ}>Q.</Text>
          <Text style={styles.promptText}>오늘 가장 기억에 남는 순간은 무엇인가요?</Text>
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
        <View style={styles.bodyCard}>
          <TextInput
            style={styles.bodyInput}
            value={body}
            onChangeText={setBody}
            placeholder="오늘의 일상을 자유롭게 p!ng해보세요..."
            placeholderTextColor="#d1d5db"
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* AI comment section */}
        <View style={styles.aiSection}>
          <View style={styles.aiTitleRow}>
            <View style={styles.aiDot}><View style={styles.aiDotInner} /></View>
            <Text style={styles.aiTitle}>AI 코멘트</Text>
            <Text style={styles.aiSub}>내일 확인 가능</Text>
          </View>
          <View style={styles.personaRow}>
            {PERSONAS.map((p) => (
              <TouchableOpacity
                key={p.label}
                style={[styles.personaCard, persona === p.label && styles.personaCardActive]}
                onPress={() => setPersona(p.label)}
              >
                <Text style={styles.personaEmoji}>{p.emoji}</Text>
                <Text style={[styles.personaLabel, persona === p.label && styles.personaLabelActive]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

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
                      day !== null && selectedDates.includes(day) && styles.calCellActive,
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  autoSaveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: '#f3f4f6', borderRadius: 8,
  },
  autoSaveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80' },
  autoSaveText: { fontSize: 11, color: '#6b7280' },
  saveBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 9, backgroundColor: '#111827' },
  saveBtnText: { fontSize: 12, fontWeight: '700', color: '#ffffff' },
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
    flexDirection: 'row', gap: 6,
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  promptQ: { fontSize: 12, color: '#9ca3af', marginTop: 1 },
  promptText: { fontSize: 12, color: '#4b5563', flex: 1, lineHeight: 18 },
  titleInput: {
    fontSize: 18, fontWeight: '700', color: '#1f2937',
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingVertical: 6,
  },
  bodyCard: {
    backgroundColor: '#f9fafb', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb',
    padding: 14, minHeight: 140,
  },
  bodyInput: { fontSize: 14, color: '#374151', lineHeight: 22, minHeight: 120 },
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
