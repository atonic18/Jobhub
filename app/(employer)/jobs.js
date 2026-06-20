import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronRight, Plus, RefreshCw, Trash2, Users } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { jobService } from '../../services/jobService';
import { FREE_TIER_ACTIVE_JOB_LIMIT, getSalaryLabel, getUserId } from '../../utils/jobUtils';

export default function EmployerJobs() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = getUserId(user);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchJobs = async () => {
    if (!userId) return;
    try {
      const response = await jobService.getEmployerJobs(userId);
      setJobs(response.documents);
    } catch (error) {
      Alert.alert('Jobs', error.message || 'Could not load your jobs.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchJobs();
    }, [userId])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  };

  const confirmDeleteJob = (job) => {
    Alert.alert('Delete job', `Delete "${job.title}" permanently?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setJobs((current) => current.filter((item) => item.$id !== job.$id));
            await jobService.deleteJob(job.$id);
          } catch (error) {
            Alert.alert('Delete job', error.message || 'Could not delete this job.');
            await fetchJobs();
          }
        },
      },
    ]);
  };

  const activeCount = jobs.filter((job) => job.is_active !== false).length;

  return (
    <View className="flex-1 bg-background dark:bg-darkBg">
      <View className="px-6 pt-12 pb-5">
        <View className="flex-row justify-between items-start mb-5">
          <View className="flex-1 mr-4">
            <Text className="text-text dark:text-darkText text-2xl font-bold">Jobs Posted</Text>
            <Text className="text-secondaryText dark:text-darkMuted mt-1">
              {activeCount}/{FREE_TIER_ACTIVE_JOB_LIMIT} active jobs on the free tier.
            </Text>
          </View>
          <View className="flex-row">
            <TouchableOpacity
              onPress={onRefresh}
              className="bg-white dark:bg-darkSurface p-3 rounded-2xl border border-gray-100 dark:border-darkBorder mr-2"
            >
              <RefreshCw size={20} color="#2563EB" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/(employer)/post-job')}
              className="bg-primary p-3 rounded-2xl"
            >
              <Plus size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563EB" className="mt-10" />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.$id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" colors={['#2563EB']} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/(employer)/job-details', params: { id: item.$id } })}
              className="bg-white dark:bg-darkSurface mx-6 mb-4 p-5 rounded-3xl border border-gray-100 dark:border-darkBorder"
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1 mr-3">
                  <View className="flex-row items-center mb-2">
                    <Text className="text-text dark:text-darkText font-bold text-lg flex-1">{item.title}</Text>
                    <View className={`${item.is_active === false ? 'bg-gray-100 dark:bg-darkSurface2' : 'bg-green-100'} px-3 py-1 rounded-full`}>
                      <Text className={`${item.is_active === false ? 'text-secondaryText dark:text-darkMuted' : 'text-green-700'} text-xs font-bold`}>
                        {item.is_active === false ? 'Closed' : 'Active'}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-secondaryText dark:text-darkMuted">{item.location || 'Remote'} - {getSalaryLabel(item)}</Text>
                  <View className="flex-row items-center mt-3">
                    <Users size={16} color="#64748B" />
                    <Text className="text-secondaryText dark:text-darkMuted ml-2">
                      {item.applicant_count || 0} applicants - {item.accepted_count || 0} accepted
                    </Text>
                  </View>
                </View>
                <View className="items-end">
                  <TouchableOpacity
                    onPress={(event) => {
                      event?.stopPropagation?.();
                      confirmDeleteJob(item);
                    }}
                    className="bg-red-50 p-2 rounded-xl mb-3"
                  >
                    <Trash2 size={18} color="#EF4444" />
                  </TouchableOpacity>
                  <ChevronRight size={20} color="#64748B" />
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View className="items-center mt-16 px-8">
              <Text className="text-text dark:text-darkText font-bold text-xl">No jobs posted</Text>
              <Text className="text-secondaryText dark:text-darkMuted text-center mt-2">Post a job to start receiving applicants.</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </View>
  );
}


