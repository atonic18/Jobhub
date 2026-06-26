import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, Linking, KeyboardAvoidingView, Platform } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Banknote, Bookmark, BookmarkCheck, Calendar, ChevronLeft, FileText, MapPin, Briefcase, Paperclip, X } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { jobService } from '../../services/jobService';
import { fileService } from '../../services/fileService';
import { documentService } from '../../services/documentService';
import { useAuth } from '../../context/AuthContext';
import {
  APPLICATION_STATUSES,
  documentMatchesRequirement,
  getApplicationStatusLabel,
  getCompanyLabel,
  getDepartmentForJob,
  getDocumentTypeLabel,
  getMissingDocumentRequirements,
  getSalaryLabel,
  getUserId,
} from '../../utils/jobUtils';

export default function JobDetails() {
  const { id } = useLocalSearchParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [applyVisible, setApplyVisible] = useState(false);
  const [coverLetter, setCoverLetter] = useState('I am interested in this position.');
  const [employeeDocuments, setEmployeeDocuments] = useState([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState(new Set());
  const [application, setApplication] = useState(null);
  const router = useRouter();
  const { user } = useAuth();
  const userId = getUserId(user);

  const fetchJobDetails = async () => {
    try {
      const response = await jobService.getJobWithApplicationStatus(id, userId);
      setJob(response);
      if (response.applicationId) {
        const applicationResponse = await jobService.getApplication(response.applicationId).catch(() => null);
        setApplication(applicationResponse);
      } else {
        setApplication(null);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not load job details');
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedState = async () => {
    if (!userId || !id) return;
    try {
      const response = await jobService.getSavedJobRecords(userId);
      setSaved(response.documents.some((item) => item.job_id === id));
    } catch (error) {
      console.error('Failed to load saved state:', error.message);
    }
  };

  useEffect(() => {
    if (id) fetchJobDetails();
  }, [id, userId]);

  useFocusEffect(
    useCallback(() => {
      fetchSavedState();
    }, [userId, id])
  );

  const requiredDocuments = Array.isArray(job?.required_documents) ? job.required_documents.filter(Boolean) : [];

  const loadEmployeeDocuments = async () => {
    const response = await documentService.getDocuments(userId);
    return response.documents || [];
  };

  const openApplyModal = async () => {
    if (!userId) {
      Alert.alert('Login required', 'Please login before applying.');
      return;
    }

    try {
      const documents = await loadEmployeeDocuments();
      setEmployeeDocuments(documents);
      const missing = getMissingDocumentRequirements(documents, requiredDocuments);
      if (missing.length > 0) {
        Alert.alert(
          'Documents required',
          `Please upload these documents first: ${missing.join(', ')}`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Upload Documents', onPress: () => router.push('/(profile)/edit-profile') },
          ]
        );
        return;
      }
      const defaultSelected = documents
        .filter((document) =>
          requiredDocuments.length > 0
            ? requiredDocuments.some((requirement) => documentMatchesRequirement(document, requirement))
            : false
        )
        .map((document) => document.$id);
      setSelectedDocumentIds(new Set(defaultSelected));
      setApplyVisible(true);
    } catch (error) {
      Alert.alert('Documents', error.message || 'Could not load your documents.');
    }
  };

  const handleSubmitApplication = async () => {
    if (!userId) {
      Alert.alert('Error', 'You must be logged in to apply');
      return;
    }
    const selectedDocuments = employeeDocuments.filter((document) => selectedDocumentIds.has(document.$id));
    const missing = getMissingDocumentRequirements(selectedDocuments, requiredDocuments);
    if (missing.length > 0) {
      Alert.alert('Documents required', `Select documents that satisfy: ${missing.join(', ')}`);
      return;
    }
    setApplying(true);
    try {
      const createdApplication = await jobService.applyForJob(userId, id, coverLetter.trim(), null, job.employer_id || job.user_id, selectedDocuments);
      setJob((current) => ({
        ...current,
        hasApplied: true,
        applicationId: createdApplication.$id,
        applicationStatus: createdApplication.status || APPLICATION_STATUSES.PENDING,
        applicant_count: Number(current?.applicant_count || 0) + 1,
      }));
      setApplication(createdApplication);
      Alert.alert('Application submitted', `Current status: ${getApplicationStatusLabel(createdApplication.status || APPLICATION_STATUSES.PENDING)}.`);
      setApplyVisible(false);
      router.push('/(home)/applied');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to apply');
    } finally {
      setApplying(false);
    }
  };

  const handleSave = async () => {
    if (!userId) {
      Alert.alert('Login required', 'Please login before saving jobs.');
      return;
    }
    setSaving(true);
    const nextSaved = !saved;
    setSaved(nextSaved);
    try {
      if (nextSaved) {
        await jobService.saveJob(userId, id);
      } else {
        await jobService.unsaveJob(userId, id);
      }
    } catch (error) {
      setSaved(!nextSaved);
      Alert.alert('Saved jobs', error.message || 'Could not update this saved job.');
    } finally {
      setSaving(false);
    }
  };

  const openAttachment = async (attachmentValue) => {
    const url = fileService.getOpenUrl(attachmentValue);
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Attachment', 'Could not open this attachment.');
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-background dark:bg-darkBg">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!job) return null;
  const isOwnJob = userId && userId === (job.employer_id || job.user_id);
  const hasApplied = job.hasApplied || Boolean(job.applicationStatus);
  const currentStatus = application?.status || job.applicationStatus || APPLICATION_STATUSES.PENDING;
  const applicationLabel = getApplicationStatusLabel(currentStatus);
  const canSeeAcceptedDetails = [
    APPLICATION_STATUSES.ACCEPTED,
    APPLICATION_STATUSES.INTERVIEW_SCHEDULED,
  ].includes(currentStatus);
  const acceptanceMessage = application?.acceptance_message || job.acceptance_message || '';
  const acceptanceAttachments = application?.acceptance_message_attachments?.length
    ? application.acceptance_message_attachments
    : job.acceptance_message_attachments || [];
  const actionTitle = isOwnJob ? 'Posted by you' : hasApplied ? applicationLabel : 'Apply Now';

  return (
    <View className="flex-1 bg-background dark:bg-darkBg">
      <View className="px-6 pt-20 flex-row items-center justify-between mb-6">
        <View className="flex-row items-center">
          <TouchableOpacity activeOpacity={0.92}
            onPress={() => router.back()}
            className="bg-white dark:bg-darkSurface p-2 rounded-xl shadow-sm border border-gray-100 dark:border-darkBorder mr-4"
          >
            <ChevronLeft size={24} color="#2563EB" />
          </TouchableOpacity>
          <View>
            <Text className="text-secondaryText dark:text-darkMuted text-xs font-bold uppercase tracking-wider">Role overview</Text>
            <Text className="text-text dark:text-darkText text-2xl font-extrabold mt-1">Job Details</Text>
          </View>
        </View>
        <TouchableOpacity activeOpacity={0.92}
          onPress={handleSave}
          disabled={saving}
          className="bg-white dark:bg-darkSurface p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-darkBorder"
        >
          {saved ? <BookmarkCheck size={22} color="#2563EB" /> : <Bookmark size={22} color="#2563EB" />}
        </TouchableOpacity>
      </View>

      <ScrollView className="px-6" contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        <View className="items-center mb-8">
          <View className="w-20 h-20 bg-blue-100 dark:bg-darkSurface2 rounded-3xl items-center justify-center mb-4">
            <Briefcase size={40} color="#2563EB" />
          </View>
          <Text className="text-text dark:text-darkText text-2xl font-bold mb-1 text-center">{job.title}</Text>
          <Text className="text-secondaryText dark:text-darkMuted text-lg font-medium">{getCompanyLabel(job)}</Text>
          <View className="bg-blue-100 dark:bg-darkSurface2 px-3 py-1 rounded-full mt-3">
            <Text className="text-primary text-xs font-bold">{getDepartmentForJob(job)}</Text>
          </View>
        </View>

        <View className="mb-8">
          <View className="bg-white dark:bg-darkSurface p-4 rounded-2xl flex-1 mr-2 items-center border border-gray-50 dark:border-darkBorder shadow-sm">
            <Banknote size={20} color="#2563EB" />
            <Text className="text-secondaryText dark:text-darkMuted text-xs mt-1">Salary</Text>
            <Text className="text-text dark:text-darkText font-bold text-sm text-center">{getSalaryLabel(job)}</Text>
          </View>
          <View className="bg-white dark:bg-darkSurface p-4 rounded-2xl items-center border border-gray-50 dark:border-darkBorder shadow-sm mt-3">
            <MapPin size={20} color="#2563EB" />
            <Text className="text-secondaryText dark:text-darkMuted text-xs mt-1">Location</Text>
            <Text className="text-text dark:text-darkText font-bold text-sm text-center">{job.location || 'Remote'}</Text>
          </View>
          <View className="bg-white dark:bg-darkSurface p-4 rounded-2xl items-center border border-gray-50 dark:border-darkBorder shadow-sm mt-3">
            <Calendar size={20} color="#2563EB" />
            <Text className="text-secondaryText dark:text-darkMuted text-xs mt-1">Type</Text>
            <Text className="text-text dark:text-darkText font-bold text-sm text-center">{job.job_type || 'Open'}</Text>
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-text dark:text-darkText text-xl font-bold mb-3">Description</Text>
          <Text className="text-secondaryText dark:text-darkMuted leading-6">{job.description || 'No description provided.'}</Text>
        </View>

        <View className="mb-10">
          <Text className="text-text dark:text-darkText text-xl font-bold mb-3">Requirements</Text>
          <Text className="text-secondaryText dark:text-darkMuted leading-6">{job.requirements || 'No requirements provided.'}</Text>
        </View>

        {requiredDocuments.length > 0 ? (
          <View className="mb-10">
            <Text className="text-text dark:text-darkText text-xl font-bold mb-3">Required Documents</Text>
            {requiredDocuments.map((documentName) => (
              <View key={documentName} className="bg-white dark:bg-darkSurface border border-gray-100 dark:border-darkBorder rounded-2xl p-4 mb-2 flex-row items-center">
                <FileText size={18} color="#2563EB" />
                <Text className="text-secondaryText dark:text-darkMuted ml-3">{documentName}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {hasApplied ? (
          <View className="mb-10">
            <Text className="text-text dark:text-darkText text-xl font-bold mb-3">Application Status</Text>
            <View className="bg-white dark:bg-darkSurface border border-gray-100 dark:border-darkBorder rounded-3xl p-5">
              <View className="self-start bg-blue-100 dark:bg-darkSurface2 px-3 py-1 rounded-full mb-3">
                <Text className="text-primary text-xs font-bold">{applicationLabel}</Text>
              </View>
              {application?.auto_accept_audit ? (
                <Text className="text-secondaryText dark:text-darkMuted leading-5 mb-3">{application.auto_accept_audit}</Text>
              ) : null}
              {canSeeAcceptedDetails && acceptanceMessage ? (
                <>
                  <Text className="text-text dark:text-darkText font-bold mb-2">Acceptance Message</Text>
                  <Text className="text-secondaryText dark:text-darkMuted leading-5 mb-3">{acceptanceMessage}</Text>
                </>
              ) : null}
              {canSeeAcceptedDetails && acceptanceAttachments.length > 0 ? (
                <View className="mb-3">
                  <Text className="text-text dark:text-darkText font-bold mb-2">Message Attachments</Text>
                  {acceptanceAttachments.map((attachmentValue, index) => {
                    const attachment = fileService.parseFileReference(attachmentValue);
                    return (
                      <TouchableOpacity activeOpacity={0.92}
                        key={`${attachment?.fileId || index}`}
                        onPress={() => openAttachment(attachmentValue)}
                        className="bg-gray-50 dark:bg-darkSurface2 rounded-2xl p-3 mb-2 flex-row items-center"
                      >
                        <FileText size={18} color="#2563EB" />
                        <Text className="text-secondaryText dark:text-darkMuted ml-3 flex-1" numberOfLines={1}>
                          {attachment?.name || `Attachment ${index + 1}`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
              {canSeeAcceptedDetails && job.interview_required ? (
                <View>
                  <Text className="text-text dark:text-darkText font-bold mb-2">Interview Details</Text>
                  <Text className="text-secondaryText dark:text-darkMuted">Type: {job.interview_type || 'Interview'}</Text>
                  <Text className="text-secondaryText dark:text-darkMuted mt-1">Date and time: {[job.interview_date, job.interview_time].filter(Boolean).join(' ') || 'To be confirmed'}</Text>
                  {job.interview_location ? <Text className="text-secondaryText dark:text-darkMuted mt-1">Venue or link: {job.interview_location}</Text> : null}
                  {job.interview_instructions ? <Text className="text-secondaryText dark:text-darkMuted mt-1">Instructions: {job.interview_instructions}</Text> : null}
                </View>
              ) : null}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View className="p-6 bg-white dark:bg-darkSurface border-t border-gray-100 dark:border-darkBorder">
        <Button
          title={actionTitle}
          onPress={() => !isOwnJob && !hasApplied && openApplyModal()}
          disabled={isOwnJob || hasApplied}
        />
      </View>

      <Modal visible={applyVisible} transparent animationType="slide" onRequestClose={() => setApplyVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/40">
          <TouchableOpacity className="flex-1" activeOpacity={1} onPress={() => setApplyVisible(false)} />
          <View className="bg-white dark:bg-darkSurface rounded-t-3xl px-6 pt-6 pb-10 max-h-[88%]">
            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-text dark:text-darkText text-xl font-bold">Apply for Job</Text>
              <TouchableOpacity activeOpacity={0.92} onPress={() => setApplyVisible(false)} className="p-2">
                <X size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {requiredDocuments.length > 0 ? (
              <View className="mb-4">
                <Text className="text-text dark:text-darkText font-bold mb-2">Required Documents</Text>
                <Text className="text-secondaryText dark:text-darkMuted">
                  {requiredDocuments.join(', ')}
                </Text>
              </View>
            ) : null}

            <Text className="text-text dark:text-darkText font-bold mb-2">Cover Letter</Text>
            <TextInput
              value={coverLetter}
              onChangeText={setCoverLetter}
              multiline
              textAlignVertical="top"
              placeholder="Write a short message to the employer"
              placeholderTextColor="#64748B"
              className="min-h-[110px] bg-gray-50 dark:bg-darkSurface2 border border-gray-100 dark:border-darkBorder rounded-2xl p-4 text-text dark:text-darkText mb-4"
            />

            <View className="mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-text dark:text-darkText font-bold">Documents to Share</Text>
                <TouchableOpacity activeOpacity={0.92} onPress={() => router.push('/(profile)/edit-profile')} className="flex-row items-center">
                  <Paperclip size={16} color="#2563EB" />
                  <Text className="text-primary font-bold ml-1">Manage</Text>
                </TouchableOpacity>
              </View>
              {employeeDocuments.length === 0 ? (
                <View className="bg-gray-50 dark:bg-darkSurface2 rounded-2xl p-4">
                  <Text className="text-secondaryText dark:text-darkMuted">No uploaded documents. Manage your profile to add CVs or credentials.</Text>
                </View>
              ) : (
                employeeDocuments.map((document) => {
                  const selected = selectedDocumentIds.has(document.$id);
                  return (
                    <TouchableOpacity activeOpacity={0.92}
                      key={document.$id}
                      onPress={() => {
                        const next = new Set(selectedDocumentIds);
                        if (selected) next.delete(document.$id);
                        else next.add(document.$id);
                        setSelectedDocumentIds(next);
                      }}
                      className={`rounded-2xl p-3 mb-2 flex-row items-center border ${selected ? 'bg-blue-50 dark:bg-darkSurface2 border-primary' : 'bg-gray-50 dark:bg-darkSurface2 border-transparent'}`}
                    >
                      <FileText size={18} color="#2563EB" />
                      <View className="flex-1 ml-3">
                        <Text className="text-text dark:text-darkText font-bold" numberOfLines={1}>{document.file_name || 'Document'}</Text>
                        <Text className="text-secondaryText dark:text-darkMuted text-xs">{getDocumentTypeLabel(document.document_type)}</Text>
                      </View>
                      <View className={`w-5 h-5 rounded-full border ${selected ? 'bg-primary border-primary' : 'border-gray-300'}`} />
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            <Button
              title="Submit Application"
              onPress={handleSubmitApplication}
              loading={applying}
              className="mt-4"
            />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}


