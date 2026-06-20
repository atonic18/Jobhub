import { ID, Query, Permission, Role } from 'react-native-appwrite';
import { account, databases } from './appwrite';
import * as Linking from 'expo-linking';
import { toSkillArray } from '../utils/jobUtils';

const DATABASE_ID = 'jobhub_db';

export const authService = {
  // Login
  login: async (email, password) => {
    try {
      // Check if session already exists and delete it
      console.log('Attempting to delete current session before login...');
      await account.deleteSession('current');
      console.log('Previous session deleted.');
    } catch (e) {
      // No active session, ignore error
      console.log('No active session to delete or error deleting session:', e.message);
    }
    console.log('Creating new session for:', email);
    const session = await account.createEmailPasswordSession(email, password);
    console.log('Session created successfully:', session.$id);
    return session;
  },

  // Register
  register: async (email, password, fullName, type, skills = []) => {
    try {
      // Check if session already exists and delete it
      console.log('Attempting to delete current session before registration...');
      await account.deleteSession('current');
      console.log('Previous session deleted.');
    } catch (e) {
      // No active session, ignore error
      console.log('No active session to delete or error deleting session:', e.message);
    }
    const userAccount = await account.create(ID.unique(), email, password, fullName);
    console.log('User account created:', userAccount.$id);
    await account.createEmailPasswordSession(email, password);
    console.log('Session created after registration.');
    try {
      await account.updatePrefs({ type, full_name: fullName, skills: toSkillArray(skills), tier: 'free' });
      console.log('Account preferences saved after registration.');
    } catch (prefsError) {
      console.error('Error saving account preferences:', prefsError.message);
    }
    
    // Create user document
    console.log('Creating user document in database for:', userAccount.$id);
    const userPermissions = [
      Permission.read(Role.user(userAccount.$id)),
      Permission.update(Role.user(userAccount.$id)),
      Permission.delete(Role.user(userAccount.$id)),
      Permission.read(Role.users()), // Allow other users to see basic info (like in chat/job details)
    ];

    try {
      await databases.createDocument(DATABASE_ID, 'users', ID.unique(), {
        user_id: userAccount.$id,
        email,
        full_name: fullName,
        profile_pic_url: '',
        type,
        tier: 'free',
        is_verified: false,
      }, userPermissions);
      console.log('User document created successfully');
    } catch (dbError) {
      console.error('Error creating user document:', dbError.message);
      // We don't throw here so the user is still registered, but they will have needsProfile: true
    }

    // Create empty profile based on type
    try {
      if (type === 'employee') {
        await databases.createDocument(DATABASE_ID, 'employees', ID.unique(), {
          user_id: userAccount.$id,
          title: '',
          bio: '',
          skills: toSkillArray(skills),
          location: '',
          show_profile_to_employers: true,
        }, userPermissions);
        console.log('Job seeker profile created');
      } else if (type === 'employer') {
        await databases.createDocument(DATABASE_ID, 'employer_profiles', ID.unique(), {
          user_id: userAccount.$id,
          company_name: fullName,
          contact_email: email,
          contact_phone: '',
          location: '',
          industry: '',
          description: '',
          website: '',
          is_active: true,
        }, userPermissions);
        console.log('Employer profile created');
      }
    } catch (profileError) {
      console.error('Error creating profile document:', profileError.message);
    }

    return userAccount;
  },

  // Logout
  logout: async () => {
    try {
      return await account.deleteSession('current');
    } catch (error) {
      const message = error?.message || '';
      const alreadyLoggedOut =
        message.includes('missing scopes') ||
        message.includes('guests') ||
        message.includes('missing scope') ||
        message.includes('Session not found');

      if (alreadyLoggedOut) {
        console.log('Logout skipped: no active Appwrite session found.');
        return null;
      }

      throw error;
    }
  },

  updateTier: async (userId, tier) => {
    const normalizedTier = tier === 'premium' ? 'premium' : 'free';
    const userDoc = await databases.listDocuments(DATABASE_ID, 'users', [
      Query.equal('user_id', userId)
    ]);

    if (userDoc.total > 0) {
      await databases.updateDocument(DATABASE_ID, 'users', userDoc.documents[0].$id, {
        tier: normalizedTier,
      });
    }

    const currentPrefs = (await account.getPrefs()) || {};
    await account.updatePrefs({
      ...currentPrefs,
      tier: normalizedTier,
    });

    return normalizedTier;
  },

  // Get current user data with profile
  getCurrentUser: async () => {
    try {
      console.log('authService: Fetching current account...');
      const userAccount = await account.get();
      console.log('authService: Account found:', userAccount.$id);
      
      try {
        console.log('authService: Fetching user document from database...');
        const userDoc = await databases.listDocuments(DATABASE_ID, 'users', [
          Query.equal('user_id', userAccount.$id)
        ]);

        if (userDoc.total === 0) {
          console.log('authService: No user document found for ID:', userAccount.$id);
          return {
            ...userAccount,
            user_id: userAccount.$id,
            full_name: userAccount.name || userAccount.prefs?.full_name,
            type: userAccount.prefs?.type || 'employee',
            tier: userAccount.prefs?.tier || 'free',
            profile_pic_url: userAccount.prefs?.profile_pic_url || '',
            needsProfile: true,
          };
        }

        const profileDoc = userDoc.documents[0];
        console.log('authService: User document found:', profileDoc.$id);
        return {
          ...profileDoc,
          ...userAccount,
          account_id: userAccount.$id,
          user_doc_id: profileDoc.$id,
          user_id: profileDoc.user_id || userAccount.$id,
          full_name: profileDoc.full_name || userAccount.name,
          profile_pic_url: profileDoc.profile_pic_url || userAccount.prefs?.profile_pic_url || '',
          type: profileDoc.type,
          tier: profileDoc.tier || userAccount.prefs?.tier || 'free',
        };
      } catch (dbError) {
        console.error('authService: Database error fetching user document:', dbError.message);
        // If it's a 404 on the database/collection, we should know
        return { ...userAccount, needsProfile: true, dbError: dbError.message };
      }
    } catch (error) {
      console.log('authService: No active session found (account.get failed):', error.message);
      return null;
    }
  },

  // Forgot password
  forgotPassword: async (email) => {
    try {
      // Using Linking.createURL to generate a redirect URL for the app.
      // Note: This URL must be registered as a Web Platform in Appwrite console.
      // For mobile development, Appwrite requires a valid web redirect.
      const redirectUrl = Linking.createURL('reset-password');
      console.log('Generated redirect URL for password recovery:', redirectUrl);
      
      return await account.createRecovery(email, redirectUrl);
    } catch (error) {
      console.error('Forgot password error:', error);
      // Re-throw more descriptive error for UI if it's the platform registration issue
      if (error.message && error.message.includes('Invalid `url` param')) {
        throw new Error('Project setup incomplete: Please register "' + Linking.createURL('reset-password') + '" as a Web platform in your Appwrite console.');
      }
      throw error;
    }
  },

  // Reset password
  completePasswordReset: async (userId, secret, password, passwordAgain) => {
    try {
      return await account.updateRecovery(userId, secret, password, passwordAgain);
    } catch (error) {
      console.error('Complete password reset error:', error);
      throw error;
    }
  }
};
