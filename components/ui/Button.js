import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';

export const Button = ({ title, onPress, loading, disabled, variant = 'primary', className = '' }) => {
  const baseStyle = "py-4 px-6 rounded-2xl flex-row justify-center items-center";
  const variants = {
    primary: "bg-primary",
    secondary: "bg-secondary",
    outline: "border-2 border-primary bg-transparent",
    ghost: "bg-transparent"
  };
  
  const textVariants = {
    primary: "text-white font-bold",
    secondary: "text-white font-bold",
    outline: "text-primary font-bold",
    ghost: "text-primary font-bold"
  };

  return (
    <TouchableOpacity 
      onPress={onPress} 
      disabled={loading || disabled}
      className={`${baseStyle} ${variants[variant]} ${(loading || disabled) ? 'opacity-60' : ''} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? '#2563EB' : 'white'} />
      ) : (
        <Text className={`${textVariants[variant]} text-lg`}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};


