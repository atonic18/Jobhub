import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ChevronLeft } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ProfileAvatar } from '../../components/ui/ProfileAvatar';
import { useAuth } from '../../context/AuthContext';
import { profileService } from '../../services/profileService';
import { getUserId, getUserRole } from '../../utils/jobUtils';

export default function EditProfile() {
  const router = useRouter();
  const { user, refreshUserData } = useAuth();
  const userId = getUserId(user);
  const role = getUserRole(user);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.profile_pic_url || '');
  const [profileId, setProfileId] = useState(null);
  const [formData, setFormData] = useState({
    full_name: user?.full_name || user?.name || '',
    phone: user?.phone || '',
    title: '',
    bio: '',
    skills: '',
    location: '',
    company_name: '',
    contact_email: '',
    contact_phone: '',
    industry: '',
    description: '',
    website: '',
  });

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    if (!userId) return;
    try {
      const profile = role === 'employer'
        ? await profileService.getEmployerProfile(userId)
        : await profileService.getSeekerProfile(userId);
      setProfileId(profile?.$id || null);
      setFormData((current) => ({
        ...current,
        title: profile?.title || '',
        bio: profile?.bio || '',
        skills: Array.isArray(profile?.skills) ? profile.skills.join(', ') : profile?.skills || '',
        location: profile?.location || '',
        company_name: profile?.company_name || '',
        contact_email: profile?.contact_email || user?.email || '',
        contact_phone: profile?.contact_phone || user?.phone || '',
        industry: profile?.industry || '',
        description: profile?.description || '',
        website: profile?.website || '',
      }));
    } catch (error) {
      console.error(error);
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
      const uploaded = await profileService.uploadProfilePicture(userId, asset, user);
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
    Alert.alert('Profile picture', 'Choose a source for your profile picture.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Gallery', onPress: chooseFromGallery },
      { text: 'Camera', onPress: takeProfilePhoto },
    ]);
  };

  const handleSave = async () => {
    if (!formData.full_name.trim()) {
      Alert.alert('Profile', 'Full name is required.');
      return;
    }
    if (role !== 'employer' && !formData.skills.trim()) {
      Alert.alert('Profile', 'Skills are required for job recommendations.');
      return;
    }

    setSaving(true);
    try {
      await profileService.updateUserDoc(userId, {
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
      }, user);

      const skills = formData.skills
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean);

      let nextProfileId = profileId;
      if (!nextProfileId) {
        const createdProfile = role === 'employer'
          ? await profileService.ensureEmployerProfile(userId, {
              full_name: formData.full_name.trim(),
              company_name: formData.company_name.trim(),
              contact_email: formData.contact_email.trim(),
              contact_phone: formData.contact_phone.trim(),
              location: formData.location.trim(),
              industry: formData.industry.trim(),
              description: formData.description.trim(),
              website: formData.website.trim(),
            })
          : await profileService.ensureSeekerProfile(userId, {
              title: formData.title.trim(),
              bio: formData.bio.trim(),
              skills,
              location: formData.location.trim(),
            });
        nextProfileId = createdProfile.$id;
        setProfileId(nextProfileId);
      }

      if (role === 'employer') {
        await profileService.updateEmployerProfile(nextProfileId, {
          company_name: formData.company_name.trim() || formData.full_name.trim(),
          contact_email: formData.contact_email.trim(),
          contact_phone: formData.contact_phone.trim(),
          location: formData.location.trim(),
          industry: formData.industry.trim(),
          description: formData.description.trim(),
          website: formData.website.trim(),
        });
      } else {
        await profileService.updateSeekerProfile(nextProfileId, {
          title: formData.title.trim(),
          bio: formData.bio.trim(),
          skills,
          location: formData.location.trim(),
        });
      }

      await refreshUserData();
      Alert.alert('Profile saved', 'Your profile has been updated.');
      router.back();
    } catch (error) {
      Alert.alert('Profile', error.message || 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
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
    <ScrollView className="flex-1 bg-background dark:bg-darkBg px-6 pt-12" keyboardShouldPersistTaps="handled">
      <View className="flex-row items-center mb-8">
        <TouchableOpacity onPress={() => router.back()} className="bg-white dark:bg-darkSurface p-2 rounded-xl border border-gray-100 dark:border-darkBorder mr-4">
          <ChevronLeft size={24} color="#2563EB" />
        </TouchableOpacity>
        <Text className="text-text dark:text-darkText text-xl font-bold">Edit Profile</Text>
      </View>

      <View className="bg-white dark:bg-darkSurface border border-gray-100 dark:border-darkBorder rounded-3xl p-5 mb-6 items-center">
        <ProfileAvatar uri={avatarUrl} name={formData.full_name} size={96} textSize={36} className="mb-4" />
        <TouchableOpacity
          onPress={pickProfilePicture}
          disabled={uploadingPhoto}
          className={`bg-blue-100 dark:bg-darkSurface2 px-4 py-3 rounded-2xl flex-row items-center ${uploadingPhoto ? 'opacity-60' : ''}`}
        >
          <Camera size={18} color="#2563EB" />
          <Text className="text-primary font-bold ml-2">{uploadingPhoto ? 'Uploading...' : 'Change Profile Picture'}</Text>
        </TouchableOpacity>
      </View>

      <Input label="Full Name" value={formData.full_name} onChangeText={(value) => updateField('full_name', value)} placeholder="Your full name" />
      <Input label="Phone" value={formData.phone} onChangeText={(value) => updateField('phone', value)} placeholder="Phone number" keyboardType="phone-pad" />

      {role === 'employer' ? (
        <>
          <Input label="Company Name" value={formData.company_name} onChangeText={(value) => updateField('company_name', value)} placeholder="Company name" />
          <Input label="Contact Email" value={formData.contact_email} onChangeText={(value) => updateField('contact_email', value)} placeholder="hiring@company.com" autoCapitalize="none" keyboardType="email-address" />
          <Input label="Contact Phone" value={formData.contact_phone} onChangeText={(value) => updateField('contact_phone', value)} placeholder="Company phone" keyboardType="phone-pad" />
          <Input label="Location" value={formData.location} onChangeText={(value) => updateField('location', value)} placeholder="Company location" />
          <Input label="Industry" value={formData.industry} onChangeText={(value) => updateField('industry', value)} placeholder="e.g. Technology, Finance" />
          <Input label="Website" value={formData.website} onChangeText={(value) => updateField('website', value)} placeholder="https://company.com" autoCapitalize="none" keyboardType="url" />
          <Input label="Company Description" value={formData.description} onChangeText={(value) => updateField('description', value)} placeholder="What does your company do?" multiline numberOfLines={4} textAlignVertical="top" inputClassName="min-h-[120px]" />
        </>
      ) : (
        <>
          <Input label="Professional Title" value={formData.title} onChangeText={(value) => updateField('title', value)} placeholder="e.g. Product Designer" />
          <Input label="Location" value={formData.location} onChangeText={(value) => updateField('location', value)} placeholder="City or preferred work location" />
          <Input label="Skills" value={formData.skills} onChangeText={(value) => updateField('skills', value)} placeholder="React, UX, Writing" />
          <Input label="Bio" value={formData.bio} onChangeText={(value) => updateField('bio', value)} placeholder="Short profile summary" multiline numberOfLines={4} textAlignVertical="top" inputClassName="min-h-[120px]" />
        </>
      )}

      <Button title="Save Changes" onPress={handleSave} loading={saving} className="mt-4 mb-10" />
    </ScrollView>
    </KeyboardAvoidingView>
  );
}


