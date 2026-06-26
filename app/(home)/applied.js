import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Banknote, Briefcase, ChevronRight, MapPin, Trash2 } from 'lucide-react-native';
import { jobService } from '../../services/jobService';
import { useAuth } from '../../context/AuthContext';
import { getApplicationStatusLabel, getCompanyLabel, getSalaryLabel, getUserId } from '../../utils/jobUtils';

const getStatusStyle = (status) => {
  if (status === 'accepted' || status === 'interview_scheduled') {
    return { surface: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-300' };
  }
  if (status === 'rejected' || status === 'declined') {
    return { surface: 'bg-rose-50 dark:bg-rose-950/30', text: 'text-rose-700 dark:text-rose-300' };
  }
  if (status === 'needs_review') {
    return { surface: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-300' };
  }
  return { surface: 'bg-blue-50 dark:bg-darkSurface2', text: 'text-primary' };
};

export default function AppliedJobsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const userId = getUserId(user);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  const fetchApplications = async () => {
    if (!userId) return;
    try {
      const response = await jobService.getApplicationsWithJobs(userId);
      setApplications(response.documents);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchApplications();
    }, [userId])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchApplications();
    setRefreshing(false);
  };

  const removeUnavailableApplication = (application) => {
    Alert.alert(
      'Remove application',
      'Remove this unavailable job from your applied jobs list?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemovingId(application.$id);
            try {
              await jobService.removeApplicationFromAppliedList(application.$id, userId);
              setApplications((current) => current.filter((item) => item.$id !== application.$id));
            } catch (error) {
              Alert.alert('Remove application', error.message || 'Could not remove this application.');
            } finally {
              setRemovingId(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-background dark:bg-darkBg">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background dark:bg-darkBg">
      <FlatList
        data={applications}
        keyExtractor={(item) => item.$id}
        ListHeaderComponent={
          <View className="px-6 pt-20 pb-5">
            <Text className="text-text dark:text-darkText text-2xl font-bold">Applied Jobs</Text>
            <Text className="text-secondaryText dark:text-darkMuted mt-1">Track the roles you have applied for.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const job = item.job;
          const isUnavailable = !job || job.is_active === false;
          const statusStyle = getStatusStyle(item.status);
          return (
            <TouchableOpacity activeOpacity={0.92}
              onPress={() => job && router.push({ pathname: '/(home)/job-details', params: { id: job.$id } })}
              disabled={!job}
              className="mx-6 mb-4 bg-white dark:bg-darkSurface border border-slate-100 dark:border-darkBorder rounded-3xl p-5"
            >
              <View className="flex-row items-start">
                <View className="w-12 h-12 bg-blue-100 dark:bg-darkSurface2 rounded-2xl items-center justify-center mr-4">
                  <Briefcase size={24} color="#2563EB" />
                </View>
                <View className="flex-1">
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1 mr-3">
                      <Text className="text-text dark:text-darkText text-lg font-bold" numberOfLines={2}>{job?.title || 'Unavailable job'}</Text>
                      <Text className="text-secondaryText dark:text-darkMuted text-sm mt-1" numberOfLines={1}>
                        {isUnavailable ? 'This posting is no longer available.' : getCompanyLabel(job)}
                      </Text>
                    </View>
                    {!isUnavailable ? <ChevronRight size={20} color="#94A3B8" /> : null}
                  </View>
                  {!isUnavailable && (
                    <View className="bg-slate-50 dark:bg-darkSurface2 rounded-2xl px-3 py-3 mt-4">
                      <View className="flex-row items-center mb-2">
                        <MapPin size={14} color="#64748B" />
                        <Text className="text-secondaryText dark:text-darkMuted text-sm ml-2 flex-1" numberOfLines={1}>{job.location || 'Remote'}</Text>
                      </View>
                      <View className="flex-row items-center">
                        <Banknote size={14} color="#64748B" />
                        <Text className="text-secondaryText dark:text-darkMuted text-sm ml-2 flex-1" numberOfLines={1}>{getSalaryLabel(job)}</Text>
                      </View>
                    </View>
                  )}
                  <View className="flex-row items-center justify-between mt-4">
                    <View className={`self-start px-3 py-1.5 rounded-full ${isUnavailable ? 'bg-slate-100 dark:bg-darkSurface2' : statusStyle.surface}`}>
                      <Text className={`text-xs font-bold ${isUnavailable ? 'text-secondaryText dark:text-darkMuted' : statusStyle.text}`}>
                        {isUnavailable ? 'Posting unavailable' : getApplicationStatusLabel(item.status)}
                      </Text>
                     </View>
                    {isUnavailable ? (
                      <TouchableOpacity activeOpacity={0.92}
                        onPress={() => removeUnavailableApplication(item)}
                        disabled={removingId === item.$id}
                        className={`bg-red-50 dark:bg-darkSurface2 px-3 py-2 rounded-xl flex-row items-center ${removingId === item.$id ? 'opacity-60' : ''}`}
                      >
                        <Trash2 size={14} color="#EF4444" />
                        <Text className="text-red-500 text-xs font-bold ml-1">{removingId === item.$id ? 'Removing' : 'Remove'}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" colors={['#2563EB']} />
        }
        ListEmptyComponent={
          <View className="items-center mt-16 px-8">
            <Briefcase size={42} color="#2563EB" />
            <Text className="text-text dark:text-darkText font-bold text-xl mt-4">No applications yet</Text>
            <Text className="text-secondaryText dark:text-darkMuted text-center mt-2 mb-6">Apply to a job and it will appear here with its current status.</Text>
            <TouchableOpacity activeOpacity={0.92} onPress={() => router.push('/(home)/search')} className="bg-primary px-6 py-4 rounded-2xl">
              <Text className="text-white font-bold">Browse Jobs</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 110 }}
      />
    </View>
  );
}


