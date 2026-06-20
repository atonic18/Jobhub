const { Client, Databases, Query } = require('node-appwrite');

module.exports = async (context) => {
  const { res, log, error } = context;
  const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_FUNCTION_API_KEY);

  const databases = new Databases(client);

  try {
    const now = new Date().toISOString();
    const expiredJobs = await databases.listDocuments(DATABASE_ID, 'job_postings', [
      Query.lessThan('application_deadline', now),
      Query.equal('is_active', true)
    ]);

    for (const job of expiredJobs.documents) {
      await databases.updateDocument(DATABASE_ID, 'job_postings', job.$id, {
        is_active: false
      });
      log(`Expired job ${job.$id} deactivated`);
    }

    return res.json({ success: true, count: expiredJobs.total });
  } catch (err) {
    error(err.message);
    return res.json({ success: false, error: err.message }, 500);
  }
};
