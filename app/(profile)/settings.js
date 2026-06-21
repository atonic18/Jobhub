import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, ChevronRight, CircleHelp, Lock, LogOut, User } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { ProfileAvatar } from '../../components/ui/ProfileAvatar';
import { getRoleLabel, getUserRole } from '../../utils/jobUtils';

export default function Settings() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const role = getUserRole(user);
  const fullName = user?.full_name || user?.name || 'JobHub User';

  const handleLogout = async () => {
    Alert.alert('Logout', 'Do you want to logout of JobHub?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const MenuItem = ({ icon, title, subtitle, onPress }) => (
    <TouchableOpacity activeOpacity={0.92}
      onPress={onPress}
      className="flex-row items-center justify-between p-6 bg-white dark:bg-darkSurface border-b border-gray-50 dark:border-darkBorder"
    >
      <View className="flex-row items-center flex-1 mr-4">
        <View className="mr-4">{icon}</View>
        <View className="flex-1">
          <Text className="text-text dark:text-darkText text-lg font-medium">{title}</Text>
          {subtitle ? <Text className="text-secondaryText dark:text-darkMuted mt-1">{subtitle}</Text> : null}
        </View>
      </View>
      <ChevronRight size={20} color="#64748B" />
    </TouchableOpacity>
  );

  return (
    <ScrollView className="flex-1 bg-background dark:bg-darkBg">
      <View className="px-6 pt-16 pb-10 bg-white dark:bg-darkSurface items-center border-b border-gray-100 dark:border-darkBorder">
        <ProfileAvatar uri={user?.profile_pic_url} name={fullName} size={96} textSize={36} className="mb-4" />
        <Text className="text-text dark:text-darkText text-2xl font-bold mb-1">{fullName}</Text>
        <Text className="text-secondaryText dark:text-darkMuted font-medium">{user?.email}</Text>
        <View className="bg-blue-100 dark:bg-darkSurface2 px-3 py-1 rounded-full mt-3">
          <Text className="text-primary text-xs font-bold">{getRoleLabel(role)}</Text>
        </View>
      </View>

      <View className="mt-6">
        <MenuItem
          icon={<User size={24} color="#2563EB" />}
          title="Edit Profile"
          subtitle="Update your name, bio, role details, and skills."
          onPress={() => router.push('/(profile)/edit-profile')}
        />
        <MenuItem
          icon={<Bell size={24} color="#2563EB" />}
          title="Notifications"
          subtitle="Open your latest JobHub updates."
          onPress={() => router.push('/(home)/notifications')}
        />
        <MenuItem
          icon={<Lock size={24} color="#2563EB" />}
          title="Privacy & Security"
          subtitle="Manage visibility and security preferences."
          onPress={() => router.push('/(profile)/privacy')}
        />
        <MenuItem
          icon={<CircleHelp size={24} color="#2563EB" />}
          title="Help Center"
          subtitle="Get answers about applications, jobs, and messages."
          onPress={() => router.push('/(profile)/help')}
        />

        <TouchableOpacity activeOpacity={0.92}
          onPress={handleLogout}
          className="flex-row items-center p-6 mt-6"
        >
          <LogOut size={24} color="#EF4444" />
          <Text className="text-red-500 text-lg font-bold ml-4">Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}


