import { ID, Query, Permission, Role } from 'react-native-appwrite';
import { databases, functions } from './appwrite';
import { APPLICATION_STATUSES, toSkillArray } from '../utils/jobUtils';
import { fileService } from './fileService';
import { documentService } from './documentService';
import { notificationService } from './notificationService';

const DATABASE_ID = 'jobhub_db';
const UPDATE_APPLICATION_STATUS_FUNCTION_ID = 'updateApplicationStatus';
const JOBHUB_ROUTER_FUNCTION_ID = 'sendMessage';

const getOwnerPermissions = (userId) => [
  Permission.read(Role.user(userId)),
  Permission.update(Role.user(userId)),
  Permission.delete(Role.user(userId)),
];

const isAuthorizationError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === 401 || error?.code === 403 || message.includes('not authorized') || message.includes('unauthorized');
};

const uniqueDocuments = (documents) => {
  const map = new Map();
  documents.forEach((document) => {
    map.set(document.$id, document);
  });
  return Array.from(map.values());
};

const isAcceptedLikeStatus = (status) =>
  status === APPLICATION_STATUSES.ACCEPTED || status === APPLICATION_STATUSES.INTERVIEW_SCHEDULED;

const getApplicationCountsByJob = async () => {
  try {
    const response = await databases.listDocuments(DATABASE_ID, 'applications', [Query.limit(100)]);
    return response.documents.reduce((counts, application) => {
      const jobId = application.job_id;
      if (!counts[jobId]) counts[jobId] = { applicantCount: 0, acceptedCount: 0 };
      counts[jobId].applicantCount += 1;
      if (isAcceptedLikeStatus(application.status)) counts[jobId].acceptedCount += 1;
      return counts;
    }, {});
  } catch (error) {
    console.error('Failed to load applicant counts:', error.message);
    return {};
  }
};

const attachApplicationCounts = async (documents) => {
  const counts = await getApplicationCountsByJob();
  return documents.map((job) => ({
    ...job,
    applicant_count: counts[job.$id]?.applicantCount ?? job.applicant_count ?? 0,
    accepted_count: counts[job.$id]?.acceptedCount ?? job.accepted_count ?? 0,
  }));
};

const getApplicationStatusByJob = async (userId) => {
  if (!userId) return {};
  try {
    const response = await databases.listDocuments(DATABASE_ID, 'applications', [
      Query.equal('user_id', userId),
      Query.limit(100),
    ]);
    return response.documents.reduce((map, application) => ({
      ...map,
      [application.job_id]: {
        applicationId: application.$id,
        status: application.status || 'pending',
      },
    }), {});
  } catch (error) {
    console.error('Failed to load application status map:', error.message);
    return {};
  }
};

const getUserProfilesByUserId = async (userIds) => {
  const ids = Array.from(new Set(userIds.filter(Boolean))).slice(0, 100);
  if (ids.length === 0) return {};

  try {
    const response = await databases.listDocuments(DATABASE_ID, 'users', [
      Query.equal('user_id', ids),
      Query.limit(100),
    ]);
    return response.documents.reduce((map, profile) => ({
      ...map,
      [profile.user_id]: profile,
    }), {});
  } catch (error) {
    console.error('Failed to load employer profile images:', error.message);
    return {};
  }
};

const attachEmployerProfiles = async (documents) => {
  const profilesByUserId = await getUserProfilesByUserId(
    documents.map((job) => job.employer_id || job.user_id)
  );

  return documents.map((job) => {
    const ownerId = job.employer_id || job.user_id;
    const profile = profilesByUserId[ownerId];
    return {
      ...job,
      employer_profile_pic_url: profile?.profile_pic_url || job.employer_profile_pic_url || '',
      employer_display_name: profile?.company_name || profile?.full_name || job.company || job.company_name || '',
    };
  });
};

