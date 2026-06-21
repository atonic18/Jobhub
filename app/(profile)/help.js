import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Linking, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronDown, ChevronLeft, ChevronRight, Mail } from 'lucide-react-native';
import { PressableSurface } from '../../components/ui/PressableSurface';
import { faqService } from '../../services/faqService';
import { useAuth } from '../../context/AuthContext';
import { getUserRole } from '../../utils/jobUtils';

export default function HelpScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const role = getUserRole(user);
  const [openIndex, setOpenIndex] = useState(0);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFaqs = async () => {
      setFaqs(await faqService.getFAQItems(role));
      setLoading(false);
    };
    loadFaqs();
  }, [role]);

  return (
    <ScrollView className="flex-1 bg-background dark:bg-darkBg">
      <View className="px-6 pt-12 pb-6">
        <View className="flex-row items-center mb-8">
          <PressableSurface onPress={() => router.back()} className="bg-white dark:bg-darkSurface p-2 rounded-xl border border-gray-100 dark:border-darkBorder mr-4">
            <ChevronLeft size={24} color="#2563EB" />
          </PressableSurface>
          <Text className="text-text dark:text-darkText text-xl font-bold">Help Center</Text>
        </View>

        {loading ? <ActivityIndicator color="#2563EB" className="mt-6" /> : null}

        {faqs.map((item, index) => {
          const open = openIndex === index;
          return (
            <PressableSurface
              key={item.question}
              onPress={() => setOpenIndex(open ? -1 : index)}
              className="bg-white dark:bg-darkSurface border border-gray-100 dark:border-darkBorder rounded-3xl p-5 mb-4"
              pressedStyle={{ backgroundColor: '#F0F7FF', borderColor: '#BFDBFE' }}
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-text dark:text-darkText font-bold text-lg flex-1 mr-3">{item.question}</Text>
                {open ? <ChevronDown size={20} color="#64748B" /> : <ChevronRight size={20} color="#64748B" />}
              </View>
              {open && <Text className="text-secondaryText dark:text-darkMuted mt-3 leading-6">{item.answer}</Text>}
            </PressableSurface>
          );
        })}

        <PressableSurface
          onPress={() => Linking.openURL('mailto:support@jobhub.local')}
          className="bg-primary rounded-3xl p-5 mt-2 flex-row items-center justify-between"
          pressedStyle={{ backgroundColor: '#1D4ED8' }}
        >
          <View className="flex-row items-center">
            <Mail size={22} color="white" />
            <Text className="text-white font-bold text-lg ml-3">Contact Support</Text>
          </View>
          <ChevronRight size={20} color="white" />
        </PressableSurface>
      </View>
    </ScrollView>
  );
}


