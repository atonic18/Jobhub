const { ID, Permission, Query, Role } = require('node-appwrite');

const APPLICATION_STATUSES = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  NEEDS_REVIEW: 'needs_review',
  INTERVIEW_SCHEDULED: 'interview_scheduled',
  REJECTED: 'rejected',
};

const acceptedStatuses = [APPLICATION_STATUSES.ACCEPTED, APPLICATION_STATUSES.INTERVIEW_SCHEDULED];

const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9+#.]+/g, ' ')
    .trim();

const stripCommonSuffix = (value) =>
  value.replace(/(ers|ies|ing|ed|es|s)$/i, (suffix) => suffix === 'ies' ? 'y' : '').trim();

const tokenize = (value) =>
  normalizeText(value)
    .split(' ')
    .map(stripCommonSuffix)
    .filter((token) => token.length >= 2);

const parseArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch (error) {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
};

const parseFileReference = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return { url: value, name: 'Attachment' };
  }
};

const unique = (values) => Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));

const materialTokens = (value) => {
  const common = new Set(['and', 'or', 'the', 'for', 'with', 'job', 'role', 'work', 'year', 'years', 'required', 'needed']);
  return tokenize(value).filter((token) => token.length >= 3 && !common.has(token));
};

const phraseMatchesCandidate = (phrase, candidateText) => {
  const normalizedPhrase = normalizeText(phrase);
  if (!normalizedPhrase) return false;
  const normalizedCandidate = normalizeText(candidateText);
  if (normalizedCandidate.includes(normalizedPhrase)) return true;
  const candidateTokens = tokenize(normalizedCandidate);
  return materialTokens(normalizedPhrase).some((phraseToken) =>
    candidateTokens.some((candidateToken) =>
      candidateToken === phraseToken || candidateToken.includes(phraseToken) || phraseToken.includes(candidateToken)
    )
  );
};

const getCriteriaPhrases = (job) => {
  const skills = parseArray(job.required_skills);
  const criteria = unique([
    ...skills,
    ...String(job.auto_accept_criteria || '').split(/[,;\n]/),
  ]);

  if (criteria.length > 0) return criteria;

  const requirements = unique(String(job.requirements || '').split(/[,;\n]/));
  if (requirements.length > 0) return requirements;

  return unique([job.title]);
};

const buildCandidateText = ({ applicant, profile, documents }) => [
  applicant?.full_name,
  profile?.title,
  profile?.bio,
  ...(parseArray(profile?.skills)),
  profile?.experience,
  ...(parseArray(profile?.certificates)),
  profile?.qualifications,
  ...documents.flatMap((document) => [
    document.file_name,
    document.document_type,
    ...(parseArray(document.extracted_keywords)),
  ]),
].filter(Boolean).join(' ');

const evaluateApplicantMatch = ({ job, applicant, profile, documents }) => {
  const criteria = getCriteriaPhrases(job);
  const candidateText = buildCandidateText({ applicant, profile, documents });
  const matched = criteria.filter((phrase) => phraseMatchesCandidate(phrase, candidateText));
  const threshold = criteria.length <= 2 ? 1 : Math.ceil(criteria.length * 0.4);
  const accepted = matched.length >= threshold;

  return {
    accepted,
    score: matched.length,
    matched,
    criteria,
    audit: accepted
      ? `Automatically accepted because job-related criteria matched: ${matched.join(', ')}.`
      : `Marked for review because matched ${matched.length} of ${criteria.length} job-related criteria.`,
  };
};

const notificationPermissions = (userId) => [
  Permission.read(Role.user(userId)),
  Permission.update(Role.user(userId)),
  Permission.delete(Role.user(userId)),
];

const participantPermissions = (participants) => [
  ...participants.map((id) => Permission.read(Role.user(id))),
  ...participants.map((id) => Permission.update(Role.user(id))),
  ...participants.map((id) => Permission.delete(Role.user(id))),
];

const createNotification = async (databases, databaseId, payload) =>
  databases.createDocument(databaseId, 'notifications', ID.unique(), {
    user_id: payload.user_id,
    title: payload.title,
    message: payload.message || payload.content || '',
    content: payload.content || payload.message || '',
    notification_type: payload.notification_type || 'general',
    related_id: payload.related_id || '',
    is_read: false,
  }, notificationPermissions(payload.user_id));

const grantAttachmentAccess = async ({ storage, attachment, ownerId, readerIds }) => {
  const file = parseFileReference(attachment);
  if (!storage || !file?.bucketId || !file?.fileId || !ownerId) return null;
  const readers = unique([ownerId, ...readerIds]);
  const current = await storage.getFile(file.bucketId, file.fileId).catch(() => null);
  return storage.updateFile(
    file.bucketId,
    file.fileId,
    file.name || undefined,
    Array.from(new Set([
      ...(current?.$permissions || []),
      ...readers.map((readerId) => Permission.read(Role.user(readerId))),
      Permission.update(Role.user(ownerId)),
      Permission.delete(Role.user(ownerId)),
    ]))
  ).catch(() => null);
};

