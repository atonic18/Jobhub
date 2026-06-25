import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LockKeyhole, ShieldCheck } from 'lucide-react-native';
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
  const { width, height } = useWindowDimensions();
  const isCompact = height < 720;
  const formWidth = Math.min(width - 48, 430);

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
      <View className="flex-1 justify-center items-center bg-background dark:bg-darkBg">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background dark:bg-darkBg"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: isCompact ? 'flex-start' : 'center',
        paddingTop: isCompact ? 42 : 64,
        paddingBottom: 32,
      }}
      className="bg-background dark:bg-darkBg px-6"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={{ width: formWidth, alignSelf: 'center' }}>
      <View className="items-center mb-7">
        <Logo size={isCompact ? 68 : 78} />
      </View>
      <View className="mb-7">
        <View className="self-start flex-row items-center bg-blue-50 dark:bg-blue-500/10 px-3 py-2 rounded-full mb-4">
          <ShieldCheck size={16} color="#2563EB" />
          <Text className="text-primary font-bold text-xs ml-2">Account recovery</Text>
        </View>
        <Text className="text-text dark:text-darkText text-4xl font-extrabold mb-3">Reset password</Text>
        <Text className="text-secondaryText dark:text-darkMuted text-base leading-6">
          Create a new password for your JobHub account. Use something secure and easy for you to remember.
        </Text>
      </View>

      <View className="bg-white/70 dark:bg-darkSurface/70 rounded-[32px] p-4 border border-white dark:border-darkBorder">
        <Input
          label="New password"
          placeholder="Enter a new password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="newPassword"
          helperText="Password must be at least 8 characters."
          leftIcon={<LockKeyhole size={20} color="#2563EB" />}
        />
        <Input
          label="Confirm password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          textContentType="newPassword"
          leftIcon={<LockKeyhole size={20} color="#2563EB" />}
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
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}


