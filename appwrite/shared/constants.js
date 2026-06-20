const UserRole = {
  EMPLOYEE: 'employee',
  EMPLOYER: 'employer',
};

const JobType = {
  FULL_TIME: 'full-time',
  PART_TIME: 'part-time',
  CONTRACT: 'contract',
  INTERNSHIP: 'internship',
};

const ApplicationStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  NEEDS_REVIEW: 'needs_review',
  INTERVIEW_SCHEDULED: 'interview_scheduled',
  REJECTED: 'rejected',
};

const ConversationStatus = {
  ACTIVE: 'active',
  CLOSED: 'closed',
};

const NotificationType = {
  JOB_APPLICATION: 'job_application',
  APPLICATION_STATUS: 'application_status',
  MESSAGE: 'message',
  REPORT: 'report',
};

const TransactionStatus = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
};

const ReportType = {
  JOB: 'job',
  USER: 'user',
  MESSAGE: 'message',
};

const ReportStatus = {
  PENDING: 'pending',
  REVIEWED: 'reviewed',
  RESOLVED: 'resolved',
};

module.exports = {
  UserRole,
  JobType,
  ApplicationStatus,
  ConversationStatus,
  NotificationType,
  TransactionStatus,
  ReportType,
  ReportStatus,
};
