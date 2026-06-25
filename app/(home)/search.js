import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Bookmark, Search, SlidersHorizontal, X } from 'lucide-react-native';
import { JobCard } from '../../components/cards/JobCard';
import { PressableSurface } from '../../components/ui/PressableSurface';
import { jobService } from '../../services/jobService';
import { useAuth } from '../../context/AuthContext';
import { getUserId, JOB_DEPARTMENTS, jobMatchesDepartment, jobMatchesSearch } from '../../utils/jobUtils';

const WORK_MODES = ['remote', 'hybrid', 'on-site'];
const JOB_TYPES = ['full-time', 'part-time', 'contract', 'internship'];

export default function SearchScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const userId = getUserId(user);
  const [query, setQuery] = useState(String(params.query || ''));
  const [selectedDepartment, setSelectedDepartment] = useState(String(params.department || ''));
  const [selectedWorkMode, setSelectedWorkMode] = useState('');
  const [selectedJobType, setSelectedJobType] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [savedJobIds, setSavedJobIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setSelectedDepartment(String(params.department || ''));
    setQuery(String(params.query || ''));
  }, [params.department, params.query]);

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

  const fetchSavedJobs = async () => {
    if (!userId) return;
    try {
      const response = await jobService.getSavedJobRecords(userId);
      setSavedJobIds(new Set(response.documents.map((saved) => saved.job_id)));
    } catch (error) {
      console.error('Failed to load saved jobs:', error.message);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      fetchSavedJobs();
    }, [userId])
  );

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesQuery = jobMatchesSearch(job, query);
      const matchesDepartment = jobMatchesDepartment(job, selectedDepartment);
      const matchesWorkMode = selectedWorkMode ? job.work_mode === selectedWorkMode : true;
      const matchesJobType = selectedJobType ? job.job_type === selectedJobType : true;
      return matchesQuery && matchesDepartment && matchesWorkMode && matchesJobType;
    });
  }, [jobs, query, selectedDepartment, selectedWorkMode, selectedJobType]);

  const activeFilterCount = [selectedDepartment, selectedWorkMode, selectedJobType].filter(Boolean).length;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchJobs(), fetchSavedJobs()]);
    setRefreshing(false);
  };

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

  const clearFilters = () => {
    setQuery('');
    setSelectedDepartment('');
    setSelectedWorkMode('');
    setSelectedJobType('');
  };

  const FilterChip = ({ label, selected, onPress }) => (
    <PressableSurface
      onPress={onPress}
      className={`${selected ? 'bg-primary border-primary' : 'bg-slate-100 dark:bg-darkSurface2 border-slate-200 dark:border-darkBorder'} border px-5 py-3 rounded-2xl mr-2.5 mb-2`}
      shadow={false}
      pressedStyle={selected ? { backgroundColor: '#1D4ED8', borderColor: '#1D4ED8' } : { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }}
    >
      {({ pressed }) => (
        <Text className={`${selected ? 'text-white' : pressed ? 'text-primary' : 'text-secondaryText dark:text-darkMuted'} text-sm font-bold capitalize`}>
          {label}
        </Text>
      )}
    </PressableSurface>
  );

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background dark:bg-darkBg"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="px-6 pt-20 pb-4 bg-background dark:bg-darkBg">
        <View className="flex-row items-center justify-between mb-5">
          <View className="flex-1 mr-4">
            <Text className="text-text dark:text-darkText text-2xl font-bold">Search Jobs</Text>
            <Text className="text-secondaryText dark:text-darkMuted">Find roles by title, location, type, or department.</Text>
          </View>
          <TouchableOpacity activeOpacity={0.92}
            onPress={() => router.push('/(home)/saved')}
            className="bg-white dark:bg-darkSurface border border-gray-100 dark:border-darkBorder p-3 rounded-2xl"
          >
            <Bookmark size={21} color="#2563EB" />
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center bg-white dark:bg-darkSurface border border-slate-100 dark:border-darkBorder rounded-3xl p-1.5 mb-5 shadow-sm">
          <View className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-darkSurface2 items-center justify-center">
            <Search size={20} color="#2563EB" />
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search jobs, companies, locations..."
            placeholderTextColor="#64748B"
            className="flex-1 px-3 py-3 text-text dark:text-darkText"
            returnKeyType="search"
          />
          {query ? (
            <TouchableOpacity activeOpacity={0.88} onPress={() => setQuery('')} className="p-2 mr-1">
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity activeOpacity={0.88} onPress={() => setFilterVisible(true)} className="w-11 h-11 rounded-2xl bg-primary items-center justify-center">
            <SlidersHorizontal size={19} color="#FFFFFF" />
            {activeFilterCount > 0 ? (
              <View className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-400 border-2 border-white items-center justify-center">
                <Text className="text-slate-900 text-[10px] font-black">{activeFilterCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-text dark:text-darkText font-bold">Browse by department</Text>
          {selectedDepartment ? (
            <TouchableOpacity activeOpacity={0.88} onPress={() => setSelectedDepartment('')}>
              <Text className="text-primary text-xs font-bold">Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <FlatList
          data={JOB_DEPARTMENTS}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          decelerationRate="fast"
          contentContainerStyle={{ paddingRight: 24 }}
          ListHeaderComponent={
            <FilterChip
              label="All roles"
              selected={!selectedDepartment}
              onPress={() => setSelectedDepartment('')}
            />
          }
          renderItem={({ item }) => {
            const selected = selectedDepartment === item.name;
            return (
              <FilterChip
                label={item.name}
                selected={selected}
                onPress={() => setSelectedDepartment(selected ? '' : item.name)}
              />
            );
          }}
        />

        <View className="flex-row justify-between items-center mt-4 bg-slate-50 dark:bg-darkSurface2 px-3 py-2.5 rounded-2xl">
          <Text className="text-secondaryText dark:text-darkMuted text-sm font-medium">
            {filteredJobs.length} {filteredJobs.length === 1 ? 'role found' : 'roles found'}
          </Text>
          {activeFilterCount || query ? (
            <TouchableOpacity activeOpacity={0.88} onPress={clearFilters} className="bg-white dark:bg-darkSurface px-3 py-1.5 rounded-xl">
              <Text className="text-primary text-xs font-bold">Reset search</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <FlatList
          data={filteredJobs}
          keyExtractor={(item) => item.$id}
          keyboardShouldPersistTaps="handled"
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
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" colors={['#2563EB']} />
          }
          ListEmptyComponent={
            <View className="items-center px-6 mt-8">
              <Text className="text-text dark:text-darkText font-bold text-lg mb-1">No matching jobs</Text>
              <Text className="text-secondaryText dark:text-darkMuted text-center">Try a different keyword, department, or work mode.</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 110 }}
        />
      )}

      <Modal
        visible={filterVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <TouchableOpacity className="flex-1" activeOpacity={1} onPress={() => setFilterVisible(false)} />
          <View className="bg-white dark:bg-darkSurface rounded-t-[32px] px-6 pt-3 pb-10">
            <View className="w-12 h-1.5 rounded-full bg-slate-200 dark:bg-darkBorder self-center mb-5" />
            <View className="flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-text dark:text-darkText text-xl font-bold">Refine your search</Text>
                <Text className="text-secondaryText dark:text-darkMuted text-sm mt-1">Choose what matters for your next role.</Text>
              </View>
              <TouchableOpacity activeOpacity={0.88} onPress={() => setFilterVisible(false)} className="bg-slate-100 dark:bg-darkSurface2 p-2 rounded-xl">
                <X size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text className="text-text dark:text-darkText font-bold mb-3">Work mode</Text>
            <View className="flex-row flex-wrap mb-4">
              {WORK_MODES.map((mode) => (
                <FilterChip
                  key={mode}
                  label={mode}
                  selected={selectedWorkMode === mode}
                  onPress={() => setSelectedWorkMode(selectedWorkMode === mode ? '' : mode)}
                />
              ))}
            </View>

            <Text className="text-text dark:text-darkText font-bold mb-3">Job type</Text>
            <View className="flex-row flex-wrap mb-4">
              {JOB_TYPES.map((type) => (
                <FilterChip
                  key={type}
                  label={type}
                  selected={selectedJobType === type}
                  onPress={() => setSelectedJobType(selectedJobType === type ? '' : type)}
                />
              ))}
            </View>

            <Text className="text-text dark:text-darkText font-bold mb-3">Department</Text>
            <View className="flex-row flex-wrap">
              {JOB_DEPARTMENTS.map((department) => (
                <FilterChip
                  key={department.id}
                  label={department.name}
                  selected={selectedDepartment === department.name}
                  onPress={() => setSelectedDepartment(selectedDepartment === department.name ? '' : department.name)}
                />
              ))}
            </View>

            <View className="flex-row mt-6">
              <TouchableOpacity activeOpacity={0.92}
                onPress={clearFilters}
                className="flex-1 py-4 rounded-2xl border border-slate-200 dark:border-darkBorder mr-3 items-center"
              >
                <Text className="text-secondaryText dark:text-darkMuted font-bold">Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.92}
                onPress={() => setFilterVisible(false)}
                className="flex-1 py-4 rounded-2xl bg-primary items-center"
              >
                <Text className="text-white font-bold">Show Results</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}


