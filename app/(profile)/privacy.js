import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Lock } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { profileService } from '../../services/profileService';
import { getUserId, getUserRole } from '../../utils/jobUtils';

export default function PrivacyScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = getUserId(user);
  const role = getUserRole(user);
  const [profileId, setProfileId] = useState(null);
  const [visibleToEmployers, setVisibleToEmployers] = useState(true);
  const [messageRequests, setMessageRequests] = useState(true);
  const [activityAlerts, setActivityAlerts] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [userId]);

  const loadSettings = async () => {
    if (!userId || role === 'employer') {
      setLoading(false);
      return;
    }

    try {
      const profile = await profileService.ensureSeekerProfile(userId);
      setProfileId(profile.$id);
      setVisibleToEmployers(profile.show_profile_to_employers !== false);
    } catch (error) {
      Alert.alert('Privacy', error.message || 'Could not load privacy settings.');
    } finally {
      setLoading(false);
    }
  };

  const updateEmployerVisibility = async (value) => {
    setVisibleToEmployers(value);
    if (!profileId) return;
    setSaving(true);
    try {
      await profileService.updateSeekerProfile(profileId, {
        show_profile_to_employers: value,
      });
    } catch (error) {
      setVisibleToEmployers(!value);
      Alert.alert('Privacy', error.message || 'Could not save this setting.');
    } finally {
      setSaving(false);
    }
  };

  const Row = ({ title, subtitle, value, onValueChange, disabled }) => (
    <View className="bg-white dark:bg-darkSurface border-b border-gray-50 dark:border-darkBorder p-6 flex-row items-center justify-between">
      <View className="flex-1 mr-4">
        <Text className="text-text dark:text-darkText text-lg font-bold">{title}</Text>
        <Text className="text-secondaryText dark:text-darkMuted mt-1">{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
        thumbColor={value ? '#2563EB' : '#F8FAFC'}
      />
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 bg-background dark:bg-darkBg items-center justify-center">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background dark:bg-darkBg">
      <View className="px-6 pt-12 pb-6">
        <View className="flex-row items-center mb-8">
          <TouchableOpacity activeOpacity={0.92} onPress={() => router.back()} className="bg-white dark:bg-darkSurface p-2 rounded-xl border border-gray-100 dark:border-darkBorder mr-4">
            <ChevronLeft size={24} color="#2563EB" />
          </TouchableOpacity>
          <Text className="text-text dark:text-darkText text-xl font-bold">Privacy & Security</Text>
        </View>
        <View className="bg-blue-100 dark:bg-darkSurface2 p-5 rounded-3xl flex-row">
          <Lock size={24} color="#2563EB" />
          <Text className="text-secondaryText dark:text-darkMuted ml-3 flex-1">
            Employer profile visibility controls what applicant details employers can see.
          </Text>
        </View>
      </View>
      <Row
        title="Show my profile details to employers"
        subtitle="When off, employers see only limited anonymous applicant data."
        value={visibleToEmployers}
        onValueChange={updateEmployerVisibility}
        disabled={saving || role === 'employer'}
      />
      <Row title="Message requests" subtitle="Allow recruiters to start new conversations." value={messageRequests} onValueChange={setMessageRequests} />
      <Row title="Activity alerts" subtitle="Receive security and account activity notices." value={activityAlerts} onValueChange={setActivityAlerts} />
    </ScrollView>
  );
}