const attachJobMetadata = async (documents, userId) => {
  const [jobsWithCounts, applicationStatusByJob] = await Promise.all([
    attachApplicationCounts(documents),
    getApplicationStatusByJob(userId),
  ]);

  const jobsWithProfiles = await attachEmployerProfiles(jobsWithCounts);

  return jobsWithProfiles.map((job) => {
    const ownerId = job.employer_id || job.user_id;
    const isOwnJob = userId && ownerId === userId;
    const application = applicationStatusByJob[job.$id];
    return {
      ...job,
      hasApplied: isOwnJob ? false : Boolean(application),
      applicationId: isOwnJob ? '' : application?.applicationId || '',
      applicationStatus: isOwnJob ? '' : application?.status || '',
    };
  });
};

const parseFunctionResponse = (execution) => {
  const raw = execution?.responseBody || execution?.response || '';
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (error) {
    return { raw };
  }
};

const executeApplicationStatusFunction = async ({ applicationId, jobId, newStatus }) => {
  const execution = await functions.createExecution(
    UPDATE_APPLICATION_STATUS_FUNCTION_ID,
    JSON.stringify({ applicationId, jobId, newStatus }),
    false
  );
  const body = parseFunctionResponse(execution);
  if (body?.success === false || body?.error) {
    throw new Error(body.error || 'Could not update this application.');
  }
  return body;
};

const executeRemoveApplicationFunction = async ({ applicationId }) => {
  const execution = await functions.createExecution(
    JOBHUB_ROUTER_FUNCTION_ID,
    JSON.stringify({ action: 'removeApplication', applicationId }),
    false
  );
  const body = parseFunctionResponse(execution);
  if (body?.success === false || body?.error) {
    throw new Error(body.error || 'Could not remove this application.');
  }
  return body;
};

const executeJobPostedNotificationFunction = async (job) => {
  const execution = await functions.createExecution(
    JOBHUB_ROUTER_FUNCTION_ID,
    JSON.stringify(job),
    false
  );
  const body = parseFunctionResponse(execution);
  if (body?.success === false || body?.error) {
    throw new Error(body.error || 'Could not create job notifications.');
  }
  return body;
};

const executeApplicationSubmittedFunction = async (application) => {
  const execution = await functions.createExecution(
    JOBHUB_ROUTER_FUNCTION_ID,
    JSON.stringify(application),
    false
  );
  const body = parseFunctionResponse(execution);
  if (body?.success === false || body?.error) {
    throw new Error(body.error || 'Could not process this application.');
  }
  return body;
};

const createAutomaticMessage = async (employerId, jobId, jobData) => {
  const messageParts = [
    jobData.acceptance_message,
    jobData.interview_instructions ? `Interview instructions: ${jobData.interview_instructions}` : '',
  ].map((item) => String(item || '').trim()).filter(Boolean);

  if (messageParts.length === 0 && !jobData.acceptance_message_attachments?.length) return null;

  return await databases.createDocument(DATABASE_ID, 'automatic_messages', ID.unique(), {
    job_id: jobId,
    employer_id: employerId,
    message_text: messageParts.join('\n\n'),
    attachments: jobData.acceptance_message_attachments || [],
  }, [
    Permission.read(Role.user(employerId)),
    Permission.update(Role.user(employerId)),
    Permission.delete(Role.user(employerId)),
  ]);
};

