import React from 'react';
import { View, Text } from 'react-native';

export const Logo = ({ size = 60, color = "#2563EB" }) => {
  return (
    <View 
      style={{ 
        width: size, 
        height: size, 
        backgroundColor: color, 
        borderRadius: size / 4,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      }}
    >
      <Text 
        style={{ 
          color: 'white', 
          fontSize: size / 2.5, 
          fontWeight: 'bold',
          letterSpacing: 1
        }}
      >
        JH
      </Text>
    </View>
  );
};


