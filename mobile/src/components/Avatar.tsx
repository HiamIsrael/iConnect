import React from 'react';
import { Image, Text, View } from 'react-native';
import { colors } from '../theme';
import { initials } from '../utils';
import { imageUrl } from '../api';

export default function Avatar({
  name = '',
  photoUrl,
  size = 40,
}: {
  name?: string;
  photoUrl?: string | null;
  size?: number;
}) {
  const uri = imageUrl(photoUrl);
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.elevated }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.brand,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: colors.white, fontWeight: '700', fontSize: size * 0.34 }}>
        {initials(name)}
      </Text>
    </View>
  );
}
