const { Client, Databases, Storage, Query, Permission, Role } = require('node-appwrite');
const {
  APPLICATION_STATUSES,
  acceptedStatuses,
  createNotification,
  evaluateApplicantMatch,
  grantAttachmentAccess,
  parseArray,
  sendAcceptancePackage,
} = require('../shared/applicationWorkflow.js');

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

const getUserDocument = async (databases, databaseId, userId) => {
  const response = await databases.listDocuments(databaseId, 'users', [
    Query.equal('user_id', userId),
    Query.limit(1),
  ]);
  return response.documents[0] || null;
};

const getEmployeeProfile = async (databases, databaseId, userId) => {
  const response = await databases.listDocuments(databaseId, 'employees', [
    Query.equal('user_id', userId),
    Query.limit(1),
  ]).catch(() => ({ documents: [] }));
  return response.documents[0] || null;
};

const getEmployeeDocuments = async (databases, databaseId, userId) => {
  const response = await databases.listDocuments(databaseId, 'employee_documents', [
    Query.equal('user_id', userId),
    Query.limit(100),
  ]).catch(() => ({ documents: [] }));
  return response.documents || [];
};

const createNotificationOnce = async (databases, databaseId, payload) => {
  const existing = await databases.listDocuments(databaseId, 'notifications', [
    Query.equal('user_id', payload.user_id),
    Query.equal('notification_type', payload.notification_type),
    Query.equal('related_id', payload.related_id || ''),
    Query.limit(1),
  ]).catch(() => ({ total: 0 }));
  if (existing.total > 0) return existing.documents[0];
  return createNotification(databases, databaseId, payload);
};

const updateJobCounts = async (databases, databaseId, jobId) => {
  const applications = await databases.listDocuments(databaseId, 'applications', [
    Query.equal('job_id', jobId),
    Query.limit(100),
  ]);
  await databases.updateDocument(databaseId, 'job_postings', jobId, {
    applicant_count: applications.total,
    accepted_count: applications.documents.filter((item) => acceptedStatuses.includes(item.status)).length,
  }).catch(() => null);
  return applications;
};

const applicationPermissions = (application, employerId) => Array.from(new Set([
  ...(application.$permissions || []),
  Permission.read(Role.user(application.user_id)),
  Permission.update(Role.user(application.user_id)),
  Permission.delete(Role.user(application.user_id)),
  ...(employerId ? [Permission.read(Role.user(employerId))] : []),
]));

const grantEmployerAccess = async ({ databases, storage, databaseId, application, employerId }) => {
  if (!application?.$id || !application?.user_id || !employerId) return application;

  const updated = await databases.updateDocument(
    databaseId,
    'applications',
    application.$id,
    {},
    applicationPermissions(application, employerId)
  );

  const documents = parseArray(application.applied_documents).length > 0
    ? parseArray(application.applied_documents)
    : parseArray(application.documents);

  await Promise.all(documents.map((document) =>
    grantAttachmentAccess({
      storage,
      attachment: document,
      ownerId: application.user_id,
      readerIds: [employerId],
    })
  ));

  return updated;
};

module.exports = async ({ req, res, log, error }) => {
  const applicationPayload = parseBody(req);
  const databaseId = process.env.APPWRITE_DATABASE_ID || 'jobhub_db';

  if (!applicationPayload.job_id || !applicationPayload.user_id) {
    return res.json({ success: false, error: 'Application payload must include job_id and user_id.' }, 400);
  }

  const { databases, storage } = getClient();

  try {
    let application = applicationPayload.$id
      ? await databases.getDocument(databaseId, 'applications', applicationPayload.$id)
      : applicationPayload;
    const job = await databases.getDocument(databaseId, 'job_postings', application.job_id);
    const employerId = application.employer_id || job.employer_id || job.user_id;
    const applicant = await getUserDocument(databases, databaseId, application.user_id);
    const employeeProfile = await getEmployeeProfile(databases, databaseId, application.user_id);
    const employeeDocuments = await getEmployeeDocuments(databases, databaseId, application.user_id);
    const applicantName = applicant?.full_name || 'An applicant';

    application = await grantEmployerAccess({ databases, storage, databaseId, application, employerId });

    await updateJobCounts(databases, databaseId, job.$id);

    await createNotificationOnce(databases, databaseId, {
      user_id: employerId,
      title: 'New application received',
      message: `${applicantName} applied for ${job.title}.`,
      content: `${applicantName} applied for ${job.title}.`,
      notification_type: 'application_received',
      related_id: application.$id || application.application_id || '',
      is_read: false,
    });

    let nextStatus = APPLICATION_STATUSES.PENDING;
    let matchResult = null;
    let interviewId = '';

    if (job.auto_accept_enabled === true) {
      matchResult = evaluateApplicantMatch({
        job,
        applicant,
        profile: employeeProfile,
        documents: employeeDocuments,
      });
      nextStatus = matchResult.accepted
        ? (job.interview_required ? APPLICATION_STATUSES.INTERVIEW_SCHEDULED : APPLICATION_STATUSES.ACCEPTED)
        : APPLICATION_STATUSES.NEEDS_REVIEW;

      if (acceptedStatuses.includes(nextStatus)) {
        const packageResult = await sendAcceptancePackage({
          databases,
          storage,
          databaseId,
          application,
          job,
          employerId,
          status: nextStatus,
        });
        interviewId = packageResult.interviewId || '';
        job.acceptance_message = packageResult.messageText || '';
        job.acceptance_message_attachments = packageResult.attachments || [];
      } else {
        await createNotification(databases, databaseId, {
          user_id: application.user_id,
          title: 'Application needs review',
          message: `Your application for ${job.title} was received and needs employer review.`,
          notification_type: 'application_needs_review',
          related_id: application.$id,
        });
      }

      application = await databases.updateDocument(databaseId, 'applications', application.$id, {
        status: nextStatus,
        match_score: matchResult.score,
        match_reasons: matchResult.matched,
        auto_accept_audit: matchResult.audit,
        auto_decision_at: new Date().toISOString(),
        acceptance_message: job.acceptance_message || '',
        acceptance_message_attachments: parseArray(job.acceptance_message_attachments),
        interview_id: interviewId,
      });
      await updateJobCounts(databases, databaseId, job.$id);
    }

    return res.json({ success: true, application, status: nextStatus, match: matchResult });
  } catch (err) {
    error(err.message);
    return res.json({ success: false, error: err.message }, 500);
  }
};
