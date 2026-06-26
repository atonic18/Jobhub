import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

const styles = StyleSheet.create({
  fieldShadow: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 18,
    elevation: 1,
  },
});

export const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  error,
  helperText,
  leftIcon,
  className = '',
  inputClassName = '',
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = secureTextEntry;

  return (
    <View className={`mb-5 ${className}`}>
      {label && <Text className="text-text dark:text-darkText font-bold mb-2 ml-1">{label}</Text>}
      <View
        className={`relative flex-row items-center bg-white dark:bg-darkSurface border ${error ? 'border-red-400' : 'border-slate-200 dark:border-darkBorder'} rounded-3xl px-4`}
        style={styles.fieldShadow}
      >
        {leftIcon ? <View className="mr-3">{leftIcon}</View> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          secureTextEntry={isPasswordField && !showPassword}
          placeholderTextColor="#94A3B8"
          className={`flex-1 py-4 text-base text-text dark:text-darkText ${isPasswordField ? 'pr-12' : ''} ${inputClassName}`}
          {...props}
        />
        {isPasswordField && (
          <TouchableOpacity activeOpacity={0.92}
            className="absolute right-4 top-4 bg-slate-100 dark:bg-darkSurface2 rounded-full p-1"
            onPress={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff size={20} color="#64748B" />
            ) : (
              <Eye size={20} color="#64748B" />
            )}
          </TouchableOpacity>
        )}
      </View>
      {error ? (
        <Text className="text-red-500 text-sm mt-2 ml-1">{error}</Text>
      ) : helperText ? (
        <Text className="text-secondaryText dark:text-darkMuted text-sm mt-2 ml-1">{helperText}</Text>
      ) : null}
    </View>
  );
};


