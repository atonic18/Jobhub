import React from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  buttonShadow: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 9,
    elevation: 2,
  },
  primaryPressed: {
    backgroundColor: '#1D4ED8',
    shadowColor: '#2563EB',
    shadowOpacity: 0.18,
  },
  secondaryPressed: {
    backgroundColor: '#4338CA',
    shadowColor: '#4F46E5',
    shadowOpacity: 0.18,
  },
  lightPressed: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
});

const pressedStyleForVariant = {
  primary: styles.primaryPressed,
  secondary: styles.secondaryPressed,
  outline: styles.lightPressed,
  ghost: styles.lightPressed,
};

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
    <Pressable
      onPress={onPress}
      disabled={loading || disabled}
      className={`${baseStyle} ${variants[variant]} ${(loading || disabled) ? 'opacity-60' : ''} ${className}`}
      style={({ pressed }) => [
        variant === 'ghost' ? null : styles.buttonShadow,
        pressed && !loading && !disabled ? pressedStyleForVariant[variant] : null,
      ]}
      android_ripple={{ color: variant === 'primary' || variant === 'secondary' ? 'rgba(255,255,255,0.16)' : 'rgba(37,99,235,0.08)' }}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? '#2563EB' : 'white'} />
      ) : (
        <Text className={`${textVariants[variant]} text-lg`}>{title}</Text>
      )}
    </Pressable>
  );
};


