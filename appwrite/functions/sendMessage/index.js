const { Client, Databases, ID, Permission, Query, Role, Storage } = require('node-appwrite');
const onApplicationSubmitted = require('../onApplicationSubmitted/index.js');
const onJobPostCreated = require('../onJobPostCreated/index.js');
const { acceptedStatuses, grantAttachmentAccess } = require('../shared/applicationWorkflow.js');

const parseBody = (req) => {
  if (!req.body) return {};
  if (typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(req.body);
  } catch (error) {
    return {};
  }
};

const getClient = () => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT || process.env.APPWRITE_FUNCTION_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://sfo.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID || '1212125')
    .setKey(process.env.APPWRITE_FUNCTION_API_KEY || process.env.APPWRITE_API_KEY);

  return {
    databases: new Databases(client),
    storage: new Storage(client),
  };
};

const removeApplication = async ({ databases, databaseId, applicationId, callerId, res }) => {
  if (!applicationId || !callerId) {
    return res.json({ success: false, error: 'applicationId and authenticated user are required.' }, 400);
  }

  const application = await databases.getDocument(databaseId, 'applications', applicationId);
  if (application.user_id !== callerId) {
    return res.json({ success: false, error: 'You can only remove your own applications.' }, 403);
  }

  await databases.deleteDocument(databaseId, 'applications', applicationId);

  if (application.job_id) {
    const applications = await databases.listDocuments(databaseId, 'applications', [
      Query.equal('job_id', application.job_id),
      Query.limit(100),
    ]);
    await databases.updateDocument(databaseId, 'job_postings', application.job_id, {
      applicant_count: applications.total,
      accepted_count: applications.documents.filter((item) => acceptedStatuses.includes(item.status)).length,
    }).catch(() => null);
  }

  return res.json({ success: true, applicationId });
};

const notificationPermissions = (userId) => [
  Permission.read(Role.user(userId)),
  Permission.update(Role.user(userId)),
  Permission.delete(Role.user(userId)),
];

module.exports = async (context) => {
  const { req, res, log, error } = context;
  const body = parseBody(req);
  const databaseId = process.env.APPWRITE_DATABASE_ID || 'jobhub_db';
  const callerId = req.headers['x-appwrite-user-id'];
  const { databases, storage } = getClient();

  if (body.action === 'removeApplication') {
    try {
      return await removeApplication({
        databases,
        databaseId,
        applicationId: body.applicationId,
        callerId,
        res,
      });
    } catch (err) {
      error(err.message);
      return res.json({ success: false, error: err.message }, 500);
    }
  }

  if ((body.$id || body.job_id) && body.title && (body.employer_id || body.user_id) && !body.conversationId && !body.conversation_id) {
    return onJobPostCreated(context);
  }

  if (body.job_id && body.user_id && !body.title && !body.conversationId && !body.conversation_id) {
    return onApplicationSubmitted(context);
  }

  const {
    conversationId,
    content,
    messageText,
    attachmentUrl,
    attachmentName,
    attachmentType,
    attachmentBucketId,
    attachmentFileId,
  } = body;
  const text = String(content || messageText || '').trim();

  if (!conversationId || !callerId) {
    return res.json({ success: false, error: 'conversationId and authenticated user are required.' }, 400);
  }

  if (!text && !attachmentUrl) {
    return res.json({ success: false, error: 'Message content or attachment is required.' }, 400);
  }

  try {
    const conversation = await databases.getDocument(databaseId, 'conversations', conversationId);
    const participants = conversation.participants || [];

    if (!participants.includes(callerId)) {
      return res.json({ success: false, error: 'You are not part of this conversation.' }, 403);
    }

    const attachment = attachmentBucketId && attachmentFileId ? {
      bucketId: attachmentBucketId,
      fileId: attachmentFileId,
      name: attachmentName || 'Attachment',
      type: attachmentType || '',
      url: attachmentUrl || '',
    } : null;

    if (attachment) {
      await grantAttachmentAccess({
        storage,
        attachment,
        ownerId: callerId,
        readerIds: participants.filter((id) => id !== callerId),
      });
    }

    const message = await databases.createDocument(databaseId, 'messages', ID.unique(), {
      conversation_id: conversationId,
      sender_id: callerId,
      content: text || `Attachment: ${attachmentName || 'file'}`,
      attachment_url: attachmentUrl || '',
      attachment_name: attachmentName || '',
      attachment_type: attachmentType || '',
      hidden_for: [],
      sent_at: new Date().toISOString(),
    }, [
      Permission.read(Role.user(callerId)),
      ...participants.filter((id) => id !== callerId).map((id) => Permission.read(Role.user(id))),
      Permission.update(Role.user(callerId)),
      Permission.delete(Role.user(callerId)),
    ]);

    const recipients = participants.filter((id) => id !== callerId);
    await Promise.all(
      recipients.map(async (recipientId) => {
        await databases.createDocument(databaseId, 'notifications', ID.unique(), {
          user_id: recipientId,
          title: 'New message',
          message: text || 'You received a new attachment.',
          content: text || 'You received a new attachment.',
          notification_type: 'message',
          related_id: conversationId,
          is_read: false,
        }, notificationPermissions(recipientId));
      })
    );

    return res.json({ success: true, message });
  } catch (err) {
    error(err.message);
    return res.json({ success: false, error: err.message }, 500);
  }
};
