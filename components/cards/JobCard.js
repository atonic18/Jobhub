import React from 'react';
import { View, Text } from 'react-native';
import { ArrowUpRight, Banknote, Bookmark, BookmarkCheck, Clock3, MapPin, UsersRound } from 'lucide-react-native';
import { ProfileAvatar } from '../ui/ProfileAvatar';
import { PressableSurface } from '../ui/PressableSurface';
import { formatTimestamp, getApplicationStatusLabel, getCompanyLabel, getDepartmentForJob, getSalaryLabel } from '../../utils/jobUtils';

export const JobCard = ({ job, onPress, onSavePress, saved = false }) => {
  const skills = Array.isArray(job.required_skills)
    ? job.required_skills.filter(Boolean).slice(0, 2)
    : [];
  const extraSkillCount = Math.max((job.required_skills?.length || 0) - skills.length, 0);

  return (
    <PressableSurface
      onPress={onPress}
      className="bg-white dark:bg-darkSurface p-5 rounded-3xl mb-4 border border-slate-100 dark:border-darkBorder"
    >
      <View className="flex-row justify-between items-start mb-4">
        <View className="flex-1 flex-row items-start">
          <ProfileAvatar
            uri={job.employer_profile_pic_url}
            name={job.employer_display_name || getCompanyLabel(job)}
            size={48}
            textSize={18}
            className="mr-3"
          />
          <View className="flex-1">
            <Text className="text-text dark:text-darkText text-lg leading-6 font-bold" numberOfLines={2}>{job.title}</Text>
            <Text className="text-secondaryText dark:text-darkMuted text-sm font-medium mt-1" numberOfLines={1}>{job.employer_display_name || getCompanyLabel(job)}</Text>
          </View>
        </View>
        <View className="items-end ml-3">
          <PressableSurface
            onPress={(event) => {
              event?.stopPropagation?.();
              onSavePress?.(job);
            }}
            className="bg-slate-50 dark:bg-darkSurface2 p-2.5 rounded-2xl"
            shadow={false}
            pressedStyle={{ backgroundColor: '#DBEAFE' }}
          >
            {saved ? (
              <BookmarkCheck size={18} color="#2563EB" />
            ) : (
              <Bookmark size={18} color="#2563EB" />
            )}
          </PressableSurface>
        </View>
      </View>

      <View className="flex-row flex-wrap mb-4">
        <View className="bg-blue-50 dark:bg-darkSurface2 px-3 py-1.5 rounded-full mr-2 mb-2">
          <Text className="text-primary text-xs font-bold capitalize">{job.job_type || 'Open'}</Text>
        </View>
        {job.work_mode ? (
          <View className="bg-violet-50 dark:bg-violet-950/30 px-3 py-1.5 rounded-full mr-2 mb-2">
            <Text className="text-violet-700 dark:text-violet-300 text-xs font-bold capitalize">{job.work_mode}</Text>
          </View>
        ) : null}
        <View className="bg-slate-100 dark:bg-darkSurface2 px-3 py-1.5 rounded-full mr-2 mb-2">
          <Text className="text-secondaryText dark:text-darkMuted text-xs font-semibold">{getDepartmentForJob(job)}</Text>
        </View>
        {job.hasApplied ? (
          <View className="bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-full mb-2">
            <Text className="text-emerald-700 dark:text-emerald-300 text-xs font-bold">{getApplicationStatusLabel(job.applicationStatus)}</Text>
          </View>
        ) : null}
      </View>

      <View className="bg-slate-50 dark:bg-darkSurface2 rounded-2xl px-3 py-3 mb-4">
        <View className="flex-row items-center mb-2.5">
          <MapPin size={16} color="#64748B" />
          <Text className="text-secondaryText dark:text-darkMuted text-sm ml-2 flex-1" numberOfLines={1}>{job.location || 'Remote'}</Text>
        </View>
        <View className="flex-row items-center">
          <Banknote size={16} color="#64748B" />
          <Text className="text-secondaryText dark:text-darkMuted text-sm ml-2 flex-1" numberOfLines={1}>{getSalaryLabel(job)}</Text>
        </View>
      </View>

      {skills.length > 0 ? (
        <View className="mb-4">
          <Text className="text-secondaryText dark:text-darkMuted text-xs font-bold uppercase tracking-wide mb-2">Key skills</Text>
          <View className="flex-row flex-wrap">
            {skills.map((skill, index) => (
              <View key={`${skill}-${index}`} className="bg-slate-100 dark:bg-darkSurface2 px-3 py-1.5 rounded-full mr-2 mb-2">
                <Text className="text-secondaryText dark:text-darkMuted text-xs font-semibold">{skill}</Text>
              </View>
            ))}
            {extraSkillCount > 0 ? (
              <View className="bg-slate-100 dark:bg-darkSurface2 px-3 py-1.5 rounded-full mr-2 mb-2">
                <Text className="text-secondaryText dark:text-darkMuted text-xs font-bold">+{extraSkillCount}</Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      <View className="border-t border-slate-100 dark:border-darkBorder pt-3 flex-row items-center justify-between">
        <View className="flex-row items-center flex-1 mr-3">
          {job.$createdAt ? (
            <>
              <Clock3 size={14} color="#64748B" />
              <Text className="text-secondaryText dark:text-darkMuted text-xs ml-1.5" numberOfLines={1}>Posted {formatTimestamp(job.$createdAt)}</Text>
            </>
          ) : null}
        </View>
        {job.participants_needed ? (
          <View className="bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1.5 rounded-xl flex-row items-center mr-2">
            <UsersRound size={13} color="#B45309" />
            <Text className="text-amber-700 dark:text-amber-300 text-xs font-bold ml-1">Hiring {job.participants_needed}</Text>
          </View>
        ) : null}
        <View className="flex-row items-center">
          <Text className="text-primary text-xs font-bold mr-1">View role</Text>
          <ArrowUpRight size={15} color="#2563EB" />
        </View>
      </View>
    </PressableSurface>
  );
};


