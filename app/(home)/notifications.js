import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Bell, CheckCheck, ChevronLeft } from 'lucide-react-native';
import { notificationService } from '../../services/notificationService';
import { useAuth } from '../../context/AuthContext';
import { formatTimestamp, getUserId } from '../../utils/jobUtils';

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = getUserId(user);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    if (!userId) return;
    try {
      const response = await notificationService.getNotifications(userId);
      setNotifications(response.documents);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [userId])
  );

  useEffect(() => {
    if (!userId) return undefined;
    const unsubscribe = notificationService.subscribeToNotifications(userId, (notification) => {
      setNotifications((current) =>
        current.some((item) => item.$id === notification.$id)
          ? current
          : [notification, ...current]
      );
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const markNotificationRead = async (notification) => {
    if (notification.is_read) return;
    setNotifications((current) =>
      current.map((item) => item.$id === notification.$id ? { ...item, is_read: true } : item)
    );
    try {
      await notificationService.markAsRead(notification.$id);
    } catch (error) {
      Alert.alert('Notifications', error.message || 'Could not update this notification.');
      await fetchNotifications();
    }
  };

  const markAllRead = async () => {
    const previous = notifications;
    setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
    try {
      await notificationService.markAllAsRead(previous);
    } catch (error) {
      Alert.alert('Notifications', error.message || 'Could not mark notifications as read.');
      await fetchNotifications();
    }
  };

  return (
    <View className="flex-1 bg-background dark:bg-darkBg">
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.$id}
        ListHeaderComponent={
          <View className="px-6 pt-20 pb-5">
            <View className="flex-row items-center justify-between mb-5">
              <View className="flex-row items-center flex-1 mr-4">
                <TouchableOpacity activeOpacity={0.92} onPress={() => router.back()} className="bg-white dark:bg-darkSurface border border-gray-100 dark:border-darkBorder p-2 rounded-xl mr-4">
                  <ChevronLeft size={24} color="#2563EB" />
                </TouchableOpacity>
                <View className="flex-1">
                  <Text className="text-secondaryText dark:text-darkMuted text-xs font-bold uppercase tracking-wider">Activity center</Text>
                  <Text className="text-text dark:text-darkText text-2xl font-extrabold mt-1">Notifications</Text>
                  <Text className="text-secondaryText dark:text-darkMuted mt-1">Updates about jobs and applications.</Text>
                </View>
              </View>
              <TouchableOpacity activeOpacity={0.92} onPress={markAllRead} className="bg-blue-100 dark:bg-darkSurface2 p-3 rounded-2xl">
                <CheckCheck size={20} color="#2563EB" />
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.92}
            onPress={() => markNotificationRead(item)}
            className="mx-6 mb-3 bg-white dark:bg-darkSurface border border-gray-100 dark:border-darkBorder rounded-3xl p-5 flex-row"
          >
            <View className={`${item.is_read ? 'bg-gray-100 dark:bg-darkSurface2' : 'bg-blue-100 dark:bg-darkSurface2'} w-12 h-12 rounded-2xl items-center justify-center mr-4`}>
              <Bell size={22} color={item.is_read ? '#64748B' : '#2563EB'} />
            </View>
            <View className="flex-1">
              <Text className="text-text dark:text-darkText font-bold text-base">{item.title || 'JobHub update'}</Text>
              <Text className="text-secondaryText dark:text-darkMuted mt-1">{item.message || item.content || 'Tap to mark this notification as read.'}</Text>
              <Text className="text-secondaryText dark:text-darkMuted text-xs mt-3">{formatTimestamp(item.$createdAt)}</Text>
            </View>
            {!item.is_read && <View className="w-3 h-3 bg-primary rounded-full mt-1" />}
          </TouchableOpacity>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" colors={['#2563EB']} />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color="#2563EB" className="mt-10" />
          ) : (
            <View className="items-center mt-16 px-8">
              <Bell size={42} color="#2563EB" />
              <Text className="text-text dark:text-darkText font-bold text-xl mt-4">No notifications</Text>
              <Text className="text-secondaryText dark:text-darkMuted text-center mt-2">Application updates and new job alerts will appear here.</Text>
            </View>
          )
        }
        contentContainerStyle={{ paddingBottom: 110 }}
      />
    </View>
  );
}


