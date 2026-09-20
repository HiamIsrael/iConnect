import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';

const palette: Record<string, string> = {
  brand: colors.brand,
  success: colors.success,
  warning: colors.warning,
  accent: colors.accent,
};

export default function Badge({ label = '', tone = 'accent' }: { label?: string; tone?: string }) {
  return (
    <View style={[styles.badge, { borderColor: palette[tone] || colors.line }]}>
      <Text style={[styles.text, { color: palette[tone] || colors.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  },
});
