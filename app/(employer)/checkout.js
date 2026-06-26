import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';

export default function Checkout() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-background dark:bg-darkBg px-6 pt-20">
      <View className="flex-row items-center mb-8">
        <TouchableOpacity activeOpacity={0.92} onPress={() => router.back()} className="mr-4">
          <ChevronLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-secondaryText dark:text-darkMuted text-xs font-bold uppercase tracking-wider">Payments</Text>
          <Text className="text-text dark:text-darkText text-2xl font-extrabold mt-1">Checkout Disabled</Text>
        </View>
      </View>

      <View className="bg-white dark:bg-darkSurface border border-gray-100 dark:border-darkBorder rounded-3xl p-6">
        <Text className="text-text dark:text-darkText text-2xl font-bold mb-3">No payment required</Text>
        <Text className="text-secondaryText dark:text-darkMuted leading-6 mb-6">
          Premium restrictions have been removed. Employers can post jobs and accept applicants without upgrading.
        </Text>
        <Button title="Back to Dashboard" onPress={() => router.replace('/(employer)/dashboard')} />
      </View>
    </View>
  );
}
