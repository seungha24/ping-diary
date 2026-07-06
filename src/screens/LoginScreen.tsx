import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

/**
 * 로그인 / 회원가입 화면.
 * 인증되지 않은 상태에서 앱 진입 시 노출된다.
 */
export default function LoginScreen() {
  const { accent } = useTheme();
  const { login, signup, loginDemo, loginOAuth } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!email.trim() || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (mode === 'login') await login(email.trim(), password);
      else await signup(email.trim(), password);
    } catch (e: any) {
      setError(e?.message ?? '요청에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function demo() {
    setLoading(true);
    setError(null);
    try {
      await loginDemo();
    } catch (e: any) {
      setError(e?.message ?? '데모 로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    setError(null);
    try {
      await loginOAuth('google'); // 웹: 구글 페이지로 리디렉트됨
    } catch (e: any) {
      setError(e?.message ?? '구글 로그인을 시작하지 못했습니다. (Supabase 구글 provider 설정 필요)');
    }
  }

  async function kakao() {
    setError(null);
    try {
      await loginOAuth('kakao'); // 웹: 카카오 페이지로 리디렉트됨
    } catch (e: any) {
      setError(e?.message ?? '카카오 로그인을 시작하지 못했습니다. (Supabase 카카오 provider 설정 필요)');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.inner}>
          {/* 로고 */}
          <View style={styles.logoWrap}>
            <Text style={[styles.logo, { color: accent }]}>p!ng</Text>
            <Text style={styles.logoSub}>다이어리</Text>
          </View>

          {/* 탭 */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, mode === 'login' && { borderBottomColor: accent }]}
              onPress={() => { setMode('login'); setError(null); }}
            >
              <Text style={[styles.tabText, mode === 'login' && { color: accent, fontWeight: '700' }]}>로그인</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === 'signup' && { borderBottomColor: accent }]}
              onPress={() => { setMode('signup'); setError(null); }}
            >
              <Text style={[styles.tabText, mode === 'signup' && { color: accent, fontWeight: '700' }]}>회원가입</Text>
            </TouchableOpacity>
          </View>

          {/* 입력 */}
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="이메일"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="비밀번호"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            editable={!loading}
            onSubmitEditing={submit}
            returnKeyType="go"
          />

          {error && <Text style={styles.error}>{error}</Text>}

          {/* 제출 */}
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: accent }, loading && styles.disabled]}
            onPress={submit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitText}>{mode === 'login' ? '로그인' : '회원가입'}</Text>}
          </TouchableOpacity>

          {/* 구분선 */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>또는</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* 구글 로그인 */}
          <TouchableOpacity style={styles.googleBtn} onPress={google} disabled={loading}>
            <Text style={styles.googleG}>G</Text>
            <Text style={styles.googleText}>구글로 계속하기</Text>
          </TouchableOpacity>

          {/* 카카오 로그인 */}
          <TouchableOpacity style={styles.kakaoBtn} onPress={kakao} disabled={loading}>
            <Text style={styles.kakaoIcon}>💬</Text>
            <Text style={styles.kakaoText}>카카오로 계속하기</Text>
          </TouchableOpacity>

          {/* 데모 */}
          <TouchableOpacity style={styles.demoBtn} onPress={demo} disabled={loading}>
            <Text style={styles.demoText}>데모 계정으로 둘러보기</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  flex: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 32, gap: 14 },
  logoWrap: { alignItems: 'center', marginBottom: 20 },
  logo: { fontSize: 44, fontWeight: '800' },
  logoSub: { fontSize: 14, color: '#9ca3af', marginTop: 2, letterSpacing: 4 },
  tabRow: { flexDirection: 'row', marginBottom: 8 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 15, color: '#9ca3af' },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: '#1f2937',
  },
  error: { color: '#dc2626', fontSize: 12, textAlign: 'center' },
  submitBtn: { borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  submitText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  demoBtn: { alignItems: 'center', paddingVertical: 10 },
  demoText: { color: '#6b7280', fontSize: 13, textDecorationLine: 'underline' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 2 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { fontSize: 12, color: '#9ca3af' },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingVertical: 13, backgroundColor: '#ffffff',
  },
  googleG: { fontSize: 16, fontWeight: '800', color: '#4285F4' },
  googleText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  kakaoBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 12, paddingVertical: 13, backgroundColor: '#FEE500',
  },
  kakaoIcon: { fontSize: 15 },
  kakaoText: { fontSize: 14, fontWeight: '700', color: '#191600' },
});
