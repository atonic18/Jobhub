const { Client, Databases, Storage, ID, Permission, Query, Role } = require('node-appwrite');
require('dotenv').config();

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://sfo.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID || '1212125';
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID || 'jobhub_db';

if (!apiKey) {
  console.error('APPWRITE_API_KEY is required. Create an API key with database, collection, attribute, index, and storage scopes.');
  process.exit(1);
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new Databases(client);
const storage = new Storage(client);

const collectionPermissions = [
  Permission.read(Role.users()),
  Permission.create(Role.users()),
];

const privateCollectionPermissions = [
  Permission.create(Role.users()),
];

const privateBucketPermissions = [
  Permission.create(Role.users()),
];

const createCollection = async (collectionId, name, permissions = collectionPermissions) => {
  try {
    await databases.createCollection(databaseId, collectionId, name, permissions, true);
    console.log(`created collection: ${collectionId}`);
  } catch (error) {
    console.log(`skipped collection ${collectionId}: ${error.message}`);
    try {
      await databases.updateCollection(databaseId, collectionId, name, permissions, true);
      console.log(`updated collection permissions: ${collectionId}`);
    } catch (updateError) {
      console.log(`skipped collection update ${collectionId}: ${updateError.message}`);
    }
  }
};

const createString = async (collectionId, key, size, required = false, array = false) => {
  try {
    await databases.createStringAttribute(databaseId, collectionId, key, size, required, undefined, array);
    console.log(`created string: ${collectionId}.${key}`);
  } catch (error) {
    console.log(`skipped string ${collectionId}.${key}: ${error.message}`);
  }
};

const createInteger = async (collectionId, key, required = false) => {
  try {
    await databases.createIntegerAttribute(databaseId, collectionId, key, required);
    console.log(`created integer: ${collectionId}.${key}`);
  } catch (error) {
    console.log(`skipped integer ${collectionId}.${key}: ${error.message}`);
  }
};

const createBoolean = async (collectionId, key, required = false, defaultValue = false) => {
  try {
    await databases.createBooleanAttribute(databaseId, collectionId, key, required, defaultValue);
    console.log(`created boolean: ${collectionId}.${key}`);
  } catch (error) {
    console.log(`skipped boolean ${collectionId}.${key}: ${error.message}`);
  }
};

const createEnum = async (collectionId, key, values, required = false, defaultValue) => {
  try {
    await databases.createEnumAttribute(databaseId, collectionId, key, values, required, defaultValue);
    console.log(`created enum: ${collectionId}.${key}`);
  } catch (error) {
    console.log(`skipped enum ${collectionId}.${key}: ${error.message}`);
  }
};

const updateEnum = async (collectionId, key, values, required = false, defaultValue) => {
  try {
    await databases.updateEnumAttribute(databaseId, collectionId, key, values, required, defaultValue ?? null);
    console.log(`updated enum: ${collectionId}.${key}`);
  } catch (error) {
    console.log(`skipped enum update ${collectionId}.${key}: ${error.message}`);
  }
};

const makeLegacyBooleanOptional = async (collectionId, key, defaultValue = false) => {
  try {
    const attribute = await databases.getAttribute(databaseId, collectionId, key);
    if (attribute.type !== 'boolean') {
      console.log(`skipped boolean update ${collectionId}.${key}: attribute is ${attribute.type}`);
      return;
    }
    if (attribute.required === false && attribute.default === defaultValue) {
      console.log(`skipped boolean update ${collectionId}.${key}: already optional`);
      return;
    }
    await databases.updateBooleanAttribute(databaseId, collectionId, key, false, defaultValue);
    console.log(`updated boolean: ${collectionId}.${key}`);
  } catch (error) {
    console.log(`skipped boolean update ${collectionId}.${key}: ${error.message}`);
  }
};

const createIndex = async (collectionId, key, type, attributes) => {
  try {
    await databases.createIndex(databaseId, collectionId, key, type, attributes);
    console.log(`created index: ${collectionId}.${key}`);
  } catch (error) {
    console.log(`skipped index ${collectionId}.${key}: ${error.message}`);
  }
};

const createOrUpdateBucket = async (bucketId, name, extensions) => {
  try {
    await storage.createBucket(bucketId, name, privateBucketPermissions, true, true, 10 * 1024 * 1024, extensions);
    console.log(`created bucket: ${bucketId}`);
  } catch (error) {
    console.log(`skipped bucket create ${bucketId}: ${error.message}`);
    try {
      await storage.updateBucket(bucketId, name, privateBucketPermissions, true, true, 10 * 1024 * 1024, extensions);
      console.log(`updated bucket: ${bucketId}`);
    } catch (updateError) {
      console.log(`skipped bucket update ${bucketId}: ${updateError.message}`);
    }
  }
};

const seedFaq = async () => {
  const existing = await databases.listDocuments(databaseId, 'faq_items', [Query.limit(1)]).catch(() => ({ total: 1 }));
  if (existing.total > 0) return;

  const items = [
    ['How do I apply for jobs?', 'Open a job, review the requirements, choose the documents you want to share, and submit your application.'],
    ['How do employers post jobs?', 'Employers use Post a Job to add the role, required skills, worker count, interview settings, auto-accept criteria, and acceptance message.'],
    ['How does CV upload work?', 'Employees upload CVs, certificates, IDs, and supporting files from Edit Profile. Files are stored privately and shared only when selected for an application.'],
    ['How does automatic acceptance work?', 'The system compares only job-related skills, CV text, credentials, experience, certificates, and keywords. Sensitive personal data is not used.'],
    ['How do interviews work?', 'Accepted applicants see the interview type, date, time, venue or link, and instructions in their application details.'],
    ['How do I edit profile information?', 'Open Profile, then Edit Profile. Employees can update skills and documents, while employers can update company details and business type.'],
    ['How do I contact support?', 'Use Contact Support in the Help Center to email the support team.'],
  ];

  await Promise.all(items.map(([question, answer], index) =>
    databases.createDocument(databaseId, 'faq_items', ID.unique(), {
      question,
      answer,
      audience: 'all',
      sort_order: index + 1,
      is_active: true,
    }, [Permission.read(Role.users())])
  ));
  console.log('seeded FAQ items');
};

const normalizeOldApplicationStatuses = async () => {
  const legacyStatuses = ['viewed', 'shortlisted', 'declined'];
  for (const status of legacyStatuses) {
    const response = await databases.listDocuments(databaseId, 'applications', [
      Query.equal('status', status),
      Query.limit(100),
    ]).catch(() => ({ documents: [] }));

    await Promise.all(response.documents.map((application) =>
      databases.updateDocument(databaseId, 'applications', application.$id, {
        status: status === 'declined' ? 'rejected' : 'pending',
      }).catch((error) => console.log(`skipped application status update ${application.$id}: ${error.message}`))
    ));
  }
};

const run = async () => {
  await createCollection('employee_documents', 'Employee Documents', privateCollectionPermissions);
  await createCollection('automatic_messages', 'Automatic Messages', privateCollectionPermissions);
  await createCollection('message_attachments', 'Message Attachments', privateCollectionPermissions);
  await createCollection('interviews', 'Interviews', privateCollectionPermissions);
  await createCollection('faq_items', 'FAQ Items', [Permission.read(Role.users())]);

  await createEnum('employer_profiles', 'business_type', ['corporate', 'small_scale'], false, 'corporate');
  await createString('employer_profiles', 'business_type_detail', 255);

  await createString('employees', 'experience', 5000);
  await createString('employees', 'certificates', 255, false, true);
  await createString('employees', 'qualifications', 5000);

  await createString('employee_documents', 'user_id', 36, true);
  await createEnum('employee_documents', 'document_type', ['cv', 'certificate', 'identity', 'supporting'], true);
  await createString('employee_documents', 'file_id', 100, true);
  await createString('employee_documents', 'bucket_id', 100, true);
  await createString('employee_documents', 'file_name', 255, true);
  await createString('employee_documents', 'file_type', 255);
  await createInteger('employee_documents', 'file_size');
  await createString('employee_documents', 'file_url', 1000);
  await createString('employee_documents', 'extracted_keywords', 255, false, true);
  await createEnum('employee_documents', 'scan_status', ['queued', 'processing', 'completed', 'failed'], false, 'queued');
  await createString('employee_documents', 'scan_error', 1000);

  await createBoolean('job_postings', 'interview_required', false, false);
  await createEnum('job_postings', 'interview_type', ['none', 'physical', 'online', 'phone'], false, 'none');
  await createString('job_postings', 'interview_date', 50);
  await createString('job_postings', 'interview_time', 50);
  await createString('job_postings', 'interview_location', 1000);
  await createString('job_postings', 'interview_instructions', 5000);
  await createBoolean('job_postings', 'auto_accept_enabled', false, false);
  await createString('job_postings', 'auto_accept_criteria', 5000);
  await createString('job_postings', 'acceptance_message', 5000);
  await createString('job_postings', 'acceptance_message_attachments', 4000, false, true);
  await makeLegacyBooleanOptional('job_postings', 'is_premium', false);

  await normalizeOldApplicationStatuses();
  await updateEnum('applications', 'status', ['pending', 'accepted', 'needs_review', 'interview_scheduled', 'rejected'], true);
  await createInteger('applications', 'match_score');
  await createString('applications', 'match_reasons', 255, false, true);
  await createString('applications', 'auto_accept_audit', 2000);
  await createString('applications', 'auto_decision_at', 50);
  await createString('applications', 'acceptance_message', 5000);
  await createString('applications', 'acceptance_message_attachments', 4000, false, true);
  await createString('applications', 'interview_id', 36);

  await createString('automatic_messages', 'job_id', 36, true);
  await createString('automatic_messages', 'employer_id', 36, true);
  await createString('automatic_messages', 'message_text', 5000);
  await createString('automatic_messages', 'attachments', 4000, false, true);

  await createString('message_attachments', 'owner_id', 36, true);
  await createString('message_attachments', 'job_id', 36);
  await createString('message_attachments', 'message_id', 36);
  await createString('message_attachments', 'bucket_id', 100, true);
  await createString('message_attachments', 'file_id', 100, true);
  await createString('message_attachments', 'file_name', 255, true);
  await createString('message_attachments', 'file_type', 255);
  await createInteger('message_attachments', 'file_size');

  await createString('interviews', 'application_id', 36);
  await createString('interviews', 'employer_id', 36);
  await createEnum('interviews', 'interview_type', ['physical', 'online', 'phone'], false);
  await createString('interviews', 'meeting_link', 1000);
  await createString('interviews', 'instructions', 5000);

  await createString('faq_items', 'question', 500, true);
  await createString('faq_items', 'answer', 5000, true);
  await createEnum('faq_items', 'audience', ['all', 'employee', 'employer'], false, 'all');
  await createInteger('faq_items', 'sort_order');
  await createBoolean('faq_items', 'is_active', false, true);

  await new Promise((resolve) => setTimeout(resolve, 5000));
  await createIndex('employee_documents', 'user_id_idx', 'key', ['user_id']);
  await createIndex('automatic_messages', 'job_id_idx', 'key', ['job_id']);
  await createIndex('message_attachments', 'owner_id_idx', 'key', ['owner_id']);
  await createIndex('faq_items', 'active_order_idx', 'key', ['is_active', 'sort_order']);

  await createOrUpdateBucket('application_documents', 'Application Documents', ['pdf', 'jpg', 'jpeg', 'png', 'webp']);

  await seedFaq();
  console.log('JobHub application upgrade migration finished.');
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
