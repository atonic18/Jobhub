import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LockKeyhole, Mail, ShieldCheck } from 'lucide-react-native';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Logo } from '../../components/ui/Logo';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login, forgotPassword } = useAuth();
  const { width, height } = useWindowDimensions();
  const isCompact = height < 720;
  const formWidth = Math.min(width - 48, 430);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setLoading(true);
    console.log('Login initiated for:', email);
    try {
      await login(email, password);
      console.log('Login successful');
      router.replace('/');
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Login Failed', error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address first');
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(email);
      Alert.alert('Success', 'Password reset email sent. Please check your inbox.');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

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
            <Text className="text-primary font-bold text-xs ml-2">Secure sign in</Text>
          </View>
          <Text className="text-text dark:text-darkText text-4xl font-extrabold mb-3">Welcome back</Text>
          <Text className="text-secondaryText dark:text-darkMuted text-base leading-6">
            Continue to your JobHub dashboard and keep moving on the roles that fit you.
          </Text>
        </View>

      <View className="bg-white/70 dark:bg-darkSurface/70 rounded-[32px] p-4 border border-white dark:border-darkBorder">
        <Input
          label="Email address"
          placeholder="name@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
          leftIcon={<Mail size={20} color="#2563EB" />}
        />
        <Input
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
          leftIcon={<LockKeyhole size={20} color="#2563EB" />}
        />

        <TouchableOpacity activeOpacity={0.92}
          className="items-end mb-6"
          onPress={handleForgotPassword}
          disabled={loading}
        >
          <Text className="text-primary font-semibold">Forgot Password?</Text>
        </TouchableOpacity>

        <Button
          title="Sign in"
          onPress={handleLogin}
          loading={loading}
          className="mb-6"
        />


        <View className="flex-row justify-center flex-wrap px-2">
          <Text className="text-secondaryText dark:text-darkMuted">New to JobHub? </Text>
          <TouchableOpacity activeOpacity={0.92} onPress={() => router.push('/(auth)/register')}>
            <Text className="text-primary font-bold">Create account</Text>
          </TouchableOpacity>
        </View>
      </View>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}


