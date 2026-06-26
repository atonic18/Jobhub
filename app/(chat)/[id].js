import React, { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Linking, ToastAndroid } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { ChevronLeft, FileText, MoreVertical, Paperclip, Send } from 'lucide-react-native';
import { chatService } from '../../services/chatService';
import { fileService } from '../../services/fileService';
import { profileService } from '../../services/profileService';
import { ProfileAvatar } from '../../components/ui/ProfileAvatar';
import { useAuth } from '../../context/AuthContext';
import { formatTime, getUserId } from '../../utils/jobUtils';

const isValidMessage = (item) => Boolean(item && item.$id);

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const userId = getUserId(user);
  const [conversation, setConversation] = useState(null);
  const [otherParticipant, setOtherParticipant] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();
  const flatListRef = useRef();

  useEffect(() => {
    if (!id || !userId) return undefined;

    fetchConversation();
    fetchMessages();

    const unsubscribe = chatService.subscribeToMessages(id, (newMessage) => {
      if (!isValidMessage(newMessage)) return;
      if (newMessage.hidden_for?.includes(userId)) return;
      setMessages((prev) =>
        prev.some((item) => item?.$id === newMessage.$id) ? prev : [...prev, newMessage]
      );
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [id, userId]);

  const fetchConversation = async () => {
    try {
      const response = await chatService.getConversation(id);
      setConversation(response);
      const otherParticipantId = response.participants?.find((participant) => participant !== userId);
      if (otherParticipantId) {
        const profile = await profileService.getChatParticipantProfile(otherParticipantId);
        setOtherParticipant(profile);
      } else {
        setOtherParticipant(null);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await chatService.getMessages(id, userId);
      setMessages((response.documents || []).filter(isValidMessage));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if ((!message.trim() && !attachment) || sending) return;

    const content = message.trim() || (attachment ? `Attachment: ${attachment.name}` : '');
    setMessage('');
    const currentAttachment = attachment;
    setAttachment(null);
    setSending(true);

    try {
      const created = await chatService.sendMessage(id, userId, content, conversation?.participants, currentAttachment);
      if (isValidMessage(created)) {
        setMessages((prev) =>
          prev.some((item) => item?.$id === created.$id) ? prev : [...prev, created]
        );
      } else {
        await fetchMessages();
      }
      setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
    } catch (error) {
      setMessage(content);
      setAttachment(currentAttachment);
      Alert.alert('Message not sent', error.message || 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  const pickAttachment = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      setUploading(true);
      const recipients = (conversation?.participants || []).filter((participant) => participant !== userId);
      const uploaded = await fileService.uploadMessageAttachment(result.assets[0], userId, recipients);
      setAttachment(uploaded);
    } catch (error) {
      Alert.alert('Attachment', error.message || 'Could not upload this file.');
    } finally {
      setUploading(false);
    }
  };

  const openAttachment = async (url) => {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Attachment', 'Could not open this attachment.');
    }
  };

  const showConversationActions = () => {
    Alert.alert('Conversation', 'Choose an action', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear Chat',
        style: 'destructive',
        onPress: async () => {
          try {
            await chatService.clearConversationForUser(id, userId);
            setMessages([]);
          } catch (error) {
            Alert.alert('Clear Chat', error.message || 'Could not clear this chat.');
          }
        },
      },
      {
        text: 'Report Chat',
        onPress: () => {
          if (Platform.OS === 'android') {
            ToastAndroid.show('Report submitted', ToastAndroid.SHORT);
          } else {
            Alert.alert('Report submitted', 'Report submitted');
          }
        },
      },
    ]);
  };

  const participantName = otherParticipant?.displayName || 'User';
  const participantSubtitle = otherParticipant?.subtitle || (otherParticipant?.type === 'employer' ? 'Employer' : 'Employee');

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background dark:bg-darkBg"
    >
      <View className="px-6 pt-20 pb-4 bg-white dark:bg-darkSurface border-b border-gray-100 dark:border-darkBorder flex-row items-center">
        <TouchableOpacity activeOpacity={0.92} onPress={() => router.back()} className="mr-4">
          <ChevronLeft size={24} color="#2563EB" />
        </TouchableOpacity>
        <View className="flex-1 flex-row items-center">
          <ProfileAvatar uri={otherParticipant?.profile_pic_url} name={participantName} size={40} textSize={16} className="mr-3" />
          <View className="flex-1">
            <Text className="text-text dark:text-darkText font-bold" numberOfLines={1}>{participantName}</Text>
            <Text className="text-secondaryText dark:text-darkMuted text-xs" numberOfLines={1}>{participantSubtitle}</Text>
          </View>
        </View>
        <TouchableOpacity activeOpacity={0.92} onPress={showConversationActions}>
          <MoreVertical size={20} color="#64748B" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages.filter(isValidMessage)}
          keyExtractor={(item) => item.$id}
          className="flex-1 px-6 pt-4"
          contentContainerStyle={{ paddingBottom: 32 }}
          renderItem={({ item }) => {
            const isMe = item.sender_id === userId;
            return (
              <View className={`mb-4 flex-row ${isMe ? 'justify-end' : 'justify-start'}`}>
                <View className={`max-w-[80%] p-4 rounded-3xl ${isMe ? 'bg-primary rounded-tr-none' : 'bg-white dark:bg-darkSurface rounded-tl-none border border-gray-100 dark:border-darkBorder shadow-sm'}`}>
                  <Text className={`${isMe ? 'text-white' : 'text-text dark:text-darkText'} leading-5`}>
                    {item.content}
                  </Text>
                  {item.attachment_url ? (
                    <TouchableOpacity activeOpacity={0.92}
                      onPress={() => openAttachment(item.attachment_url)}
                      className={`${isMe ? 'bg-white/20' : 'bg-gray-100 dark:bg-darkSurface2'} rounded-2xl p-3 mt-2 flex-row items-center`}
                    >
                      <FileText size={16} color={isMe ? 'white' : '#2563EB'} />
                      <Text className={`${isMe ? 'text-white' : 'text-secondaryText dark:text-darkMuted'} ml-2 flex-1`} numberOfLines={1}>
                        {item.attachment_name || 'Attachment'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                  <Text className={`text-[10px] mt-1 ${isMe ? 'text-blue-100 text-right' : 'text-secondaryText dark:text-darkMuted'}`}>
                    {formatTime(item.sent_at || item.$createdAt)}
                  </Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View className="items-center mt-16 px-8">
              <Text className="text-text dark:text-darkText font-bold text-xl">No messages yet</Text>
              <Text className="text-secondaryText dark:text-darkMuted text-center mt-2">Start the conversation below.</Text>
            </View>
          }
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />
      )}

      <View className="mx-4 mb-6">
        {attachment ? (
          <View className="bg-white dark:bg-darkSurface border border-gray-100 dark:border-darkBorder rounded-2xl p-3 mb-2 flex-row items-center">
            <FileText size={18} color="#2563EB" />
            <Text className="text-secondaryText dark:text-darkMuted ml-3 flex-1" numberOfLines={1}>{attachment.name}</Text>
            <TouchableOpacity activeOpacity={0.92} onPress={() => setAttachment(null)}>
              <Text className="text-red-500 font-bold">Remove</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <View className="p-4 bg-white dark:bg-darkSurface border-t border-gray-100 dark:border-darkBorder flex-row items-center rounded-3xl shadow-sm">
          <TouchableOpacity activeOpacity={0.92} onPress={pickAttachment} disabled={uploading} className="p-2">
            <Paperclip size={20} color={uploading ? '#94A3B8' : '#2563EB'} />
          </TouchableOpacity>
          <TextInput
            placeholder="Type a message..."
            placeholderTextColor="#64748B"
            value={message}
            onChangeText={setMessage}
            className="flex-1 px-4 py-2 text-text dark:text-darkText"
          />
          <TouchableOpacity activeOpacity={0.92}
            onPress={handleSend}
            disabled={(!message.trim() && !attachment) || sending}
            className={`bg-primary p-3 rounded-2xl ml-2 ${((!message.trim() && !attachment) || sending) ? 'opacity-60' : ''}`}
          >
            <Send size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

