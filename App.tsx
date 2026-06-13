import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import RootNavigator from './src/navigation/RootNavigator';
import { ThemeProvider } from './src/context/ThemeContext';
import { EntriesProvider } from './src/context/EntriesContext';

export default function App() {
  return (
    <ThemeProvider>
      <EntriesProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </EntriesProvider>
    </ThemeProvider>
  );
}
