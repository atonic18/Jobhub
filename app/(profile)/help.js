import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronDown, ChevronLeft, ChevronRight, Mail } from 'lucide-react-native';

const FAQS = [
  {
    question: 'How do I save a job?',
    answer: 'Tap the bookmark icon on a job card or on the job details page. Saved jobs appear in the Saved Jobs screen.',
  },
  {
    question: 'Where can I track applications?',
    answer: 'Open the Applied tab. Each submitted application appears there with its current status.',
  },
  {
    question: 'How do messages work?',
    answer: 'Conversations with employers and recruiters appear in Messages. You can search conversations from the message list.',
  },
];

export default function HelpScreen() {
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <ScrollView className="flex-1 bg-background dark:bg-darkBg">
      <View className="px-6 pt-12 pb-6">
        <View className="flex-row items-center mb-8">
          <TouchableOpacity onPress={() => router.back()} className="bg-white dark:bg-darkSurface p-2 rounded-xl border border-gray-100 dark:border-darkBorder mr-4">
            <ChevronLeft size={24} color="#2563EB" />
          </TouchableOpacity>
          <Text className="text-text dark:text-darkText text-xl font-bold">Help Center</Text>
        </View>

        {FAQS.map((item, index) => {
          const open = openIndex === index;
          return (
            <TouchableOpacity
              key={item.question}
              onPress={() => setOpenIndex(open ? -1 : index)}
              className="bg-white dark:bg-darkSurface border border-gray-100 dark:border-darkBorder rounded-3xl p-5 mb-4"
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-text dark:text-darkText font-bold text-lg flex-1 mr-3">{item.question}</Text>
                {open ? <ChevronDown size={20} color="#64748B" /> : <ChevronRight size={20} color="#64748B" />}
              </View>
              {open && <Text className="text-secondaryText dark:text-darkMuted mt-3 leading-6">{item.answer}</Text>}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          onPress={() => Linking.openURL('mailto:support@jobhub.local')}
          className="bg-primary rounded-3xl p-5 mt-2 flex-row items-center justify-between"
        >
          <View className="flex-row items-center">
            <Mail size={22} color="white" />
            <Text className="text-white font-bold text-lg ml-3">Contact Support</Text>
          </View>
          <ChevronRight size={20} color="white" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}


