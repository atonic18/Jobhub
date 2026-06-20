import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
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
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-background dark:bg-darkBg px-6 pt-20">
      <View className="items-center mb-8">
        <Logo size={80} />
      </View>
      <View className="mb-10">
        <Text className="text-text dark:text-darkText text-4xl font-bold mb-2">Welcome Back!</Text>
        <Text className="text-secondaryText dark:text-darkMuted text-lg">Sign in to continue searching for your dream job.</Text>
      </View>

      <View>
        <Input
          label="Email Address"
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />
        <Input
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <TouchableOpacity 
          className="items-end mb-8"
          onPress={handleForgotPassword}
          disabled={loading}
        >
          <Text className="text-primary font-semibold">Forgot Password?</Text>
        </TouchableOpacity>

        <Button 
          title="Login" 
          onPress={handleLogin} 
          loading={loading}
          className="mb-6"
        />

        <View className="flex-row justify-center">
          <Text className="text-secondaryText dark:text-darkMuted">Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text className="text-primary font-bold">Register</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}


