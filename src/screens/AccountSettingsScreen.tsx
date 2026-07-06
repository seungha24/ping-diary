import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, TextInput, Switch, Alert, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import IconChev from '../components/icons/IconChev';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

function Row({ label, value, onPress }: { label: string; value?: string; onPress?: () => void }) {
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
  const navigation = useNavigation();
  const { accent } = useTheme();
  const { logout } = useAuth();

  const [name, setName] = useState('김지연');
  const [username, setUsername] = useState('jiyeon_ping');
  const [email] = useState('jiyeon@example.com');
  const [editingName, setEditingName] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [privateMode, setPrivateMode] = useState(false);

  function handleDeleteAccount() {
    Alert.alert(
      '계정 삭제',
      '정말 삭제하시겠어요? 모든 데이터가 영구적으로 삭제되며 복구할 수 없어요.',
      [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: () => {} },
      ]
    );
  }

  function handleLogout() {
    // 웹에서는 Alert 버튼 콜백이 동작하지 않을 수 있어 window.confirm으로 분기
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (typeof window !== 'undefined' && window.confirm('로그아웃하시겠어요?')) logout();
      return;
    }
    Alert.alert('로그아웃', '로그아웃하시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', onPress: () => logout() },
    ]);
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
            {/* 이름 */}
            <View style={styles.row}>
              <Text style={styles.rowLabel}>이름</Text>
              {editingName ? (
                <View style={styles.inlineEditRow}>
                  <TextInput
                    style={styles.inlineInput}
                    value={name}
                    onChangeText={setName}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={() => setEditingName(false)}
                  />
                  <TouchableOpacity onPress={() => setEditingName(false)}>
                    <Text style={styles.saveText}>저장</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.rowRight} onPress={() => setEditingName(true)}>
                  <Text style={styles.rowValue}>{name}</Text>
                  <IconChev dir="right" size={16} color="#d1d5db" />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.divider} />
            <Row label="아이디" value={`@${username}`} />
            <View style={styles.divider} />
            <Row label="이메일" value={email} />
            <View style={styles.divider} />
            <Row label="비밀번호 변경" onPress={() => {}} />
          </View>
        </View>

        {/* 개인정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>개인정보</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.rowLabel}>비공개 계정</Text>
                <Text style={styles.rowDesc}>활성화하면 내 일기가 그룹 외부에 공개되지 않아요</Text>
              </View>
              <Switch
                value={privateMode}
                onValueChange={setPrivateMode}
                trackColor={{ false: '#e5e7eb', true: accent }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        </View>

        {/* 앱 설정 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>앱 설정</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>다크 모드</Text>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: '#e5e7eb', true: accent }}
                thumbColor="#ffffff"
              />
            </View>
            <View style={styles.divider} />
            <Row label="언어" value="한국어" onPress={() => {}} />
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
            <TouchableOpacity style={styles.row} onPress={handleDeleteAccount}>
              <Text style={[styles.rowLabelDanger, { color: '#ef4444' }]}>계정 삭제</Text>
              <Text style={styles.rowDesc2}>탈퇴 시 모든 데이터가 삭제돼요</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6', backgroundColor: '#ffffff',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
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
  inlineEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inlineInput: {
    fontSize: 14, color: '#111827',
    borderBottomWidth: 1.5, borderBottomColor: '#111827',
    paddingVertical: 2, minWidth: 80, textAlign: 'right',
  },
  saveText: { fontSize: 13, fontWeight: '700', color: '#111827' },
});
