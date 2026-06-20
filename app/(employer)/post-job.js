import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { jobService } from '../../services/jobService';
import { useAuth } from '../../context/AuthContext';
import { FREE_TIER_ACCEPTED_LIMIT, FREE_TIER_ACTIVE_JOB_LIMIT, FREE_TIER_PARTICIPANT_LIMIT, getUserId, toSkillArray } from '../../utils/jobUtils';

export default function PostJob() {
  const [formData, setFormData] = useState({
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
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const userId = getUserId(user);

  const updateField = (key, value) => {
    setFormData((current) => ({ ...current, [key]: value }));
  };

  const handlePost = async () => {
    if (!formData.title.trim() || !formData.description.trim() || !formData.location.trim()) {
      Alert.alert('Missing details', 'Please fill all required fields: title, description, and location.');
      return;
    }

    const participantsNeeded = Number(formData.participants_needed || 1);
    if (!Number.isFinite(participantsNeeded) || participantsNeeded < 1) {
      Alert.alert('Participants needed', 'Enter at least 1 participant.');
      return;
    }
    if (participantsNeeded > FREE_TIER_PARTICIPANT_LIMIT) {
      Alert.alert('Free tier limit', `Free tier employers can request up to ${FREE_TIER_PARTICIPANT_LIMIT} participants per job.`);
      return;
    }

    setLoading(true);
    try {
      const employerJobs = await jobService.getEmployerJobs(userId);
      const activeJobs = employerJobs.documents.filter((job) => job.is_active !== false);
      if (activeJobs.length >= FREE_TIER_ACTIVE_JOB_LIMIT) {
        Alert.alert('Posting limit reached', `Free tier employers can keep up to ${FREE_TIER_ACTIVE_JOB_LIMIT} active jobs at the same time.`);
        return;
      }

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
      };
      await jobService.createJob(userId, jobData);
      Alert.alert(
        'Job posted successfully',
        'Your job is now live. Matching employees will be notified.',
        [{ text: 'View Jobs', onPress: () => router.replace('/(employer)/jobs') }]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to post job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background dark:bg-darkBg"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView className="flex-1 bg-background dark:bg-darkBg px-6 pt-12 pb-10" keyboardShouldPersistTaps="handled">
        <View className="flex-row items-center mb-8">
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-white dark:bg-darkSurface p-2 rounded-xl shadow-sm border border-gray-100 dark:border-darkBorder mr-4"
          >
            <ChevronLeft size={24} color="#2563EB" />
          </TouchableOpacity>
          <Text className="text-text dark:text-darkText text-xl font-bold">Post a Job</Text>
        </View>

        <View className="bg-blue-50 dark:bg-darkSurface border border-blue-100 dark:border-darkBorder p-4 rounded-2xl mb-5">
          <Text className="text-text dark:text-darkText font-bold">Free tier limits</Text>
          <Text className="text-secondaryText dark:text-darkMuted mt-1">
            Up to {FREE_TIER_ACTIVE_JOB_LIMIT} active jobs, {FREE_TIER_PARTICIPANT_LIMIT} requested participants per job, and {FREE_TIER_ACCEPTED_LIMIT} accepted applicants per free-tier job.
          </Text>
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
          label="Participants Needed"
          placeholder="e.g. 5"
          value={formData.participants_needed}
          onChangeText={(text) => updateField('participants_needed', text.replace(/[^0-9]/g, ''))}
          keyboardType="numeric"
        />

        <Text className="text-text dark:text-darkText font-semibold mb-2 ml-1">Work Mode</Text>
        <View className="flex-row flex-wrap mb-6">
          {['remote', 'on-site', 'hybrid'].map((mode) => (
            <TouchableOpacity
              key={mode}
              onPress={() => updateField('work_mode', mode)}
              className={`px-4 py-2 rounded-xl border ${formData.work_mode === mode ? 'bg-primary border-primary' : 'bg-white dark:bg-darkSurface border-gray-200 dark:border-darkBorder'} mr-2 mb-2`}
            >
              <Text className={`${formData.work_mode === mode ? 'text-white' : 'text-secondaryText dark:text-darkMuted'} font-bold capitalize`}>{mode}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text className="text-text dark:text-darkText font-semibold mb-2 ml-1">Job Type</Text>
        <View className="flex-row flex-wrap mb-6">
          {['full-time', 'part-time', 'contract', 'internship'].map((type) => (
            <TouchableOpacity
              key={type}
              onPress={() => updateField('job_type', type)}
              className={`px-4 py-2 rounded-xl border ${formData.job_type === type ? 'bg-primary border-primary' : 'bg-white dark:bg-darkSurface border-gray-200 dark:border-darkBorder'} mr-2 mb-2`}
            >
              <Text className={`${formData.job_type === type ? 'text-white' : 'text-secondaryText dark:text-darkMuted'} font-bold capitalize`}>{type}</Text>
            </TouchableOpacity>
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
          placeholder="Skills, tools, or experience required..."
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
          placeholder="CV, ID card, Portfolio"
          value={formData.required_documents}
          onChangeText={(text) => updateField('required_documents', text)}
        />

        <Button
          title="Post Job Now"
          onPress={handlePost}
          loading={loading}
          className="mt-4 mb-10"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}


