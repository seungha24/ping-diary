import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemedStyles } from '../theme/themed';

export default function Tag({ label }: { label: string }) {
  const styles = useThemedStyles(lightStyles);
  return (
    <View style={styles.tag}>
      <Text style={styles.hash}>#</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const lightStyles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 2,
  },
  hash: { fontSize: 11, color: '#9ca3af' },
  label: { fontSize: 11, color: '#4b5563' },
});
