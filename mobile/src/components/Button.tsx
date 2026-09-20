import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, radius } from '../theme';

export default function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'ghost' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : variant === 'outline' ? styles.outline : styles.ghost,
        (pressed || disabled || loading) && styles.dimmed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.white : colors.text} />
      ) : (
        <Text style={[styles.text, isPrimary ? styles.primaryText : styles.ghostText]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.brand,
  },
  outline: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
  },
  primaryText: {
    color: colors.white,
  },
  ghostText: {
    color: colors.text,
  },
  dimmed: {
    opacity: 0.6,
  },
});
