import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useTheme } from '../context/ThemeContext';
import { useGroups } from '../context/GroupsContext';
import { createGroup, joinGroup } from '../api';
import { IconUsers } from '../components/icons/Line';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** 웹/네이티브 공통 알림 */
function notify(message: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(message);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('react-native').Alert.alert(message);
  }
}

export default function GroupCreateScreen() {
  const navigation = useNavigation<Nav>();
  const { accent } = useTheme();
  const { refresh } = useGroups();
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  // 서버에 실제 그룹 생성 → 초대 코드 발급
  async function handleCreate() {
    if (!name.trim() || loading) return;
    setLoading(true);
    try {
      const group = await createGroup(name.trim());
      await refresh();
      notify(`'${group.name}' 그룹이 만들어졌어요!\n초대 코드: ${group.invite_code}\n\n친구에게 이 코드를 공유하면 함께 쓸 수 있어요.`);
      navigation.goBack();
    } catch (e: any) {
      notify(e?.message ?? '그룹 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  // 초대 코드로 기존 그룹 참여
  async function handleJoin() {
    const code = inviteCode.trim();
    if (!code || loading) return;
    setLoading(true);
    try {
      const group = await joinGroup(code);
      await refresh();
      notify(`'${group.name}' 그룹에 참여했어요!`);
      navigation.goBack();
    } catch (e: any) {
      notify(e?.message ?? '참여에 실패했습니다. 코드를 확인해주세요.');
    } finally {
      setLoading(false);
    }
  }

  const canCreate = name.trim().length > 0 && !loading;

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
            style={[styles.createBtn, { backgroundColor: accent }, !canCreate && styles.createBtnDisabled]}
            onPress={handleCreate}
            disabled={!canCreate}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={[styles.createBtnText, !canCreate && styles.createBtnTextDisabled]}>완료</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 그룹 이름 */}
          <View style={styles.topSection}>
            <View style={styles.emojiPreview}>
              <IconUsers size={30} color="#9ca3af" />
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
            <Text style={styles.hint}>그룹을 만들면 초대 코드가 발급돼요.{'\n'}코드를 공유하면 친구가 함께 참여할 수 있어요.</Text>
          </View>

          {/* 초대 코드로 참여 */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>이미 초대 코드가 있나요?</Text>
            <View style={styles.joinRow}>
              <TextInput
                style={styles.joinInput}
                value={inviteCode}
                onChangeText={setInviteCode}
                placeholder="초대 코드 입력 (예: 9D42PC)"
                placeholderTextColor="#9ca3af"
                autoCapitalize="characters"
                returnKeyType="done"
                onSubmitEditing={handleJoin}
              />
              <TouchableOpacity
                style={[styles.joinBtn, (!inviteCode.trim() || loading) && styles.joinBtnDisabled]}
                onPress={handleJoin}
                disabled={!inviteCode.trim() || loading}
              >
                <Text style={styles.joinBtnText}>참여</Text>
              </TouchableOpacity>
            </View>
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
  createBtn: { backgroundColor: '#111827', borderRadius: 9, paddingHorizontal: 14, paddingVertical: 7, minWidth: 52, alignItems: 'center' },
  createBtnDisabled: { backgroundColor: '#e5e7eb' },
  createBtnText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
  createBtnTextDisabled: { color: '#9ca3af' },
  content: { padding: 24, gap: 28, paddingBottom: 60 },
  topSection: { alignItems: 'center', gap: 16 },
  emojiPreview: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
  },
  emojiPreviewText: { fontSize: 38 },
  nameInput: {
    width: '100%', fontSize: 20, fontWeight: '700', color: '#111827',
    borderBottomWidth: 2, borderBottomColor: '#e5e7eb',
    paddingVertical: 8, textAlign: 'center',
  },
  hint: { fontSize: 12, color: '#9ca3af', textAlign: 'center', lineHeight: 18 },
  section: { gap: 12 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: '#9ca3af', letterSpacing: 0.5 },
  joinRow: { flexDirection: 'row', gap: 8 },
  joinInput: {
    flex: 1, fontSize: 14, color: '#111827',
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#f9fafb',
  },
  joinBtn: {
    backgroundColor: '#111827', borderRadius: 12,
    paddingHorizontal: 16, justifyContent: 'center',
  },
  joinBtnDisabled: { backgroundColor: '#e5e7eb' },
  joinBtnText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
});
