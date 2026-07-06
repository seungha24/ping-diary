import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// 공개(anon) 키 — 클라이언트에 포함해도 안전. 필요 시 EXPO_PUBLIC_* 로 오버라이드.
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://zfvrmmroohxcdvskuztn.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmdnJtbXJvb2h4Y2R2c2t1enRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyMjAwNTMsImV4cCI6MjA5ODc5NjA1M30.6gkxSA7AqaMIfnDpOn9fH6SX9k-1ORbC3UgE4I0GpuY';

const isWeb = Platform.OS === 'web';

/**
 * 소셜 로그인(OAuth)용 Supabase 클라이언트.
 * 웹은 URL에서 세션 자동 감지, 네이티브는 AsyncStorage에 세션 보관.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: isWeb ? undefined : (AsyncStorage as any),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: isWeb,
  },
});
