import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Banknote, Bookmark, BookmarkCheck, Clock, MapPin, Users } from 'lucide-react-native';
import { ProfileAvatar } from '../ui/ProfileAvatar';
import { formatTimestamp, getApplicationStatusLabel, getCompanyLabel, getDepartmentForJob, getSalaryLabel } from '../../utils/jobUtils';

export const JobCard = ({ job, onPress, onSavePress, saved = false }) => {
  return (
    <TouchableOpacity 
      onPress={onPress}
      className="bg-white dark:bg-darkSurface p-5 rounded-3xl mb-4 shadow-sm border border-gray-100 dark:border-darkBorder"
    >
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1 flex-row items-start">
          <ProfileAvatar
            uri={job.employer_profile_pic_url}
            name={job.employer_display_name || getCompanyLabel(job)}
            size={44}
            textSize={18}
            className="mr-3"
          />
          <View className="flex-1">
            <Text className="text-text dark:text-darkText text-xl font-bold mb-1">{job.title}</Text>
            <Text className="text-secondaryText dark:text-darkMuted font-medium">{job.employer_display_name || getCompanyLabel(job)}</Text>
          </View>
        </View>
        <View className="items-end ml-3">
          <TouchableOpacity
            onPress={(event) => {
              event?.stopPropagation?.();
              onSavePress?.(job);
            }}
            className="bg-blue-50 dark:bg-darkSurface2 p-2 rounded-full mb-2"
          >
            {saved ? (
              <BookmarkCheck size={18} color="#2563EB" />
            ) : (
              <Bookmark size={18} color="#2563EB" />
            )}
          </TouchableOpacity>
          <View className="bg-blue-100 dark:bg-darkSurface2 px-3 py-1 rounded-full">
            <Text className="text-primary text-xs font-bold">{job.job_type || 'Open'}</Text>
          </View>
          {job.hasApplied ? (
            <View className="bg-green-100 dark:bg-darkSurface2 px-3 py-1 rounded-full mt-2">
              <Text className="text-green-700 dark:text-green-300 text-xs font-bold">
                {getApplicationStatusLabel(job.applicationStatus)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      
      <View className="flex-row items-center mb-4 space-x-4">
        <View className="flex-row items-center">
          <MapPin size={16} color="#64748B" />
          <Text className="text-secondaryText dark:text-darkMuted text-sm ml-1">{job.location || 'Remote'}</Text>
        </View>
        <View className="flex-row items-center ml-4">
          <Banknote size={16} color="#64748B" />
          <Text className="text-secondaryText dark:text-darkMuted text-sm ml-1">{getSalaryLabel(job)}</Text>
        </View>
      </View>

      {job.$createdAt ? (
        <View className="flex-row items-center mb-4">
          <Clock size={14} color="#64748B" />
          <Text className="text-secondaryText dark:text-darkMuted text-xs ml-1">Posted {formatTimestamp(job.$createdAt)}</Text>
        </View>
      ) : null}

      <View className="flex-row flex-wrap">
        <View className="bg-gray-100 dark:bg-darkSurface2 px-3 py-1 rounded-lg mr-2 mb-2">
          <Text className="text-secondaryText dark:text-darkMuted text-xs">{getDepartmentForJob(job)}</Text>
        </View>
        {job.work_mode && (
          <View className="bg-gray-100 dark:bg-darkSurface2 px-3 py-1 rounded-lg mr-2 mb-2">
            <Text className="text-secondaryText dark:text-darkMuted text-xs">{job.work_mode}</Text>
          </View>
        )}
        {job.participants_needed ? (
          <View className="bg-gray-100 dark:bg-darkSurface2 px-3 py-1 rounded-lg mr-2 mb-2 flex-row items-center">
            <Users size={12} color="#64748B" />
            <Text className="text-secondaryText dark:text-darkMuted text-xs ml-1">{job.participants_needed} needed</Text>
          </View>
        ) : null}
        <View className="bg-blue-100 dark:bg-darkSurface2 px-3 py-1 rounded-lg mr-2 mb-2 flex-row items-center">
          <Users size={12} color="#2563EB" />
          <Text className="text-primary text-xs font-bold ml-1">{job.applicant_count || 0} applicants</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};


