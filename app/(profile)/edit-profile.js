import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { AlignLeft, Award, BriefcaseBusiness, Building2, Camera, ChevronLeft, FileText, Globe2, GraduationCap, Mail, MapPin, Paperclip, Phone, RefreshCw, Sparkles, Trash2, UserRound } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ProfileAvatar } from '../../components/ui/ProfileAvatar';
import { useAuth } from '../../context/AuthContext';
import { profileService } from '../../services/profileService';
import { documentService } from '../../services/documentService';
import { fileService } from '../../services/fileService';
import {
  EMPLOYEE_DOCUMENT_TYPES,
  getBusinessTypeLabel,
  getDocumentTypeLabel,
  getUserId,
  getUserRole,
} from '../../utils/jobUtils';

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
  const [documents, setDocuments] = useState([]);
  const [documentType, setDocumentType] = useState('cv');
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [replacingDocumentId, setReplacingDocumentId] = useState(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState(null);
  const [rescanningDocumentId, setRescanningDocumentId] = useState(null);
  const [formData, setFormData] = useState({
    full_name: user?.full_name || user?.name || '',
    phone: user?.phone || '',
    title: '',
    bio: '',
    skills: '',
    experience: '',
    certificates: '',
    qualifications: '',
    location: '',
    company_name: '',
    contact_email: '',
    contact_phone: '',
    industry: '',
    business_type_detail: '',
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
        experience: profile?.experience || '',
        certificates: Array.isArray(profile?.certificates) ? profile.certificates.join(', ') : profile?.certificates || '',
        qualifications: profile?.qualifications || '',
        location: profile?.location || '',
        company_name: profile?.company_name || '',
        contact_email: profile?.contact_email || user?.email || '',
        contact_phone: profile?.contact_phone || user?.phone || '',
        industry: profile?.industry || '',
        business_type_detail: profile?.business_type_detail || getBusinessTypeLabel(profile?.business_type) || '',
        description: profile?.description || '',
        website: profile?.website || '',
      }));
      if (role !== 'employer') {
        const documentResponse = await documentService.getDocuments(userId);
        setDocuments(documentResponse.documents || []);
      }
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

  const pickDocumentAsset = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return null;
    return result.assets[0];
  };

  const uploadEmployeeDocument = async () => {
    if (!userId || uploadingDocument) return;
    try {
      const asset = await pickDocumentAsset();
      if (!asset) return;
      setUploadingDocument(true);
      const created = await documentService.uploadDocument({
        userId,
        documentType,
        asset,
      });
      setDocuments((current) => [created, ...current]);
    } catch (error) {
      Alert.alert('Document upload', error.message || 'Could not upload this document.');
    } finally {
      setUploadingDocument(false);
    }
  };

  const replaceEmployeeDocument = async (document) => {
    if (!document || replacingDocumentId) return;
    try {
      const asset = await pickDocumentAsset();
      if (!asset) return;
      setReplacingDocumentId(document.$id);
      const updated = await documentService.replaceDocument({ document, asset });
      setDocuments((current) => current.map((item) => item.$id === document.$id ? updated : item));
    } catch (error) {
      Alert.alert('Replace document', error.message || 'Could not replace this document.');
    } finally {
      setReplacingDocumentId(null);
    }
  };

  const deleteEmployeeDocument = (document) => {
    Alert.alert('Delete document', `Delete "${document.file_name || 'document'}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingDocumentId(document.$id);
          try {
            await documentService.deleteDocument(document);
            setDocuments((current) => current.filter((item) => item.$id !== document.$id));
          } catch (error) {
            Alert.alert('Delete document', error.message || 'Could not delete this document.');
          } finally {
            setDeletingDocumentId(null);
          }
        },
      },
    ]);
  };

  const rescanEmployeeDocument = async (document) => {
    setRescanningDocumentId(document.$id);
    try {
      await documentService.rescanDocument(document.$id);
      setDocuments((current) =>
        current.map((item) => item.$id === document.$id ? { ...item, scan_status: 'queued', scan_error: '' } : item)
      );
    } catch (error) {
      Alert.alert('Document scan', error.message || 'Could not scan this document.');
    } finally {
      setRescanningDocumentId(null);
    }
  };

  const openEmployeeDocument = async (document) => {
    const url = fileService.getOpenUrl({
      bucketId: document.bucket_id,
      fileId: document.file_id,
      name: document.file_name,
      type: document.file_type,
      url: document.file_url,
    });
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Document', 'Could not open this document.');
    }
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
      const certificates = formData.certificates
        .split(',')
        .map((certificate) => certificate.trim())
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
              business_type_detail: formData.business_type_detail.trim(),
              description: formData.description.trim(),
              website: formData.website.trim(),
            })
          : await profileService.ensureSeekerProfile(userId, {
              title: formData.title.trim(),
              bio: formData.bio.trim(),
              skills,
              experience: formData.experience.trim(),
              certificates,
              qualifications: formData.qualifications.trim(),
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
          business_type_detail: formData.business_type_detail.trim(),
          description: formData.description.trim(),
          website: formData.website.trim(),
        });
      } else {
        await profileService.updateSeekerProfile(nextProfileId, {
          title: formData.title.trim(),
          bio: formData.bio.trim(),
          skills,
          experience: formData.experience.trim(),
          certificates,
          qualifications: formData.qualifications.trim(),
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
    <ScrollView
      className="flex-1 bg-background dark:bg-darkBg px-6 pt-16"
      contentContainerStyle={{ paddingBottom: 112 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-row items-center mb-8">
        <TouchableOpacity activeOpacity={0.92} onPress={() => router.back()} className="bg-white dark:bg-darkSurface p-2 rounded-xl border border-gray-100 dark:border-darkBorder mr-4">
          <ChevronLeft size={24} color="#2563EB" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-secondaryText dark:text-darkMuted text-xs font-bold uppercase tracking-wider">
            {role === 'employer' ? 'Employer profile' : 'Job seeker profile'}
          </Text>
          <Text className="text-text dark:text-darkText text-2xl font-extrabold mt-1">Edit Profile</Text>
        </View>
      </View>

      <View className="bg-white dark:bg-darkSurface border border-gray-100 dark:border-darkBorder rounded-3xl p-5 mb-6 items-center">
        <ProfileAvatar uri={avatarUrl} name={formData.full_name} size={96} textSize={36} className="mb-4" />
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
        <Text className="text-text dark:text-darkText text-lg font-extrabold mb-1">Basic information</Text>
        <Text className="text-secondaryText dark:text-darkMuted mb-5 leading-5">
          Keep this accurate so employers can identify and contact you.
        </Text>

        <Input
          label="Full name"
          value={formData.full_name}
          onChangeText={(value) => updateField('full_name', value)}
          placeholder="e.g. Hilary Ngwa"
          autoCapitalize="words"
          textContentType="name"
          leftIcon={<UserRound size={20} color="#2563EB" />}
        />
        <Input
          label="Phone number"
          value={formData.phone}
          onChangeText={(value) => updateField('phone', value)}
          placeholder="e.g. +237 6XX XXX XXX"
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          leftIcon={<Phone size={20} color="#2563EB" />}
        />
      </View>

      {role === 'employer' ? (
        <>
          <Input label="Company Name" value={formData.company_name} onChangeText={(value) => updateField('company_name', value)} placeholder="e.g. JobHub Technologies" leftIcon={<Building2 size={20} color="#2563EB" />} />
          <Input label="Contact Email" value={formData.contact_email} onChangeText={(value) => updateField('contact_email', value)} placeholder="e.g. careers@company.com" autoCapitalize="none" keyboardType="email-address" leftIcon={<Mail size={20} color="#2563EB" />} />
          <Input label="Contact Phone" value={formData.contact_phone} onChangeText={(value) => updateField('contact_phone', value)} placeholder="e.g. +237 6XX XXX XXX" keyboardType="phone-pad" leftIcon={<Phone size={20} color="#2563EB" />} />
          <Input label="Location" value={formData.location} onChangeText={(value) => updateField('location', value)} placeholder="e.g. Douala, Cameroon" leftIcon={<MapPin size={20} color="#2563EB" />} />
          <Input label="Industry" value={formData.industry} onChangeText={(value) => updateField('industry', value)} placeholder="e.g. Technology, finance, healthcare" leftIcon={<BriefcaseBusiness size={20} color="#2563EB" />} />
          <Input
            label="Business Type"
            value={formData.business_type_detail}
            onChangeText={(value) => updateField('business_type_detail', value)}
            placeholder="e.g. Fashion retail, logistics startup, fintech agency"
            leftIcon={<Building2 size={20} color="#2563EB" />}
          />
          <Input label="Website" value={formData.website} onChangeText={(value) => updateField('website', value)} placeholder="e.g. https://company.com" autoCapitalize="none" keyboardType="url" leftIcon={<Globe2 size={20} color="#2563EB" />} />
          <Input label="Company Description" value={formData.description} onChangeText={(value) => updateField('description', value)} placeholder="Briefly describe what your company does and who you hire." multiline numberOfLines={4} textAlignVertical="top" inputClassName="min-h-[120px]" leftIcon={<FileText size={20} color="#2563EB" />} />
        </>
      ) : (
        <>
          <View className="bg-white/70 dark:bg-darkSurface/70 rounded-[32px] p-4 border border-white dark:border-darkBorder mb-6">
            <Text className="text-text dark:text-darkText text-lg font-extrabold mb-1">Career profile</Text>
            <Text className="text-secondaryText dark:text-darkMuted mb-5 leading-5">
              These fields help employers understand what you do and which jobs fit you.
            </Text>

            <Input
              label="Professional title"
              value={formData.title}
              onChangeText={(value) => updateField('title', value)}
              placeholder="e.g. Product Designer, Accountant, Sales Executive"
              autoCapitalize="words"
              leftIcon={<BriefcaseBusiness size={20} color="#2563EB" />}
            />
            <Input
              label="Preferred location"
              value={formData.location}
              onChangeText={(value) => updateField('location', value)}
              placeholder="e.g. Douala, Yaounde, Remote"
              autoCapitalize="words"
              helperText="Use the city or work mode where you want to receive opportunities."
              leftIcon={<MapPin size={20} color="#2563EB" />}
            />
            <Input
              label="Top skills"
              value={formData.skills}
              onChangeText={(value) => updateField('skills', value)}
              placeholder="e.g. React Native, customer support, bookkeeping"
              autoCapitalize="words"
              helperText="Separate skills with commas. These power your job recommendations."
              leftIcon={<Sparkles size={20} color="#2563EB" />}
            />
            <Input
              label="Work experience"
              value={formData.experience}
              onChangeText={(value) => updateField('experience', value)}
              placeholder="Summarize your recent roles, responsibilities, tools used, and achievements."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              inputClassName="min-h-[120px]"
              leftIcon={<AlignLeft size={20} color="#2563EB" />}
            />
            <Input
              label="Certificates"
              value={formData.certificates}
              onChangeText={(value) => updateField('certificates', value)}
              placeholder="e.g. HND Accounting, CPA, AWS Cloud Practitioner"
              autoCapitalize="words"
              helperText="Separate certificates with commas."
              leftIcon={<Award size={20} color="#2563EB" />}
            />
            <Input
              label="Qualifications"
              value={formData.qualifications}
              onChangeText={(value) => updateField('qualifications', value)}
              placeholder="List degrees, diplomas, licenses, apprenticeships, or training."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              inputClassName="min-h-[100px]"
              leftIcon={<GraduationCap size={20} color="#2563EB" />}
            />
            <Input
              label="Profile bio"
              value={formData.bio}
              onChangeText={(value) => updateField('bio', value)}
              placeholder="Write a short intro about your strengths, work style, and the roles you are looking for."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              inputClassName="min-h-[120px]"
              leftIcon={<FileText size={20} color="#2563EB" />}
            />
          </View>
          <View className="bg-white dark:bg-darkSurface border border-gray-100 dark:border-darkBorder rounded-3xl p-5 mb-6">
            <Text className="text-text dark:text-darkText text-lg font-bold mb-1">CV and Credentials</Text>
            <Text className="text-secondaryText dark:text-darkMuted mb-4">PDFs and images stay private until you choose to share them with an application.</Text>

            <Text className="text-text dark:text-darkText font-semibold mb-2 ml-1">Document Type</Text>
            <View className="flex-row flex-wrap mb-4">
              {EMPLOYEE_DOCUMENT_TYPES.map((type) => (
                <TouchableOpacity activeOpacity={0.92}
                  key={type.value}
                  onPress={() => setDocumentType(type.value)}
                  className={`px-4 py-2 rounded-2xl border mr-2 mb-2 ${documentType === type.value ? 'bg-primary border-primary' : 'bg-gray-50 dark:bg-darkSurface2 border-gray-200 dark:border-darkBorder'}`}
                >
                  <Text className={`${documentType === type.value ? 'text-white' : 'text-secondaryText dark:text-darkMuted'} font-bold`}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity activeOpacity={0.92}
              onPress={uploadEmployeeDocument}
              disabled={uploadingDocument}
              className={`border border-dashed border-primary rounded-2xl p-4 flex-row items-center justify-center mb-4 ${uploadingDocument ? 'opacity-60' : ''}`}
            >
              <Paperclip size={18} color="#2563EB" />
              <Text className="text-primary font-bold ml-2">{uploadingDocument ? 'Uploading...' : 'Upload PDF or Image'}</Text>
            </TouchableOpacity>

            {documents.length === 0 ? (
              <View className="bg-gray-50 dark:bg-darkSurface2 rounded-2xl p-4">
                <Text className="text-secondaryText dark:text-darkMuted">No CV or credentials uploaded yet.</Text>
              </View>
            ) : (
              documents.map((document) => (
                <View key={document.$id} className="bg-gray-50 dark:bg-darkSurface2 rounded-2xl p-4 mb-3">
                  <TouchableOpacity activeOpacity={0.92} onPress={() => openEmployeeDocument(document)} className="flex-row items-center">
                    <FileText size={20} color="#2563EB" />
                    <View className="flex-1 ml-3">
                      <Text className="text-text dark:text-darkText font-bold" numberOfLines={1}>{document.file_name || 'Document'}</Text>
                      <Text className="text-secondaryText dark:text-darkMuted text-xs mt-1">
                        {getDocumentTypeLabel(document.document_type)} - {document.scan_status || 'queued'}
                      </Text>
                      {document.scan_error ? (
                        <Text className="text-red-500 text-xs mt-1" numberOfLines={2}>{document.scan_error}</Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                  <View className="flex-row mt-3">
                    <TouchableOpacity activeOpacity={0.92}
                      onPress={() => replaceEmployeeDocument(document)}
                      disabled={replacingDocumentId === document.$id}
                      className="flex-1 bg-white dark:bg-darkSurface border border-gray-100 dark:border-darkBorder rounded-2xl py-3 items-center mr-2"
                    >
                      <Text className="text-primary font-bold">{replacingDocumentId === document.$id ? 'Replacing...' : 'Replace'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity activeOpacity={0.92}
                      onPress={() => rescanEmployeeDocument(document)}
                      disabled={rescanningDocumentId === document.$id}
                      className="bg-white dark:bg-darkSurface border border-gray-100 dark:border-darkBorder rounded-2xl px-4 items-center justify-center mr-2"
                    >
                      <RefreshCw size={18} color={rescanningDocumentId === document.$id ? '#94A3B8' : '#2563EB'} />
                    </TouchableOpacity>
                    <TouchableOpacity activeOpacity={0.92}
                      onPress={() => deleteEmployeeDocument(document)}
                      disabled={deletingDocumentId === document.$id}
                      className="bg-red-50 rounded-2xl px-4 items-center justify-center"
                    >
                      <Trash2 size={18} color={deletingDocumentId === document.$id ? '#94A3B8' : '#EF4444'} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </>
      )}

      <Button title="Save Changes" onPress={handleSave} loading={saving} className="mt-4 mb-10" />
    </ScrollView>
    </KeyboardAvoidingView>
  );
}


