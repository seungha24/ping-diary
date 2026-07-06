import React, { createContext, useContext, useEffect, useState } from 'react';
import { getToken, setToken, login, signup } from '../api';

/**
 * 인증 컨텍스트.
 * 지금은 데모 계정으로 자동 로그인해 서버와 바로 연동한다.
 * (추후 로그인/회원가입 화면을 붙이면 이 자동 로그인을 대체하면 된다.)
 */
const DEMO_EMAIL = 'demo@ping-diary.app';
const DEMO_PASSWORD = 'pingdiary-demo-1234';

interface AuthContextValue {
  ready: boolean;      // 토큰 확보 완료 여부
  token: string | null;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue>({ ready: false, token: null, error: null });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setTok] = useState<string | null>(getToken());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function ensureSession() {
      // 이미 토큰이 있으면 재사용
      const existing = getToken();
      if (existing) {
        if (!cancelled) { setTok(existing); setReady(true); }
        return;
      }
      try {
        // 데모 계정 로그인 시도 → 없으면 가입 후 재로그인
        let t: string;
        try {
          t = await login(DEMO_EMAIL, DEMO_PASSWORD);
        } catch {
          await signup(DEMO_EMAIL, DEMO_PASSWORD).catch(() => {});
          t = await login(DEMO_EMAIL, DEMO_PASSWORD);
        }
        setToken(t);
        if (!cancelled) { setTok(t); setReady(true); }
      } catch (e: any) {
        if (!cancelled) { setError(e?.message ?? '로그인 실패'); setReady(true); }
      }
    }

    ensureSession();
    return () => { cancelled = true; };
  }, []);

  return (
    <AuthContext.Provider value={{ ready, token, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
