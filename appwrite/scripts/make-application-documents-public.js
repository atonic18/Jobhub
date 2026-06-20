const { Client, Permission, Query, Role, Storage } = require('node-appwrite');
require('dotenv').config();

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://sfo.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID || '1212125';
const apiKey = process.env.APPWRITE_API_KEY;
const bucketId = process.env.APPWRITE_APPLICATION_DOCUMENTS_BUCKET_ID || 'application_documents';

if (!apiKey) {
  console.error('APPWRITE_API_KEY is required.');
  process.exit(1);
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const storage = new Storage(client);

const unique = (values) => [...new Set(values.filter(Boolean))];

const run = async () => {
  let cursor;
  let updated = 0;
  let scanned = 0;

  do {
    const queries = [Query.limit(100)];
    if (cursor) queries.push(Query.cursorAfter(cursor));

    const response = await storage.listFiles({ bucketId, queries });
    for (const file of response.files) {
      scanned += 1;
      const permissions = unique([...(file.$permissions || []), Permission.read(Role.any())]);
      if (permissions.length === (file.$permissions || []).length) continue;

      await storage.updateFile({
        bucketId,
        fileId: file.$id,
        name: file.name,
        permissions,
      });
      updated += 1;
      console.log(`updated ${file.$id} ${file.name}`);
    }

    cursor = response.files.length > 0 ? response.files[response.files.length - 1].$id : null;
    if (response.files.length < 100) cursor = null;
  } while (cursor);

  console.log(`Finished. Scanned ${scanned} files, updated ${updated}.`);
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
