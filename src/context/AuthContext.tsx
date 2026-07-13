import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import {
  getToken, getUserEmail, setToken as apiSetToken, setUserEmail as apiSetUserEmail,
  clearToken, hydrateToken, login as apiLogin, signup as apiSignup, getMe,
  setOnUnauthorized,
} from '../api';
import { supabase } from '../supabaseClient';
import { API_BASE_URL } from '../config';
import { useTheme } from './ThemeContext';
import { notify } from '../notify';

/**
 * 인증 컨텍스트.
 * 실제 로그인/회원가입/로그아웃을 지원하며, 빠른 체험용 데모 로그인도 제공한다.
 */
const DEMO_EMAIL = 'demo@ping-diary.app';
const DEMO_PASSWORD = 'pingdiary-demo-1234';

interface AuthContextValue {
  ready: boolean;        // 초기 토큰 확인 완료 여부
  authed: boolean;       // 로그인 상태
  token: string | null;
  email: string | null;  // 로그인한 사용자 이메일
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  loginDemo: () => Promise<void>;
  loginOAuth: (provider: OAuthProvider) => Promise<void>;
  logout: () => void;
  recovering: boolean;   // 비밀번호 재설정 링크로 진입한 상태
  resetPassword: (email: string) => Promise<void>;
  completeRecovery: (newPassword: string) => Promise<void>;
  cancelRecovery: () => void;
}

/** 소셜 로그인 provider (Supabase 기본 지원) */
export type OAuthProvider = 'google' | 'kakao' | 'naver';

