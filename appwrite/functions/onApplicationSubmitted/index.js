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

const getUserDocument = async (databases, databaseId, userId) => {
  const response = await databases.listDocuments(databaseId, 'users', [
    Query.equal('user_id', userId),
    Query.limit(1),
  ]);
  return response.documents[0] || null;
};

const notificationPermissions = (userId) => [
  Permission.read(Role.user(userId)),
  Permission.update(Role.user(userId)),
  Permission.delete(Role.user(userId)),
];

const createNotificationOnce = async (databases, databaseId, payload) => {
  const existing = await databases.listDocuments(databaseId, 'notifications', [
    Query.equal('user_id', payload.user_id),
    Query.equal('notification_type', payload.notification_type),
    Query.equal('related_id', payload.related_id || ''),
    Query.limit(1),
  ]);
  if (existing.total > 0) return existing.documents[0];
  return databases.createDocument(
    databaseId,
    'notifications',
    ID.unique(),
    payload,
    notificationPermissions(payload.user_id)
  );
};

module.exports = async ({ req, res, log, error }) => {
  const application = parseBody(req);
  const databaseId = process.env.APPWRITE_DATABASE_ID || 'jobhub_db';

  if (!application.job_id || !application.user_id) {
    return res.json({ success: false, error: 'Application payload must include job_id and user_id.' }, 400);
  }

  const { databases } = getClient();

  try {
    const job = await databases.getDocument(databaseId, 'job_postings', application.job_id);
    const employerId = application.employer_id || job.employer_id || job.user_id;
    const applicant = await getUserDocument(databases, databaseId, application.user_id);
    const applicantName = applicant?.full_name || 'An applicant';

    const applications = await databases.listDocuments(databaseId, 'applications', [
      Query.equal('job_id', application.job_id),
      Query.limit(100),
    ]);
    await databases.updateDocument(databaseId, 'job_postings', job.$id, {
      applicant_count: applications.total,
      accepted_count: applications.documents.filter((item) => item.status === 'accepted').length,
    }).catch((countError) => log(`Applicant count update skipped: ${countError.message}`));

    await createNotificationOnce(databases, databaseId, {
      user_id: employerId,
      title: 'New application received',
      message: `${applicantName} applied for ${job.title}.`,
      content: `${applicantName} applied for ${job.title}.`,
      notification_type: 'application_received',
      related_id: application.$id || application.application_id || '',
      is_read: false,
    });

    return res.json({ success: true });
  } catch (err) {
    error(err.message);
    return res.json({ success: false, error: err.message }, 500);
  }
};
