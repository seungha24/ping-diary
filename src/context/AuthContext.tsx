import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import {
  getToken, getUserEmail, setToken as apiSetToken, setUserEmail as apiSetUserEmail,
  clearToken, hydrateToken, login as apiLogin, signup as apiSignup,
} from '../api';
import { supabase } from '../supabaseClient';

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
  loginGoogle: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  ready: false,
  authed: false,
  token: null,
  email: null,
  login: async () => {},
  signup: async () => {},
  loginDemo: async () => {},
  loginGoogle: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setTok] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

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

  /** 구글 계정으로 로그인 (웹: 리디렉트 방식) */
  async function loginGoogle() {
    const redirectTo =
      Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
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
      value={{ ready, authed: !!token, token, email: userEmail, login, signup, loginDemo, loginGoogle, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
