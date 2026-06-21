import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { ChevronLeft, FileText, Paperclip, X } from 'lucide-react-native';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { PressableSurface } from '../../components/ui/PressableSurface';
import { jobService } from '../../services/jobService';
import { fileService } from '../../services/fileService';
import { useAuth } from '../../context/AuthContext';
import { getUserId, toSkillArray } from '../../utils/jobUtils';

const INTERVIEW_OPTIONS = [
  { value: 'none', label: 'No interview required' },
  { value: 'physical', label: 'Physical interview' },
  { value: 'online', label: 'Online interview' },
  { value: 'phone', label: 'Phone interview' },
];

const DEFAULT_FORM_DATA = {
  title: '',
  description: '',
  job_type: 'full-time',
  salary_min: '',
  salary_max: '',
  location: '',
  work_mode: 'remote',
  requirements: '',
  participants_needed: '1',
  required_skills: '',
  required_documents: '',
  interview_type: 'none',
  interview_date: '',
  interview_time: '',
  interview_location: '',
  interview_instructions: '',
  auto_accept_enabled: false,
  auto_accept_criteria: '',
  acceptance_message: '',
};

const getParamValue = (value) => Array.isArray(value) ? value[0] : value;

const arrayToInput = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  return String(value || '');
};

const splitRequirementsAndCriteria = (requirements, criteria) => {
  const cleanCriteria = String(criteria || '').trim();
  const text = String(requirements || '').trim();
  const marker = 'Auto-accept criteria:';
  const markerIndex = text.lastIndexOf(marker);

  if (cleanCriteria || markerIndex === -1) {
    return { requirements: text, autoAcceptCriteria: cleanCriteria };
  }

  return {
    requirements: text.slice(0, markerIndex).trim(),
    autoAcceptCriteria: text.slice(markerIndex + marker.length).trim(),
  };
};

const getEditableAttachments = (value) => {
  const values = Array.isArray(value) ? value : [value].filter(Boolean);
  return values.map(fileService.parseFileReference).filter(Boolean);
};

const serializeAttachment = (attachment) => {
  const { isNew, ...storedAttachment } = attachment;
  return fileService.serializeFileReference(storedAttachment);
};

const getAttachmentKey = (attachment, index = '') =>
  attachment.fileId || attachment.url || attachment.name || String(index);

const buildFormDataFromJob = (job) => {
  const { requirements, autoAcceptCriteria } = splitRequirementsAndCriteria(
    job.requirements,
    job.auto_accept_criteria
  );

  return {
    ...DEFAULT_FORM_DATA,
    title: job.title || '',
    description: job.description || '',
    job_type: job.job_type || DEFAULT_FORM_DATA.job_type,
    salary_min: job.salary_min ? String(job.salary_min) : '',
    salary_max: job.salary_max ? String(job.salary_max) : '',
    location: job.location || '',
    work_mode: job.work_mode || DEFAULT_FORM_DATA.work_mode,
    requirements,
    participants_needed: String(job.participants_needed || 1),
    required_skills: arrayToInput(job.required_skills),
    required_documents: arrayToInput(job.required_documents),
    interview_type: job.interview_required ? job.interview_type || 'physical' : 'none',
    interview_date: job.interview_date || '',
    interview_time: job.interview_time || '',
    interview_location: job.interview_location || '',
    interview_instructions: job.interview_instructions || '',
    auto_accept_enabled: job.auto_accept_enabled === true,
    auto_accept_criteria: autoAcceptCriteria,
    acceptance_message: job.acceptance_message || '',
  };
};

