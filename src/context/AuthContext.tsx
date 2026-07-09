import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import {
  getToken, getUserEmail, setToken as apiSetToken, setUserEmail as apiSetUserEmail,
  clearToken, hydrateToken, login as apiLogin, signup as apiSignup, getMe,
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
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setTok] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const { hydrateTheme } = useTheme();

  // 로그인되면 내 계정에 저장된 테마를 불러와 적용
  useEffect(() => {
    if (!token) return;
    getMe().then((me) => { if (me.theme) hydrateTheme(me.theme as any); }).catch(() => {});
  }, [token]);

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
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
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
    // 카카오·네이버는 이메일 scope 문제로 서버 커스텀 OAuth 사용 (닉네임만). 웹 리디렉트.
    if ((provider === 'kakao' || provider === 'naver') && Platform.OS === 'web' && typeof window !== 'undefined') {
      const ret = encodeURIComponent(window.location.origin);
      window.location.href = `${API_BASE_URL}/auth/${provider}/start?return=${ret}`;
      return;
    }
    // 네이버는 서버 커스텀 OAuth 전용(위 웹 리디렉트) — Supabase provider 아님
    if (provider === 'naver') throw new Error('네이버 로그인은 웹에서 이용해주세요.');
    const redirectTo =
      Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : undefined;
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error) throw error;
  }

  /** 로그아웃 */
  function logout() {
    clearToken();
    setTok(null);
    setUserEmail(null);
    supabase.auth.signOut().catch(() => {});
  }

  return (
    <AuthContext.Provider
      value={{ ready, authed: !!token, token, email: userEmail, login, signup, loginDemo, loginOAuth, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
