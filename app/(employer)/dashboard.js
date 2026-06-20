import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Bell, Plus, Users, Briefcase, LogOut, ChevronRight } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { jobService } from '../../services/jobService';
import { notificationService } from '../../services/notificationService';
import { getSalaryLabel, getUserId } from '../../utils/jobUtils';

export default function EmployerDashboard() {
  const { user, logout, refreshUserData } = useAuth();
  const [stats, setStats] = useState({ totalJobs: 0, totalApplicants: 0 });
  const [myJobs, setMyJobs] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const userId = getUserId(user);

  useFocusEffect(
    useCallback(() => {
      fetchStats();
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

  const StatCard = ({ title, value, icon, color }) => (
    <View className="bg-white dark:bg-darkSurface p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-darkBorder flex-1 m-1">
      <View className={`w-12 h-12 rounded-2xl items-center justify-center mb-4 ${color}`}>
        {icon}
      </View>
      <Text className="text-secondaryText dark:text-darkMuted text-sm mb-1">{title}</Text>
      <Text className="text-text dark:text-darkText text-2xl font-bold">{value}</Text>
    </View>
  );

  return (
    <ScrollView 
      className="flex-1 bg-background dark:bg-darkBg px-6 pt-12"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} color="#2563EB" />
      }
    >
      <View className="flex-row justify-between items-center mb-8">
        <View>
          <Text className="text-secondaryText dark:text-darkMuted text-lg">Employer Panel</Text>
          <Text className="text-text dark:text-darkText text-2xl font-bold">{user?.full_name || user?.name}</Text>
        </View>
        <View className="flex-row">
          <TouchableOpacity
            onPress={() => router.push('/(employer)/notifications')}
            className="bg-white dark:bg-darkSurface p-3 rounded-2xl border border-gray-100 dark:border-darkBorder mr-3"
          >
            <Bell size={22} color="#2563EB" />
            {unreadNotifications > 0 ? (
              <View className="absolute -top-1 -right-1 bg-red-500 min-w-[18px] h-[18px] px-1 rounded-full items-center justify-center">
                <Text className="text-white text-[10px] font-bold">{unreadNotifications > 9 ? '9+' : unreadNotifications}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleLogout}
            className="bg-red-50 p-3 rounded-2xl"
          >
            <LogOut size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-row mb-6">
        <StatCard 
          title="Total Jobs" 
          value={stats.totalJobs} 
          icon={<Briefcase size={24} color="#2563EB" />} 
          color="bg-blue-50"
        />
        <StatCard 
          title="Applicants" 
          value={stats.totalApplicants} 
          icon={<Users size={24} color="#8B5CF6" />} 
          color="bg-purple-50"
        />
      </View>

      <TouchableOpacity 
        onPress={() => router.push('/(employer)/post-job')}
        className="bg-primary p-6 rounded-3xl flex-row items-center justify-between mb-8 shadow-lg shadow-blue-200"
      >
        <View>
          <Text className="text-white text-xl font-bold mb-1">Post a New Job</Text>
          <Text className="text-blue-100">Find the best talent for your team.</Text>
        </View>
        <View className="bg-white/20 p-2 rounded-xl">
          <Plus size={24} color="white" />
        </View>
      </TouchableOpacity>

      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-text dark:text-darkText text-xl font-bold">Active Postings</Text>
        <TouchableOpacity onPress={() => router.push('/(employer)/jobs')}>
          <Text className="text-primary font-bold">Manage</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator color="#2563EB" />
      ) : stats.totalJobs === 0 ? (
        <View className="bg-white dark:bg-darkSurface p-10 rounded-3xl items-center border border-dashed border-gray-300 dark:border-darkBorder">
          <Text className="text-secondaryText dark:text-darkMuted">No active job postings yet.</Text>
        </View>
      ) : (
        <View className="mb-10">
          {myJobs.map((job) => (
            <TouchableOpacity
              key={job.$id}
              onPress={() => router.push({ pathname: '/(employer)/job-details', params: { id: job.$id } })}
              className="bg-white dark:bg-darkSurface p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-darkBorder mb-4"
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1 mr-3">
                  <Text className="text-text dark:text-darkText font-bold text-lg">{job.title}</Text>
                  <Text className="text-secondaryText dark:text-darkMuted mt-1">{job.location || 'Remote'} - {getSalaryLabel(job)}</Text>
                </View>
                <ChevronRight size={20} color="#64748B" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}



