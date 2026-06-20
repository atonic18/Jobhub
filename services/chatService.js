import { ID, Query, Permission, Role } from 'react-native-appwrite';
import { databases, client, functions } from './appwrite';

const DATABASE_ID = 'jobhub_db';

const parseExecutionBody = (execution) => {
  const raw = execution?.responseBody || execution?.response || '';
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (error) {
    return { raw };
  }
};

const sharedConversationPermissions = (ownerId) => [
  Permission.read(Role.users()),
  Permission.update(Role.users()),
  Permission.delete(Role.user(ownerId)),
];

const messagePermissions = (senderId) => [
  Permission.read(Role.users()),
  Permission.update(Role.user(senderId)),
  Permission.delete(Role.user(senderId)),
];

const createMessageDirectly = async (conversationId, senderId, content, attachment = null) =>
  databases.createDocument(DATABASE_ID, 'messages', ID.unique(), {
    conversation_id: conversationId,
    sender_id: senderId,
    content,
    attachment_url: attachment?.url || '',
    attachment_name: attachment?.name || '',
    attachment_type: attachment?.type || '',
    hidden_for: [],
    sent_at: new Date().toISOString(),
  }, messagePermissions(senderId));

export const chatService = {
  // Get conversations for a user
  getConversations: async (userId) => {
    try {
      return await databases.listDocuments(DATABASE_ID, 'conversations', [
        Query.contains('participants', userId)
      ]);
    } catch (error) {
      const response = await databases.listDocuments(DATABASE_ID, 'conversations');
      return {
        ...response,
        documents: response.documents.filter((conversation) =>
          conversation.participants?.includes(userId)
        ),
      };
    }
  },

  getConversation: async (conversationId) => {
    return await databases.getDocument(DATABASE_ID, 'conversations', conversationId);
  },

  // Get messages for a conversation
  getMessages: async (conversationId, userId) => {
    const response = await databases.listDocuments(DATABASE_ID, 'messages', [
      Query.equal('conversation_id', conversationId),
      Query.orderAsc('sent_at')
    ]);
    if (!userId) return response;
    return {
      ...response,
      documents: response.documents.filter((message) => !message.hidden_for?.includes(userId)),
    };
  },

  // Send message
  sendMessage: async (conversationId, senderId, content, participants, attachment = null) => {
    try {
      const execution = await functions.createExecution(
        'sendMessage',
        JSON.stringify({
          conversationId,
          content,
          attachmentUrl: attachment?.url || '',
          attachmentName: attachment?.name || '',
          attachmentType: attachment?.type || '',
        }),
        false
      );
      const body = parseExecutionBody(execution);
      if (body?.success === false || body?.error) {
        throw new Error(body.error || 'Could not send this message.');
      }
      if (body?.message?.$id) return body.message;
    } catch (error) {
      console.error('Function sendMessage failed, falling back to direct message create:', error.message);
    }

    return await createMessageDirectly(conversationId, senderId, content, attachment);
  },

  clearConversationForUser: async (conversationId, userId) => {
    const response = await chatService.getMessages(conversationId);
    return await Promise.all(
      response.documents
        .filter((message) => !message.hidden_for?.includes(userId))
        .map((message) =>
          databases.updateDocument(DATABASE_ID, 'messages', message.$id, {
            hidden_for: [...(message.hidden_for || []), userId],
          })
        )
    );
  },

  // Create or get conversation between two users
  getOrCreateConversation: async (user1Id, user2Id) => {
    // Check if exists
    let existing;
    try {
      existing = await databases.listDocuments(DATABASE_ID, 'conversations', [
        Query.contains('participants', user1Id),
        Query.contains('participants', user2Id)
      ]);
    } catch (error) {
      const response = await databases.listDocuments(DATABASE_ID, 'conversations');
      existing = {
        ...response,
        total: response.documents.filter((conversation) =>
          conversation.participants?.includes(user1Id) &&
          conversation.participants?.includes(user2Id)
        ).length,
        documents: response.documents.filter((conversation) =>
          conversation.participants?.includes(user1Id) &&
          conversation.participants?.includes(user2Id)
        ),
      };
    }

    if (existing.total > 0) return existing.documents[0];

    const permissions = sharedConversationPermissions(user1Id);

    // Create new
    return await databases.createDocument(DATABASE_ID, 'conversations', ID.unique(), {
      participants: [user1Id, user2Id]
    }, permissions);
  },

  // Subscribe to messages in a conversation
  subscribeToMessages: (conversationId, callback) => {
    return client.subscribe(
      `databases.${DATABASE_ID}.collections.messages.documents`,
      (response) => {
        const isCreateEvent = response?.events?.some((event) => event.endsWith('.create'));
        if (isCreateEvent && response?.payload?.$id && response.payload.conversation_id === conversationId) {
          callback(response.payload);
        }
      }
    );
  }
};
