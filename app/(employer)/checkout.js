import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, CreditCard } from 'lucide-react-native';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { formatXaf, PREMIUM_MONTHLY_PRICE_XAF } from '../../utils/jobUtils';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

export default function Checkout() {
  const router = useRouter();
  const { user, refreshUserData } = useAuth();
  const [loading, setLoading] = useState(false);

  const handlePay = () => {
    setLoading(true);
    setTimeout(async () => {
      try {
        await authService.updateTier(user?.user_id || user?.$id, 'premium');
        await refreshUserData();
        router.push('/(employer)/success');
      } catch (error) {
        Alert.alert('Payment', error.message || 'Payment succeeded, but the premium tier could not be saved.');
      } finally {
        setLoading(false);
      }
    }, 1200);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background dark:bg-darkBg"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
    <ScrollView className="flex-1 bg-background dark:bg-darkBg px-6 pt-12" keyboardShouldPersistTaps="handled">
      <View className="flex-row items-center mb-8">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <ChevronLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-text dark:text-darkText text-xl font-bold">Checkout</Text>
      </View>

      <View className="bg-primary p-6 rounded-3xl mb-8 flex-row items-center">
        <View className="bg-white/20 p-3 rounded-2xl mr-4">
          <CreditCard size={24} color="white" />
        </View>
        <View>
          <Text className="text-blue-100 text-sm">Premium Plan</Text>
          <Text className="text-white text-xl font-bold">{formatXaf(PREMIUM_MONTHLY_PRICE_XAF)} / month</Text>
        </View>
      </View>

      <Text className="text-text dark:text-darkText text-lg font-bold mb-4">Payment Method</Text>
      <Input label="Card Number" placeholder="**** **** **** 4242" />
      <View className="flex-row space-x-4">
        <Input label="Expiry" placeholder="MM/YY" className="flex-1" />
        <Input label="CVV" placeholder="***" className="flex-1 ml-4" />
      </View>

      <Button title="Pay Now" onPress={handlePay} loading={loading} className="mt-6" />
    </ScrollView>
    </KeyboardAvoidingView>
  );
}


