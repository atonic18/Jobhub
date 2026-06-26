import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, View, Text, FlatList, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { ArrowRight, ArrowUpRight, Bell, Bookmark, BriefcaseBusiness, ChevronRight, Code2, Filter, MapPin, Megaphone, Palette, PenLine, Search, UsersRound } from 'lucide-react-native';
import { JobCard } from '../../components/cards/JobCard';
import { jobService } from '../../services/jobService';
import { notificationService } from '../../services/notificationService';
import { profileService } from '../../services/profileService';
import { useAuth } from '../../context/AuthContext';
import { getApplicationStatusLabel, getCompanyLabel, getRecommendedJobsForSkills, getRoleLabel, getSalaryLabel, getUserId, getUserRole, getUserSkills, JOB_DEPARTMENTS } from '../../utils/jobUtils';

const RisingJobsCarousel = ({ jobs, onPress }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const risingJobs = [...jobs]
    .sort((first, second) => {
      const applicantDifference = Number(second.applicant_count || 0) - Number(first.applicant_count || 0);
      if (applicantDifference !== 0) return applicantDifference;
      return new Date(second.$createdAt || 0) - new Date(first.$createdAt || 0);
    })
    .slice(0, 5);

  useEffect(() => {
    if (risingJobs.length < 2) return undefined;
    const interval = setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % risingJobs.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [risingJobs.length]);

  useEffect(() => {
    slideAnimation.setValue(18);
    Animated.timing(slideAnimation, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, slideAnimation]);

  if (risingJobs.length === 0) return null;
  const activeJob = risingJobs[activeIndex % risingJobs.length];

  return (
    <View className="bg-primary rounded-3xl p-5 mb-8 overflow-hidden">
      <View className="absolute -right-12 -top-16 w-44 h-44 rounded-full bg-blue-400/30" />
      <View className="absolute -left-16 -bottom-20 w-40 h-40 rounded-full bg-indigo-900/20" />

      <View className="flex-row items-center justify-between mb-5">
        <View className="flex-row items-center">
          <View className="w-9 h-9 rounded-2xl bg-white/15 items-center justify-center mr-3">
            <BriefcaseBusiness size={18} color="#FFFFFF" />
          </View>
          <View>
            <Text className="text-white text-lg font-bold">Rising now</Text>
            <Text className="text-blue-100 text-xs mt-0.5">Roles gaining attention</Text>
          </View>
        </View>
        <Text className="text-blue-100 text-xs font-bold">{activeIndex + 1}/{risingJobs.length}</Text>
      </View>

      <Animated.View
        key={activeJob.$id}
        style={{
          opacity: slideAnimation.interpolate({ inputRange: [0, 18], outputRange: [1, 0] }),
          transform: [{ translateX: slideAnimation }],
        }}
      >
        <Text className="text-white text-2xl leading-8 font-bold" numberOfLines={2}>{activeJob.title}</Text>
        <Text className="text-blue-100 font-medium mt-1" numberOfLines={1}>{activeJob.employer_display_name || getCompanyLabel(activeJob)}</Text>

        <View className="flex-row flex-wrap mt-4">
          <View className="bg-white/15 px-3 py-1.5 rounded-full mr-2 mb-2 flex-row items-center">
            <MapPin size={13} color="#DBEAFE" />
            <Text className="text-blue-50 text-xs font-semibold ml-1.5">{activeJob.location || 'Remote'}</Text>
          </View>
          <View className="bg-white/15 px-3 py-1.5 rounded-full mr-2 mb-2">
            <Text className="text-blue-50 text-xs font-semibold" numberOfLines={1}>{getSalaryLabel(activeJob)}</Text>
          </View>
          <View className="bg-white/15 px-3 py-1.5 rounded-full mb-2 flex-row items-center">
            <UsersRound size={13} color="#DBEAFE" />
            <Text className="text-blue-50 text-xs font-semibold ml-1.5">{activeJob.applicant_count || 0} interested</Text>
          </View>
        </View>

        <TouchableOpacity activeOpacity={0.88} onPress={() => onPress(activeJob)} className="self-start bg-white px-4 py-2.5 rounded-2xl flex-row items-center mt-3">
          <Text className="text-primary text-sm font-bold mr-1.5">Explore role</Text>
          <ArrowUpRight size={16} color="#2563EB" />
        </TouchableOpacity>
      </Animated.View>

      <View className="flex-row mt-5">
        {risingJobs.map((job, index) => (
          <View key={job.$id} className={`h-1.5 rounded-full mr-1.5 ${index === activeIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/35'}`} />
        ))}
      </View>
    </View>
  );
};

const DEPARTMENT_VISUALS = {
  design: { icon: Palette, color: '#7C3AED', surface: '#F3E8FF' },
  development: { icon: Code2, color: '#2563EB', surface: '#DBEAFE' },
  marketing: { icon: Megaphone, color: '#EA580C', surface: '#FFEDD5' },
  writing: { icon: PenLine, color: '#059669', surface: '#D1FAE5' },
};

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
    <View className="px-6 pt-20 pb-6">
      <View className="flex-row justify-between items-center mb-8">
        <View className="flex-1 mr-4">
          <Text className="text-secondaryText dark:text-darkMuted text-xs font-bold uppercase tracking-wider">Job seeker home</Text>
          <Text className="text-text dark:text-darkText text-3xl font-extrabold mt-1" numberOfLines={1}>
            Hello, {user?.full_name || user?.name || 'Guest'}
          </Text>
          <Text className="text-secondaryText dark:text-darkMuted mt-2 leading-5">
            Find matching roles, track applications, and save jobs you want to revisit.
          </Text>
          <View className="self-start mt-3 bg-blue-100 dark:bg-darkSurface2 px-3 py-1 rounded-full">
            <Text className="text-primary text-xs font-bold">{getRoleLabel(role)}</Text>
          </View>
        </View>
        <View className="flex-row">
          <TouchableOpacity activeOpacity={0.92}
            onPress={() => router.push('/(home)/saved')}
            className="bg-white dark:bg-darkSurface p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-darkBorder mr-3"
          >
            <Bookmark size={22} color="#2563EB" />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.92}
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

      <TouchableOpacity activeOpacity={0.92}
        onPress={() => router.push('/(home)/search')}
        className="flex-row items-center bg-white dark:bg-darkSurface p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-darkBorder mb-8"
      >
        <Search size={20} color="#64748B" />
        <Text className="text-secondaryText dark:text-darkMuted ml-3 flex-1">Search for jobs, companies...</Text>
        <Filter size={20} color="#2563EB" />
      </TouchableOpacity>

      <View className="flex-row justify-between items-center mb-4">
        <View className="flex-1 mr-3">
          <Text className="text-text dark:text-darkText text-xl font-bold">Explore departments</Text>
          <Text className="text-secondaryText dark:text-darkMuted text-sm mt-1">Find roles in your field.</Text>
        </View>
        <TouchableOpacity activeOpacity={0.88} onPress={() => router.push('/(home)/search')} className="bg-blue-50 dark:bg-darkSurface2 px-3 py-2 rounded-xl flex-row items-center">
          <Text className="text-primary text-xs font-bold mr-1">All</Text>
          <ArrowRight size={14} color="#2563EB" />
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={156}
        snapToAlignment="start"
        contentContainerStyle={{ paddingRight: 24 }}
        className="mb-8"
      >
        {JOB_DEPARTMENTS.map((department) => {
          const visual = DEPARTMENT_VISUALS[department.id] || DEPARTMENT_VISUALS.development;
          const DepartmentIcon = visual.icon;

          return (
          <TouchableOpacity activeOpacity={0.92}
            key={department.id}
            onPress={() =>
              router.push({
                pathname: '/(home)/search',
                params: { department: department.name },
              })
            }
            className="w-36 bg-white dark:bg-darkSurface p-4 rounded-3xl mr-3 shadow-sm border border-slate-100 dark:border-darkBorder"
          >
            <View className="w-11 h-11 rounded-2xl items-center justify-center mb-4" style={{ backgroundColor: visual.surface }}>
              <DepartmentIcon size={21} color={visual.color} />
            </View>
            <Text className="text-text dark:text-darkText font-bold text-base" numberOfLines={1}>{department.name}</Text>
            <View className="flex-row items-center mt-2">
              <Text className="text-primary text-xs font-bold mr-1">Explore</Text>
              <ArrowUpRight size={13} color="#2563EB" />
            </View>
          </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View className="mb-6">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-text dark:text-darkText text-xl font-bold">Applied Jobs</Text>
          <TouchableOpacity activeOpacity={0.88} onPress={() => router.push('/(home)/applied')} className="bg-blue-50 dark:bg-darkSurface2 px-3 py-2 rounded-xl flex-row items-center">
            <Text className="text-primary text-xs font-bold mr-1">View all</Text>
            <ChevronRight size={14} color="#2563EB" />
          </TouchableOpacity>
        </View>
        {applications.length === 0 ? (
          <View className="bg-white dark:bg-darkSurface border border-dashed border-gray-200 dark:border-darkBorder p-5 rounded-3xl">
            <Text className="text-secondaryText dark:text-darkMuted">Your applications and statuses will appear here.</Text>
          </View>
        ) : (
          applications.map((application) => (
            <TouchableOpacity activeOpacity={0.92}
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

      <RisingJobsCarousel
        jobs={jobs}
        onPress={(job) => router.push({ pathname: '/(home)/job-details', params: { id: job.$id } })}
      />

      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-text dark:text-darkText text-xl font-bold">Recommended Jobs</Text>
        <TouchableOpacity activeOpacity={0.88} onPress={() => router.push('/(home)/search')} className="bg-blue-50 dark:bg-darkSurface2 px-3 py-2 rounded-xl flex-row items-center">
          <Text className="text-primary text-xs font-bold mr-1">View all</Text>
          <ChevronRight size={14} color="#2563EB" />
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
        contentContainerStyle={{ paddingBottom: 110 }}
      />
    </View>
  );
}


