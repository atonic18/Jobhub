import { useColorScheme } from 'react-native';
import { Tabs } from 'expo-router';
import { Briefcase, Home, MessageSquare, User } from 'lucide-react-native';

export default function EmployerLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: isDark ? '#9FB0C3' : '#64748B',
        tabBarStyle: {
          backgroundColor: isDark ? '#142437' : '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: isDark ? '#24384F' : '#F1F5F9',
          height: 80,
          paddingBottom: 25,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Jobs Posted',
          tabBarIcon: ({ color, size }) => <Briefcase size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="post-job" options={{ href: null }} />
      <Tabs.Screen name="job-details" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="subscription" options={{ href: null }} />
      <Tabs.Screen name="checkout" options={{ href: null }} />
      <Tabs.Screen name="success" options={{ href: null }} />
    </Tabs>
  );
}


