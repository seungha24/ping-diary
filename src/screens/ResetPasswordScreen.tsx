import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useThemedStyles } from '../theme/themed';

/**
 * 비밀번호 재설정 화면.
 * 재설정 메일의 링크로 앱에 복귀하면(PASSWORD_RECOVERY) 노출된다.
 */
export default function ResetPasswordScreen() {
  const styles = useThemedStyles(lightStyles);
  const { accent } = useTheme();
  const { completeRecovery, cancelRecovery } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 해요.');
      return;
    }
    if (password !== confirm) {
      setError('비밀번호가 일치하지 않아요.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await completeRecovery(password);
      // 성공하면 세션이 유효해져 자동으로 앱 본체로 진입
    } catch (e: any) {
      setError(e?.message ?? '비밀번호 변경에 실패했어요.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.inner}>
          <View style={styles.logoWrap}>
            <Text style={[styles.logo, { color: accent }]}>p!ng</Text>
            <Text style={styles.title}>새 비밀번호 설정</Text>
            <Text style={styles.sub}>사용할 새 비밀번호를 입력해주세요.</Text>
          </View>

          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="새 비밀번호 (6자 이상)"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            editable={!loading}
            returnKeyType="next"
          />
          <TextInput
            style={styles.input}
            value={confirm}
            onChangeText={setConfirm}
            placeholder="새 비밀번호 확인"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            editable={!loading}
            onSubmitEditing={submit}
            returnKeyType="go"
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: accent }, loading && styles.disabled]}
            onPress={submit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitText}>비밀번호 변경</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={cancelRecovery} disabled={loading}>
            <Text style={styles.cancelText}>취소하고 로그인으로</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const lightStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  flex: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 32, gap: 14 },
  logoWrap: { alignItems: 'center', marginBottom: 20 },
  logo: { fontSize: 40, fontWeight: '800' },
  title: { fontSize: 18, fontWeight: '600', color: '#111827', marginTop: 12 },
  sub: { fontSize: 13, color: '#9ca3af', marginTop: 4 },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: '#1f2937',
  },
  error: { color: '#dc2626', fontSize: 12, textAlign: 'center' },
  submitBtn: { borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  submitText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.6 },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
  cancelText: { color: '#6b7280', fontSize: 13, textDecorationLine: 'underline' },
});
