import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { BriefcaseBusiness, Building2, Camera, CircleHelp, FileText, Globe2, LogOut, Mail, MapPin, Phone, UserRound } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ProfileAvatar } from '../../components/ui/ProfileAvatar';
import { useAuth } from '../../context/AuthContext';
import { profileService } from '../../services/profileService';
import { getBusinessTypeLabel, getUserId } from '../../utils/jobUtils';

export default function EmployerProfile() {
  const router = useRouter();
  const { user, logout, refreshUserData } = useAuth();
  const userId = getUserId(user);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.profile_pic_url || '');
  const [profileId, setProfileId] = useState(null);
  const [formData, setFormData] = useState({
    full_name: user?.full_name || user?.name || '',
    phone: user?.phone || '',
    company_name: '',
    contact_email: user?.email || '',
    contact_phone: user?.phone || '',
    location: '',
    industry: '',
    business_type_detail: '',
    website: '',
    description: '',
  });

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    if (!userId) return;
    try {
      const profile = await profileService.ensureEmployerProfile(userId, {
        full_name: user?.full_name || user?.name,
        email: user?.email,
        phone: user?.phone,
      });
      setProfileId(profile.$id);
      setFormData((current) => ({
        ...current,
        company_name: profile.company_name || '',
        contact_email: profile.contact_email || user?.email || '',
        contact_phone: profile.contact_phone || user?.phone || '',
        location: profile.location || '',
        industry: profile.industry || '',
        business_type_detail: profile.business_type_detail || getBusinessTypeLabel(profile.business_type) || '',
        website: profile.website || '',
        description: profile.description || '',
      }));
    } catch (error) {
      Alert.alert('Profile', error.message || 'Could not load company profile.');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (key, value) => {
    setFormData((current) => ({ ...current, [key]: value }));
  };

  const uploadProfileAsset = async (asset) => {
    if (!asset || !userId) return;

    setUploadingPhoto(true);
    try {
      const uploaded = await profileService.uploadProfilePicture(userId, asset, { ...user, type: 'employer' });
      setAvatarUrl(uploaded.profile_pic_url);
      await refreshUserData();
    } catch (error) {
      Alert.alert('Profile picture', error.message || 'Could not upload this picture.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const chooseFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Profile picture', 'Gallery permission is required to choose a profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;

      await uploadProfileAsset(result.assets[0]);
    } catch (error) {
      Alert.alert('Profile picture', error.message || 'Could not choose this picture.');
    }
  };

  const takeProfilePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Profile picture', 'Camera permission is required to take a profile picture.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;

      await uploadProfileAsset(result.assets[0]);
    } catch (error) {
      Alert.alert('Profile picture', error.message || 'Could not take this picture.');
    }
  };

  const pickProfilePicture = () => {
    if (!userId || uploadingPhoto) return;
    Alert.alert('Profile picture', 'Choose a source for the profile picture.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Gallery', onPress: chooseFromGallery },
      { text: 'Camera', onPress: takeProfilePhoto },
    ]);
  };

  const handleSave = async () => {
    if (!formData.full_name.trim() || !formData.company_name.trim()) {
      Alert.alert('Profile', 'Your name and company name are required.');
      return;
    }

    setSaving(true);
    try {
      await profileService.updateUserDoc(userId, {
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
      }, { ...user, type: 'employer' });

      const profile = profileId
        ? { $id: profileId }
        : await profileService.ensureEmployerProfile(userId, formData);

      await profileService.updateEmployerProfile(profile.$id, {
        company_name: formData.company_name.trim(),
        contact_email: formData.contact_email.trim(),
        contact_phone: formData.contact_phone.trim(),
        location: formData.location.trim(),
        industry: formData.industry.trim(),
        business_type_detail: formData.business_type_detail.trim(),
        website: formData.website.trim(),
        description: formData.description.trim(),
      });

      setProfileId(profile.$id);
      await refreshUserData();
      Alert.alert('Profile saved', 'Company information has been updated.');
    } catch (error) {
      Alert.alert('Profile', error.message || 'Could not save company profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Do you want to logout of JobHub?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background dark:bg-darkBg items-center justify-center">
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
        className="flex-1 px-6 pt-20"
        contentContainerStyle={{ paddingBottom: 112 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row justify-between items-center mb-8">
          <View className="flex-1 mr-4">
            <Text className="text-secondaryText dark:text-darkMuted text-sm font-bold uppercase tracking-wider">Employer account</Text>
            <Text className="text-text dark:text-darkText text-3xl font-extrabold mt-1">Company Profile</Text>
            <Text className="text-secondaryText dark:text-darkMuted mt-2 leading-5">Keep company details clear so applicants know who they are applying to.</Text>
          </View>
          <TouchableOpacity activeOpacity={0.92} onPress={handleLogout} className="bg-red-50 p-3 rounded-2xl">
            <LogOut size={22} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity activeOpacity={0.92}
          onPress={() => router.push('/(profile)/help')}
          className="bg-white dark:bg-darkSurface p-5 rounded-3xl flex-row items-center mb-6 border border-gray-100 dark:border-darkBorder"
        >
          <View className="bg-blue-100 dark:bg-darkSurface2 p-3 rounded-2xl mr-4">
            <CircleHelp size={22} color="#2563EB" />
          </View>
          <View className="flex-1">
            <Text className="text-text dark:text-darkText font-bold">Help Center</Text>
            <Text className="text-secondaryText dark:text-darkMuted">Read FAQs about posting, interviews, and applications.</Text>
          </View>
        </TouchableOpacity>

        <View className="bg-white dark:bg-darkSurface border border-gray-100 dark:border-darkBorder rounded-3xl p-5 mb-6 items-center">
          <ProfileAvatar uri={avatarUrl} name={formData.company_name || formData.full_name} size={96} textSize={36} className="mb-4" />
          <TouchableOpacity activeOpacity={0.92}
            onPress={pickProfilePicture}
            disabled={uploadingPhoto}
            className={`bg-blue-100 dark:bg-darkSurface2 px-4 py-3 rounded-2xl flex-row items-center ${uploadingPhoto ? 'opacity-60' : ''}`}
          >
            <Camera size={18} color="#2563EB" />
            <Text className="text-primary font-bold ml-2">{uploadingPhoto ? 'Uploading...' : 'Change Profile Picture'}</Text>
          </TouchableOpacity>
        </View>

        <View className="bg-white/70 dark:bg-darkSurface/70 rounded-[32px] p-4 border border-white dark:border-darkBorder mb-6">
          <Text className="text-text dark:text-darkText text-lg font-extrabold mb-1">Public company details</Text>
          <Text className="text-secondaryText dark:text-darkMuted mb-5 leading-5">These details appear on job posts and candidate conversations.</Text>

        <Input
          label="Your name"
          value={formData.full_name}
          onChangeText={(value) => updateField('full_name', value)}
          placeholder="e.g. Hilary Ngwa"
          autoCapitalize="words"
          textContentType="name"
          leftIcon={<UserRound size={20} color="#2563EB" />}
        />
        <Input
          label="Personal phone"
          value={formData.phone}
          onChangeText={(value) => updateField('phone', value)}
          placeholder="e.g. +237 6XX XXX XXX"
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          helperText="Used for account contact. Applicants will see the company contact phone below."
          leftIcon={<Phone size={20} color="#2563EB" />}
        />
        <Input
          label="Company name"
          value={formData.company_name}
          onChangeText={(value) => updateField('company_name', value)}
          placeholder="e.g. JobHub Technologies"
          autoCapitalize="words"
          leftIcon={<Building2 size={20} color="#2563EB" />}
        />
        <Input
          label="Hiring email"
          value={formData.contact_email}
          onChangeText={(value) => updateField('contact_email', value)}
          placeholder="e.g. careers@company.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
          leftIcon={<Mail size={20} color="#2563EB" />}
        />
        <Input
          label="Hiring phone"
          value={formData.contact_phone}
          onChangeText={(value) => updateField('contact_phone', value)}
          placeholder="e.g. +237 6XX XXX XXX"
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          leftIcon={<Phone size={20} color="#2563EB" />}
        />
        <Input
          label="Company location"
          value={formData.location}
          onChangeText={(value) => updateField('location', value)}
          placeholder="e.g. Douala, Cameroon"
          autoCapitalize="words"
          leftIcon={<MapPin size={20} color="#2563EB" />}
        />
        <Input
          label="Industry"
          value={formData.industry}
          onChangeText={(value) => updateField('industry', value)}
          placeholder="e.g. Technology, finance, healthcare"
          autoCapitalize="words"
          leftIcon={<BriefcaseBusiness size={20} color="#2563EB" />}
        />
        <Input
          label="Business type"
          value={formData.business_type_detail}
          onChangeText={(value) => updateField('business_type_detail', value)}
          placeholder="e.g. Logistics startup, fashion retail, fintech agency"
          autoCapitalize="sentences"
          leftIcon={<Building2 size={20} color="#2563EB" />}
        />
        <Input
          label="Website"
          value={formData.website}
          onChangeText={(value) => updateField('website', value)}
          placeholder="e.g. https://company.com"
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="URL"
          leftIcon={<Globe2 size={20} color="#2563EB" />}
        />
        <Input
          label="Company description"
          value={formData.description}
          onChangeText={(value) => updateField('description', value)}
          placeholder="Briefly describe what your company does, your culture, and the kind of candidates you hire."
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          inputClassName="min-h-[120px]"
          leftIcon={<FileText size={20} color="#2563EB" />}
        />
        </View>

        <Button title="Save Company Profile" onPress={handleSave} loading={saving} className="mt-2 mb-10" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}