const AuthContext = createContext<AuthContextValue>({
  ready: false,
  authed: false,
  token: null,
  email: null,
  login: async () => {},
  signup: async () => {},
  loginDemo: async () => {},
  loginOAuth: async () => {},
  logout: () => {},
  recovering: false,
  resetPassword: async () => {},
  completeRecovery: async () => {},
  cancelRecovery: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setTok] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);
  const { hydrateTheme } = useTheme();

  // 로그인되면 내 계정에 저장된 테마를 불러와 적용
  // (의존성은 authed — 토큰 문자열은 1시간마다 갱신되므로 그때마다 재조회하지 않게)
  const authed = !!token;
  useEffect(() => {
    if (!authed) return;
    getMe().then((me) => { if (me.theme) hydrateTheme(me.theme as any); }).catch(() => {});
  }, [authed]);

  // API가 401을 만나면(토큰 만료·무효) 로그인 화면으로 깔끔히 복귀
  useEffect(() => {
    setOnUnauthorized(() => logout());
    return () => setOnUnauthorized(null);
  }, []);

  // 소셜 로그인(Supabase) 세션을 우리 토큰 저장소/상태에 반영
  function adoptSession(session: any) {
    const t = session?.access_token;
    if (!t) return;
    apiSetToken(t);
    const em = session?.user?.email ?? null;
    if (em) apiSetUserEmail(em);
    setTok(t);
    setUserEmail(em);
  }

  // 앱 시작 시 토큰 복원 + 소셜 로그인 세션 구독
  useEffect(() => {
    let cancelled = false;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // 비밀번호 재설정 링크로 들어오면 새 비밀번호 입력 화면을 띄운다
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (session?.access_token) adoptSession(session);
    });
    (async () => {
      // URL에 ?logout 이 있으면 강제 로그아웃 (DevTools 없이 로그아웃용)
      if (Platform.OS === 'web' && typeof window !== 'undefined' && /[?&]logout/.test(window.location.search)) {
        clearToken();
        await supabase.auth.signOut().catch(() => {});
        if (!cancelled) { setTok(null); setUserEmail(null); setReady(true); }
        return;
      }
      // 소셜 커스텀 OAuth(카카오/네이버) 콜백 처리 — 서버가 해시/쿼리로 넘긴 값
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const labels: Record<string, string> = { kakao: '카카오', naver: '네이버' };
        for (const p of ['kakao', 'naver']) {
          // 실패 시 서버가 넘긴 에러 표시
          if (new RegExp(`[?&]${p}_error=`).test(window.location.search)) {
            const err = new URLSearchParams(window.location.search).get(`${p}_error`);
            window.history.replaceState(null, '', window.location.pathname);
            notify(`${labels[p]} 로그인에 실패했어요 (${err}). 잠시 후 다시 시도해주세요.`);
          }
          // 성공 시 해시로 넘어온 토큰으로 세션 세팅
          if (window.location.hash.includes(`${p}_at=`)) {
            const hp = new URLSearchParams(window.location.hash.slice(1));
            const at = hp.get(`${p}_at`);
            const rt = hp.get(`${p}_rt`);
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
            if (at && rt) {
              try {
                const { data } = await supabase.auth.setSession({ access_token: at, refresh_token: rt });
                if (data.session) adoptSession(data.session);
              } catch {}
            }
          }
        }
      }
      await hydrateToken();
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) adoptSession(data.session);
      } catch {}
      if (!cancelled) {
        setTok(getToken());
        setUserEmail(getUserEmail());
        setReady(true);
      }
    })();
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  /** 로그인 → 토큰 저장 */
  async function login(email: string, password: string) {
    const t = await apiLogin(email, password); // 성공 시 토큰·이메일 저장됨
    setTok(t);
    setUserEmail(getUserEmail());
  }

  /** 회원가입 후 자동 로그인 */
  async function signup(email: string, password: string) {
    await apiSignup(email, password);
    await login(email, password);
  }

  /** 데모 계정으로 로그인 (없으면 생성) */
  async function loginDemo() {
    try {
      await login(DEMO_EMAIL, DEMO_PASSWORD);
    } catch {
      await apiSignup(DEMO_EMAIL, DEMO_PASSWORD).catch(() => {});
      await login(DEMO_EMAIL, DEMO_PASSWORD);
    }
  }

  /** 소셜 계정으로 로그인 (구글: Supabase OAuth / 카카오·네이버: 서버 커스텀 OAuth) */
  async function loginOAuth(provider: OAuthProvider) {
    // ── 웹: 카카오·네이버는 서버 커스텀 OAuth로 페이지 리디렉트 ──
    if ((provider === 'kakao' || provider === 'naver') && Platform.OS === 'web' && typeof window !== 'undefined') {
      const ret = encodeURIComponent(window.location.origin);
      window.location.href = `${API_BASE_URL}/auth/${provider}/start?return=${ret}`;
      return;
    }

    // ── 네이티브(폰): 인앱 브라우저로 열고 pingdiary:// 딥링크로 복귀 ──
    if (Platform.OS !== 'web') {
      const NATIVE_REDIRECT = 'pingdiary://auth';

      if (provider === 'kakao' || provider === 'naver') {
        const startUrl = `${API_BASE_URL}/auth/${provider}/start?return=${encodeURIComponent(NATIVE_REDIRECT)}`;
        const res = await WebBrowser.openAuthSessionAsync(startUrl, NATIVE_REDIRECT);
        if (res.type !== 'success' || !('url' in res) || !res.url) {
          throw new Error('로그인이 취소됐어요.');
        }
        const hp = new URLSearchParams(res.url.split('#')[1] || '');
        const at = hp.get(`${provider}_at`);
        const rt = hp.get(`${provider}_rt`);
        if (!at || !rt) {
          const em = res.url.match(/[?&](?:kakao|naver)_error=([^&#]+)/);
          throw new Error(em ? decodeURIComponent(em[1]) : '로그인에 실패했어요. 다시 시도해주세요.');
        }
        const { data, error } = await supabase.auth.setSession({ access_token: at, refresh_token: rt });
        if (error) throw error;
        if (data.session) adoptSession(data.session);
        return;
      }

      // 구글: Supabase OAuth URL을 받아 인앱 브라우저로 진행
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: NATIVE_REDIRECT, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data.url) throw new Error('로그인 준비에 실패했어요.');
      const res = await WebBrowser.openAuthSessionAsync(data.url, NATIVE_REDIRECT);
      if (res.type !== 'success' || !('url' in res) || !res.url) {
        throw new Error('로그인이 취소됐어요.');
      }
      const hp = new URLSearchParams(res.url.split('#')[1] || '');
      const at = hp.get('access_token');
      const rt = hp.get('refresh_token');
      if (at && rt) {
        const { data: d2, error: e2 } = await supabase.auth.setSession({ access_token: at, refresh_token: rt });
        if (e2) throw e2;
        if (d2.session) adoptSession(d2.session);
        return;
      }
      // PKCE 플로우면 ?code= 로 복귀
      const codeMatch = res.url.match(/[?&]code=([^&#]+)/);
      if (codeMatch) {
        const { data: d3, error: e3 } = await supabase.auth.exchangeCodeForSession(decodeURIComponent(codeMatch[1]));
        if (e3) throw e3;
        if (d3.session) adoptSession(d3.session);
        return;
      }
      throw new Error('로그인에 실패했어요. 다시 시도해주세요.');
    }

    // ── 웹: 구글은 Supabase OAuth 리디렉트 ──
    const redirectTo =
      Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : undefined;
    // 여기 도달하는 건 웹의 구글뿐 (카카오·네이버는 위에서 처리)
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (error) throw error;
  }

  /** 로그아웃 */
  function logout() {
    clearToken();
    setTok(null);
    setUserEmail(null);
    supabase.auth.signOut().catch(() => {});
  }

  /** 비밀번호 재설정 메일 발송 (재설정 링크 → 앱으로 복귀) */
  async function resetPassword(email: string) {
    const redirectTo =
      Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    if (error) throw error;
  }

  /** 재설정 링크로 들어온 세션에서 새 비밀번호 확정 */
  async function completeRecovery(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    setRecovering(false); // 세션이 유효해져 그대로 로그인 상태
  }

  /** 재설정 취소 (로그인 화면으로) */
  function cancelRecovery() {
    setRecovering(false);
    logout();
  }

  return (
    <AuthContext.Provider
      value={{
        ready, authed, token, email: userEmail,
        login, signup, loginDemo, loginOAuth, logout,
        recovering, resetPassword, completeRecovery, cancelRecovery,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
