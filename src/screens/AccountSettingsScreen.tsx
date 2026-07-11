import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  SafeAreaView, TextInput, Alert, Modal, ActivityIndicator, Platform,
} from 'react-native';
import TouchableOpacity from '../components/Touchable';
import { useNavigation } from '@react-navigation/native';
import IconChev from '../components/icons/IconChev';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { changePassword, deleteAccount, getMe, getCachedMe, saveProfile } from '../api';
import { notify } from '../notify';
import { useThemedStyles } from '../theme/themed';
import SheetWrap from '../components/SheetWrap';

function Row({ label, value, onPress }: { label: string; value?: string; onPress?: () => void }) {
  const styles = useThemedStyles(lightStyles);
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={!onPress}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>
        {value && <Text style={styles.rowValue}>{value}</Text>}
        {onPress && <IconChev dir="right" size={16} color="#d1d5db" />}
      </View>
    </TouchableOpacity>
  );
}

export default function AccountSettingsScreen() {
  const styles = useThemedStyles(lightStyles);
  const navigation = useNavigation();
  const { accent } = useTheme();
  const { logout, token, email: authEmail } = useAuth();

  const emailPrefix = (authEmail ?? '').split('@')[0] || '사용자';
  const [name, setName] = useState(() => getCachedMe()?.display_name || emailPrefix);
  const [username, setUsername] = useState(() => getCachedMe()?.username || emailPrefix);
  const email = authEmail ?? '-';
  // 이름/아이디 편집 모달 (비밀번호 변경 모달과 같은 형태)
  const [editField, setEditField] = useState<null | 'name' | 'username'>(null);
  const [draft, setDraft] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // DB에 저장된 이름/아이디 불러오기
  useEffect(() => {
    if (!token) return;
    getMe().then((me) => {
      if (me.display_name) setName(me.display_name);
      if (me.username) setUsername(me.username);
    }).catch(() => {});
  }, [token]);

  function openEdit(field: 'name' | 'username') {
    setDraft(field === 'name' ? name : username);
    setEditField(field);
  }

  /** 이름/아이디 저장 → DB (성공해야 모달 닫힘) */
  async function commitEdit() {
    if (!editField) return;
    const v = draft.trim();
    if (!v) return notify(editField === 'name' ? '이름을 입력해 주세요.' : '아이디를 입력해 주세요.');
    setEditLoading(true);
    try {
      if (editField === 'name') {
        await saveProfile({ display_name: v });
        setName(v);
        notify('이름이 변경됐어요.');
      } else {
        await saveProfile({ username: v });
        setUsername(v);
        notify('아이디가 변경됐어요.');
      }
      setEditField(null);
    } catch (e: any) {
      notify(e?.message ?? '저장에 실패했어요.');
    } finally {
      setEditLoading(false);
    }
  }

  // 비밀번호 변경 모달
  const [pwOpen, setPwOpen] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [delLoading, setDelLoading] = useState(false);
  const [delOpen, setDelOpen] = useState(false);

  async function submitPassword() {
    if (newPw.length < 6) return notify('비밀번호는 6자 이상이어야 해요.');
    if (newPw !== confirmPw) return notify('비밀번호가 서로 일치하지 않아요.');
    setPwLoading(true);
    try {
      await changePassword(newPw);
      setPwOpen(false);
      setNewPw('');
      setConfirmPw('');
      notify('비밀번호가 변경됐어요.');
    } catch (e: any) {
      notify(e?.message ?? '비밀번호 변경에 실패했어요.');
    } finally {
      setPwLoading(false);
    }
  }

  async function runDelete() {
    setDelLoading(true);
    try {
      await deleteAccount();
      logout(); // 삭제 후 로그아웃 → 로그인 화면
    } catch (e: any) {
      setDelLoading(false);
      notify(e?.message ?? '계정 삭제에 실패했어요.');
    }
  }

  function handleDeleteAccount() {
    setDelOpen(true); // 폰 프레임 안 인앱 확인 다이얼로그
  }

  function handleLogout() {
    // 즉시 로그아웃 (확인창이 탭을 막는 문제 방지)
    logout();
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <IconChev dir="left" size={18} color="#9ca3af" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>계정 설정</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* 내 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>내 정보</Text>
          <View style={styles.card}>
            <Row label="이름" value={name} onPress={() => openEdit('name')} />
            <View style={styles.divider} />
            <Row label="아이디" value={`@${username}`} onPress={() => openEdit('username')} />
            <View style={styles.divider} />
            <Row label="이메일" value={email} />
            <View style={styles.divider} />
            <Row label="비밀번호 변경" onPress={() => setPwOpen(true)} />
          </View>
        </View>

        {/* 앱 설정 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>앱 설정</Text>
          <View style={styles.card}>
            <Row label="언어" value="한국어" />
            <View style={styles.divider} />
            <Row label="버전" value="1.0.0" />
          </View>
        </View>

        {/* 위험 구역 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>계정 관리</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={handleLogout}>
              <Text style={styles.rowLabelDanger}>로그아웃</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.row} onPress={handleDeleteAccount} disabled={delLoading}>
              <Text style={[styles.rowLabelDanger, { color: '#ef4444' }]}>계정 삭제</Text>
              {delLoading
                ? <ActivityIndicator size="small" color="#ef4444" />
                : <Text style={styles.rowDesc2}>탈퇴 시 모든 데이터가 삭제돼요</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* 이름/아이디 변경 모달 */}
      {editField && (
      <SheetWrap style={styles.overlayWrap}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editField === 'name' ? '이름 변경' : '아이디 변경'}</Text>
            <View style={styles.modalInputRow}>
              {editField === 'username' && <Text style={styles.atSign}>@</Text>}
              <TextInput
                style={styles.modalInputFlex}
                value={draft}
                onChangeText={setDraft}
                placeholder={editField === 'name' ? '이름' : '아이디'}
                placeholderTextColor="#9ca3af"
                autoFocus
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={commitEdit}
                maxLength={30}
              />
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setEditField(null)}
                disabled={editLoading}
              >
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: accent }, editLoading && { opacity: 0.6 }]}
                onPress={commitEdit}
                disabled={editLoading}
              >
                {editLoading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.modalConfirmText}>저장</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SheetWrap>
      )}

      {/* 비밀번호 변경 모달 */}
      {pwOpen && (
      <SheetWrap style={styles.overlayWrap}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>비밀번호 변경</Text>
            <TextInput
              style={styles.modalInput}
              value={newPw}
              onChangeText={setNewPw}
              placeholder="새 비밀번호 (6자 이상)"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              autoFocus
            />
            <TextInput
              style={styles.modalInput}
              value={confirmPw}
              onChangeText={setConfirmPw}
              placeholder="새 비밀번호 확인"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              onSubmitEditing={submitPassword}
              returnKeyType="done"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => { setPwOpen(false); setNewPw(''); setConfirmPw(''); }}
                disabled={pwLoading}
              >
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: accent }, pwLoading && { opacity: 0.6 }]}
                onPress={submitPassword}
                disabled={pwLoading}
              >
                {pwLoading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.modalConfirmText}>변경</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SheetWrap>
      )}

      {/* 계정 삭제 확인 (폰 프레임 안) */}
      {delOpen && (
      <SheetWrap style={styles.overlayWrap}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>계정을 삭제할까요?</Text>
            <Text style={styles.modalMsg}>모든 p!ng와 계정이 영구적으로 삭제되며 복구할 수 없어요.</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setDelOpen(false)}
                disabled={delLoading}
              >
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: '#ef4444' }, delLoading && { opacity: 0.6 }]}
                onPress={runDelete}
                disabled={delLoading}
              >
                {delLoading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.modalConfirmText}>삭제</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SheetWrap>
      )}
    </SafeAreaView>
  );
}

