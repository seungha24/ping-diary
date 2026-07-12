import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { getPhotoPlaceholder } from '../data/types';
import { useThemedStyles } from '../theme/themed';

interface Props {
  photo: string | null;
  size?: number;
  radius?: number;
}

function resolveSource(photo: string) {
  return { uri: photo };
}

/** 작은 썸네일 (p!ng 목록 카드용) */
export function PhotoThumb({ photo, size = 48, radius = 10 }: Props) {
  const styles = useThemedStyles(lightStyles);
  if (!photo) return null;
  if (photo.startsWith('ph:')) {
    const p = getPhotoPlaceholder(photo);
    return (
      <View style={[styles.thumb, { width: size, height: size, borderRadius: radius, backgroundColor: p.bg }]}>
        <Text style={{ fontSize: size * 0.4 }}>{p.emoji}</Text>
      </View>
    );
  }
  return <Image source={resolveSource(photo)} style={[styles.thumb, { width: size, height: size, borderRadius: radius }]} />;
}

/** 전체 너비 사진 블록 (상세/그룹 피드용) */
export function PhotoBlock({ photo, height = 140 }: { photo: string | null; height?: number }) {
  const styles = useThemedStyles(lightStyles);
  if (!photo) return null;
  if (photo.startsWith('ph:')) {
    const p = getPhotoPlaceholder(photo);
    return (
      <View style={[styles.block, { height, backgroundColor: p.bg }]}>
        <Text style={{ fontSize: height * 0.3 }}>{p.emoji}</Text>
      </View>
    );
  }
  return <Image source={resolveSource(photo)} style={{ width: '100%', height }} resizeMode="cover" />;
}

/** 원본 비율 그대로 보여주는 전체 너비 사진 (일기 상세용). minRatio로 세로 사진 높이 제한 */
export function AspectPhoto({ photo, radius = 0, minRatio = 0.6 }: { photo: string | null; radius?: number; minRatio?: number }) {
  const [ratio, setRatio] = useState<number | null>(null);

  useEffect(() => {
    if (!photo || photo.startsWith('ph:')) return;
    Image.getSize(photo, (w, h) => { if (w && h) setRatio(w / h); }, () => setRatio(4 / 3));
  }, [photo]);

  if (!photo) return null;
  if (photo.startsWith('ph:')) return <PhotoBlock photo={photo} height={200} />;
  // 세로로 긴 사진은 minRatio까지만 (화면 독점 방지, 탭하면 어차피 원본 확대)
  const r = Math.max(ratio ?? 4 / 3, minRatio);
  return (
    <Image
      source={resolveSource(photo)}
      style={{ width: '100%', aspectRatio: r, borderRadius: radius }}
      resizeMode="cover"
    />
  );
}

const lightStyles = StyleSheet.create({
  thumb: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  block: { width: '100%', alignItems: 'center', justifyContent: 'center' },
});
