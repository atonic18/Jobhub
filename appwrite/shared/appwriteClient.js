const { Client, Databases, Storage, Users, Messaging, Functions } = require('node-appwrite');

const getAppwriteClient = (endpoint, projectId, apiKey) => {
  const client = new Client();
  client
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  return {
    databases: new Databases(client),
    storage: new Storage(client),
    users: new Users(client),
    messaging: new Messaging(client),
    functions: new Functions(client),
  };
};

module.exports = { getAppwriteClient };
