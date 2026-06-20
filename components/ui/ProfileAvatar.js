import React from 'react';
import { Image, Text, View } from 'react-native';

const getInitial = (name) => String(name || 'J').trim().slice(0, 1).toUpperCase() || 'J';

export const ProfileAvatar = ({ uri, name, size = 48, textSize = 18, className = '' }) => (
  <View
    className={`bg-blue-100 dark:bg-darkSurface2 rounded-full items-center justify-center overflow-hidden ${className}`}
    style={{ width: size, height: size, borderRadius: size / 2 }}
  >
    {uri ? (
      <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="cover" />
    ) : (
      <Text className="text-primary font-bold" style={{ fontSize: textSize }}>
        {getInitial(name)}
      </Text>
    )}
  </View>
);
