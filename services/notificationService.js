import { ID, Permission, Query, Role } from 'react-native-appwrite';
import { client, databases } from './appwrite';

const DATABASE_ID = 'jobhub_db';

const notificationPermissions = (userId) => [
  Permission.read(Role.user(userId)),
  Permission.update(Role.user(userId)),
  Permission.delete(Role.user(userId)),
];

export const notificationService = {
  createNotification: async ({ userId, title, message, content, notificationType, relatedId }) => {
    return await databases.createDocument(DATABASE_ID, 'notifications', ID.unique(), {
      user_id: userId,
      title,
      message: message || content || '',
      content: content || message || '',
      notification_type: notificationType || 'general',
      related_id: relatedId || '',
      is_read: false,
    }, notificationPermissions(userId));
  },

  getNotifications: async (userId) => {
    return await databases.listDocuments(DATABASE_ID, 'notifications', [
      Query.equal('user_id', userId),
      Query.orderDesc('$createdAt'),
    ]);
  },

  getUnreadCount: async (userId) => {
    const response = await databases.listDocuments(DATABASE_ID, 'notifications', [
      Query.equal('user_id', userId),
      Query.equal('is_read', false),
      Query.limit(100),
    ]);
    return response.total;
  },

  markAsRead: async (notificationId) => {
    return await databases.updateDocument(DATABASE_ID, 'notifications', notificationId, {
      is_read: true,
    });
  },

  markAllAsRead: async (notifications) => {
    return await Promise.all(
      notifications
        .filter((notification) => !notification.is_read)
        .map((notification) =>
          databases.updateDocument(DATABASE_ID, 'notifications', notification.$id, { is_read: true })
        )
    );
  },

  subscribeToNotifications: (userId, callback) => {
    return client.subscribe(
      `databases.${DATABASE_ID}.collections.notifications.documents`,
      (response) => {
        const isCreateEvent = response.events.some((event) => event.endsWith('.create'));
        if (isCreateEvent && response.payload.user_id === userId) {
          callback(response.payload);
        }
      }
    );
  },
};
