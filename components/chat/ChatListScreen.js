import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, TextInput, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MessageSquare, Search, X } from 'lucide-react-native';
import { chatService } from '../../services/chatService';
import { profileService } from '../../services/profileService';
import { ProfileAvatar } from '../ui/ProfileAvatar';
import { useAuth } from '../../context/AuthContext';
import { formatTimestamp, getUserId, getUserRole } from '../../utils/jobUtils';

export default function ChatListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = getUserId(user);
  const role = getUserRole(user);
  const [conversations, setConversations] = useState([]);
  const [participantProfiles, setParticipantProfiles] = useState({});
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = async () => {
    if (!userId) return;
    try {
      const response = await chatService.getConversations(userId);
      setConversations(response.documents);
      const otherParticipantIds = response.documents
        .map((conversation) => conversation.participants?.find((participant) => participant !== userId))
        .filter(Boolean);
      const uniqueParticipantIds = [...new Set(otherParticipantIds)];
      const profiles = await Promise.all(
        uniqueParticipantIds.map(async (participantId) => [
          participantId,
          await profileService.getChatParticipantProfile(participantId),
        ])
      );
      setParticipantProfiles(Object.fromEntries(profiles));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [userId])
  );

  const filteredConversations = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return conversations;
    return conversations.filter((conversation) => {
      const otherParticipantId = conversation.participants?.find((participant) => participant !== userId) || '';
      const participantProfile = participantProfiles[otherParticipantId];
      return [
        conversation.$id,
        participantProfile?.displayName,
        participantProfile?.subtitle,
        conversation.last_message,
        conversation.$updatedAt,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalized);
    });
  }, [conversations, participantProfiles, query, userId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  };

  return (
    <View className="flex-1 bg-background dark:bg-darkBg">
      <View className="px-6 pt-12 pb-5 bg-white dark:bg-darkSurface border-b border-gray-100 dark:border-darkBorder">
        <Text className="text-text dark:text-darkText text-2xl font-bold mb-5">Messages</Text>
        <View className="flex-row items-center bg-gray-100 dark:bg-darkSurface2 rounded-3xl px-4">
          <Search size={20} color="#64748B" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search conversations..."
            placeholderTextColor="#64748B"
            className="flex-1 px-3 py-3 text-text dark:text-darkText"
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery('')} className="p-1">
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563EB" className="mt-10" />
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.$id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" colors={['#2563EB']} />
          }
          renderItem={({ item }) => {
            const otherParticipantId = item.participants?.find((participant) => participant !== userId) || 'Unknown';
            const participantProfile = participantProfiles[otherParticipantId];
            const participantName = participantProfile?.displayName || 'User';
            const participantSubtitle = item.last_message || participantProfile?.subtitle || 'Chat participant';
            return (
              <TouchableOpacity
                onPress={() => router.push(`/(chat)/${item.$id}`)}
                className="flex-row items-center p-6 bg-white dark:bg-darkSurface border-b border-gray-50 dark:border-darkBorder"
              >
                <ProfileAvatar uri={participantProfile?.profile_pic_url} name={participantName} size={56} textSize={20} className="mr-4" />
                <View className="flex-1">
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-text dark:text-darkText font-bold text-lg" numberOfLines={1}>{participantName}</Text>
                    <Text className="text-secondaryText dark:text-darkMuted text-xs">
                      {formatTimestamp(item.$updatedAt)}
                    </Text>
                  </View>
                  <Text className="text-secondaryText dark:text-darkMuted text-sm flex-1 mr-2" numberOfLines={1}>
                    {participantSubtitle}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View className="items-center mt-16 px-8">
              <MessageSquare size={42} color="#2563EB" />
              <Text className="text-text dark:text-darkText font-bold text-xl mt-4">
                {query ? 'No matching messages' : 'No messages yet'}
              </Text>
              <Text className="text-secondaryText dark:text-darkMuted text-center mt-2">
                {query ? 'Try a different search term.' : role === 'employer' ? 'Conversations with applicants will appear here.' : 'Conversations with recruiters will appear here.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}


