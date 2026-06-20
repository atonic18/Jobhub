const { Client, Databases, Storage, Permission, Role } = require('node-appwrite');
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

const createBucket = async (bucketId, name, extensions) => {
  try {
    await storage.createBucket(
      bucketId,
      name,
      [
        Permission.read(Role.any()),
        Permission.read(Role.users()),
        Permission.create(Role.users()),
      ],
      true,
      true,
      10 * 1024 * 1024,
      extensions,
    );
    console.log(`created bucket: ${bucketId}`);
  } catch (error) {
    console.log(`skipped bucket ${bucketId}: ${error.message}`);
  }
};

const run = async () => {
  await createString('users', 'profile_pic_url', 1000);

  await createInteger('job_postings', 'applicant_count');
  await createInteger('job_postings', 'accepted_count');
  await createInteger('job_postings', 'max_accepted_count');
  await createString('job_postings', 'required_skills', 255, false, true);
  await createString('job_postings', 'required_documents', 255, false, true);

  await createString('applications', 'employer_id', 36);
  await createString('applications', 'applied_documents', 2000, false, true);

  await createString('messages', 'attachment_url', 1000);
  await createString('messages', 'attachment_name', 255);
  await createString('messages', 'attachment_type', 255);
  await createString('messages', 'hidden_for', 36, false, true);

  await createString('notifications', 'content', 1000);
  await createString('notifications', 'notification_type', 100);
  await createString('notifications', 'related_id', 100);
  await createBoolean('notifications', 'is_read', false, false);

  await createBucket('profile_pics', 'Profile Pictures', ['jpg', 'jpeg', 'png', 'webp']);
  await createBucket('application_documents', 'Application Documents', ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx']);

  console.log('JobHub fixes migration finished.');
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
