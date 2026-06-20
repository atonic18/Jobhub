import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Bell, Bookmark, ChevronRight, Filter, Search } from 'lucide-react-native';
import { JobCard } from '../../components/cards/JobCard';
import { jobService } from '../../services/jobService';
import { notificationService } from '../../services/notificationService';
import { profileService } from '../../services/profileService';
import { useAuth } from '../../context/AuthContext';
import { getApplicationStatusLabel, getCompanyLabel, getRecommendedJobsForSkills, getRoleLabel, getUserId, getUserRole, getUserSkills, JOB_DEPARTMENTS } from '../../utils/jobUtils';

export default function Home() {
  const [jobs, setJobs] = useState([]);
  const [skills, setSkills] = useState([]);
  const [applications, setApplications] = useState([]);
  const [savedJobIds, setSavedJobIds] = useState(new Set());
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user, refreshUserData } = useAuth();
  const router = useRouter();
  const userId = getUserId(user);
  const role = getUserRole(user);

  const fetchSavedJobs = async () => {
    if (!userId) return;
    try {
      const response = await jobService.getSavedJobRecords(userId);
      setSavedJobIds(new Set(response.documents.map((saved) => saved.job_id)));
    } catch (error) {
      console.error('Failed to load saved jobs:', error.message);
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await jobService.getJobsWithApplicantCounts(userId);
      setJobs(response.documents);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    if (!userId) return;
    try {
      const response = await jobService.getApplicationsWithJobs(userId);
      setApplications(response.documents.slice(0, 3));
    } catch (error) {
      console.error('Failed to load applied jobs preview:', error.message);
    }
  };

  const fetchUnreadNotifications = async () => {
    if (!userId) return;
    try {
      setUnreadNotifications(await notificationService.getUnreadCount(userId));
    } catch (error) {
      console.error('Failed to load notification count:', error.message);
    }
  };

  const fetchProfile = async () => {
    if (!userId || role === 'employer') return;
    try {
      const profile = await profileService.getSeekerProfile(userId);
      setSkills(getUserSkills(user, profile));
    } catch (error) {
      console.error('Failed to load recommendation skills:', error.message);
    }
  };

  useEffect(() => {
    Promise.all([fetchJobs(), fetchProfile(), fetchApplications()]);
  }, [userId, role]);

  useFocusEffect(
    useCallback(() => {
      fetchSavedJobs();
      fetchUnreadNotifications();
    }, [userId])
  );

  useEffect(() => {
    if (!userId) return undefined;
    const unsubscribe = notificationService.subscribeToNotifications(userId, (notification) => {
      setUnreadNotifications((count) => count + 1);
      if (notification.notification_type === 'skill_match') {
        const title = notification.title || 'New matching job';
        const message = notification.message || notification.content || 'A new job matches your skills.';
        Alert.alert(title, message);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshUserData();
    await Promise.all([fetchJobs(), fetchSavedJobs(), fetchProfile(), fetchApplications(), fetchUnreadNotifications()]);
    setRefreshing(false);
  };

  const recommendedJobs = getRecommendedJobsForSkills(jobs, skills);

  const toggleSaveJob = async (job) => {
    if (!userId) {
      Alert.alert('Login required', 'Please login before saving jobs.');
      return;
    }

    const nextSaved = new Set(savedJobIds);
    const alreadySaved = nextSaved.has(job.$id);

    try {
      if (alreadySaved) {
        nextSaved.delete(job.$id);
        setSavedJobIds(nextSaved);
        await jobService.unsaveJob(userId, job.$id);
      } else {
        nextSaved.add(job.$id);
        setSavedJobIds(nextSaved);
        await jobService.saveJob(userId, job.$id);
      }
    } catch (error) {
      await fetchSavedJobs();
      Alert.alert('Saved jobs', error.message || 'Could not update this saved job.');
    }
  };

  const renderHeader = () => (
    <View className="px-6 pt-12 pb-6">
      <View className="flex-row justify-between items-center mb-8">
        <View className="flex-1 mr-4">
          <Text className="text-secondaryText dark:text-darkMuted text-lg">Hello,</Text>
          <Text className="text-text dark:text-darkText text-2xl font-bold">{user?.full_name || user?.name || 'Guest'}</Text>
          <View className="self-start mt-2 bg-blue-100 dark:bg-darkSurface2 px-3 py-1 rounded-full">
            <Text className="text-primary text-xs font-bold">{getRoleLabel(role)}</Text>
          </View>
        </View>
        <View className="flex-row">
          <TouchableOpacity
            onPress={() => router.push('/(home)/saved')}
            className="bg-white dark:bg-darkSurface p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-darkBorder mr-3"
          >
            <Bookmark size={22} color="#2563EB" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/(home)/notifications')}
            className="bg-white dark:bg-darkSurface p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-darkBorder"
          >
            <Bell size={22} color="#2563EB" />
            {unreadNotifications > 0 ? (
              <View className="absolute -top-1 -right-1 bg-red-500 min-w-[18px] h-[18px] px-1 rounded-full items-center justify-center">
                <Text className="text-white text-[10px] font-bold">{unreadNotifications > 9 ? '9+' : unreadNotifications}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => router.push('/(home)/search')}
        className="flex-row items-center bg-white dark:bg-darkSurface p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-darkBorder mb-8"
      >
        <Search size={20} color="#64748B" />
        <Text className="text-secondaryText dark:text-darkMuted ml-3 flex-1">Search for jobs, companies...</Text>
        <Filter size={20} color="#2563EB" />
      </TouchableOpacity>

      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-text dark:text-darkText text-xl font-bold">Recommended Departments</Text>
        <TouchableOpacity onPress={() => router.push('/(home)/search')}>
          <Text className="text-primary font-bold">All</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-8">
        {JOB_DEPARTMENTS.map((department) => (
          <TouchableOpacity
            key={department.id}
            onPress={() =>
              router.push({
                pathname: '/(home)/search',
                params: { department: department.name },
              })
            }
            className="bg-white dark:bg-darkSurface px-5 py-4 rounded-3xl mr-4 flex-row items-center shadow-sm border border-gray-100 dark:border-darkBorder"
          >
            <View className="w-9 h-9 bg-blue-100 dark:bg-darkSurface2 rounded-2xl items-center justify-center mr-3">
              <Text className="text-primary font-black">{department.name[0]}</Text>
            </View>
            <Text className="text-text dark:text-darkText font-bold">{department.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View className="mb-6">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-text dark:text-darkText text-xl font-bold">Applied Jobs</Text>
          <TouchableOpacity onPress={() => router.push('/(home)/applied')}>
            <Text className="text-primary font-bold">View All</Text>
          </TouchableOpacity>
        </View>
        {applications.length === 0 ? (
          <View className="bg-white dark:bg-darkSurface border border-dashed border-gray-200 dark:border-darkBorder p-5 rounded-3xl">
            <Text className="text-secondaryText dark:text-darkMuted">Your applications and statuses will appear here.</Text>
          </View>
        ) : (
          applications.map((application) => (
            <TouchableOpacity
              key={application.$id}
              onPress={() => application.job && router.push({ pathname: '/(home)/job-details', params: { id: application.job.$id } })}
              className="bg-white dark:bg-darkSurface border border-gray-100 dark:border-darkBorder p-4 rounded-3xl mb-3"
            >
              <View className="flex-row justify-between items-center">
                <View className="flex-1 mr-3">
                  <Text className="text-text dark:text-darkText font-bold">{application.job?.title || 'Unavailable job'}</Text>
                  <Text className="text-secondaryText dark:text-darkMuted mt-1">{application.job ? getCompanyLabel(application.job) : 'Posting unavailable'}</Text>
                </View>
                <View className="bg-blue-100 dark:bg-darkSurface2 px-3 py-1 rounded-full">
                  <Text className="text-primary text-xs font-bold">{getApplicationStatusLabel(application.status)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-text dark:text-darkText text-xl font-bold">Recommended Jobs</Text>
        <TouchableOpacity onPress={() => router.push('/(home)/search')} className="flex-row items-center">
          <Text className="text-primary font-bold">See All</Text>
          <ChevronRight size={16} color="#2563EB" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-background dark:bg-darkBg">
      <FlatList
        data={recommendedJobs}
        renderItem={({ item }) => (
          <View className="px-6">
            <JobCard
              job={item}
              saved={savedJobIds.has(item.$id)}
              onSavePress={toggleSaveJob}
              onPress={() => router.push({ pathname: '/(home)/job-details', params: { id: item.$id } })}
            />
          </View>
        )}
        keyExtractor={(item) => item.$id}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" colors={['#2563EB']} />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color="#2563EB" className="mt-10" />
          ) : (
            <View className="items-center mt-10 px-6">
              <Text className="text-secondaryText dark:text-darkMuted text-center">
                {skills.length === 0 ? 'Add skills in your profile to see recommended jobs.' : 'No matching jobs found. Pull down to refresh.'}
              </Text>
            </View>
          )
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}


