import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, CheckCircle2 } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { formatXaf, PREMIUM_MONTHLY_PRICE_XAF } from '../../utils/jobUtils';

export default function Subscription() {
  const router = useRouter();

  const plans = [
    {
      name: 'Free',
      price: formatXaf(0),
      period: '/month',
      features: ['Up to 3 active jobs', 'Accept up to 5 applicants per job', 'Basic applicant tracking'],
      buttonText: 'Current Plan',
      featured: false,
    },
    {
      name: 'Premium',
      price: formatXaf(PREMIUM_MONTHLY_PRICE_XAF),
      period: '/month',
      features: ['Unlimited accepted applicants', 'Priority in search results', 'Direct messaging', 'Advanced analytics'],
      buttonText: 'Upgrade Now',
      featured: true,
    }
  ];

  return (
    <ScrollView className="flex-1 bg-background dark:bg-darkBg px-6 pt-12 pb-10">
      <View className="flex-row items-center mb-8">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="bg-white dark:bg-darkSurface p-2 rounded-xl shadow-sm border border-gray-100 dark:border-darkBorder mr-4"
        >
          <ChevronLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-text dark:text-darkText text-xl font-bold">Subscription Plans</Text>
      </View>

      <Text className="text-secondaryText dark:text-darkMuted text-center mb-10 text-lg px-4">
        Choose the perfect plan to grow your team with top talent.
      </Text>

      {plans.map((plan, index) => (
        <View 
          key={index}
          className={`bg-white dark:bg-darkSurface p-8 rounded-3xl mb-8 border ${plan.featured ? 'border-primary border-2 shadow-xl shadow-blue-100' : 'border-gray-100 dark:border-darkBorder shadow-sm'}`}
        >
          {plan.featured && (
            <View className="bg-primary self-start px-4 py-1 rounded-full mb-4">
              <Text className="text-white text-xs font-bold">MOST POPULAR</Text>
            </View>
          )}
          <Text className="text-text dark:text-darkText text-2xl font-bold mb-2">{plan.name}</Text>
          <View className="flex-row items-end mb-6">
            <Text className="text-text dark:text-darkText text-4xl font-black">{plan.price}</Text>
            <Text className="text-secondaryText dark:text-darkMuted text-lg mb-1">{plan.period}</Text>
          </View>

          <View className="mb-8">
            {plan.features.map((feature, fIndex) => (
              <View key={fIndex} className="flex-row items-center mb-4">
                <CheckCircle2 size={20} color={plan.featured ? '#2563EB' : '#64748B'} />
                <Text className="text-secondaryText dark:text-darkMuted ml-3">{feature}</Text>
              </View>
            ))}
          </View>

          <Button 
            title={plan.buttonText}
            variant={plan.featured ? 'primary' : 'outline'}
            onPress={() => plan.featured && router.push('/(employer)/checkout')}
            className="w-full"
          />
        </View>
      ))}
    </ScrollView>
  );
}


