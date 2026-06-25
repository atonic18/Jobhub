import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { BriefcaseBusiness, Building2, Mail, UserRound, LockKeyhole } from 'lucide-react-native';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Logo } from '../../components/ui/Logo';
import { PressableSurface } from '../../components/ui/PressableSurface';
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
  const { width, height } = useWindowDimensions();
  const isCompact = height < 760;
  const formWidth = Math.min(width - 48, 460);

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
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: isCompact ? 'flex-start' : 'center',
        paddingTop: isCompact ? 34 : 54,
        paddingBottom: 34,
      }}
      className="bg-background dark:bg-darkBg px-6"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={{ width: formWidth, alignSelf: 'center' }}>
      <View className="items-center mb-6">
        <Logo size={isCompact ? 64 : 76} />
      </View>
      <View className="mb-7">
        <View className="self-start flex-row items-center bg-blue-50 dark:bg-blue-500/10 px-3 py-2 rounded-full mb-4">
          <Text className="text-primary font-bold text-xs">Set up your workspace</Text>
        </View>
        <Text className="text-text dark:text-darkText text-4xl font-extrabold mb-3">Create account</Text>
        <Text className="text-secondaryText dark:text-darkMuted text-base leading-6">
          Choose how you want to use JobHub, then add the details we need to personalize the app.
        </Text>
      </View>

      <View className="bg-white/70 dark:bg-darkSurface/70 rounded-[32px] p-4 border border-white dark:border-darkBorder">
        <Text className="text-text dark:text-darkText font-bold mb-3 ml-1">I want to join as</Text>
        <View className="flex-row mb-3 bg-slate-100 dark:bg-darkSurface2 p-1.5 rounded-3xl">
          <PressableSurface
            className={`flex-1 py-3 px-2 rounded-2xl border mr-1 ${formData.role === 'employee' ? 'bg-primary border-primary' : 'bg-white/80 dark:bg-darkSurface border-transparent'}`}
            onPress={() => setFormData({...formData, role: 'employee'})}
            shadow={formData.role === 'employee'}
            pressedStyle={{ backgroundColor: '#3B82F6', borderColor: '#3B82F6' }}
          >
            {({ pressed }) => (
              <View className="items-center">
                <BriefcaseBusiness size={18} color={formData.role === 'employee' || pressed ? '#FFFFFF' : '#64748B'} />
                <Text className={`text-center font-bold mt-1 ${formData.role === 'employee' || pressed ? 'text-white' : 'text-secondaryText dark:text-darkMuted'}`}>Job seeker</Text>
              </View>
            )}
          </PressableSurface>
          <PressableSurface
            className={`flex-1 py-3 px-2 rounded-2xl border ml-1 ${formData.role === 'employer' ? 'bg-primary border-primary' : 'bg-white/80 dark:bg-darkSurface border-transparent'}`}
            onPress={() => setFormData({...formData, role: 'employer'})}
            shadow={formData.role === 'employer'}
            pressedStyle={{ backgroundColor: '#3B82F6', borderColor: '#3B82F6' }}
          >
            {({ pressed }) => (
              <View className="items-center">
                <Building2 size={18} color={formData.role === 'employer' || pressed ? '#FFFFFF' : '#64748B'} />
                <Text className={`text-center font-bold mt-1 ${formData.role === 'employer' || pressed ? 'text-white' : 'text-secondaryText dark:text-darkMuted'}`}>Employer</Text>
              </View>
            )}
          </PressableSurface>
        </View>
        <Text className="text-secondaryText dark:text-darkMuted mb-6 ml-1 leading-5">
          {formData.role === 'employer'
            ? 'Post jobs, manage applicants, and start conversations from the employer dashboard.'
            : 'Add a few skills so recommendations can match your strongest roles first.'}
        </Text>

        <Input
          label="Full name"
          placeholder="Your full name"
          value={formData.full_name}
          onChangeText={(text) => setFormData({...formData, full_name: text})}
          autoCapitalize="words"
          textContentType="name"
          leftIcon={<UserRound size={20} color="#2563EB" />}
        />
        <Input
          label="Email address"
          placeholder="name@example.com"
          value={formData.email}
          onChangeText={(text) => setFormData({...formData, email: text})}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
          leftIcon={<Mail size={20} color="#2563EB" />}
        />
        <Input
          label="Password"
          placeholder="Create a strong password"
          value={formData.password}
          onChangeText={(text) => setFormData({...formData, password: text})}
          secureTextEntry
          textContentType="newPassword"
          helperText="Use at least 8 characters for a safer account."
          leftIcon={<LockKeyhole size={20} color="#2563EB" />}
        />

        {formData.role === 'employee' ? (
          <Input
            label="Top skills"
            placeholder="React, Accounting, Sales, Design"
            value={formData.skills}
            onChangeText={(text) => setFormData({...formData, skills: text})}
            autoCapitalize="words"
            helperText="Separate each skill with a comma."
          />
        ) : null}
        
        <Button 
          title="Create Account" 
          onPress={handleRegister} 
          loading={loading}
          className="mt-4 mb-6"
        />

        <View className="flex-row justify-center flex-wrap px-2">
          <Text className="text-secondaryText dark:text-darkMuted">Already have an account? </Text>
          <TouchableOpacity activeOpacity={0.92} onPress={() => router.push('/(auth)/login')}>
            <Text className="text-primary font-bold">Sign in</Text>
          </TouchableOpacity>
        </View>
      </View>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}


