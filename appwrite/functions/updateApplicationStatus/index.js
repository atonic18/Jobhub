const { Client, Databases, ID, Permission, Query, Role } = require('node-appwrite');

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
  };
};

const notificationPermissions = (userId) => [
  Permission.read(Role.user(userId)),
  Permission.update(Role.user(userId)),
  Permission.delete(Role.user(userId)),
];

module.exports = async ({ req, res, error }) => {
  const { applicationId, newStatus } = parseBody(req);
  const databaseId = process.env.APPWRITE_DATABASE_ID || 'jobhub_db';
  const callerId = req.headers['x-appwrite-user-id'];
  const nextStatus = String(newStatus || '').toLowerCase();

  if (!applicationId || !nextStatus) {
    return res.json({ success: false, error: 'applicationId and newStatus are required.' }, 400);
  }

  if (!['accepted', 'rejected', 'pending', 'viewed'].includes(nextStatus)) {
    return res.json({ success: false, error: 'Invalid application status.' }, 400);
  }

  const { databases } = getClient();

  try {
    const application = await databases.getDocument(databaseId, 'applications', applicationId);
    const job = await databases.getDocument(databaseId, 'job_postings', application.job_id);
    const ownerId = job.employer_id || job.user_id;

    if (!callerId || ownerId !== callerId) {
      return res.json({ success: false, error: 'Only the employer who posted this job can update applicants.' }, 403);
    }

    if (['accepted', 'rejected'].includes(application.status) && application.status !== nextStatus) {
      return res.json({ success: false, error: `This application is already ${application.status}.` }, 409);
    }

    const updated = await databases.updateDocument(databaseId, 'applications', applicationId, {
      status: nextStatus,
    });

    const applications = await databases.listDocuments(databaseId, 'applications', [
      Query.equal('job_id', job.$id),
      Query.limit(100),
    ]);
    const acceptedCount = applications.documents.filter((item) =>
      item.$id === applicationId ? nextStatus === 'accepted' : item.status === 'accepted'
    ).length;

    await databases.updateDocument(databaseId, 'job_postings', job.$id, {
      applicant_count: applications.total,
      accepted_count: acceptedCount,
    });

    if (nextStatus === 'accepted') {
      const existingConversations = await databases.listDocuments(databaseId, 'conversations', [
        Query.contains('participants', ownerId),
        Query.contains('participants', application.user_id),
        Query.limit(1),
      ]).catch(() => ({ total: 0, documents: [] }));

      if (existingConversations.total === 0) {
        await databases.createDocument(databaseId, 'conversations', ID.unique(), {
          participants: [ownerId, application.user_id],
        }, [
          Permission.read(Role.user(ownerId)),
          Permission.read(Role.user(application.user_id)),
          Permission.update(Role.user(ownerId)),
          Permission.update(Role.user(application.user_id)),
          Permission.delete(Role.user(ownerId)),
          Permission.delete(Role.user(application.user_id)),
        ]);
      }
    }

    await databases.createDocument(databaseId, 'notifications', ID.unique(), {
      user_id: application.user_id,
      title: nextStatus === 'rejected' ? 'Application declined' : `Application ${nextStatus}`,
      message: `Your application for ${job.title} was ${nextStatus === 'rejected' ? 'declined' : nextStatus}.`,
      content: `Your application for ${job.title} was ${nextStatus === 'rejected' ? 'declined' : nextStatus}.`,
      notification_type: 'application_status',
      related_id: applicationId,
      is_read: false,
    }, notificationPermissions(application.user_id));

    return res.json({ success: true, application: updated });
  } catch (err) {
    error(err.message);
    return res.json({ success: false, error: err.message }, 500);
  }
};
