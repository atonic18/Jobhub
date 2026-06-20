export const JOB_DEPARTMENTS = [
  {
    id: 'design',
    name: 'Design',
    keywords: ['design', 'designer', 'ui', 'ux', 'figma', 'product design', 'visual'],
  },
  {
    id: 'development',
    name: 'Development',
    keywords: ['developer', 'engineer', 'software', 'frontend', 'backend', 'react', 'mobile', 'web'],
  },
  {
    id: 'marketing',
    name: 'Marketing',
    keywords: ['marketing', 'growth', 'seo', 'social media', 'campaign', 'brand'],
  },
  {
    id: 'writing',
    name: 'Writing',
    keywords: ['writer', 'writing', 'content', 'copywriter', 'editor', 'technical writing'],
  },
];

export const FREE_TIER_PARTICIPANT_LIMIT = 50;
export const FREE_TIER_ACTIVE_JOB_LIMIT = 3;
export const FREE_TIER_ACCEPTED_LIMIT = 5;
export const PREMIUM_MONTHLY_PRICE_XAF = 5;
export const APPLICATION_DOCUMENTS_BUCKET_ID = 'application_documents';
export const PROFILE_PICTURES_BUCKET_ID = APPLICATION_DOCUMENTS_BUCKET_ID;

const compactText = (value) => String(value || '').trim();
const normalizeText = (value) =>
  compactText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9+#.]+/g, ' ')
    .trim();

const stripCommonSuffix = (value) =>
  value
    .replace(/(ers|ies|ing|ed|es|s)$/i, (suffix) => {
      if (suffix === 'ies') return 'y';
      return '';
    })
    .trim();

export const toSkillArray = (skills) => {
  if (Array.isArray(skills)) return skills.map(compactText).filter(Boolean);
  return compactText(skills)
    .split(',')
    .map(compactText)
    .filter(Boolean);
};

export const getUserSkills = (user, profile) =>
  toSkillArray(profile?.skills || user?.skills || user?.prefs?.skills || []);

export const getUserTier = (user) => {
  const tier = String(user?.tier || user?.prefs?.tier || '').toLowerCase();
  return tier === 'premium' ? 'premium' : 'free';
};

export const getUserId = (user) => user?.user_id || user?.$id || user?.id;

export const getUserRole = (user) => {
  const role = user?.type || user?.role || user?.prefs?.type || user?.prefs?.role;
  if (role === 'employer') return 'employer';
  if (role === 'admin') return 'admin';
  return 'employee';
};

export const getRoleLabel = (role) => {
  if (role === 'employer') return 'Employer';
  if (role === 'admin') return 'Admin';
  return 'Job Seeker';
};

export const getCompanyLabel = (job) =>
  compactText(job?.company_name || job?.company || job?.employer_name) || 'Hiring company';

export const formatXaf = (amount) => {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return 'XAF 0';
  return `XAF ${Math.round(numeric).toLocaleString('en-US')}`;
};

export const getSalaryLabel = (job) => {
  if (job?.salary_range) return job.salary_range;
  const min = Number(job?.salary_min);
  const max = Number(job?.salary_max);
  if (min && max) return `${formatXaf(min)} - ${formatXaf(max)}`;
  if (min) return `From ${formatXaf(min)}`;
  if (max) return `Up to ${formatXaf(max)}`;
  return 'Negotiable';
};

const searchableJobText = (job) =>
  [
    job?.title,
    job?.description,
    job?.requirements,
    ...(Array.isArray(job?.required_skills) ? job.required_skills : []),
    job?.location,
    job?.job_type,
    job?.work_mode,
    job?.category,
    getCompanyLabel(job),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

const searchableJobTextNormalized = (job) => normalizeText(searchableJobText(job));

export const tokenizeText = (value) =>
  normalizeText(value)
    .split(' ')
    .map((token) => stripCommonSuffix(token))
    .filter((token) => token.length >= 2);

const keywordMatches = (skill, candidate) => {
  const normalizedSkill = stripCommonSuffix(normalizeText(skill));
  const normalizedCandidate = stripCommonSuffix(normalizeText(candidate));

  if (!normalizedSkill || !normalizedCandidate) return false;
  if (normalizedSkill === normalizedCandidate) return true;
  if (normalizedSkill.length < 3 || normalizedCandidate.length < 3) return false;

  return normalizedCandidate.includes(normalizedSkill) || normalizedSkill.includes(normalizedCandidate);
};

export const getDepartmentForJob = (job) => {
  if (job?.category) return job.category;
  const haystack = searchableJobText(job);
  const matched = JOB_DEPARTMENTS.find((department) =>
    department.keywords.some((keyword) => haystack.includes(keyword))
  );
  return matched?.name || compactText(job?.work_mode) || 'General';
};

export const jobMatchesDepartment = (job, departmentName) => {
  if (!departmentName) return true;
  const department = JOB_DEPARTMENTS.find((item) => item.name === departmentName || item.id === departmentName);
  if (!department) return true;
  const haystack = searchableJobText(job);
  return department.keywords.some((keyword) => haystack.includes(keyword));
};

export const jobMatchesSearch = (job, query) => {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return true;
  const haystack = searchableJobTextNormalized(job);
  const queryTokens = tokenizeText(normalizedQuery);
  if (haystack.includes(normalizedQuery)) return true;
  return queryTokens.every((token) =>
    haystack.includes(token) || tokenizeText(haystack).some((candidate) => keywordMatches(token, candidate))
  );
};

export const jobMatchesSkills = (job, skills) => {
  const skillList = toSkillArray(skills);
  if (skillList.length === 0) return false;

  const haystack = searchableJobTextNormalized(job);
  const jobTokens = tokenizeText(haystack);

  return skillList.some((skill) => {
    const normalizedSkill = normalizeText(skill);
    if (!normalizedSkill) return false;
    if (haystack.includes(normalizedSkill)) return true;

    return tokenizeText(normalizedSkill).some((skillToken) =>
      jobTokens.some((jobToken) => keywordMatches(skillToken, jobToken))
    );
  });
};

export const getJobSkillScore = (job, skills) => {
  const skillList = toSkillArray(skills);
  if (skillList.length === 0) return 0;

  return skillList.reduce((score, skill) => (
    jobMatchesSkills(job, [skill]) ? score + 1 : score
  ), 0);
};

export const sortJobsBySkillMatch = (jobs, skills) => {
  const skillList = toSkillArray(skills);
  if (skillList.length === 0) return jobs;

  return [...jobs].sort((a, b) => {
    const skillDelta = getJobSkillScore(b, skillList) - getJobSkillScore(a, skillList);
    if (skillDelta !== 0) return skillDelta;
    return new Date(b.$createdAt || 0) - new Date(a.$createdAt || 0);
  });
};

export const getRecommendedJobsForSkills = (jobs, skills) => {
  const skillList = toSkillArray(skills);
  if (skillList.length === 0) return [];
  return sortJobsBySkillMatch(
    jobs.filter((job) => jobMatchesSkills(job, skillList)),
    skillList
  );
};

export const getApplicationStatusLabel = (status) => {
  if (!status) return 'Pending';
  if (status === 'rejected') return 'Declined';
  if (status === 'declined') return 'Declined';
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export const formatTimestamp = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};
