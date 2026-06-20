import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, ChevronLeft, FileText, MessageSquare, ShieldOff, Trash2, Users, X } from 'lucide-react-native';
import { jobService } from '../../services/jobService';
import { chatService } from '../../services/chatService';
import { fileService } from '../../services/fileService';
import { profileService } from '../../services/profileService';
import { useAuth } from '../../context/AuthContext';
import { FREE_TIER_ACCEPTED_LIMIT, getApplicationStatusLabel, getSalaryLabel, getUserId, getUserTier } from '../../utils/jobUtils';
import { Button } from '../../components/ui/Button';
import { ProfileAvatar } from '../../components/ui/ProfileAvatar';

export default function EmployerJobDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const userId = getUserId(user);
  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  const loadDetails = async () => {
    if (!id) return;
    try {
      const [jobResponse, applicationResponse] = await Promise.all([
        jobService.getJob(id),
        jobService.getApplications('job', id),
      ]);
      setJob({
        ...jobResponse,
        applicant_count: applicationResponse.total,
        accepted_count: applicationResponse.documents.filter((item) => item.status === 'accepted').length,
      });
      const enrichedApplications = await Promise.all(
        applicationResponse.documents.map(async (application) => ({
          ...application,
          applicant: await profileService.getApplicantProfileSummary(application.user_id),
        }))
      );
      setApplications(enrichedApplications);
    } catch (error) {
      Alert.alert('Job details', error.message || 'Could not load this job.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDetails();
    setRefreshing(false);
  };

  const toggleJobStatus = async () => {
    if (!job) return;
    setUpdating(true);
    try {
      const updated = await jobService.updateJob(job.$id, { is_active: job.is_active === false });
      setJob(updated);
    } catch (error) {
      Alert.alert('Job status', error.message || 'Could not update this job.');
    } finally {
      setUpdating(false);
    }
  };

  const deleteJob = () => {
    if (!job) return;
    Alert.alert('Delete job', 'This will permanently remove the job and its posting from the app.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setUpdating(true);
          try {
            await jobService.deleteJob(job.$id);
            router.replace('/(employer)/jobs');
          } catch (error) {
            Alert.alert('Delete job', error.message || 'Could not delete this job.');
          } finally {
            setUpdating(false);
          }
        },
      },
    ]);
  };

  const messageApplicant = async (applicantId) => {
    try {
      const conversation = await chatService.getOrCreateConversation(userId, applicantId);
      router.push(`/(chat)/${conversation.$id}`);
    } catch (error) {
      Alert.alert('Chat', error.message || 'Could not open this conversation.');
    }
  };

  const updateApplicationStatus = async (application, status) => {
    setStatusUpdatingId(application.$id);
    try {
      const updated = await jobService.updateApplicationStatus({
        application,
        job,
        status,
        employerUser: user,
      });
      setApplications((current) =>
        current.map((item) => item.$id === application.$id ? { ...item, ...updated, applicant: item.applicant } : item)
      );
      const nextApplications = applications.map((item) => item.$id === application.$id ? { ...item, status } : item);
      setJob((current) => ({
        ...current,
        accepted_count: nextApplications.filter((item) => item.status === 'accepted').length,
        applicant_count: nextApplications.length,
      }));
    } catch (error) {
      Alert.alert('Application', error.message || 'Could not update this application.');
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const openDocument = async (documentValue) => {
    const url = fileService.getOpenUrl(documentValue);
    if (!url) {
      Alert.alert('Preview', 'This document is missing its file reference.');
      return;
    }
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Preview', 'Could not open this document.');
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background dark:bg-darkBg items-center justify-center">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!job) {
    return (
      <View className="flex-1 bg-background dark:bg-darkBg items-center justify-center px-8">
        <Text className="text-text dark:text-darkText font-bold text-xl">Job not found</Text>
      </View>
    );
  }

  const employerTier = getUserTier(user);
  const acceptedCount = applications.filter((application) => application.status === 'accepted').length;
  const freeAcceptLimitReached = employerTier !== 'premium' && acceptedCount >= FREE_TIER_ACCEPTED_LIMIT;

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-darkBg px-6 pt-12"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" colors={['#2563EB']} />}
    >
      <View className="flex-row items-center mb-8">
        <TouchableOpacity onPress={() => router.back()} className="bg-white dark:bg-darkSurface p-2 rounded-xl border border-gray-100 dark:border-darkBorder mr-4">
          <ChevronLeft size={24} color="#2563EB" />
        </TouchableOpacity>
        <Text className="text-text dark:text-darkText text-xl font-bold flex-1">Job Details</Text>
      </View>

      <View className="bg-white dark:bg-darkSurface p-6 rounded-3xl border border-gray-100 dark:border-darkBorder mb-5">
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1 mr-3">
            <Text className="text-text dark:text-darkText text-2xl font-bold">{job.title}</Text>
            <Text className="text-secondaryText dark:text-darkMuted mt-2">{job.location || 'Remote'} - {getSalaryLabel(job)}</Text>
          </View>
          <View className={`${job.is_active === false ? 'bg-gray-100 dark:bg-darkSurface2' : 'bg-green-100'} px-3 py-1 rounded-full`}>
            <Text className={`${job.is_active === false ? 'text-secondaryText dark:text-darkMuted' : 'text-green-700'} text-xs font-bold`}>
              {job.is_active === false ? 'Closed' : 'Active'}
            </Text>
          </View>
        </View>
        <View className="flex-row items-center mt-2 mb-4">
          <Users size={16} color="#64748B" />
          <Text className="text-secondaryText dark:text-darkMuted ml-2">
            {job.applicant_count || applications.length} applicants - {acceptedCount} accepted
          </Text>
        </View>
        {employerTier !== 'premium' ? (
          <Text className="text-secondaryText dark:text-darkMuted mb-4">
            Free tier accept limit: {acceptedCount}/{FREE_TIER_ACCEPTED_LIMIT}
          </Text>
        ) : (
          <Text className="text-primary font-bold mb-4">Premium: unlimited accepted applicants</Text>
        )}
        <Text className="text-text dark:text-darkText font-bold mb-2">Description</Text>
        <Text className="text-secondaryText dark:text-darkMuted leading-6 mb-4">{job.description}</Text>
        {job.requirements ? (
          <>
            <Text className="text-text dark:text-darkText font-bold mb-2">Requirements</Text>
            <Text className="text-secondaryText dark:text-darkMuted leading-6">{job.requirements}</Text>
          </>
        ) : null}
      </View>

      <View className="flex-row mb-8">
        <View className="flex-1 mr-3">
          <Button
            title={job.is_active === false ? 'Reopen Job' : 'Close Job'}
            variant={job.is_active === false ? 'primary' : 'outline'}
            onPress={toggleJobStatus}
            loading={updating}
          />
        </View>
        <TouchableOpacity
          onPress={deleteJob}
          disabled={updating}
          className={`px-5 rounded-2xl bg-red-50 flex-row items-center justify-center ${updating ? 'opacity-60' : ''}`}
        >
          <Trash2 size={20} color="#EF4444" />
          <Text className="text-red-500 font-bold ml-2">Delete</Text>
        </TouchableOpacity>
      </View>

      <Text className="text-text dark:text-darkText text-xl font-bold mb-4">Applicants</Text>
      {applications.length === 0 ? (
        <View className="bg-white dark:bg-darkSurface p-8 rounded-3xl border border-dashed border-gray-300 dark:border-darkBorder items-center mb-10">
          <Text className="text-secondaryText dark:text-darkMuted text-center">No applications yet.</Text>
        </View>
      ) : (
        applications.map((application) => {
          const applicant = application.applicant || {};
          const documents = application.applied_documents?.length ? application.applied_documents : application.documents || [];
          const acceptDisabled = statusUpdatingId === application.$id || (freeAcceptLimitReached && application.status !== 'accepted');
          return (
          <View key={application.$id} className="bg-white dark:bg-darkSurface p-5 rounded-3xl border border-gray-100 dark:border-darkBorder mb-4">
            <View className="flex-row justify-between items-center">
              <View className="flex-row flex-1 mr-3">
                <ProfileAvatar
                  uri={applicant.canShowDetails ? applicant.profile_pic_url : ''}
                  name={applicant.full_name || 'Applicant'}
                  size={48}
                  textSize={18}
                  className="mr-3"
                />
                <View className="flex-1">
                <View className="flex-row items-center">
                  {!applicant.canShowDetails ? <ShieldOff size={16} color="#64748B" /> : null}
                  <Text className="text-text dark:text-darkText font-bold ml-1">{applicant.full_name || 'Applicant'}</Text>
                </View>
                <Text className="text-secondaryText dark:text-darkMuted mt-1" numberOfLines={1}>
                  {applicant.canShowDetails
                    ? [applicant.title, applicant.location].filter(Boolean).join(' - ') || application.user_id
                    : 'Profile details hidden by applicant'}
                </Text>
                {applicant.canShowDetails && applicant.skills?.length ? (
                  <Text className="text-secondaryText dark:text-darkMuted mt-1" numberOfLines={2}>Skills: {applicant.skills.join(', ')}</Text>
                ) : null}
                <View className="self-start mt-2 bg-blue-100 dark:bg-darkSurface2 px-3 py-1 rounded-full">
                  <Text className="text-primary text-xs font-bold">{getApplicationStatusLabel(application.status)}</Text>
                </View>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => messageApplicant(application.user_id)}
                className="bg-primary p-3 rounded-2xl"
              >
                <MessageSquare size={20} color="white" />
              </TouchableOpacity>
            </View>
            {application.cover_letter ? (
              <Text className="text-secondaryText dark:text-darkMuted mt-4 leading-5">{application.cover_letter}</Text>
            ) : null}
            {documents.length > 0 ? (
              <View className="mt-4">
                <Text className="text-text dark:text-darkText font-bold mb-2">Uploaded Documents</Text>
                {documents.map((documentValue, index) => {
                  const document = fileService.parseFileReference(documentValue);
                  return (
                    <TouchableOpacity
                      key={`${application.$id}-${index}`}
                      onPress={() => openDocument(documentValue)}
                      className="bg-gray-50 dark:bg-darkSurface2 rounded-2xl p-3 mb-2 flex-row items-center"
                    >
                      <FileText size={18} color="#2563EB" />
                      <Text className="text-secondaryText dark:text-darkMuted ml-3 flex-1" numberOfLines={1}>
                        {document?.name || `Document ${index + 1}`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}
            <View className="flex-row mt-4">
              {application.status !== 'accepted' ? (
                <TouchableOpacity
                  onPress={() => updateApplicationStatus(application, 'accepted')}
                  disabled={acceptDisabled}
                  className={`flex-1 py-3 rounded-2xl flex-row items-center justify-center mr-2 ${acceptDisabled ? 'bg-gray-200 dark:bg-darkSurface2' : 'bg-green-600'}`}
                >
                  <Check size={18} color={acceptDisabled ? '#64748B' : 'white'} />
                  <Text className={`${acceptDisabled ? 'text-secondaryText dark:text-darkMuted' : 'text-white'} font-bold ml-2`}>
                    {freeAcceptLimitReached && application.status !== 'accepted' ? 'Limit Reached' : 'Accept'}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {application.status !== 'rejected' ? (
                <TouchableOpacity
                  onPress={() => updateApplicationStatus(application, 'rejected')}
                  disabled={statusUpdatingId === application.$id}
                  className="flex-1 py-3 rounded-2xl flex-row items-center justify-center bg-red-50 ml-2"
                >
                  <X size={18} color="#EF4444" />
                  <Text className="text-red-500 font-bold ml-2">Decline</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
          );
        })
      )}
    </ScrollView>
  );
}


