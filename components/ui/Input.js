import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

export const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  error,
  className = '',
  inputClassName = '',
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = secureTextEntry;

  return (
    <View className={`mb-4 ${className}`}>
      {label && <Text className="text-text dark:text-darkText font-semibold mb-2 ml-1">{label}</Text>}
      <View className="relative">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          secureTextEntry={isPasswordField && !showPassword}
          placeholderTextColor="#64748B"
          className={`bg-white dark:bg-darkSurface border ${error ? 'border-red-500' : 'border-gray-200 dark:border-darkBorder'} rounded-2xl p-4 pr-12 text-text dark:text-darkText ${inputClassName}`}
          {...props}
        />
        {isPasswordField && (
          <TouchableOpacity 
            className="absolute right-4 top-4"
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
      {error && <Text className="text-red-500 text-sm mt-1 ml-1">{error}</Text>}
    </View>
  );
};


