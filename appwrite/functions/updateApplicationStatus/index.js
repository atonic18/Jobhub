const { Client, Databases, Storage, Query } = require('node-appwrite');
const {
  APPLICATION_STATUSES,
  acceptedStatuses,
  createNotification,
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

const updateJobCounts = async (databases, databaseId, jobId, applicationId, nextStatus) => {
  const applications = await databases.listDocuments(databaseId, 'applications', [
    Query.equal('job_id', jobId),
    Query.limit(100),
  ]);
  const acceptedCount = applications.documents.filter((item) =>
    item.$id === applicationId ? acceptedStatuses.includes(nextStatus) : acceptedStatuses.includes(item.status)
  ).length;

  await databases.updateDocument(databaseId, 'job_postings', jobId, {
    applicant_count: applications.total,
    accepted_count: acceptedCount,
  });
};

module.exports = async ({ req, res, error }) => {
  const { applicationId, newStatus } = parseBody(req);
  const databaseId = process.env.APPWRITE_DATABASE_ID || 'jobhub_db';
  const callerId = req.headers['x-appwrite-user-id'];
  const requestedStatus = String(newStatus || '').toLowerCase();

  if (!applicationId || !requestedStatus) {
    return res.json({ success: false, error: 'applicationId and newStatus are required.' }, 400);
  }

  if (![
    APPLICATION_STATUSES.ACCEPTED,
    APPLICATION_STATUSES.REJECTED,
    APPLICATION_STATUSES.PENDING,
    APPLICATION_STATUSES.NEEDS_REVIEW,
    APPLICATION_STATUSES.INTERVIEW_SCHEDULED,
  ].includes(requestedStatus)) {
    return res.json({ success: false, error: 'Invalid application status.' }, 400);
  }

  const { databases, storage } = getClient();

  try {
    const application = await databases.getDocument(databaseId, 'applications', applicationId);
    const job = await databases.getDocument(databaseId, 'job_postings', application.job_id);
    const ownerId = job.employer_id || job.user_id;

    if (!callerId || ownerId !== callerId) {
      return res.json({ success: false, error: 'Only the employer who posted this job can update applicants.' }, 403);
    }

    const nextStatus = requestedStatus === APPLICATION_STATUSES.ACCEPTED && job.interview_required
      ? APPLICATION_STATUSES.INTERVIEW_SCHEDULED
      : requestedStatus;

    let interviewId = application.interview_id || '';
    let acceptanceMessage = application.acceptance_message || '';
    let acceptanceAttachments = parseArray(application.acceptance_message_attachments);
    if (acceptedStatuses.includes(nextStatus) && !acceptedStatuses.includes(application.status)) {
      const packageResult = await sendAcceptancePackage({
        databases,
        storage,
        databaseId,
        application,
        job,
        employerId: ownerId,
        status: nextStatus,
      });
      interviewId = packageResult.interviewId || interviewId;
      acceptanceMessage = packageResult.messageText || acceptanceMessage;
      acceptanceAttachments = packageResult.attachments || acceptanceAttachments;
    }

    const updated = await databases.updateDocument(databaseId, 'applications', applicationId, {
      status: nextStatus,
      acceptance_message: acceptanceMessage,
      acceptance_message_attachments: acceptanceAttachments,
      interview_id: interviewId,
    });

    await updateJobCounts(databases, databaseId, job.$id, applicationId, nextStatus);

    if (nextStatus === APPLICATION_STATUSES.REJECTED) {
      await createNotification(databases, databaseId, {
        user_id: application.user_id,
        title: 'Application declined',
        message: `Your application for ${job.title} was declined.`,
        notification_type: 'application_status',
        related_id: applicationId,
      });
    } else if (nextStatus === APPLICATION_STATUSES.NEEDS_REVIEW) {
      await createNotification(databases, databaseId, {
        user_id: application.user_id,
        title: 'Application needs review',
        message: `Your application for ${job.title} is waiting for employer review.`,
        notification_type: 'application_needs_review',
        related_id: applicationId,
      });
    } else if (nextStatus === APPLICATION_STATUSES.PENDING) {
      await createNotification(databases, databaseId, {
        user_id: application.user_id,
        title: 'Application pending',
        message: `Your application for ${job.title} is pending.`,
        notification_type: 'application_status',
        related_id: applicationId,
      });
    }

    return res.json({ success: true, application: updated });
  } catch (err) {
    error(err.message);
    return res.json({ success: false, error: err.message }, 500);
  }
};
