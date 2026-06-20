import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/ui/Logo';
import { useAuth } from '../context/AuthContext';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  
  const { userId, secret } = useLocalSearchParams();
  const router = useRouter();
  const { completePasswordReset } = useAuth();

  useEffect(() => {
    if (!userId || !secret) {
      Alert.alert('Error', 'Invalid password reset link. Please request a new one.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') }
      ]);
    }
    setInitializing(false);
  }, [userId, secret]);

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    try {
      await completePasswordReset(userId, secret, password, confirmPassword);
      Alert.alert('Success', 'Password has been reset successfully. You can now login with your new password.', [
        { text: 'Login', onPress: () => router.replace('/(auth)/login') }
      ]);
    } catch (error) {
      console.error('Reset password error:', error);
      Alert.alert('Error', error.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-background px-6 pt-20">
      <View className="items-center mb-8">
        <Logo size={80} />
      </View>
      <View className="mb-10">
        <Text className="text-text text-4xl font-bold mb-2">Reset Password</Text>
        <Text className="text-secondaryText text-lg">Enter your new password below.</Text>
      </View>

      <View>
        <Input
          label="New Password"
          placeholder="Enter new password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Input
          label="Confirm New Password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
        
        <Button 
          title="Reset Password" 
          onPress={handleResetPassword} 
          loading={loading}
          className="mt-6 mb-6"
        />

        <Button 
          title="Back to Login" 
          variant="outline"
          onPress={() => router.replace('/(auth)/login')}
          disabled={loading}
        />
      </View>
    </ScrollView>
  );
}


