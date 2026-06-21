import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';

export default function Subscription() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-background dark:bg-darkBg px-6 pt-12">
      <View className="flex-row items-center mb-8">
        <TouchableOpacity activeOpacity={0.92}
          onPress={() => router.back()}
          className="bg-white dark:bg-darkSurface p-2 rounded-xl shadow-sm border border-gray-100 dark:border-darkBorder mr-4"
        >
          <ChevronLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-text dark:text-darkText text-xl font-bold">Plans Removed</Text>
      </View>

      <View className="bg-white dark:bg-darkSurface border border-gray-100 dark:border-darkBorder rounded-3xl p-6">
        <Text className="text-text dark:text-darkText text-2xl font-bold mb-3">Unlimited access is enabled</Text>
        <Text className="text-secondaryText dark:text-darkMuted leading-6 mb-6">
          Job posting, applications, and applicant acceptance are no longer limited by a subscription plan.
        </Text>
        <Button title="Back to Dashboard" onPress={() => router.replace('/(employer)/dashboard')} />
      </View>
    </View>
  );
}
