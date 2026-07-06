import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import RootNavigator from './src/navigation/RootNavigator';
import { ThemeProvider } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { EntriesProvider } from './src/context/EntriesContext';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <EntriesProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </EntriesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
