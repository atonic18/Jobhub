const { Client, Databases, ID, Permission, Query, Role } = require('node-appwrite');

module.exports = async (context) => {
  const { res, log, error } = context;
  const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_FUNCTION_API_KEY);

  const databases = new Databases(client);

  try {
    const employees = await databases.listDocuments(DATABASE_ID, 'employees', [
      Query.equal('is_available', true)
    ]);

    for (const employee of employees.documents) {
      const matchedJobs = await databases.listDocuments(DATABASE_ID, 'job_postings', [
        Query.equal('category_id', employee.job_preference),
        Query.equal('is_active', true),
        Query.orderDesc('posted_date'),
        Query.limit(5)
      ]);

      if (matchedJobs.total > 0) {
        await databases.createDocument(DATABASE_ID, 'notifications', ID.unique(), {
          user_id: employee.user_id,
          title: 'Daily job digest',
          message: `We found ${matchedJobs.total} new jobs matching your profile!`,
          content: `We found ${matchedJobs.total} new jobs matching your profile!`,
          notification_type: 'daily_digest',
          related_id: '',
          is_read: false,
        }, [
          Permission.read(Role.user(employee.user_id)),
          Permission.update(Role.user(employee.user_id)),
          Permission.delete(Role.user(employee.user_id)),
        ]);
      }
    }

    return res.json({ success: true });
  } catch (err) {
    error(err.message);
    return res.json({ success: false, error: err.message }, 500);
  }
};
