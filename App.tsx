import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import RootNavigator from './src/navigation/RootNavigator';
import LoginScreen from './src/screens/LoginScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import { ThemeProvider } from './src/context/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { EntriesProvider } from './src/context/EntriesContext';
import { GroupsProvider } from './src/context/GroupsContext';
import ToastHost from './src/components/ToastHost';

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
            <StatusBar style="dark" />
            <Gate />
            <ToastHost />
          </GroupsProvider>
        </EntriesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