export const jobService = {
  // Get all active jobs
  getJobs: async (filters = []) => {
    const queries = [Query.equal('is_active', true), Query.orderDesc('$createdAt')];
    if (filters.length > 0) queries.push(...filters);
    
    return await databases.listDocuments(DATABASE_ID, 'job_postings', queries);
  },

  getJobsWithApplicantCounts: async (userIdOrFilters = null, maybeFilters = []) => {
    const userId = Array.isArray(userIdOrFilters) ? null : userIdOrFilters;
    const filters = Array.isArray(userIdOrFilters) ? userIdOrFilters : maybeFilters;
    const response = await jobService.getJobs(filters);
    return {
      ...response,
      documents: await attachJobMetadata(response.documents, userId),
    };
  },

  // Get job by ID
  getJob: async (jobId) => {
    return await databases.getDocument(DATABASE_ID, 'job_postings', jobId);
  },

  getJobWithApplicationStatus: async (jobId, userId) => {
    const job = await jobService.getJob(jobId);
    const [withMetadata] = await attachJobMetadata([job], userId);
    return withMetadata;
  },

  getEmployerJobs: async (employerId, options = {}) => {
    const { includeClosed = true } = options;
    const requests = [
      databases.listDocuments(DATABASE_ID, 'job_postings', [
        Query.equal('employer_id', employerId),
        Query.orderDesc('$createdAt'),
      ]),
      databases.listDocuments(DATABASE_ID, 'job_postings', [
        Query.equal('user_id', employerId),
        Query.orderDesc('$createdAt'),
      ]),
    ];

    const results = await Promise.allSettled(requests);
    const documents = results
      .filter((result) => result.status === 'fulfilled')
      .flatMap((result) => result.value.documents);
    const uniqueJobs = uniqueDocuments(documents);
    const filteredJobs = includeClosed
      ? uniqueJobs
      : uniqueJobs.filter((job) => job.is_active !== false);

    return {
      total: filteredJobs.length,
      documents: await attachApplicationCounts(filteredJobs),
    };
  },

  // Create new job (Employer)
  createJob: async (employerId, jobData) => {
    const participantsNeeded = Math.max(1, Number(jobData.participants_needed || 1));
    const jobId = ID.unique();
    const permissions = [
      Permission.read(Role.users()), // Authenticated users can read jobs
      Permission.update(Role.user(employerId)),
      Permission.delete(Role.user(employerId)),
    ];
    const requiredSkills = toSkillArray([
      ...(Array.isArray(jobData.required_skills) ? jobData.required_skills : toSkillArray(jobData.required_skills || '')),
      ...toSkillArray(jobData.auto_accept_criteria || ''),
    ]);
    const requirements = [
      jobData.requirements,
      jobData.auto_accept_criteria ? `Auto-accept criteria: ${jobData.auto_accept_criteria}` : '',
    ].map((item) => String(item || '').trim()).filter(Boolean).join('\n\n');

    const created = await databases.createDocument(DATABASE_ID, 'job_postings', jobId, {
      job_id: jobId,
      user_id: employerId,
      category_id: jobData.category_id || jobData.category || 'general',
      employer_id: employerId,
      title: jobData.title || '',
      description: jobData.description || '',
      job_type: jobData.job_type || 'full-time',
      location: jobData.location || '',
      work_mode: jobData.work_mode || 'remote',
      requirements,
      salary_min: Number.isFinite(Number(jobData.salary_min)) ? Number(jobData.salary_min) : 0,
      salary_max: Number.isFinite(Number(jobData.salary_max)) ? Number(jobData.salary_max) : 0,
      participants_needed: Number.isFinite(participantsNeeded) ? participantsNeeded : 1,
      required_skills: requiredSkills,
      required_documents: jobData.required_documents || [],
      interview_required: jobData.interview_required === true,
      interview_type: jobData.interview_required ? jobData.interview_type || 'physical' : 'none',
      interview_date: jobData.interview_date || '',
      interview_time: jobData.interview_time || '',
      interview_location: jobData.interview_location || '',
      auto_accept_enabled: jobData.auto_accept_enabled === true,
      applicant_count: 0,
      accepted_count: 0,
      is_active: true,
    }, permissions);

    await createAutomaticMessage(employerId, created.$id, jobData).catch((error) =>
      console.error('Failed to save automatic message:', error.message)
    );

    await notificationService.createNotification({
      userId: employerId,
      title: 'Job posted successfully',
      message: `${created.title} is now live.`,
      notificationType: 'job_posted',
      relatedId: created.$id,
    }).catch((error) => console.error('Failed to create employer job-post notification:', error.message));

    await executeJobPostedNotificationFunction(created).catch((error) =>
      console.error('Failed to create skill-match notifications:', error.message)
    );

    return created;
  },

  // Update job
  updateJob: async (jobId, jobData) => {
    return await databases.updateDocument(DATABASE_ID, 'job_postings', jobId, jobData);
  },

  // Delete/Deactivate job
  closeJob: async (jobId) => {
    return await databases.updateDocument(DATABASE_ID, 'job_postings', jobId, { is_active: false });
  },

  deleteJob: async (jobId) => {
    return await databases.deleteDocument(DATABASE_ID, 'job_postings', jobId);
  },

  // Save job
  saveJob: async (userId, jobId) => {
    const existing = await databases.listDocuments(DATABASE_ID, 'saved_jobs', [
      Query.equal('user_id', userId),
      Query.equal('job_id', jobId),
    ]);

    if (existing.total > 0) return existing.documents[0];

    return await databases.createDocument(DATABASE_ID, 'saved_jobs', ID.unique(), {
      user_id: userId,
      job_id: jobId,
    }, getOwnerPermissions(userId));
  },

  // Remove saved job
  unsaveJob: async (userId, jobId) => {
    const existing = await databases.listDocuments(DATABASE_ID, 'saved_jobs', [
      Query.equal('user_id', userId),
      Query.equal('job_id', jobId),
    ]);

    await Promise.all(
      existing.documents.map((saved) =>
        databases.deleteDocument(DATABASE_ID, 'saved_jobs', saved.$id)
      )
    );

    return existing.documents;
  },

  // Get saved job records
  getSavedJobRecords: async (userId) => {
    return await databases.listDocuments(DATABASE_ID, 'saved_jobs', [
      Query.equal('user_id', userId)
    ]);
  },

  // Get saved jobs
  getSavedJobs: async (userId) => {
    const response = await databases.listDocuments(DATABASE_ID, 'saved_jobs', [
      Query.equal('user_id', userId)
    ]);
    
    // Fetch actual job details for each saved job
    const jobPromises = response.documents.map(async (saved) => {
      const job = await databases.getDocument(DATABASE_ID, 'job_postings', saved.job_id);
      return { ...job, savedRecordId: saved.$id };
    });

    const results = await Promise.allSettled(jobPromises);
    const jobs = results
      .filter((result) => result.status === 'fulfilled')
      .map((result) => result.value);
    return await attachJobMetadata(jobs, userId);
  },

  // Apply for job
  applyForJob: async (userId, jobId, coverLetter, resumeUrl, employerId, uploadedDocuments = []) => {
    if (employerId && userId === employerId) {
      throw new Error('You cannot apply for a job you posted.');
    }

    const existing = await databases.listDocuments(DATABASE_ID, 'applications', [
      Query.equal('user_id', userId),
      Query.equal('job_id', jobId),
    ]);

    if (existing.total > 0) {
      throw new Error('You have already applied for this job.');
    }

    const applicationId = ID.unique();
    const jobOwnerId = employerId || '';
    const permissions = [
      Permission.read(Role.user(userId)),
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId)),
      ...(jobOwnerId ? [Permission.read(Role.user(jobOwnerId))] : []),
    ];
    const selectedDocuments = uploadedDocuments.map((document) =>
      typeof document === 'string' ? fileService.parseFileReference(document) : document
    ).filter(Boolean);
    if (selectedDocuments.length > 0 && jobOwnerId) {
      await documentService.grantEmployerAccess(selectedDocuments, userId, jobOwnerId);
    }
    const appliedDocuments = selectedDocuments.map((document) =>
      documentService.serializeForApplication(document)
    );
    const created = await databases.createDocument(DATABASE_ID, 'applications', applicationId, {
      application_id: applicationId,
      user_id: userId,
      job_id: jobId,
      employer_id: jobOwnerId,
      cover_letter: coverLetter,
      resume_url: resumeUrl,
      documents: appliedDocuments.length > 0 ? appliedDocuments : (resumeUrl ? [resumeUrl] : []),
      applied_documents: appliedDocuments,
      status: APPLICATION_STATUSES.PENDING,
      match_score: 0,
      match_reasons: [],
      auto_accept_audit: '',
      auto_decision_at: '',
      interview_id: '',
    }, permissions);

    const processed = await executeApplicationSubmittedFunction(created).catch((error) => {
      console.error('Application side effects failed:', error.message);
      return null;
    });

    await notificationService.createNotification({
      userId,
      title: 'Application submitted',
      message: 'Your application was submitted successfully.',
      notificationType: 'application_submitted',
      relatedId: created.$id,
    }).catch((error) => console.error('Failed to create application submitted notification:', error.message));

    return processed?.application || created;
  },

  updateApplicationStatus: async ({ application, job, status, employerUser }) => {
    if (!application?.$id || !job?.$id) throw new Error('Application and job are required.');
    const nextStatus = String(status || '').toLowerCase();
    if (![
      APPLICATION_STATUSES.ACCEPTED,
      APPLICATION_STATUSES.REJECTED,
      APPLICATION_STATUSES.PENDING,
      APPLICATION_STATUSES.NEEDS_REVIEW,
      APPLICATION_STATUSES.INTERVIEW_SCHEDULED,
    ].includes(nextStatus)) {
      throw new Error('Invalid application status.');
    }
    const employerId = job.employer_id || job.user_id;
    const callerId = employerUser?.user_id || employerUser?.$id || employerUser?.id;
    if (employerId && callerId && employerId !== callerId) {
      throw new Error('Only the employer who posted this job can update applicants.');
    }

    const functionResponse = await executeApplicationStatusFunction({
      applicationId: application.$id,
      jobId: job.$id,
      newStatus: nextStatus,
    });
    const updated = functionResponse.application || { ...application, status: nextStatus };

    try {
      const response = await jobService.getApplications('job', job.$id);
      const acceptedCount = response.documents.filter((item) =>
        item.$id === updated.$id ? isAcceptedLikeStatus(nextStatus) : isAcceptedLikeStatus(item.status)
      ).length;
      await jobService.updateJob(job.$id, {
        accepted_count: acceptedCount,
        applicant_count: response.total,
      });
    } catch (error) {
      console.error('Failed to update job counts:', error.message);
    }

    return updated;
  },

  // Get applications (for Job Seeker or Employer)
  getApplications: async (filterType, id) => {
    const query = filterType === 'user' ? Query.equal('user_id', id) : Query.equal('job_id', id);
    return await databases.listDocuments(DATABASE_ID, 'applications', [query, Query.orderDesc('$createdAt')]);
  },

  getApplication: async (applicationId) => {
    return await databases.getDocument(DATABASE_ID, 'applications', applicationId);
  },

  removeApplicationFromAppliedList: async (applicationId, userId) => {
    const application = await databases.getDocument(DATABASE_ID, 'applications', applicationId);
    if (application.user_id !== userId) {
      throw new Error('You can only remove your own applications.');
    }

    try {
      return await databases.deleteDocument(DATABASE_ID, 'applications', applicationId);
    } catch (error) {
      if (!isAuthorizationError(error)) throw error;
      return await executeRemoveApplicationFunction({ applicationId, userId });
    }
  },

  getApplicationsWithJobs: async (userId) => {
    const response = await databases.listDocuments(DATABASE_ID, 'applications', [
      Query.equal('user_id', userId),
      Query.orderDesc('$createdAt'),
    ]);

    const applications = await Promise.all(
      response.documents.map(async (application) => {
        try {
          const job = await databases.getDocument(DATABASE_ID, 'job_postings', application.job_id);
          return { ...application, job };
        } catch (error) {
          return { ...application, job: null };
        }
      })
    );

    return { ...response, documents: applications };
  }
};
