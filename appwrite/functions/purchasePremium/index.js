const { Client, Databases, ID, Permission, Role } = require('node-appwrite');

module.exports = async (context) => {
  const { req, res, log, error } = context;
  const { jobId, paymentToken } = req.body;
  const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
  const callerId = req.headers['x-appwrite-user-id'];

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_FUNCTION_API_KEY);

  const databases = new Databases(client);

  try {
    const transaction = await databases.createDocument(DATABASE_ID, 'transactions', ID.unique(), {
      user_id: callerId,
      amount: 49.99,
      currency: 'USD',
      payment_method: 'Stripe',
      description: `Premium upgrade for job ${jobId}`,
      status: 'pending',
      created_at: new Date().toISOString()
    });

    const paymentSuccess = true;

    if (paymentSuccess) {
      await databases.updateDocument(DATABASE_ID, 'transactions', transaction.$id, {
        status: 'success'
      });
      await databases.updateDocument(DATABASE_ID, 'job_postings', jobId, {
        is_premium: true
      });

      await databases.createDocument(DATABASE_ID, 'notifications', ID.unique(), {
        user_id: callerId,
        title: 'Premium activated',
        message: 'Your job posting has been promoted to Premium!',
        content: 'Your job posting has been promoted to Premium!',
        notification_type: 'premium_activated',
        related_id: jobId,
        is_read: false,
      }, [
        Permission.read(Role.user(callerId)),
        Permission.update(Role.user(callerId)),
        Permission.delete(Role.user(callerId)),
      ]);
    } else {
      await databases.updateDocument(DATABASE_ID, 'transactions', transaction.$id, {
        status: 'failed'
      });
      return res.json({ success: false, error: 'Payment verification failed' });
    }

    return res.json({ success: true });
  } catch (err) {
    error(err.message);
    return res.json({ success: false, error: err.message }, 500);
  }
};
