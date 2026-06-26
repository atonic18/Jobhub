import { Text, useColorScheme, useWindowDimensions } from 'react-native';
import { Tabs } from 'expo-router';
import { Briefcase, Home, MessageSquare, User } from 'lucide-react-native';

export default function EmployerLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { width } = useWindowDimensions();
  const tabBarInset = Math.min(Math.max(width * 0.04, 10), 28);
  const activeLabel = (label) => ({ focused, color }) => (
    focused ? <Text style={{ color, fontSize: 10, fontWeight: '700', marginTop: 2 }}>{label}</Text> : null
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: isDark ? '#9FB0C3' : '#64748B',
        tabBarStyle: {
          position: 'absolute',
          left: tabBarInset,
          right: tabBarInset,
          bottom: width < 380 ? 10 : 16,
          height: 72,
          paddingBottom: 7,
          paddingTop: 7,
          borderRadius: 30,
          overflow: 'hidden',
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0,
          shadowRadius: 14,
          elevation: 0,
        },
        tabBarItemStyle: {
          flex: 1,
          marginHorizontal: 2,
          borderRadius: 20,
          overflow: 'hidden',
        },
        tabBarActiveBackgroundColor: isDark ? '#243B55' : '#DCEBFF',
        tabBarLabelPosition: 'below-icon',
        tabBarHideOnKeyboard: true,
        sceneStyle: { paddingBottom: 86 },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarLabel: activeLabel('Home'),
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Jobs Posted',
          tabBarLabel: activeLabel('Jobs'),
          tabBarIcon: ({ color, size }) => <Briefcase size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Chat',
          tabBarLabel: activeLabel('Chat'),
          tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: activeLabel('Profile'),
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