const lightStyles = StyleSheet.create({
  overlayWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6', backgroundColor: '#ffffff',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  content: { padding: 16, gap: 20, paddingBottom: 48 },
  section: { gap: 8 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: '#9ca3af', paddingHorizontal: 4 },
  card: {
    backgroundColor: '#ffffff', borderRadius: 16,
    borderWidth: 1, borderColor: '#f3f4f6',
    paddingHorizontal: 16,
  },
  divider: { height: 1, backgroundColor: '#f9fafb' },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, gap: 12,
  },
  rowLabel: { fontSize: 14, fontWeight: '500', color: '#111827' },
  rowLabelDanger: { fontSize: 14, fontWeight: '600', color: '#374151' },
  rowDesc: { fontSize: 12, color: '#9ca3af', marginTop: 2, flex: 1 },
  rowDesc2: { fontSize: 12, color: '#9ca3af' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowValue: { fontSize: 14, color: '#9ca3af' },
  atSign: { fontSize: 14, color: '#9ca3af' },
  modalInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14,
  },
  modalInputFlex: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#111827' },
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center', padding: 28,
  },
  modalCard: {
    width: '100%', maxWidth: 360, backgroundColor: '#ffffff',
    borderRadius: 18, padding: 22, gap: 12,
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 2 },
  modalMsg: { fontSize: 13, color: '#6b7280', lineHeight: 20, marginTop: 6, marginBottom: 4 },
  modalInput: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#111827',
  },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 6 },
  modalCancel: {
    flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  modalConfirm: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  modalConfirmText: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
});
