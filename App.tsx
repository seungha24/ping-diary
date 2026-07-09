import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
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
