import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Group } from '../data/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const EMOJI_OPTIONS = [
  '👨‍👩‍👧‍👦', '✈️', '📚', '🏃', '🎮', '🍕',
  '🎵', '📸', '💪', '🌿', '🎨', '⚽',
  '🐾', '🌙', '☕', '🎯', '🏕️', '🎬',
];

export default function GroupCreateScreen() {
  const navigation = useNavigation<Nav>();
  const [iconMode, setIconMode] = useState<'emoji' | 'photo'>('emoji');
  const [emoji, setEmoji] = useState('👨‍👩‍👧‍👦');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [memberInput, setMemberInput] = useState('');
  const [members, setMembers] = useState<string[]>([]);

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setIconMode('photo');
    }
  }

  function addMember() {
    const m = memberInput.trim();
    if (m && !members.includes(m)) setMembers([...members, m]);
    setMemberInput('');
  }

  function removeMember(m: string) {
    setMembers(members.filter((x) => x !== m));
  }

  function handleCreate() {
    if (!name.trim()) return;
    const newGroup: Group = {
      name: name.trim(),
      emoji,
      photo: iconMode === 'photo' && photoUri ? photoUri : undefined,
      members: members.length > 0 ? members : ['나'],
      entries: [],
    };
    // 그룹 화면으로 바로 이동 (홈의 백스택 위에)
    navigation.replace('Group', { group: newGroup });
  }

  const canCreate = name.trim().length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>취소</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>새 그룹</Text>
          <TouchableOpacity
            style={[styles.createBtn, !canCreate && styles.createBtnDisabled]}
            onPress={handleCreate}
            disabled={!canCreate}
          >
            <Text style={[styles.createBtnText, !canCreate && styles.createBtnTextDisabled]}>완료</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 미리보기 + 이름 */}
          <View style={styles.topSection}>
            <View style={styles.previewWrap}>
              {iconMode === 'photo' && photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
              ) : (
                <View style={styles.emojiPreview}>
                  <Text style={styles.emojiPreviewText}>{emoji}</Text>
                </View>
              )}
            </View>
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="그룹 이름을 입력하세요"
              placeholderTextColor="#d1d5db"
              maxLength={20}
              autoFocus
            />
          </View>

          {/* 아이콘 모드 탭 */}
          <View style={styles.section}>
            <View style={styles.iconModeTabs}>
              <TouchableOpacity
                style={[styles.iconModeTab, iconMode === 'emoji' && styles.iconModeTabActive]}
                onPress={() => setIconMode('emoji')}
              >
                <Text style={[styles.iconModeTabText, iconMode === 'emoji' && styles.iconModeTabTextActive]}>
                  😊 이모지
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconModeTab, iconMode === 'photo' && styles.iconModeTabActive]}
                onPress={pickPhoto}
              >
                <Text style={[styles.iconModeTabText, iconMode === 'photo' && styles.iconModeTabTextActive]}>
                  📷 사진
                </Text>
              </TouchableOpacity>
            </View>

            {iconMode === 'emoji' ? (
              <View style={styles.emojiGrid}>
                {EMOJI_OPTIONS.map((e) => (
                  <TouchableOpacity
                    key={e}
                    style={[styles.emojiCell, emoji === e && styles.emojiCellActive]}
                    onPress={() => setEmoji(e)}
                  >
                    <Text style={styles.emojiCellText}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <TouchableOpacity style={styles.photoChangeBtn} onPress={pickPhoto}>
                <Text style={styles.photoChangeBtnText}>
                  {photoUri ? '사진 변경하기' : '앨범에서 사진 선택'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 멤버 초대 */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>멤버 초대</Text>
            <View style={styles.memberInputRow}>
              <TextInput
                style={styles.memberInput}
                value={memberInput}
                onChangeText={setMemberInput}
                onSubmitEditing={addMember}
                placeholder="이름 입력 후 추가"
                placeholderTextColor="#9ca3af"
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[styles.addBtn, !memberInput.trim() && styles.addBtnDisabled]}
                onPress={addMember}
                disabled={!memberInput.trim()}
              >
                <Text style={styles.addBtnText}>추가</Text>
              </TouchableOpacity>
            </View>

            {members.length > 0 && (
              <View style={styles.memberChips}>
                {members.map((m) => (
                  <TouchableOpacity key={m} style={styles.memberChip} onPress={() => removeMember(m)}>
                    <Text style={styles.memberChipAvatar}>👤</Text>
                    <Text style={styles.memberChipName}>{m}</Text>
                    <Text style={styles.memberChipX}>×</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {members.length === 0 && (
              <Text style={styles.memberHint}>멤버를 추가하지 않으면 나 혼자 시작해요</Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  cancelText: { fontSize: 14, color: '#9ca3af', width: 40 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  createBtn: { backgroundColor: '#111827', borderRadius: 9, paddingHorizontal: 14, paddingVertical: 7 },
  createBtnDisabled: { backgroundColor: '#e5e7eb' },
  createBtnText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
  createBtnTextDisabled: { color: '#9ca3af' },

  content: { padding: 24, gap: 28, paddingBottom: 60 },

  topSection: { alignItems: 'center', gap: 16 },
  previewWrap: { width: 80, height: 80 },
  emojiPreview: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
  },
  emojiPreviewText: { fontSize: 38 },
  photoPreview: { width: 80, height: 80, borderRadius: 24 },
  nameInput: {
    width: '100%', fontSize: 20, fontWeight: '700', color: '#111827',
    borderBottomWidth: 2, borderBottomColor: '#e5e7eb',
    paddingVertical: 8, textAlign: 'center',
  },

  section: { gap: 12 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: '#9ca3af', letterSpacing: 0.5 },

  iconModeTabs: {
    flexDirection: 'row', backgroundColor: '#f3f4f6',
    borderRadius: 12, padding: 3, gap: 2,
  },
  iconModeTab: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  iconModeTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
  iconModeTabText: { fontSize: 13, color: '#9ca3af', fontWeight: '500' },
  iconModeTabTextActive: { color: '#111827', fontWeight: '700' },

  photoChangeBtn: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderStyle: 'dashed',
    borderRadius: 14, paddingVertical: 20, alignItems: 'center',
  },
  photoChangeBtnText: { fontSize: 14, color: '#6b7280', fontWeight: '500' },

  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiCell: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: '#f9fafb', borderWidth: 1.5, borderColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center',
  },
  emojiCellActive: { borderColor: '#111827', backgroundColor: '#f3f4f6' },
  emojiCellText: { fontSize: 24 },

  memberInputRow: { flexDirection: 'row', gap: 8 },
  memberInput: {
    flex: 1, fontSize: 14, color: '#111827',
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#f9fafb',
  },
  addBtn: {
    backgroundColor: '#111827', borderRadius: 12,
    paddingHorizontal: 16, justifyContent: 'center',
  },
  addBtnDisabled: { backgroundColor: '#e5e7eb' },
  addBtnText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },

  memberChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  memberChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#f3f4f6', borderRadius: 99,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  memberChipAvatar: { fontSize: 14 },
  memberChipName: { fontSize: 13, color: '#374151', fontWeight: '500' },
  memberChipX: { fontSize: 14, color: '#9ca3af' },

  memberHint: { fontSize: 12, color: '#d1d5db', textAlign: 'center', marginTop: 4 },
});
