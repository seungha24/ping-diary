import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import { PostHogProvider, usePostHog } from 'posthog-react-native';
import RootNavigator from './src/navigation/RootNavigator';
import LoginScreen from './src/screens/LoginScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { EntriesProvider } from './src/context/EntriesContext';
import { GroupsProvider } from './src/context/GroupsContext';
import ToastHost from './src/components/ToastHost';
import ErrorBoundary from './src/components/ErrorBoundary';
import { notify } from './src/notify';
import { registerPush } from './src/push';
import { POSTHOG_KEY, POSTHOG_HOST } from './src/config';

/** 다크 모드에 맞춰 상태바 글자색 전환 */
function ThemedStatusBar() {
  const { mode } = useTheme();
  return <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />;
}

/** 로그인되면 이 기기를 푸시 알림 대상으로 등록 */
function PushRegistrar() {
  const { authed } = useAuth();
  useEffect(() => {
    if (authed) registerPush();
  }, [authed]);
  return null;
}

/** 로그인/로그아웃에 맞춰 PostHog 사용자 식별을 동기화 (이벤트를 사용자에 연결) */
function AnalyticsIdentify() {
  const posthog = usePostHog();
  const { authed, email } = useAuth();
  useEffect(() => {
    if (!posthog) return;
    if (authed && email) posthog.identify(email, { email });
    else posthog.reset();
  }, [posthog, authed, email]);
  return null;
}

/**
 * PostHog 분석 프로바이더. 키가 설정된 경우에만 감싸고,
 * 미설정이면 아무 것도 하지 않아 안전하게 no-op 된다.
 */
function Analytics({ children }: { children: React.ReactNode }) {
  if (!POSTHOG_KEY) return <>{children}</>;
  return (
    <PostHogProvider
      apiKey={POSTHOG_KEY}
      options={{ host: POSTHOG_HOST }}
      // captureScreens는 NavigationContainer 안에서만 동작해 여기선 끄고,
      // RootNavigator에서 onStateChange로 직접 화면 이벤트를 보낸다
      autocapture={{ captureTouches: true, captureScreens: false }}
    >
      {children}
    </PostHogProvider>
  );
}

/** 백그라운드에서 새 버전 다운로드가 끝나면 토스트로 알려줌 */
function UpdateWatcher() {
  const { isUpdatePending } = Updates.useUpdates();
  useEffect(() => {
    if (isUpdatePending) {
      notify('새 버전을 받았어요! 앱을 껐다 켜면 적용돼요 ✨');
    }
  }, [isUpdatePending]);
  return null;
}

/** 인증 상태에 따라 로그인 화면 또는 앱 본체를 렌더링 */
function Gate() {
  const { ready, authed, recovering } = useAuth();
  if (!ready) return null;
  if (recovering) return <ResetPasswordScreen />;
  return authed ? <RootNavigator /> : <LoginScreen />;
}

export default function App() {
  // 앱 시작 시 OTA 업데이트가 있으면 즉시 받아서 적용 (한 번만 열어도 최신)
  useEffect(() => {
    if (!Updates.isEnabled) return; // 웹/개발 모드에선 동작 안 함
    (async () => {
      try {
        const res = await Updates.checkForUpdateAsync();
        if (res.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch {}
    })();
  }, []);

  return (
    <Analytics>
      <ThemeProvider>
        <AuthProvider>
          <EntriesProvider>
            <GroupsProvider>
              <ThemedStatusBar />
              <ErrorBoundary>
                <Gate />
              </ErrorBoundary>
              <PushRegistrar />
              <AnalyticsIdentify />
              <UpdateWatcher />
              <ToastHost />
            </GroupsProvider>
          </EntriesProvider>
        </AuthProvider>
      </ThemeProvider>
    </Analytics>
  );
}
