import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Banknote, Bookmark, BookmarkCheck, Calendar, ChevronLeft, FileText, MapPin, Briefcase, Paperclip, X } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { jobService } from '../../services/jobService';
import { fileService } from '../../services/fileService';
import { useAuth } from '../../context/AuthContext';
import { getApplicationStatusLabel, getCompanyLabel, getDepartmentForJob, getSalaryLabel, getUserId } from '../../utils/jobUtils';

export default function JobDetails() {
  const { id } = useLocalSearchParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [applyVisible, setApplyVisible] = useState(false);
  const [coverLetter, setCoverLetter] = useState('I am interested in this position.');
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const userId = getUserId(user);

  const fetchJobDetails = async () => {
    try {
      const response = await jobService.getJobWithApplicationStatus(id, userId);
      setJob(response);
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

  const pickDocument = async () => {
    if (!userId) {
      Alert.alert('Login required', 'Please login before uploading documents.');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      setUploading(true);
      const uploaded = await fileService.uploadPickedFile(result.assets[0], userId);
      setUploadedDocuments((current) => [...current, uploaded]);
    } catch (error) {
      Alert.alert('Upload failed', error.message || 'Could not upload this file.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitApplication = async () => {
    if (!userId) {
      Alert.alert('Error', 'You must be logged in to apply');
      return;
    }
    if (requiredDocuments.length > 0 && uploadedDocuments.length === 0) {
      Alert.alert('Documents required', 'Please upload the required documents before applying.');
      return;
    }
    setApplying(true);
    try {
      await jobService.applyForJob(userId, id, coverLetter.trim(), null, job.employer_id || job.user_id, uploadedDocuments);
      setJob((current) => ({
        ...current,
        hasApplied: true,
        applicationStatus: 'pending',
        applicant_count: Number(current?.applicant_count || 0) + 1,
      }));
      Alert.alert('Success', 'Application submitted successfully!');
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
  const applicationLabel = getApplicationStatusLabel(job.applicationStatus || 'pending');
  const actionTitle = isOwnJob ? 'Posted by you' : hasApplied ? applicationLabel : 'Apply Now';

  return (
    <View className="flex-1 bg-background dark:bg-darkBg">
      <View className="px-6 pt-12 flex-row items-center justify-between mb-6">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-white dark:bg-darkSurface p-2 rounded-xl shadow-sm border border-gray-100 dark:border-darkBorder mr-4"
          >
            <ChevronLeft size={24} color="#2563EB" />
          </TouchableOpacity>
          <Text className="text-text dark:text-darkText text-xl font-bold">Job Details</Text>
        </View>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          className="bg-white dark:bg-darkSurface p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-darkBorder"
        >
          {saved ? <BookmarkCheck size={22} color="#2563EB" /> : <Bookmark size={22} color="#2563EB" />}
        </TouchableOpacity>
      </View>

      <ScrollView className="px-6" showsVerticalScrollIndicator={false}>
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

        <View className="flex-row justify-between mb-8">
          <View className="bg-white dark:bg-darkSurface p-4 rounded-2xl flex-1 mr-2 items-center border border-gray-50 dark:border-darkBorder shadow-sm">
            <Banknote size={20} color="#2563EB" />
            <Text className="text-secondaryText dark:text-darkMuted text-xs mt-1">Salary</Text>
            <Text className="text-text dark:text-darkText font-bold text-sm text-center">{getSalaryLabel(job)}</Text>
          </View>
          <View className="bg-white dark:bg-darkSurface p-4 rounded-2xl flex-1 mx-2 items-center border border-gray-50 dark:border-darkBorder shadow-sm">
            <MapPin size={20} color="#2563EB" />
            <Text className="text-secondaryText dark:text-darkMuted text-xs mt-1">Location</Text>
            <Text className="text-text dark:text-darkText font-bold text-sm text-center">{job.location || 'Remote'}</Text>
          </View>
          <View className="bg-white dark:bg-darkSurface p-4 rounded-2xl flex-1 ml-2 items-center border border-gray-50 dark:border-darkBorder shadow-sm">
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
      </ScrollView>

      <View className="p-6 bg-white dark:bg-darkSurface border-t border-gray-100 dark:border-darkBorder">
        <Button
          title={actionTitle}
          onPress={() => !isOwnJob && !hasApplied && setApplyVisible(true)}
          disabled={isOwnJob || hasApplied}
        />
      </View>

      <Modal visible={applyVisible} transparent animationType="slide" onRequestClose={() => setApplyVisible(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <TouchableOpacity className="flex-1" activeOpacity={1} onPress={() => setApplyVisible(false)} />
          <View className="bg-white dark:bg-darkSurface rounded-t-3xl px-6 pt-6 pb-10">
            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-text dark:text-darkText text-xl font-bold">Apply for Job</Text>
              <TouchableOpacity onPress={() => setApplyVisible(false)} className="p-2">
                <X size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

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

            <TouchableOpacity
              onPress={pickDocument}
              disabled={uploading}
              className={`border border-dashed border-primary rounded-2xl p-4 flex-row items-center justify-center mb-4 ${uploading ? 'opacity-60' : ''}`}
            >
              <Paperclip size={18} color="#2563EB" />
              <Text className="text-primary font-bold ml-2">{uploading ? 'Uploading...' : 'Upload Image or PDF'}</Text>
            </TouchableOpacity>

            {uploadedDocuments.map((document) => (
              <View key={document.fileId} className="bg-gray-50 dark:bg-darkSurface2 rounded-2xl p-3 mb-2 flex-row items-center">
                <FileText size={18} color="#2563EB" />
                <Text className="text-secondaryText dark:text-darkMuted ml-3 flex-1" numberOfLines={1}>{document.name}</Text>
              </View>
            ))}

            <Button
              title="Submit Application"
              onPress={handleSubmitApplication}
              loading={applying}
              className="mt-4"
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}


