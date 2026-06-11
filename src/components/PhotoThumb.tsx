import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { getPhotoPlaceholder } from '../data/types';

interface Props {
  photo: string | null;
  size?: number;
  radius?: number;
}

/** 작은 썸네일 (일기 목록 카드용) */
export function PhotoThumb({ photo, size = 48, radius = 10 }: Props) {
  if (!photo) return null;
  if (photo.startsWith('ph:')) {
    const p = getPhotoPlaceholder(photo);
    return (
      <View style={[styles.thumb, { width: size, height: size, borderRadius: radius, backgroundColor: p.bg }]}>
        <Text style={{ fontSize: size * 0.4 }}>{p.emoji}</Text>
      </View>
    );
  }
  return <Image source={{ uri: photo }} style={[styles.thumb, { width: size, height: size, borderRadius: radius }]} />;
}

/** 전체 너비 사진 블록 (상세/그룹 피드용) */
export function PhotoBlock({ photo, height = 140 }: { photo: string | null; height?: number }) {
  if (!photo) return null;
  if (photo.startsWith('ph:')) {
    const p = getPhotoPlaceholder(photo);
    return (
      <View style={[styles.block, { height, backgroundColor: p.bg }]}>
        <Text style={{ fontSize: height * 0.3 }}>{p.emoji}</Text>
      </View>
    );
  }
  return <Image source={{ uri: photo }} style={{ width: '100%', height }} resizeMode="cover" />;
}

const styles = StyleSheet.create({
  thumb: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  block: { width: '100%', alignItems: 'center', justifyContent: 'center' },
});
