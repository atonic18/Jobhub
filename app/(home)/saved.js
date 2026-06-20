import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Bookmark, ChevronLeft } from 'lucide-react-native';
import { JobCard } from '../../components/cards/JobCard';
import { jobService } from '../../services/jobService';
import { useAuth } from '../../context/AuthContext';
import { getUserId } from '../../utils/jobUtils';

export default function SavedJobsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const userId = getUserId(user);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSavedJobs = async () => {
    if (!userId) return;
    try {
      const savedJobs = await jobService.getSavedJobs(userId);
      setJobs(savedJobs);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSavedJobs();
    }, [userId])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSavedJobs();
    setRefreshing(false);
  };

  const removeSavedJob = async (job) => {
    try {
      setJobs((current) => current.filter((item) => item.$id !== job.$id));
      await jobService.unsaveJob(userId, job.$id);
    } catch (error) {
      Alert.alert('Saved jobs', error.message || 'Could not remove this job.');
      await fetchSavedJobs();
    }
  };

  return (
    <View className="flex-1 bg-background dark:bg-darkBg">
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.$id}
        ListHeaderComponent={
          <View className="px-6 pt-12 pb-4">
            <View className="flex-row items-center mb-5">
              <TouchableOpacity onPress={() => router.back()} className="bg-white dark:bg-darkSurface border border-gray-100 dark:border-darkBorder p-2 rounded-xl mr-4">
                <ChevronLeft size={24} color="#2563EB" />
              </TouchableOpacity>
              <View>
                <Text className="text-text dark:text-darkText text-2xl font-bold">Saved Jobs</Text>
                <Text className="text-secondaryText dark:text-darkMuted">Jobs you bookmarked for later.</Text>
              </View>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View className="px-6">
            <JobCard
              job={item}
              saved
              onSavePress={removeSavedJob}
              onPress={() => router.push({ pathname: '/(home)/job-details', params: { id: item.$id } })}
            />
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" colors={['#2563EB']} />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color="#2563EB" className="mt-10" />
          ) : (
            <View className="items-center mt-16 px-8">
              <Bookmark size={42} color="#2563EB" />
              <Text className="text-text dark:text-darkText font-bold text-xl mt-4">No saved jobs yet</Text>
              <Text className="text-secondaryText dark:text-darkMuted text-center mt-2 mb-6">Tap the bookmark on any job card to save it here.</Text>
              <TouchableOpacity onPress={() => router.push('/(home)/search')} className="bg-primary px-6 py-4 rounded-2xl">
                <Text className="text-white font-bold">Find Jobs</Text>
              </TouchableOpacity>
            </View>
          )
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}


