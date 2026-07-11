import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
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
    <ThemeProvider>
      <AuthProvider>
        <EntriesProvider>
          <GroupsProvider>
            <ThemedStatusBar />
            <ErrorBoundary>
              <Gate />
            </ErrorBoundary>
            <PushRegistrar />
            <UpdateWatcher />
            <ToastHost />
          </GroupsProvider>
        </EntriesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
