import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useTheme, hexToRgba } from '../context/ThemeContext';
import { useGroups } from '../context/GroupsContext';
import { createGroup, joinGroup } from '../api';
import { IconUsers } from '../components/icons/Line';
import { useThemedStyles } from '../theme/themed';
import SheetWrap from '../components/SheetWrap';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// 폰 프레임 안에 뜨는 결과 다이얼로그 상태
type Result =
  | { type: 'created'; name: string; code: string }
  | { type: 'joined'; name: string }
  | { type: 'error'; message: string };

export default function GroupCreateScreen() {
  const styles = useThemedStyles(lightStyles);
  const navigation = useNavigation<Nav>();
  const { accent } = useTheme();
  const { refresh } = useGroups();
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  // 초대 코드 복사 (웹: navigator.clipboard, 네이티브: 미지원 시 조용히 무시)
  async function copyCode(code: string) {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {
      // 무시
    }
  }

  // 확인 버튼: 성공이면 뒤로가기, 에러면 닫기만
  function closeResult() {
    const wasSuccess = result?.type === 'created' || result?.type === 'joined';
    setResult(null);
    if (wasSuccess) navigation.goBack();
  }

  // 서버에 실제 그룹 생성 → 초대 코드 발급
  async function handleCreate() {
    if (!name.trim() || loading) return;
    setLoading(true);
    try {
      const group = await createGroup(name.trim());
      await refresh();
      setResult({ type: 'created', name: group.name, code: group.invite_code });
    } catch (e: any) {
      setResult({ type: 'error', message: e?.message ?? '그룹 생성에 실패했습니다.' });
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
      setResult({ type: 'joined', name: group.name });
    } catch (e: any) {
      setResult({ type: 'error', message: e?.message ?? '참여에 실패했습니다. 코드를 확인해주세요.' });
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

      {result && (
        <SheetWrap style={styles.overlayWrap}>
          <TouchableOpacity style={styles.overlayBg} activeOpacity={1} onPress={closeResult} />
          <View style={styles.dialog}>
            {result.type === 'error' ? (
              <>
                <Text style={styles.dialogTitle}>앗, 문제가 생겼어요</Text>
                <Text style={styles.dialogMsg}>{result.message}</Text>
                <TouchableOpacity style={[styles.dialogBtn, { backgroundColor: accent }]} onPress={closeResult}>
                  <Text style={styles.dialogBtnText}>확인</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={[styles.dialogIcon, { backgroundColor: hexToRgba(accent, 0.12) }]}>
                  <IconUsers size={26} color={accent} />
                </View>
                <Text style={styles.dialogTitle}>
                  {result.type === 'created' ? '그룹이 만들어졌어요!' : '그룹에 참여했어요!'}
                </Text>
                <Text style={styles.dialogMsg}>
                  {result.type === 'created'
                    ? `'${result.name}' 그룹이 생성됐어요. 친구에게 아래 초대 코드를 공유하면 함께 쓸 수 있어요.`
                    : `이제 '${result.name}' 그룹 피드에서 함께 볼 수 있어요.`}
                </Text>
                {result.type === 'created' && (
                  <View style={styles.codeBox}>
                    <Text style={[styles.codeText, { color: accent }]}>{result.code}</Text>
                    <TouchableOpacity
                      style={[styles.copyBtn, { borderColor: hexToRgba(accent, 0.4) }]}
                      onPress={() => copyCode(result.code)}
                    >
                      <Text style={[styles.copyBtnText, { color: accent }]}>{copied ? '복사됨 ✓' : '복사'}</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <TouchableOpacity style={[styles.dialogBtn, { backgroundColor: accent }]} onPress={closeResult}>
                  <Text style={styles.dialogBtnText}>확인</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </SheetWrap>
      )}
    </SafeAreaView>
  );
}

const lightStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  cancelText: { fontSize: 14, color: '#9ca3af', width: 40 },
  headerTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  createBtn: { backgroundColor: '#111827', borderRadius: 9, paddingHorizontal: 14, paddingVertical: 7, minWidth: 52, alignItems: 'center' },
  createBtnDisabled: { backgroundColor: '#e5e7eb' },
  createBtnText: { fontSize: 13, fontWeight: '600', color: '#ffffff' },
  createBtnTextDisabled: { color: '#9ca3af' },
  content: { padding: 24, gap: 28, paddingBottom: 60 },
  topSection: { alignItems: 'center', gap: 16 },
  emojiPreview: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
  },
  emojiPreviewText: { fontSize: 38 },
  nameInput: {
    width: '100%', fontSize: 20, fontWeight: '600', color: '#111827',
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
  joinBtnText: { fontSize: 13, fontWeight: '600', color: '#ffffff' },

  // 폰 프레임 안에 뜨는 결과 다이얼로그
  overlayWrap: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', padding: 28,
  },
  overlayBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  dialog: {
    width: '100%', backgroundColor: '#fff', borderRadius: 22,
    padding: 24, alignItems: 'center', gap: 10,
  },
  dialogIcon: {
    width: 56, height: 56, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', marginBottom: 2,
  },
  dialogTitle: { fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center' },
  dialogMsg: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  codeBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#f9fafb', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb',
    paddingVertical: 12, paddingHorizontal: 16, marginTop: 4,
  },
  codeText: { fontSize: 22, fontWeight: '700', letterSpacing: 3 },
  copyBtn: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  copyBtnText: { fontSize: 12, fontWeight: '600' },
  dialogBtn: {
    width: '100%', borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', marginTop: 10,
  },
  dialogBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