const getOrCreateConversation = async ({ databases, databaseId, employerId, applicantId }) => {
  const existing = await databases.listDocuments(databaseId, 'conversations', [
    Query.contains('participants', employerId),
    Query.contains('participants', applicantId),
    Query.limit(1),
  ]).catch(() => ({ total: 0, documents: [] }));

  if (existing.total > 0) return existing.documents[0];

  const participants = [employerId, applicantId];
  return databases.createDocument(databaseId, 'conversations', ID.unique(), {
    participants,
  }, participantPermissions(participants));
};

const createMessage = async ({ databases, databaseId, conversationId, senderId, recipientId, content, attachment }) => {
  const file = parseFileReference(attachment);
  const participants = [senderId, recipientId];
  return databases.createDocument(databaseId, 'messages', ID.unique(), {
    conversation_id: conversationId,
    sender_id: senderId,
    content: content || (file ? `Attachment: ${file.name || 'file'}` : ''),
    attachment_url: file?.url || '',
    attachment_name: file?.name || '',
    attachment_type: file?.type || '',
    hidden_for: [],
    sent_at: new Date().toISOString(),
  }, [
    ...participants.map((id) => Permission.read(Role.user(id))),
    Permission.update(Role.user(senderId)),
    Permission.delete(Role.user(senderId)),
  ]);
};

const getAutomaticMessage = async ({ databases, databaseId, jobId }) => {
  const response = await databases.listDocuments(databaseId, 'automatic_messages', [
    Query.equal('job_id', jobId),
    Query.limit(1),
  ]).catch(() => ({ total: 0, documents: [] }));
  return response.documents?.[0] || null;
};

const createInterviewIfNeeded = async ({ databases, databaseId, application, job, employerId }) => {
  if (!job.interview_required) return '';
  const scheduledAt = [job.interview_date, job.interview_time].filter(Boolean).join(' ');
  const instructions = [
    scheduledAt ? `Date and time: ${scheduledAt}` : '',
    job.interview_location ? `Venue or link: ${job.interview_location}` : '',
    job.interview_instructions || '',
  ].filter(Boolean).join('\n');
  const payload = {
    application_id: application.$id,
    employer_id: employerId,
    interview_type: job.interview_type || 'physical',
    meeting_link: job.interview_type === 'online' ? job.interview_location || '' : '',
    instructions,
  };

  const interview = await databases.createDocument(databaseId, 'interviews', ID.unique(), payload, [
    Permission.read(Role.user(employerId)),
    Permission.read(Role.user(application.user_id)),
    Permission.update(Role.user(employerId)),
    Permission.delete(Role.user(employerId)),
  ]);
  return interview.$id;
};

const sendAcceptancePackage = async ({ databases, storage, databaseId, application, job, employerId, status }) => {
  if (!acceptedStatuses.includes(status)) return { interviewId: '' };

  const automaticMessage = await getAutomaticMessage({ databases, databaseId, jobId: job.$id });
  const attachments = parseArray(job.acceptance_message_attachments).length > 0
    ? parseArray(job.acceptance_message_attachments)
    : parseArray(automaticMessage?.attachments);
  await Promise.all(attachments.map((attachment) =>
    grantAttachmentAccess({ storage, attachment, ownerId: employerId, readerIds: [application.user_id] })
  ));

  const conversation = await getOrCreateConversation({
    databases,
    databaseId,
    employerId,
    applicantId: application.user_id,
  });

  const messageText = automaticMessage?.message_text || job.acceptance_message || (
    job.interview_required
      ? `Your application for ${job.title} was accepted. Interview details are now available.`
      : `Your application for ${job.title} was accepted.`
  );

  if (messageText) {
    await createMessage({
      databases,
      databaseId,
      conversationId: conversation.$id,
      senderId: employerId,
      recipientId: application.user_id,
      content: messageText,
    });
  }

  await Promise.all(attachments.map((attachment) =>
    createMessage({
      databases,
      databaseId,
      conversationId: conversation.$id,
      senderId: employerId,
      recipientId: application.user_id,
      content: `Attachment: ${parseFileReference(attachment)?.name || 'file'}`,
      attachment,
    })
  ));

  const interviewId = await createInterviewIfNeeded({ databases, databaseId, application, job, employerId });

  await createNotification(databases, databaseId, {
    user_id: application.user_id,
    title: job.interview_required ? 'Interview scheduled' : 'Application accepted',
    message: job.interview_required
      ? `Your application for ${job.title} was accepted and an interview was scheduled.`
      : `Your application for ${job.title} was accepted.`,
    notification_type: job.interview_required ? 'interview_scheduled' : 'application_accepted',
    related_id: application.$id,
  });

  if (messageText || attachments.length > 0) {
    await createNotification(databases, databaseId, {
      user_id: application.user_id,
      title: 'Acceptance message received',
      message: messageText || 'You received acceptance message attachments.',
      notification_type: 'acceptance_message',
      related_id: application.$id,
    });
  }

  return { interviewId, messageText, attachments };
};

module.exports = {
  APPLICATION_STATUSES,
  acceptedStatuses,
  createNotification,
  evaluateApplicantMatch,
  grantAttachmentAccess,
  parseArray,
  parseFileReference,
  sendAcceptancePackage,
};
