import 'react-native-url-polyfill/auto';
import { useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../context/AuthContext';
import '../global.css';

// Fix for react-native-css-interop recursion issue with React 19
if (process.env.NODE_ENV === 'development') {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (args[0]?.includes?.('SafeAreaView has been deprecated')) return;
    originalWarn(...args);
  };

  const originalError = console.error;
  console.error = (...args) => {
    if (args[0]?.includes?.('NativeWind: Action needed')) return;
    if (args[0]?.includes?.('Realtime got disconnected')) return;
    originalError(...args);
  };
}

export default function Layout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <AuthProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: isDark ? '#0E1B2A' : '#F4F8FF' },
        }}
      />
    </AuthProvider>
  );
}


