const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Client, Functions, Role } = require('node-appwrite');
const { InputFile } = require('node-appwrite/file');

const root = path.resolve(__dirname, '..', '..');
const config = require(path.join(root, 'appwrite.config.json'));
const functionsConfig = require(path.join(root, 'appwrite', 'functions.json'));

const endpoint = process.env.APPWRITE_ENDPOINT || config.endpoint;
const projectId = process.env.APPWRITE_PROJECT_ID || config.projectId;
const apiKey = process.env.APPWRITE_API_KEY;
const selectedIds = process.argv.slice(2);
const selected = selectedIds.length > 0
  ? functionsConfig.filter((item) => selectedIds.includes(item.$id))
  : functionsConfig;

if (!apiKey) {
  console.error('APPWRITE_API_KEY is required.');
  process.exit(1);
}

if (selected.length === 0) {
  console.error('No matching functions selected.');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const functions = new Functions(client);
const archivePath = path.join(root, '.tmp-appwrite-functions.tar.gz');
const sourcePath = path.join(root, 'appwrite', 'functions');

const executeRoles = (roles = []) =>
  roles.map((role) => {
    if (role === 'users') return Role.users();
    if (role === 'guests') return Role.guests();
    if (role === 'any') return Role.any();
    return role;
  });

const createArchive = () => {
  if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath);
  execFileSync('tar', ['-czf', archivePath, '-C', sourcePath, '.'], { stdio: 'pipe' });
};

const waitForDeployment = async (functionId, deploymentId) => {
  const deadline = Date.now() + 8 * 60 * 1000;
  while (Date.now() < deadline) {
    const deployment = await functions.getDeployment({ functionId, deploymentId });
    if (['ready', 'failed'].includes(deployment.status)) return deployment;
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error(`Timed out waiting for deployment ${deploymentId}.`);
};

const ensureFunction = async (item) => {
  try {
    await functions.get({ functionId: item.$id });
    await functions.update({
      functionId: item.$id,
      name: item.name,
      runtime: item.runtime,
      execute: executeRoles(item.execute),
      events: item.events,
      schedule: item.schedule,
      timeout: item.timeout,
      enabled: item.enabled,
      logging: item.logging,
      entrypoint: item.entrypoint,
      commands: item.commands,
      scopes: item.scopes,
    });
    console.log(`Updated function ${item.$id}`);
  } catch (error) {
    if (error?.code !== 404) throw error;
    await functions.create({
      functionId: item.$id,
      name: item.name,
      runtime: item.runtime,
      execute: executeRoles(item.execute),
      events: item.events,
      schedule: item.schedule,
      timeout: item.timeout,
      enabled: item.enabled,
      logging: item.logging,
      entrypoint: item.entrypoint,
      commands: item.commands,
      scopes: item.scopes,
    });
    console.log(`Created function ${item.$id}`);
  }
};

const deployFunction = async (item) => {
  await ensureFunction(item);
  const deployment = await functions.createDeployment({
    functionId: item.$id,
    code: InputFile.fromPath(archivePath, 'appwrite-functions.tar.gz'),
    activate: true,
    entrypoint: item.entrypoint,
    commands: item.commands,
  });
  console.log(`Uploaded deployment ${deployment.$id} for ${item.$id}`);

  const finished = await waitForDeployment(item.$id, deployment.$id);
  if (finished.status !== 'ready') {
    throw new Error(`Deployment for ${item.$id} failed with status ${finished.status}.`);
  }
  console.log(`Deployment ready for ${item.$id}`);
};

(async () => {
  createArchive();
  try {
    for (const item of selected) {
      await deployFunction(item);
    }
  } finally {
    if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath);
  }
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
