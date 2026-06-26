import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Bell, Plus, Users, Briefcase, LogOut, ChevronRight, MapPin, Banknote, CircleCheck, UserRound } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { jobService } from '../../services/jobService';
import { notificationService } from '../../services/notificationService';
import { profileService } from '../../services/profileService';
import { getDepartmentForJob, getSalaryLabel, getUserId } from '../../utils/jobUtils';

const TopSeekersCarousel = ({ seekers }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const translateAnim = useRef(new Animated.Value(0)).current;
  const visibleSeekers = seekers.slice(0, 8);
  const activeSeeker = visibleSeekers[activeIndex] || null;

  useEffect(() => {
    if (visibleSeekers.length <= 1) return undefined;

    const interval = setInterval(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(translateAnim, {
          toValue: -14,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setActiveIndex((current) => (current + 1) % visibleSeekers.length);
        translateAnim.setValue(14);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 260,
            useNativeDriver: true,
          }),
          Animated.timing(translateAnim, {
            toValue: 0,
            duration: 260,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [fadeAnim, translateAnim, visibleSeekers.length]);

  if (!activeSeeker) {
    return (
      <View className="bg-primary p-5 rounded-3xl mt-3 mb-8 overflow-hidden">
        <Text className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-2">Talent spotlight</Text>
        <Text className="text-white text-xl font-extrabold">Top job seekers</Text>
        <Text className="text-blue-100 leading-5 mt-2">
          Public candidate profiles will appear here when job seekers complete their profiles.
        </Text>
      </View>
    );
  }

  const initials = activeSeeker.full_name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View className="bg-primary p-5 rounded-3xl mt-3 mb-8 overflow-hidden">
      <View className="absolute -right-12 -top-10 w-36 h-36 rounded-full bg-white/10" />
      <View className="absolute -left-10 -bottom-14 w-32 h-32 rounded-full bg-blue-300/20" />

      <View className="flex-row items-center justify-between mb-4">
        <View>
          <Text className="text-blue-100 text-xs font-bold uppercase tracking-widest">Talent spotlight</Text>
          <Text className="text-white text-xl font-extrabold mt-1">Top job seekers</Text>
        </View>
        <View className="bg-white/15 px-3 py-2 rounded-full">
          <Text className="text-white text-xs font-bold">{activeIndex + 1}/{visibleSeekers.length}</Text>
        </View>
      </View>

      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateX: translateAnim }] }}>
        <View className="flex-row items-center mb-4">
          <View className="w-16 h-16 rounded-3xl bg-white/20 items-center justify-center mr-4 border border-white/20">
            {initials ? (
              <Text className="text-white text-xl font-extrabold">{initials}</Text>
            ) : (
              <UserRound size={26} color="white" />
            )}
          </View>
          <View className="flex-1">
            <Text className="text-white text-lg font-extrabold" numberOfLines={1}>{activeSeeker.full_name}</Text>
            <Text className="text-blue-100 font-semibold mt-1" numberOfLines={1}>{activeSeeker.title}</Text>
            <View className="flex-row items-center mt-2">
              <MapPin size={14} color="#BFDBFE" />
              <Text className="text-blue-100 text-sm ml-1.5 flex-1" numberOfLines={1}>{activeSeeker.location}</Text>
            </View>
          </View>
        </View>

        <View className="flex-row flex-wrap mb-4">
          {(activeSeeker.skills || []).slice(0, 3).map((skill, index) => (
            <View key={`${skill}-${index}`} className="bg-white/15 px-3 py-1.5 rounded-full mr-2 mb-2 border border-white/10">
              <Text className="text-white text-xs font-bold">{skill}</Text>
            </View>
          ))}
          {activeSeeker.skills?.length > 3 ? (
            <View className="bg-white/10 px-3 py-1.5 rounded-full mr-2 mb-2">
              <Text className="text-blue-100 text-xs font-bold">+{activeSeeker.skills.length - 3} more</Text>
            </View>
          ) : null}
        </View>

        <Text className="text-blue-100 leading-5" numberOfLines={2}>
          {activeSeeker.experience || 'Actively looking for a role and open to connecting with hiring teams.'}
        </Text>
      </Animated.View>

      <View className="flex-row mt-5">
        {visibleSeekers.map((seeker, index) => (
          <View
            key={seeker.$id || `${seeker.user_id}-${index}`}
            className={`h-1.5 rounded-full mr-1.5 ${index === activeIndex ? 'bg-white w-6' : 'bg-white/30 w-2'}`}
          />
        ))}
      </View>
    </View>
  );
};

