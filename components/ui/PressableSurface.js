import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  pressed: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    shadowColor: '#2563EB',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 3,
    transform: [{ scale: 0.995 }],
  },
});

export const PressableSurface = ({
  children,
  className = '',
  style,
  pressedStyle,
  disabled,
  shadow = true,
  ...props
}) => (
  <Pressable
    disabled={disabled}
    className={className}
    android_ripple={{ color: 'rgba(37, 99, 235, 0.08)' }}
    style={({ pressed }) => {
      const resolvedStyle = typeof style === 'function' ? style({ pressed }) : style;
      return [
        shadow ? styles.shadow : null,
        resolvedStyle,
        pressed && !disabled ? styles.pressed : null,
        pressed && !disabled ? pressedStyle : null,
        disabled ? { opacity: 0.6 } : null,
      ];
    }}
    {...props}
  >
    {typeof children === 'function'
      ? ({ pressed }) => children({ pressed: pressed && !disabled })
      : children}
  </Pressable>
);

