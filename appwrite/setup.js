const { Client, Databases, ID, Permission, Role } = require('node-appwrite');
require('dotenv').config();

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://sfo.cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID || '1212125')
  .setKey(process.env.APPWRITE_API_KEY || '');

if (!process.env.APPWRITE_API_KEY) {
  console.error('\x1b[31m%s\x1b[0m', 'ERROR: APPWRITE_API_KEY is missing!');
  console.log('\nTo resolve this:');
  console.log('1. Go to your Appwrite Console (Settings > API Keys)');
  console.log('2. Create a new API Key with these scopes:');
  console.log('   - Databases: read, write');
  console.log('   - Collections: read, write');
  console.log('   - Attributes: read, write');
  console.log('   - Indexes: read, write');
  console.log('3. Run the script with the key:');
  console.log('   $env:APPWRITE_API_KEY="your_key"; node appwrite/setup.js\n');
  process.exit(1);
}

const databases = new Databases(client);
const DATABASE_ID = 'jobhub_db';

async function setup() {
  try {
    console.log('\x1b[36m%s\x1b[0m', '--- Appwrite JobHub Setup ---');
    console.log('Endpoint:', client.config.endpoint);
    console.log('Project ID:', client.config.project);
    
    // Test Connection
    try {
      await databases.list(DATABASE_ID);
      console.log('Connection to Appwrite server verified.');
    } catch (e) {
      if (e.code === 401) {
        console.error('\x1b[31m%s\x1b[0m', 'ERROR: Invalid API Key or insufficient permissions.');
        process.exit(1);
      }
    }

    console.log('\nStarting database creation...');
    try {
      await databases.create(DATABASE_ID, 'JobHub Database');
      console.log('Database created');
    } catch (e) {
      console.log('Database might already exist');
    }

    // 2. Create Collections
    const collections = [
      { id: 'users', name: 'Users' },
      { id: 'job_seeker_profiles', name: 'Job Seeker Profiles' },
      { id: 'employer_profiles', name: 'Employer Profiles' },
      { id: 'job_postings', name: 'Job Postings' },
      { id: 'applications', name: 'Applications' },
      { id: 'saved_jobs', name: 'Saved Jobs' },
      { id: 'resumes', name: 'Resumes' },
      { id: 'conversations', name: 'Conversations' },
      { id: 'messages', name: 'Messages' },
      { id: 'notifications', name: 'Notifications' },
      { id: 'interviews', name: 'Interviews' },
      { id: 'reports', name: 'Reports' },
      { id: 'job_categories', name: 'Job Categories' },
      { id: 'employee_documents', name: 'Employee Documents' },
      { id: 'automatic_messages', name: 'Automatic Messages' },
      { id: 'message_attachments', name: 'Message Attachments' },
      { id: 'faq_items', name: 'FAQ Items' },
    ];

    const collectionPermissions = [
      Permission.read(Role.users()),
      Permission.create(Role.users()),
    ];

    for (const col of collections) {
      try {
        await databases.createCollection(DATABASE_ID, col.id, col.name);
        console.log(`Collection ${col.name} created`);
        
        // Use document-level security
        await databases.updateCollection(DATABASE_ID, col.id, col.name, collectionPermissions, true);
        
      } catch (e) {
        console.log(`Collection ${col.name} might already exist or error: ${e.message}`);
        // If it exists, we still want to update permissions to be sure
        try {
          await databases.updateCollection(DATABASE_ID, col.id, col.name, collectionPermissions, true);
          console.log(`Updated permissions for ${col.name}`);
        } catch (updateErr) {
          console.log(`Failed to update permissions for ${col.name}: ${updateErr.message}`);
        }
      }
    }

    // 3. Define Attributes
    console.log('Adding attributes (this might take a while)...');

    // Users
    await createStringAttribute(DATABASE_ID, 'users', 'user_id', 36, true);
    await createStringAttribute(DATABASE_ID, 'users', 'email', 255, true);
    await createStringAttribute(DATABASE_ID, 'users', 'full_name', 255, true);
    await createStringAttribute(DATABASE_ID, 'users', 'phone', 20, false);
    await createStringAttribute(DATABASE_ID, 'users', 'profile_pic_url', 500, false);
    await createBooleanAttribute(DATABASE_ID, 'users', 'is_verified', true, false);
    await createEnumAttribute(DATABASE_ID, 'users', 'type', ['employee', 'employer', 'admin'], true);

    // Job Seeker Profiles
    await createStringAttribute(DATABASE_ID, 'job_seeker_profiles', 'user_id', 36, true);
    await createStringAttribute(DATABASE_ID, 'job_seeker_profiles', 'bio', 1000, false);
    await createStringAttribute(DATABASE_ID, 'job_seeker_profiles', 'skills', 1000, false, true); // array
    await createStringAttribute(DATABASE_ID, 'job_seeker_profiles', 'resume_url', 500, false);
    await createStringAttribute(DATABASE_ID, 'job_seeker_profiles', 'title', 255, false);

    // Employer Profiles
    await createStringAttribute(DATABASE_ID, 'employer_profiles', 'user_id', 36, true);
    await createStringAttribute(DATABASE_ID, 'employer_profiles', 'company_name', 255, true);
    await createStringAttribute(DATABASE_ID, 'employer_profiles', 'company_logo_url', 500, false);
    await createStringAttribute(DATABASE_ID, 'employer_profiles', 'description', 2000, false);
    await createStringAttribute(DATABASE_ID, 'employer_profiles', 'website', 255, false);
    await createStringAttribute(DATABASE_ID, 'employer_profiles', 'business_type_detail', 255, false);
    await createBooleanAttribute(DATABASE_ID, 'employer_profiles', 'is_active', true, true);

    // Job Postings
    await createStringAttribute(DATABASE_ID, 'job_postings', 'job_id', 36, false);
    await createStringAttribute(DATABASE_ID, 'job_postings', 'user_id', 36, false);
    await createStringAttribute(DATABASE_ID, 'job_postings', 'category_id', 100, false);
    await createStringAttribute(DATABASE_ID, 'job_postings', 'employer_id', 36, true);
    await createStringAttribute(DATABASE_ID, 'job_postings', 'title', 255, true);
    await createStringAttribute(DATABASE_ID, 'job_postings', 'description', 5000, true);
    await createEnumAttribute(DATABASE_ID, 'job_postings', 'job_type', ['full-time', 'part-time', 'contract', 'internship'], true);
    await createIntegerAttribute(DATABASE_ID, 'job_postings', 'salary_min', false);
    await createIntegerAttribute(DATABASE_ID, 'job_postings', 'salary_max', false);
    await createStringAttribute(DATABASE_ID, 'job_postings', 'location', 255, true);
    await createEnumAttribute(DATABASE_ID, 'job_postings', 'work_mode', ['remote', 'on-site', 'hybrid'], true);
    await createBooleanAttribute(DATABASE_ID, 'job_postings', 'is_active', true, true);
    await createStringAttribute(DATABASE_ID, 'job_postings', 'requirements', 5000, false);
    await createStringAttribute(DATABASE_ID, 'job_postings', 'required_skills', 255, false, true);
    await createStringAttribute(DATABASE_ID, 'job_postings', 'required_documents', 255, false, true);
    await createIntegerAttribute(DATABASE_ID, 'job_postings', 'participants_needed', false);
    await createIntegerAttribute(DATABASE_ID, 'job_postings', 'applicant_count', false);
    await createIntegerAttribute(DATABASE_ID, 'job_postings', 'accepted_count', false);
    await createBooleanAttribute(DATABASE_ID, 'job_postings', 'interview_required', false, false);
    await createEnumAttribute(DATABASE_ID, 'job_postings', 'interview_type', ['none', 'physical', 'online', 'phone'], false);
    await createStringAttribute(DATABASE_ID, 'job_postings', 'interview_date', 50, false);
    await createStringAttribute(DATABASE_ID, 'job_postings', 'interview_time', 50, false);
    await createStringAttribute(DATABASE_ID, 'job_postings', 'interview_location', 1000, false);
    await createStringAttribute(DATABASE_ID, 'job_postings', 'interview_instructions', 5000, false);
    await createBooleanAttribute(DATABASE_ID, 'job_postings', 'auto_accept_enabled', false, false);
    await createStringAttribute(DATABASE_ID, 'job_postings', 'auto_accept_criteria', 5000, false);
    await createStringAttribute(DATABASE_ID, 'job_postings', 'acceptance_message', 5000, false);
    await createStringAttribute(DATABASE_ID, 'job_postings', 'acceptance_message_attachments', 4000, false, true);

    // Applications
    await createStringAttribute(DATABASE_ID, 'applications', 'job_id', 36, true);
    await createStringAttribute(DATABASE_ID, 'applications', 'user_id', 36, true);
    await createStringAttribute(DATABASE_ID, 'applications', 'employer_id', 36, false);
    await createEnumAttribute(DATABASE_ID, 'applications', 'status', ['pending', 'accepted', 'needs_review', 'interview_scheduled', 'rejected'], true);
    await createStringAttribute(DATABASE_ID, 'applications', 'cover_letter', 5000, false);
    await createStringAttribute(DATABASE_ID, 'applications', 'resume_url', 500, false);
    await createStringAttribute(DATABASE_ID, 'applications', 'applied_documents', 2000, false, true);
    await createIntegerAttribute(DATABASE_ID, 'applications', 'match_score', false);
    await createStringAttribute(DATABASE_ID, 'applications', 'match_reasons', 255, false, true);
    await createStringAttribute(DATABASE_ID, 'applications', 'auto_accept_audit', 2000, false);
    await createStringAttribute(DATABASE_ID, 'applications', 'auto_decision_at', 50, false);
    await createStringAttribute(DATABASE_ID, 'applications', 'acceptance_message', 5000, false);
    await createStringAttribute(DATABASE_ID, 'applications', 'acceptance_message_attachments', 4000, false, true);
    await createStringAttribute(DATABASE_ID, 'applications', 'interview_id', 36, false);

    // Saved Jobs
    await createStringAttribute(DATABASE_ID, 'saved_jobs', 'user_id', 36, true);
    await createStringAttribute(DATABASE_ID, 'saved_jobs', 'job_id', 36, true);

    // Conversations
    await createStringAttribute(DATABASE_ID, 'conversations', 'participants', 36, true, true); // array of user IDs

    // Messages
    await createStringAttribute(DATABASE_ID, 'messages', 'conversation_id', 36, true);
    await createStringAttribute(DATABASE_ID, 'messages', 'sender_id', 36, true);
    await createStringAttribute(DATABASE_ID, 'messages', 'content', 5000, true);
    await createStringAttribute(DATABASE_ID, 'messages', 'sent_at', 50, true);

    // Notifications
    await createStringAttribute(DATABASE_ID, 'notifications', 'user_id', 36, true);
    await createStringAttribute(DATABASE_ID, 'notifications', 'title', 255, true);
    await createStringAttribute(DATABASE_ID, 'notifications', 'message', 1000, true);
    await createStringAttribute(DATABASE_ID, 'notifications', 'content', 1000, false);
    await createStringAttribute(DATABASE_ID, 'notifications', 'notification_type', 100, false);
    await createStringAttribute(DATABASE_ID, 'notifications', 'related_id', 100, false);
    await createBooleanAttribute(DATABASE_ID, 'notifications', 'is_read', true, false);

    // Interviews
    await createStringAttribute(DATABASE_ID, 'interviews', 'job_id', 36, true);
    await createStringAttribute(DATABASE_ID, 'interviews', 'user_id', 36, true);
    await createStringAttribute(DATABASE_ID, 'interviews', 'scheduled_at', 50, true);
    await createStringAttribute(DATABASE_ID, 'interviews', 'location', 500, false); // URL or address
    await createStringAttribute(DATABASE_ID, 'interviews', 'notes', 1000, false);

    // Reports
    await createStringAttribute(DATABASE_ID, 'reports', 'user_id', 36, true);
    await createStringAttribute(DATABASE_ID, 'reports', 'title', 255, true);
    await createStringAttribute(DATABASE_ID, 'reports', 'content', 5000, true);
    await createStringAttribute(DATABASE_ID, 'reports', 'type', 50, true);

    // Job Categories
    await createStringAttribute(DATABASE_ID, 'job_categories', 'name', 255, true);
    await createStringAttribute(DATABASE_ID, 'job_categories', 'icon', 50, false);

    // 4. Create Indexes
    console.log('Waiting for attributes to be ready (5s)...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('Creating indexes...');
    await createIndex(DATABASE_ID, 'users', 'user_id_idx', 'key', ['user_id']);
    await createIndex(DATABASE_ID, 'job_seeker_profiles', 'user_id_idx', 'key', ['user_id']);
    await createIndex(DATABASE_ID, 'employer_profiles', 'user_id_idx', 'key', ['user_id']);
    await createIndex(DATABASE_ID, 'job_postings', 'employer_id_idx', 'key', ['employer_id']);
    await createIndex(DATABASE_ID, 'job_postings', 'is_active_idx', 'key', ['is_active']);
    await createIndex(DATABASE_ID, 'applications', 'user_id_idx', 'key', ['user_id']);
    await createIndex(DATABASE_ID, 'applications', 'job_id_idx', 'key', ['job_id']);
    await createIndex(DATABASE_ID, 'saved_jobs', 'user_id_idx', 'key', ['user_id']);
    await createIndex(DATABASE_ID, 'messages', 'conversation_id_idx', 'key', ['conversation_id']);
    await createIndex(DATABASE_ID, 'notifications', 'user_id_idx', 'key', ['user_id']);
    await createIndex(DATABASE_ID, 'employee_documents', 'user_id_idx', 'key', ['user_id']);

    // 5. Create Buckets
    console.log('Creating storage buckets...');
    const buckets = [
      { id: 'resumes', name: 'Resumes' },
      { id: 'profile_pics', name: 'Profile Pictures' },
      { id: 'company_logos', name: 'Company Logos' },
      { id: 'employee_documents', name: 'Employee Documents' },
      { id: 'message_attachments', name: 'Message Attachments' },
    ];

    const { Storage } = require('node-appwrite');
    const storage = new Storage(client);

    for (const bucket of buckets) {
      try {
        const sensitiveBucket = ['employee_documents', 'message_attachments', 'application_documents', 'resumes'].includes(bucket.id);
        const permissions = sensitiveBucket
          ? ['create("users")']
          : [
              'read("users")',
              'create("users")',
              'update("users")',
              'delete("users")'
            ];
        await storage.createBucket(bucket.id, bucket.name, [
          ...permissions
        ], true);
        console.log(`Bucket ${bucket.name} created`);
      } catch (e) {
        console.log(`Bucket ${bucket.name} might already exist: ${e.message}`);
      }
    }

    console.log('Setup completed successfully');
  } catch (error) {
    console.error('Setup failed:', error);
  }
}

async function createIndex(dbId, colId, key, type, attributes) {
  try {
    await databases.createIndex(dbId, colId, key, type, attributes);
    console.log(`Created index: ${colId}.${key}`);
  } catch (e) {
    console.log(`Index ${colId}.${key} might already exist or error: ${e.message}`);
  }
}

async function createStringAttribute(dbId, colId, key, size, required, array = false) {
  try { 
    await databases.createStringAttribute(dbId, colId, key, size, required, undefined, array); 
    console.log(`Created string attribute: ${colId}.${key}`);
  } catch (e) {
    console.log(`Attribute ${colId}.${key} might already exist or error: ${e.message}`);
  }
}
async function createBooleanAttribute(dbId, colId, key, required, xdefault) {
  try { 
    await databases.createBooleanAttribute(dbId, colId, key, required, xdefault); 
    console.log(`Created boolean attribute: ${colId}.${key}`);
  } catch (e) {
    if (e.message.includes('default value')) {
       // Try without default if required
       try {
         await databases.createBooleanAttribute(dbId, colId, key, required);
         console.log(`Created boolean attribute: ${colId}.${key} (no default)`);
       } catch (e2) {
         console.log(`Attribute ${colId}.${key} failed: ${e2.message}`);
       }
    } else {
      console.log(`Attribute ${colId}.${key} might already exist or error: ${e.message}`);
    }
  }
}
async function createIntegerAttribute(dbId, colId, key, required) {
  try { 
    await databases.createIntegerAttribute(dbId, colId, key, required); 
    console.log(`Created integer attribute: ${colId}.${key}`);
  } catch (e) {
    console.log(`Attribute ${colId}.${key} might already exist or error: ${e.message}`);
  }
}
async function createEnumAttribute(dbId, colId, key, elements, required) {
  try { 
    await databases.createEnumAttribute(dbId, colId, key, elements, required); 
    console.log(`Created enum attribute: ${colId}.${key}`);
  } catch (e) {
    console.log(`Attribute ${colId}.${key} might already exist or error: ${e.message}`);
  }
}

setup();
