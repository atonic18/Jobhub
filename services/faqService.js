import { Query } from 'react-native-appwrite';
import { databases } from './appwrite';

const DATABASE_ID = 'jobhub_db';
const FAQ_COLLECTION = 'faq_items';

export const DEFAULT_FAQS = [
  {
    question: 'How do I apply for jobs?',
    answer: 'Open a job, review the requirements, choose the documents you want to share, and submit your application.',
    sort_order: 1,
    audience: 'all',
  },
  {
    question: 'How do employers post jobs?',
    answer: 'Employers use Post a Job to add the role, required skills, worker count, interview settings, auto-accept criteria, and acceptance message.',
    sort_order: 2,
    audience: 'all',
  },
  {
    question: 'How does CV upload work?',
    answer: 'Employees upload CVs, certificates, IDs, and supporting files from Edit Profile. Files are stored privately and shared only when selected for an application.',
    sort_order: 3,
    audience: 'all',
  },
  {
    question: 'How does automatic acceptance work?',
    answer: 'When enabled by an employer, the system compares job-related skills, CV text, credentials, experience, certificates, and keywords. Sensitive personal data is not used.',
    sort_order: 4,
    audience: 'all',
  },
  {
    question: 'How do interviews work?',
    answer: 'If an employer requires an interview, accepted applicants see the interview type, date, time, venue or link, and instructions in their application details.',
    sort_order: 5,
    audience: 'all',
  },
  {
    question: 'How do I edit profile information?',
    answer: 'Open Profile, then Edit Profile. Employees can update skills and documents, while employers can update company details and business type.',
    sort_order: 6,
    audience: 'all',
  },
  {
    question: 'How do I contact support?',
    answer: 'Use Contact Support in the Help Center to email the support team.',
    sort_order: 7,
    audience: 'all',
  },
];

export const faqService = {
  getFAQItems: async (audience = 'all') => {
    try {
      const response = await databases.listDocuments(DATABASE_ID, FAQ_COLLECTION, [
        Query.equal('is_active', true),
        Query.orderAsc('sort_order'),
        Query.limit(100),
      ]);
      const documents = response.documents.filter((item) =>
        !item.audience || item.audience === 'all' || item.audience === audience
      );
      return documents.length > 0 ? documents : DEFAULT_FAQS;
    } catch (error) {
      console.error('Failed to load FAQ items:', error.message);
      return DEFAULT_FAQS;
    }
  },
};
