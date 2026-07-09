import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

/** 구글 4색 G 로고 */
function GoogleLogo({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}

/** 카카오 말풍선 심볼 */
function KakaoLogo({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="rgba(0,0,0,0.9)"
        d="M12 3.5C6.75 3.5 2.5 6.86 2.5 11c0 2.66 1.77 5 4.44 6.32-.15.53-.94 3.32-.97 3.54 0 0-.02.16.08.22.1.06.22.02.22.02.29-.04 3.4-2.23 3.94-2.6.58.08 1.18.13 1.79.13 5.25 0 9.5-3.36 9.5-7.5S17.25 3.5 12 3.5z"
      />
    </Svg>
  );
}

/** 네이버 N 심볼 */
function NaverLogo({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Path fill="#ffffff" d="M13.03 10.72 6.57 1.5H1.5v17h5.47V9.28l6.46 9.22h5.07v-17h-5.47v9.22z" />
    </Svg>
  );
}

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

  async function naver() {
    setError(null);
    try {
      await loginOAuth('naver'); // 웹: 네이버 페이지로 리디렉트됨
    } catch (e: any) {
      setError(e?.message ?? '네이버 로그인을 시작하지 못했습니다.');
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
          <TouchableOpacity style={styles.googleBtn} onPress={google} disabled={loading} activeOpacity={0.85}>
            <View style={styles.socialIcon}><GoogleLogo size={18} /></View>
            <Text style={styles.googleText}>구글로 계속하기</Text>
          </TouchableOpacity>

          {/* 카카오 로그인 */}
          <TouchableOpacity style={styles.kakaoBtn} onPress={kakao} disabled={loading} activeOpacity={0.85}>
            <View style={styles.socialIcon}><KakaoLogo size={18} /></View>
            <Text style={styles.kakaoText}>카카오로 계속하기</Text>
          </TouchableOpacity>

          {/* 네이버 로그인 */}
          <TouchableOpacity style={styles.naverBtn} onPress={naver} disabled={loading} activeOpacity={0.85}>
            <View style={styles.socialIcon}><NaverLogo size={16} /></View>
            <Text style={styles.naverText}>네이버로 계속하기</Text>
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
  socialIcon: { position: 'absolute', left: 18, top: 0, bottom: 0, justifyContent: 'center' },
  googleBtn: {
    position: 'relative', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#dadce0', borderRadius: 12, paddingVertical: 14, backgroundColor: '#ffffff',
  },
  googleText: { fontSize: 14, fontWeight: '600', color: '#3c4043' },
  kakaoBtn: {
    position: 'relative', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, paddingVertical: 14, backgroundColor: '#FEE500',
  },
  kakaoText: { fontSize: 14, fontWeight: '700', color: 'rgba(0,0,0,0.85)' },
  naverBtn: {
    position: 'relative', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, paddingVertical: 14, backgroundColor: '#03C75A',
  },
  naverText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
});
