const { Client, Databases, Storage } = require('node-appwrite');
require('dotenv').config();

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://sfo.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID || '1212125';
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID || 'jobhub_db';

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new Databases(client);
const storage = new Storage(client);

const collections = [
  'users',
  'employees',
  'employer_profiles',
  'job_postings',
  'applications',
  'employee_documents',
  'automatic_messages',
  'message_attachments',
  'interviews',
  'faq_items',
  'messages',
  'notifications',
];

const run = async () => {
  for (const collectionId of collections) {
    try {
      const collection = await databases.getCollection(databaseId, collectionId);
      const attributes = await databases.listAttributes(databaseId, collectionId);
      console.log(`\n[${collectionId}] ${collection.name}`);
      console.log(attributes.attributes.map((attribute) => `${attribute.key}:${attribute.type}${attribute.array ? '[]' : ''}`).join(', '));
    } catch (error) {
      console.log(`\n[${collectionId}] missing: ${error.message}`);
    }
  }

  try {
    const buckets = await storage.listBuckets();
    console.log('\n[buckets]');
    console.log(buckets.buckets.map((bucket) => `${bucket.$id}:${bucket.name}`).join(', '));
  } catch (error) {
    console.log(`\n[buckets] error: ${error.message}`);
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