export default function PostJob() {
  const { id } = useLocalSearchParams();
  const editingJobId = getParamValue(id);
  const isEditing = Boolean(editingJobId);
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const [attachments, setAttachments] = useState([]);
  const [loadingJob, setLoadingJob] = useState(Boolean(editingJobId));
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const userId = getUserId(user);

  useEffect(() => {
    let mounted = true;

    if (!editingJobId) {
      setFormData({ ...DEFAULT_FORM_DATA });
      setAttachments([]);
      setLoadingJob(false);
      return () => {
        mounted = false;
      };
    }

    if (!userId) {
      setLoadingJob(true);
      return () => {
        mounted = false;
      };
    }

    const loadJobForEdit = async () => {
      setLoadingJob(true);
      try {
        const job = await jobService.getJobEditDetails(editingJobId);
        if (!mounted) return;

        const ownerId = job.employer_id || job.user_id;
        if (ownerId && ownerId !== userId) {
          Alert.alert('Edit job', 'You can only edit jobs you posted.', [
            { text: 'OK', onPress: () => router.replace('/(employer)/jobs') },
          ]);
          return;
        }

        setFormData(buildFormDataFromJob(job));
        setAttachments(getEditableAttachments(job.acceptance_message_attachments));
      } catch (error) {
        if (!mounted) return;
        Alert.alert('Edit job', error.message || 'Could not load this job.', [
          { text: 'OK', onPress: () => router.replace('/(employer)/jobs') },
        ]);
      } finally {
        if (mounted) setLoadingJob(false);
      }
    };

    loadJobForEdit();

    return () => {
      mounted = false;
    };
  }, [editingJobId, router, userId]);

  const updateField = (key, value) => {
    setFormData((current) => ({ ...current, [key]: value }));
  };

  const selectOption = (field, value) => updateField(field, value);

  const pickAttachment = async () => {
    if (!userId || uploadingAttachment) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      setUploadingAttachment(true);
      const uploaded = await fileService.uploadMessageAttachment(result.assets[0], userId);
      setAttachments((current) => [...current, { ...uploaded, isNew: true }]);
    } catch (error) {
      Alert.alert('Attachment', error.message || 'Could not upload this attachment.');
    } finally {
      setUploadingAttachment(false);
    }
  };

  const removeAttachment = (attachmentKey) => {
    const attachment = attachments.find((item, index) => getAttachmentKey(item, index) === attachmentKey);
    setAttachments((current) => current.filter((item, index) => getAttachmentKey(item, index) !== attachmentKey));
    if (attachment?.isNew || !isEditing) {
      fileService.deleteStoredFile(attachment).catch(() => null);
    }
  };

  const handleSubmit = async () => {
    if (!userId) {
      Alert.alert('Login required', 'Please login again before saving this job.');
      return;
    }

    if (!formData.title.trim() || !formData.description.trim() || !formData.location.trim()) {
      Alert.alert('Missing details', 'Please fill all required fields: title, description, and location.');
      return;
    }

    const participantsNeeded = Number(formData.participants_needed || 1);
    if (!Number.isFinite(participantsNeeded) || participantsNeeded < 1) {
      Alert.alert('Workers needed', 'Enter at least 1 applicant or worker needed.');
      return;
    }

    const interviewRequired = formData.interview_type !== 'none';
    if (interviewRequired && (!formData.interview_date.trim() || !formData.interview_time.trim() || !formData.interview_location.trim())) {
      Alert.alert('Interview details', 'Interview date, time, and venue or meeting link are required.');
      return;
    }

    if (formData.auto_accept_enabled && !formData.auto_accept_criteria.trim() && !formData.required_skills.trim() && !formData.requirements.trim()) {
      Alert.alert('Auto-accept criteria', 'Add required skills, requirements, or auto-accept criteria.');
      return;
    }

    setLoading(true);
    try {
      const jobData = {
        ...formData,
        title: formData.title.trim(),
        description: formData.description.trim(),
        location: formData.location.trim(),
        requirements: formData.requirements.trim(),
        required_skills: toSkillArray(formData.required_skills || formData.requirements || formData.title),
        required_documents: formData.required_documents
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        salary_min: formData.salary_min ? parseInt(formData.salary_min, 10) : 0,
        salary_max: formData.salary_max ? parseInt(formData.salary_max, 10) : 0,
        participants_needed: participantsNeeded,
        category_id: 'general',
        interview_required: interviewRequired,
        interview_type: formData.interview_type,
        interview_date: formData.interview_date.trim(),
        interview_time: formData.interview_time.trim(),
        interview_location: formData.interview_location.trim(),
        interview_instructions: formData.interview_instructions.trim(),
        auto_accept_enabled: formData.auto_accept_enabled,
        auto_accept_criteria: formData.auto_accept_criteria.trim(),
        acceptance_message: formData.acceptance_message.trim(),
        acceptance_message_attachments: attachments.map(serializeAttachment),
      };
      if (isEditing) {
        await jobService.updateJobDetails(userId, editingJobId, jobData);
        Alert.alert(
          'Job updated',
          'Your changes have been saved.',
          [{ text: 'View Job', onPress: () => router.replace({ pathname: '/(employer)/job-details', params: { id: editingJobId } }) }]
        );
      } else {
        await jobService.createJob(userId, jobData);
        Alert.alert(
          'Job posted successfully',
          'Your job is now live. Matching employees will be notified.',
          [{ text: 'View Jobs', onPress: () => router.replace('/(employer)/jobs') }]
        );
      }
    } catch (error) {
      Alert.alert('Error', error.message || `Failed to ${isEditing ? 'update' : 'post'} job`);
    } finally {
      setLoading(false);
    }
  };

  const OptionChip = ({ label, selected, onPress }) => (
    <PressableSurface
      onPress={onPress}
      className={`px-4 py-2 rounded-xl border mr-2 mb-2 ${selected ? 'bg-primary border-primary' : 'bg-white dark:bg-darkSurface border-gray-200 dark:border-darkBorder'}`}
      shadow={false}
      pressedStyle={selected ? { backgroundColor: '#1D4ED8', borderColor: '#1D4ED8' } : { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }}
    >
      {({ pressed }) => (
        <Text className={`${selected ? 'text-white' : pressed ? 'text-primary' : 'text-secondaryText dark:text-darkMuted'} font-bold capitalize`}>{label}</Text>
      )}
    </PressableSurface>
  );

  if (loadingJob) {
    return (
      <View className="flex-1 bg-background dark:bg-darkBg items-center justify-center px-8">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="text-secondaryText dark:text-darkMuted mt-4">Loading job...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background dark:bg-darkBg"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView className="flex-1 bg-background dark:bg-darkBg px-6 pt-12 pb-10" keyboardShouldPersistTaps="handled">
        <View className="flex-row items-center mb-8">
          <TouchableOpacity activeOpacity={0.92}
            onPress={() => router.back()}
            className="bg-white dark:bg-darkSurface p-2 rounded-xl shadow-sm border border-gray-100 dark:border-darkBorder mr-4"
          >
            <ChevronLeft size={24} color="#2563EB" />
          </TouchableOpacity>
          <Text className="text-text dark:text-darkText text-xl font-bold">{isEditing ? 'Edit Job' : 'Post a Job'}</Text>
        </View>

        <Input
          label="Job Title"
          placeholder="e.g. Senior React Developer"
          value={formData.title}
          onChangeText={(text) => updateField('title', text)}
        />
        <Input
          label="Location"
          placeholder="e.g. Yaounde, Cameroon"
          value={formData.location}
          onChangeText={(text) => updateField('location', text)}
        />

        <View className="flex-row">
          <Input
            label="Min Salary (XAF)"
            placeholder="e.g. 80000"
            value={formData.salary_min}
            onChangeText={(text) => updateField('salary_min', text)}
            keyboardType="numeric"
            className="flex-1 mr-2"
          />
          <Input
            label="Max Salary (XAF)"
            placeholder="e.g. 120000"
            value={formData.salary_max}
            onChangeText={(text) => updateField('salary_max', text)}
            keyboardType="numeric"
            className="flex-1 ml-2"
          />
        </View>

        <Input
          label="Applicants or Workers Needed"
          placeholder="e.g. 5"
          value={formData.participants_needed}
          onChangeText={(text) => updateField('participants_needed', text.replace(/[^0-9]/g, ''))}
          keyboardType="numeric"
        />

        <Text className="text-text dark:text-darkText font-semibold mb-2 ml-1">Work Mode</Text>
        <View className="flex-row flex-wrap mb-6">
          {['remote', 'on-site', 'hybrid'].map((mode) => (
            <OptionChip key={mode} label={mode} selected={formData.work_mode === mode} onPress={() => selectOption('work_mode', mode)} />
          ))}
        </View>

        <Text className="text-text dark:text-darkText font-semibold mb-2 ml-1">Job Type</Text>
        <View className="flex-row flex-wrap mb-6">
          {['full-time', 'part-time', 'contract', 'internship'].map((type) => (
            <OptionChip key={type} label={type} selected={formData.job_type === type} onPress={() => selectOption('job_type', type)} />
          ))}
        </View>

        <Input
          label="Description"
          placeholder="Job description..."
          value={formData.description}
          onChangeText={(text) => updateField('description', text)}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          inputClassName="min-h-[120px]"
        />
        <Input
          label="Requirements"
          placeholder="Skills, tools, experience, certificates, or qualifications required..."
          value={formData.requirements}
          onChangeText={(text) => updateField('requirements', text)}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          inputClassName="min-h-[120px]"
        />
        <Input
          label="Required Skills"
          placeholder="React, Accounting, Sales"
          value={formData.required_skills}
          onChangeText={(text) => updateField('required_skills', text)}
        />
        <Input
          label="Required Documents"
          placeholder="CV, Certificate, ID card"
          value={formData.required_documents}
          onChangeText={(text) => updateField('required_documents', text)}
        />

        <View className="bg-white dark:bg-darkSurface border border-gray-100 dark:border-darkBorder rounded-3xl p-5 mb-6 shadow-sm">
          <Text className="text-text dark:text-darkText text-lg font-bold mb-3">Interview Options</Text>
          <View className="flex-row flex-wrap mb-2">
            {INTERVIEW_OPTIONS.map((option) => (
              <OptionChip
                key={option.value}
                label={option.label}
                selected={formData.interview_type === option.value}
                onPress={() => updateField('interview_type', option.value)}
              />
            ))}
          </View>
          {formData.interview_type !== 'none' ? (
            <>
              <Input label="Interview Date" placeholder="YYYY-MM-DD" value={formData.interview_date} onChangeText={(text) => updateField('interview_date', text)} />
              <Input label="Interview Time" placeholder="HH:MM" value={formData.interview_time} onChangeText={(text) => updateField('interview_time', text)} />
              <Input label="Venue or Meeting Link" placeholder="Office address or online meeting link" value={formData.interview_location} onChangeText={(text) => updateField('interview_location', text)} />
              <Input label="Interview Instructions" placeholder="What should accepted applicants prepare?" value={formData.interview_instructions} onChangeText={(text) => updateField('interview_instructions', text)} multiline numberOfLines={3} textAlignVertical="top" inputClassName="min-h-[90px]" />
            </>
          ) : null}
        </View>

        <View className="bg-white dark:bg-darkSurface border border-gray-100 dark:border-darkBorder rounded-3xl p-5 mb-6 shadow-sm">
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-1 mr-3">
              <Text className="text-text dark:text-darkText text-lg font-bold">Automatic Acceptance</Text>
              <Text className="text-secondaryText dark:text-darkMuted mt-1">Qualified applicants can be accepted automatically using job-related criteria only.</Text>
            </View>
            <TouchableOpacity activeOpacity={0.92}
              onPress={() => updateField('auto_accept_enabled', !formData.auto_accept_enabled)}
              className={`w-14 h-8 rounded-full p-1 ${formData.auto_accept_enabled ? 'bg-primary' : 'bg-gray-300 dark:bg-darkSurface2'}`}
            >
              <View className={`w-6 h-6 rounded-full bg-white ${formData.auto_accept_enabled ? 'self-end' : 'self-start'}`} />
            </TouchableOpacity>
          </View>
          {formData.auto_accept_enabled ? (
            <Input
              label="Auto-Accept Criteria"
              placeholder="React, accountant, CPA, 2 years experience"
              value={formData.auto_accept_criteria}
              onChangeText={(text) => updateField('auto_accept_criteria', text)}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              inputClassName="min-h-[90px]"
            />
          ) : null}
        </View>

        <View className="bg-white dark:bg-darkSurface border border-gray-100 dark:border-darkBorder rounded-3xl p-5 mb-6 shadow-sm">
          <Text className="text-text dark:text-darkText text-lg font-bold mb-3">Acceptance Message</Text>
          <Input
            label="Message Text"
            placeholder="Instructions shown when an applicant is accepted"
            value={formData.acceptance_message}
            onChangeText={(text) => updateField('acceptance_message', text)}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            inputClassName="min-h-[120px]"
          />
          <TouchableOpacity activeOpacity={0.92}
            onPress={pickAttachment}
            disabled={uploadingAttachment}
            className={`border border-dashed border-primary rounded-2xl p-4 flex-row items-center justify-center mb-4 ${uploadingAttachment ? 'opacity-60' : ''}`}
          >
            <Paperclip size={18} color="#2563EB" />
            <Text className="text-primary font-bold ml-2">{uploadingAttachment ? 'Uploading...' : 'Attach PDF or Image'}</Text>
          </TouchableOpacity>
          {attachments.map((attachment, index) => (
            <View key={getAttachmentKey(attachment, index)} className="bg-gray-50 dark:bg-darkSurface2 rounded-2xl p-3 mb-2 flex-row items-center">
              <FileText size={18} color="#2563EB" />
              <Text className="text-secondaryText dark:text-darkMuted ml-3 flex-1" numberOfLines={1}>{attachment.name || 'Attachment'}</Text>
              <TouchableOpacity activeOpacity={0.92} onPress={() => removeAttachment(getAttachmentKey(attachment, index))} className="p-1">
                <X size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <Button
          title={isEditing ? 'Save Changes' : 'Post Job Now'}
          onPress={handleSubmit}
          loading={loading}
          className="mt-4 mb-10"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
