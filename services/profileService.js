import { ID, Query, Permission, Role } from 'react-native-appwrite';
import { databases, storage } from './appwrite';
import { fileService } from './fileService';

const DATABASE_ID = 'jobhub_db';
const SEEKER_PROFILE_COLLECTION = 'employees';

const ownerPermissions = (userId) => [
  Permission.read(Role.user(userId)),
  Permission.update(Role.user(userId)),
  Permission.delete(Role.user(userId)),
  Permission.read(Role.users()),
];

const compactText = (value) => String(value || '').trim();

export const profileService = {
  // Update user base document
  updateUserDoc: async (userId, data, fallback = {}) => {
    const userDoc = await databases.listDocuments(DATABASE_ID, 'users', [
      Query.equal('user_id', userId)
    ]);
    if (userDoc.total === 0) {
      return await databases.createDocument(DATABASE_ID, 'users', ID.unique(), {
        user_id: userId,
        email: fallback.email || data.email || '',
        full_name: data.full_name || fallback.full_name || fallback.name || 'JobHub User',
        phone: data.phone || '',
        profile_pic_url: data.profile_pic_url || fallback.profile_pic_url || '',
        type: fallback.type || 'employee',
        tier: fallback.tier || 'free',
        is_verified: false,
      }, ownerPermissions(userId));
    }
    return await databases.updateDocument(DATABASE_ID, 'users', userDoc.documents[0].$id, data);
  },

  // Get/Update seeker profile
  getSeekerProfile: async (userId) => {
    const profile = await databases.listDocuments(DATABASE_ID, SEEKER_PROFILE_COLLECTION, [
      Query.equal('user_id', userId)
    ]);
    return profile.documents[0];
  },

  ensureSeekerProfile: async (userId, data = {}) => {
    const existing = await profileService.getSeekerProfile(userId);
    if (existing) return existing;

    return await databases.createDocument(DATABASE_ID, SEEKER_PROFILE_COLLECTION, ID.unique(), {
      user_id: userId,
      title: data.title || '',
      bio: data.bio || '',
      skills: Array.isArray(data.skills) ? data.skills : [],
      location: data.location || '',
      show_profile_to_employers: data.show_profile_to_employers !== false,
    }, ownerPermissions(userId));
  },

  updateSeekerProfile: async (profileId, data) => {
    return await databases.updateDocument(DATABASE_ID, SEEKER_PROFILE_COLLECTION, profileId, data);
  },

  getUserDoc: async (userId) => {
    const response = await databases.listDocuments(DATABASE_ID, 'users', [
      Query.equal('user_id', userId)
    ]);
    return response.documents[0];
  },

  uploadProfilePicture: async (userId, asset, fallback = {}) => {
    const uploaded = await fileService.uploadProfileImage(asset, userId);
    const updatedUser = await profileService.updateUserDoc(userId, {
      profile_pic_url: uploaded.url,
    }, fallback);
    return {
      uploaded,
      user: updatedUser,
      profile_pic_url: uploaded.url,
    };
  },

  getChatParticipantProfile: async (userId) => {
    if (!userId) {
      return {
        user_id: '',
        type: 'user',
        displayName: 'User',
        subtitle: 'Chat participant',
      };
    }

    const userDoc = await profileService.getUserDoc(userId).catch(() => null);
    const possibleEmployerProfile = userDoc?.type !== 'employee'
      ? await profileService.getEmployerProfile(userId).catch(() => null)
      : null;
    const type = userDoc?.type === 'employer' || possibleEmployerProfile ? 'employer' : 'employee';
    const fullName = compactText(userDoc?.full_name || userDoc?.name);

    if (type === 'employer') {
      const employerProfile = possibleEmployerProfile || (await profileService.getEmployerProfile(userId).catch(() => null));
      const companyName = compactText(employerProfile?.company_name);

      return {
        user_id: userId,
        type,
        fullName,
        companyName,
        displayName: companyName || fullName || 'Employer',
        profile_pic_url: compactText(userDoc?.profile_pic_url),
        subtitle: companyName && fullName && companyName !== fullName ? fullName : 'Employer',
      };
    }

    const seekerProfile = await profileService.getSeekerProfile(userId).catch(() => null);
    return {
      user_id: userId,
      type,
      fullName,
      displayName: fullName || 'Employee',
      profile_pic_url: compactText(userDoc?.profile_pic_url),
      subtitle: compactText(seekerProfile?.title) || 'Employee',
    };
  },

  getApplicantProfileSummary: async (userId) => {
    const [userResult, profileResult] = await Promise.allSettled([
      profileService.getUserDoc(userId),
      profileService.getSeekerProfile(userId),
    ]);
    const userDoc = userResult.status === 'fulfilled' ? userResult.value : null;
    const profile = profileResult.status === 'fulfilled' ? profileResult.value : null;
    const canShowDetails = profile?.show_profile_to_employers !== false;

    if (!canShowDetails) {
      return {
        user_id: userId,
        canShowDetails: false,
        full_name: 'Private applicant',
        title: 'Profile hidden',
        skills: [],
        email: '',
        phone: '',
      };
    }

    return {
      user_id: userId,
      canShowDetails: true,
      full_name: userDoc?.full_name || 'Applicant',
      profile_pic_url: userDoc?.profile_pic_url || '',
      email: userDoc?.email || '',
      phone: userDoc?.phone || '',
      title: profile?.title || '',
      bio: profile?.bio || '',
      location: profile?.location || '',
      skills: Array.isArray(profile?.skills) ? profile.skills : [],
    };
  },

  // Get/Update employer profile
  getEmployerProfile: async (userId) => {
    const profile = await databases.listDocuments(DATABASE_ID, 'employer_profiles', [
      Query.equal('user_id', userId)
    ]);
    return profile.documents[0];
  },

  ensureEmployerProfile: async (userId, data = {}) => {
    const existing = await profileService.getEmployerProfile(userId);
    if (existing) return existing;

    return await databases.createDocument(DATABASE_ID, 'employer_profiles', ID.unique(), {
      user_id: userId,
      company_name: data.company_name || data.full_name || 'Company',
      contact_email: data.contact_email || data.email || '',
      contact_phone: data.contact_phone || data.phone || '',
      location: data.location || '',
      industry: data.industry || '',
      description: data.description || '',
      website: data.website || '',
      is_active: true,
    }, ownerPermissions(userId));
  },

  updateEmployerProfile: async (profileId, data) => {
    return await databases.updateDocument(DATABASE_ID, 'employer_profiles', profileId, data);
  },

  // File Upload (Resumes, Logos)
  uploadFile: async (bucketId, file, userId) => {
    const permissions = [
      Permission.read(Role.users()),
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId)),
    ];
    return await storage.createFile(bucketId, ID.unique(), file, permissions);
  },

  getFilePreview: (bucketId, fileId) => {
    return storage.getFilePreview(bucketId, fileId);
  },

  getFileDownload: (bucketId, fileId) => {
    return storage.getFileDownload(bucketId, fileId);
  }
};
