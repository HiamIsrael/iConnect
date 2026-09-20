import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

export default function Empty({ text = 'Nothing here yet.' }: { text?: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderStyle: 'dashed',
    marginVertical: spacing.md,
  },
  text: {
    color: colors.muted,
    fontSize: 14,
  },
});
