import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Logo } from '../../components/ui/Logo';
import { useAuth } from '../../context/AuthContext';

export default function Register() {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'employee',
    skills: '',
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { register } = useAuth();

  const handleRegister = async () => {
    if (!formData.full_name || !formData.email || !formData.password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    if (formData.role === 'employee' && !formData.skills.trim()) {
      Alert.alert('Skills required', 'Please add at least one skill so we can recommend matching jobs.');
      return;
    }

    setLoading(true);
    try {
      const skills = formData.skills
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean);
      await register(formData.email, formData.password, formData.full_name, formData.role, skills);
      router.replace('/');
    } catch (error) {
      Alert.alert('Registration Failed', error.message || 'Something went wrong');
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
      contentContainerStyle={{ flexGrow: 1 }}
      className="bg-background dark:bg-darkBg px-6 pt-20 pb-10"
      keyboardShouldPersistTaps="handled"
    >
      <View className="items-center mb-8">
        <Logo size={80} />
      </View>
      <View className="mb-10">
        <Text className="text-text dark:text-darkText text-4xl font-bold mb-2">Create Account</Text>
        <Text className="text-secondaryText dark:text-darkMuted text-lg">Join JobHub and find your next opportunity.</Text>
      </View>

      <View>
        <Text className="text-text dark:text-darkText font-semibold mb-2 ml-1">
          Account Type: {formData.role === 'employer' ? 'Employer' : 'Job Seeker'}
        </Text>
        <View className="flex-row mb-3 bg-gray-100 dark:bg-darkSurface2 p-1 rounded-2xl">
          <TouchableOpacity 
            className={`flex-1 py-3 rounded-xl ${formData.role === 'employee' ? 'bg-white dark:bg-darkSurface' : ''}`}
            onPress={() => setFormData({...formData, role: 'employee'})}
          >
            <Text className={`text-center font-bold ${formData.role === 'employee' ? 'text-primary' : 'text-secondaryText dark:text-darkMuted'}`}>Job Seeker</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className={`flex-1 py-3 rounded-xl ${formData.role === 'employer' ? 'bg-white dark:bg-darkSurface' : ''}`}
            onPress={() => setFormData({...formData, role: 'employer'})}
          >
            <Text className={`text-center font-bold ${formData.role === 'employer' ? 'text-primary' : 'text-secondaryText dark:text-darkMuted'}`}>Employer</Text>
          </TouchableOpacity>
        </View>
        <Text className="text-secondaryText dark:text-darkMuted mb-6 ml-1">
          {formData.role === 'employer'
            ? 'You will be sent to the employer dashboard after registration.'
            : 'You will be sent to the job seeker home page after registration.'}
        </Text>

        <Input
          label="Full Name"
          placeholder="Enter your full name"
          value={formData.full_name}
          onChangeText={(text) => setFormData({...formData, full_name: text})}
        />
        <Input
          label="Email Address"
          placeholder="Enter your email"
          value={formData.email}
          onChangeText={(text) => setFormData({...formData, email: text})}
          autoCapitalize="none"
        />
        <Input
          label="Password"
          placeholder="Create a password"
          value={formData.password}
          onChangeText={(text) => setFormData({...formData, password: text})}
          secureTextEntry
        />

        {formData.role === 'employee' ? (
          <Input
            label="Skills"
            placeholder="React, Accountant, Sales, Design"
            value={formData.skills}
            onChangeText={(text) => setFormData({...formData, skills: text})}
            autoCapitalize="words"
          />
        ) : null}
        
        <Button 
          title="Create Account" 
          onPress={handleRegister} 
          loading={loading}
          className="mt-4 mb-6"
        />

        <View className="flex-row justify-center">
          <Text className="text-secondaryText dark:text-darkMuted">Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text className="text-primary font-bold">Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}