export default function EmployerDashboard() {
  const { user, logout, refreshUserData } = useAuth();
  const [stats, setStats] = useState({ totalJobs: 0, totalApplicants: 0 });
  const [myJobs, setMyJobs] = useState([]);
  const [topSeekers, setTopSeekers] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const userId = getUserId(user);

  useFocusEffect(
    useCallback(() => {
      fetchStats();
      fetchTopJobSeekers();
      fetchUnreadNotifications();
    }, [userId])
  );

  useEffect(() => {
    if (!userId) return undefined;
    const unsubscribe = notificationService.subscribeToNotifications(userId, () => {
      setUnreadNotifications((count) => count + 1);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userId]);

  const handleLogout = async () => {
    Alert.alert('Logout', 'Do you want to logout of JobHub?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshUserData();
    await fetchStats();
    await fetchTopJobSeekers();
    setRefreshing(false);
  };

  const fetchStats = async () => {
    try {
      const response = await jobService.getEmployerJobs(userId, { includeClosed: false });
      const employerJobs = response.documents;
      setMyJobs(employerJobs);

      // Fetch applicants for all my jobs
      let applicantCount = 0;
      for (const job of employerJobs) {
        const apps = await jobService.getApplications('job', job.$id);
        applicantCount += apps.total;
      }

      setStats({
        totalJobs: employerJobs.length,
        totalApplicants: applicantCount,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
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

  const fetchTopJobSeekers = async () => {
    try {
      setTopSeekers(await profileService.getTopJobSeekers(8));
    } catch (error) {
      console.error('Failed to load top job seekers:', error.message);
      setTopSeekers([]);
    }
  };

  const StatCard = ({ title, value, icon, color }) => (
    <View className="bg-white dark:bg-darkSurface px-4 py-5 rounded-3xl border border-slate-100 dark:border-darkBorder flex-1">
      <View className={`w-11 h-11 rounded-2xl items-center justify-center mb-4 ${color}`}>
        {icon}
      </View>
      <Text className="text-secondaryText dark:text-darkMuted text-xs font-semibold uppercase tracking-wide mb-1">{title}</Text>
      <Text className="text-text dark:text-darkText text-[28px] leading-8 font-bold">{value}</Text>
    </View>
  );

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-darkBg"
      contentContainerClassName="px-5 pt-20 pb-28"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} color="#2563EB" />
      }
    >
      <View className="flex-row justify-between items-center mb-7">
        <View>
          <Text className="text-secondaryText dark:text-darkMuted text-sm font-medium">Employer workspace</Text>
          <Text className="text-text dark:text-darkText text-[28px] leading-9 font-bold">{user?.full_name || user?.name || 'Your company'}</Text>
        </View>
        <View className="flex-row">
          <TouchableOpacity activeOpacity={0.92}
            onPress={() => router.push('/(employer)/notifications')}
            className="bg-white dark:bg-darkSurface p-3 rounded-2xl border border-slate-100 dark:border-darkBorder mr-3"
          >
            <Bell size={22} color="#2563EB" />
            {unreadNotifications > 0 ? (
              <View className="absolute -top-1 -right-1 bg-red-500 min-w-[18px] h-[18px] px-1 rounded-full items-center justify-center">
                <Text className="text-white text-[10px] font-bold">{unreadNotifications > 9 ? '9+' : unreadNotifications}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.92}
            onPress={handleLogout}
            className="bg-red-50 dark:bg-red-950/30 p-3 rounded-2xl"
          >
            <LogOut size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-row gap-3 mb-5">
        <StatCard title="Live jobs" value={stats.totalJobs} icon={<Briefcase size={22} color="#2563EB" />} color="bg-blue-50 dark:bg-blue-950/40" />
        <StatCard title="Applicants" value={stats.totalApplicants} icon={<Users size={22} color="#7C3AED" />} color="bg-violet-50 dark:bg-violet-950/40" />
      </View>

      <TouchableOpacity activeOpacity={0.92}
        onPress={() => router.push('/(employer)/post-job')}
        className="bg-primary px-5 py-5 rounded-3xl flex-row items-center justify-between mb-8 shadow-lg shadow-blue-200"
      >
        <View>
          <Text className="text-white text-xl font-bold mb-1">Post a new job</Text>
          <Text className="text-blue-100 text-sm">Reach qualified candidates faster.</Text>
        </View>
        <View className="bg-white/20 p-3 rounded-2xl">
          <Plus size={24} color="white" />
        </View>
      </TouchableOpacity>

      <View className="flex-row justify-between items-center mb-4">
        <View>
          <Text className="text-text dark:text-darkText text-xl font-bold">Active postings</Text>
          <Text className="text-secondaryText dark:text-darkMuted text-sm mt-1">Monitor candidates and keep roles current.</Text>
        </View>
        <TouchableOpacity activeOpacity={0.92} onPress={() => router.push('/(employer)/jobs')}>
          <Text className="text-primary font-bold">Manage</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator color="#2563EB" />
      ) : stats.totalJobs === 0 ? (
        <View className="bg-white dark:bg-darkSurface p-9 rounded-3xl items-center border border-dashed border-slate-300 dark:border-darkBorder">
          <View className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-darkSurface2 items-center justify-center mb-3">
            <Briefcase size={22} color="#2563EB" />
          </View>
          <Text className="text-text dark:text-darkText font-bold">No active postings yet</Text>
          <Text className="text-secondaryText dark:text-darkMuted text-center text-sm mt-2">Create your first role to start receiving applications.</Text>
        </View>
      ) : (
        <View className="mb-10">
          {myJobs.map((job) => (
            <TouchableOpacity activeOpacity={0.92}
              key={job.$id}
              onPress={() => router.push({ pathname: '/(employer)/job-details', params: { id: job.$id } })}
              className="bg-white dark:bg-darkSurface p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-darkBorder mb-4"
            >
              <View className="flex-row justify-between items-start mb-4">
                <View className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-darkSurface2 items-center justify-center mr-3">
                  <Briefcase size={21} color="#2563EB" />
                </View>
                <View className="flex-1 mr-2">
                  <Text className="text-text dark:text-darkText font-bold text-lg" numberOfLines={1}>{job.title}</Text>
                  <View className="flex-row items-center mt-1.5">
                    <CircleCheck size={14} color="#16A34A" />
                    <Text className="text-green-700 dark:text-green-300 text-xs font-bold ml-1.5">Live and accepting applications</Text>
                  </View>
                </View>
                <ChevronRight size={20} color="#94A3B8" />
              </View>

              <View className="flex-row flex-wrap mb-4">
                <View className="bg-blue-50 dark:bg-darkSurface2 px-3 py-1.5 rounded-full mr-2 mb-2">
                  <Text className="text-primary text-xs font-bold capitalize">{job.job_type || 'Open'}</Text>
                </View>
                {job.work_mode ? (
                  <View className="bg-slate-100 dark:bg-darkSurface2 px-3 py-1.5 rounded-full mr-2 mb-2">
                    <Text className="text-secondaryText dark:text-darkMuted text-xs font-semibold capitalize">{job.work_mode}</Text>
                  </View>
                ) : null}
                <View className="bg-slate-100 dark:bg-darkSurface2 px-3 py-1.5 rounded-full mb-2">
                  <Text className="text-secondaryText dark:text-darkMuted text-xs font-semibold">{getDepartmentForJob(job)}</Text>
                </View>
              </View>

              <View className="border-t border-slate-100 dark:border-darkBorder pt-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1 mr-3">
                    <MapPin size={15} color="#64748B" />
                    <Text className="text-secondaryText dark:text-darkMuted text-sm ml-1.5 flex-1" numberOfLines={1}>{job.location || 'Remote'}</Text>
                  </View>
                  <View className="bg-violet-50 dark:bg-violet-950/30 px-2.5 py-1.5 rounded-xl flex-row items-center">
                    <Users size={14} color="#7C3AED" />
                    <Text className="text-violet-700 dark:text-violet-300 text-xs font-bold ml-1">{job.applicant_count || 0} applicants</Text>
                  </View>
                </View>
                <View className="flex-row items-center mt-3">
                  <Banknote size={15} color="#64748B" />
                  <Text className="text-secondaryText dark:text-darkMuted text-sm ml-1.5 flex-1" numberOfLines={1}>{getSalaryLabel(job)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TopSeekersCarousel seekers={topSeekers} />
    </ScrollView>
  );
}



