import { Redirect } from 'expo-router';
import { View, ActivityIndicator, useColorScheme } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getUserRole } from '../utils/jobUtils';

export default function Index() {
  const { user, loading } = useAuth();
  const colorScheme = useColorScheme();
  const role = getUserRole(user);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colorScheme === 'dark' ? '#0E1B2A' : '#F4F8FF' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (role === 'employer') {
    return <Redirect href="/(employer)/dashboard" />;
  }

  if (role === 'admin') {
    return <Redirect href="/(admin)/dashboard" />;
  }

  return <Redirect href="/(home)/home" />;
}


