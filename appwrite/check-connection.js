const { Client, Databases } = require('node-appwrite');
require('dotenv').config();

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://sfo.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID || '1212125';

console.log('\x1b[36m%s\x1b[0m', '--- Appwrite Connection Checker ---');
console.log('Testing connection to your Appwrite project...');
console.log(`Endpoint: ${endpoint}`);
console.log(`Project ID: ${projectId}`);

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId);

async function check() {
  try {
    // We try to list health or something public, but usually projects require some session or key.
    // Let's just try to reach the endpoint.
    const response = await fetch(`${endpoint}/health/version`);
    if (response.ok) {
      const data = await response.json();
      console.log('\x1b[32m%s\x1b[0m', '✅ SUCCESS: Successfully reached Appwrite server!');
      console.log(`Appwrite Version: ${data.version}`);
      console.log('\nNext Step:');
      console.log('You now need to run the setup script with an API Key.');
      console.log('Run: $env:APPWRITE_API_KEY="your_key_here"; node appwrite/setup.js');
    } else {
      console.error('\x1b[31m%s\x1b[0m', '❌ ERROR: Could not reach Appwrite server. Check your endpoint.');
    }
  } catch (e) {
    console.error('\x1b[31m%s\x1b[0m', '❌ ERROR: Connection failed.');
    console.error(e.message);
    console.log('\nSuggestions:');
    console.log('1. Check if your internet is working.');
    console.log('2. Verify the endpoint URL in appwrite.config.json.');
  }
}

check();
