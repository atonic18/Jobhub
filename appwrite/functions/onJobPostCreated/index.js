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

const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9+#.]+/g, ' ')
    .trim();

const tokenize = (value) =>
  normalizeText(value)
    .split(' ')
    .map((token) => token.replace(/(ers|ies|ing|ed|es|s)$/i, ''))
    .filter((token) => token.length >= 2);

const jobMatchesSkills = (job, skills = []) => {
  const skillList = Array.isArray(skills) ? skills : String(skills || '').split(',');
  const haystack = normalizeText([
    job.title,
    job.description,
    job.requirements,
    job.location,
    job.job_type,
    job.work_mode,
    ...(Array.isArray(job.required_skills) ? job.required_skills : []),
  ].filter(Boolean).join(' '));
  const jobTokens = tokenize(haystack);

  return skillList.some((skill) => {
    const normalizedSkill = normalizeText(skill);
    if (!normalizedSkill) return false;
    if (haystack.includes(normalizedSkill)) return true;
    return tokenize(normalizedSkill).some((skillToken) =>
      jobTokens.some((jobToken) => jobToken.includes(skillToken) || skillToken.includes(jobToken))
    );
  });
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
  const job = parseBody(req);
  const databaseId = process.env.APPWRITE_DATABASE_ID || 'jobhub_db';
  const employerId = job.employer_id || job.user_id;

  if (!job.$id && !job.job_id) {
    return res.json({ success: false, error: 'Job payload is required.' }, 400);
  }

  const { databases } = getClient();

  try {
    if (employerId) {
      await createNotificationOnce(databases, databaseId, {
        user_id: employerId,
        title: 'Job posted successfully',
        message: `${job.title} is now live.`,
        content: `${job.title} is now live.`,
        notification_type: 'job_posted',
        related_id: job.$id || job.job_id,
        is_read: false,
      });
    }

    const employees = await databases.listDocuments(databaseId, 'employees', [Query.limit(100)]);
    const matchingEmployees = employees.documents.filter((employee) =>
      employee.user_id !== employerId && jobMatchesSkills(job, employee.skills)
    );

    await Promise.all(
      matchingEmployees.map(async (employee) => {
        const message = `${job.title} matches your saved skills.`;
        await createNotificationOnce(databases, databaseId, {
          user_id: employee.user_id,
          title: 'New job matching your skills has been posted',
          message,
          content: message,
          notification_type: 'skill_match',
          related_id: job.$id || job.job_id,
          is_read: false,
        });

      })
    );

    return res.json({ success: true, notified: matchingEmployees.length });
  } catch (err) {
    error('Error processing job notification: ' + err.message);
    return res.json({ success: false, error: err.message }, 500);
  }
};
