import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Users, FileText, AlertTriangle, BarChart3 } from 'lucide-react-native';

export default function AdminDashboard() {
  const { user } = useAuth();

  const AdminCard = ({ title, value, icon, color }) => (
    <View className="bg-white dark:bg-darkSurface p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-darkBorder mb-4 flex-row items-center">
      <View className={`w-14 h-14 rounded-2xl items-center justify-center mr-4 ${color}`}>
        {icon}
      </View>
      <View>
        <Text className="text-secondaryText dark:text-darkMuted text-sm">{title}</Text>
        <Text className="text-text dark:text-darkText text-2xl font-bold">{value}</Text>
      </View>
    </View>
  );

  return (
    <ScrollView className="flex-1 bg-background dark:bg-darkBg px-6 pt-16">
      <View className="mb-8">
        <Text className="text-secondaryText dark:text-darkMuted text-lg">System Admin</Text>
        <Text className="text-text dark:text-darkText text-3xl font-bold">{user?.full_name}</Text>
      </View>

      <View className="mb-10">
        <AdminCard 
          title="Total Registered Users" 
          value="1,248" 
          icon={<Users size={28} color="#2563EB" />} 
          color="bg-blue-50"
        />
        <AdminCard 
          title="Active Job Postings" 
          value="452" 
          icon={<FileText size={28} color="#10B981" />} 
          color="bg-green-50"
        />
        <AdminCard 
          title="Reported Issues" 
          value="14" 
          icon={<AlertTriangle size={28} color="#F59E0B" />} 
          color="bg-amber-50"
        />
        <AdminCard 
          title="Monthly Revenue" 
          value="XAF 3,420" 
          icon={<BarChart3 size={28} color="#8B5CF6" />} 
          color="bg-purple-50"
        />
      </View>

      <Text className="text-text dark:text-darkText text-xl font-bold mb-4">Quick Actions</Text>
      <TouchableOpacity activeOpacity={0.92} className="bg-white dark:bg-darkSurface p-6 rounded-3xl mb-4 border border-gray-100 dark:border-darkBorder shadow-sm">
        <Text className="text-text dark:text-darkText font-bold text-lg">Manage All Users</Text>
      </TouchableOpacity>
      <TouchableOpacity activeOpacity={0.92} className="bg-white dark:bg-darkSurface p-6 rounded-3xl mb-10 border border-gray-100 dark:border-darkBorder shadow-sm">
        <Text className="text-text dark:text-darkText font-bold text-lg">Generate System Report</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}


