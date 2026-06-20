import React from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { CheckCircle } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';

export default function PaymentSuccess() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-background dark:bg-darkBg justify-center items-center px-10">
      <View className="bg-green-100 p-6 rounded-full mb-8">
        <CheckCircle size={80} color="#10B981" />
      </View>
      <Text className="text-text dark:text-darkText text-3xl font-bold mb-2 text-center">Unlimited Access Enabled</Text>
      <Text className="text-secondaryText dark:text-darkMuted text-lg text-center mb-10">
        Premium plans are no longer used by JobHub.
      </Text>
      <Button
        title="Go to Dashboard"
        onPress={() => router.replace('/(employer)/dashboard')}
        className="w-full"
      />
    </View>
  );
}
