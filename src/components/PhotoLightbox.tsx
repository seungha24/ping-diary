import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, Animated, Pressable,
  Dimensions, StyleSheet, Image,
} from 'react-native';
import TouchableOpacity from './Touchable';
import { getPhotoPlaceholder } from '../data/types';
import PHOTO_ASSETS from '../data/photoAssets';
import { IconX } from './icons/Line';

const { width: SW } = Dimensions.get('window');

interface Props {
  photo: string | null;
  onClose: () => void;
}

export default function PhotoLightbox({ photo, onClose }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.86)).current;
  const [ratio, setRatio] = useState<number | null>(null); // 원본 가로/세로 비율

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 200, friction: 16, useNativeDriver: true }),
    ]).start();
  }, []);

  // 원본 비율을 재서 레터박스(위아래 검은 띠) 없이 꼭 맞는 박스로 표시
  useEffect(() => {
    if (!photo || photo.startsWith('ph:')) return;
    if (photo.startsWith('asset:')) {
      try {
        const resolved = (Image as any).resolveAssetSource?.(PHOTO_ASSETS[photo.slice(6)]);
        if (resolved?.width && resolved?.height) setRatio(resolved.width / resolved.height);
        else setRatio(4 / 3);
      } catch { setRatio(4 / 3); }
      return;
    }
    Image.getSize(photo, (w, h) => { if (w && h) setRatio(w / h); }, () => setRatio(4 / 3));
  }, [photo]);

  function close() {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.86, duration: 150, useNativeDriver: true }),
    ]).start(onClose);
  }

  if (!photo) return null;

  const placeholder = photo.startsWith('ph:') ? getPhotoPlaceholder(photo) : null;
  const assetSource = photo.startsWith('asset:') ? PHOTO_ASSETS[photo.slice(6)] : null;
  // 폰 프레임(393pt) 안에서 원본 비율 그대로 최대한 크게 (레터박스 없음)
  const MAX_W = 345;
  const MAX_H = 640;
  const r = ratio ?? 4 / 3;
  let boxW = MAX_W;
  let boxH = boxW / r;
  if (boxH > MAX_H) { boxH = MAX_H; boxW = boxH * r; }
  if (placeholder) { boxW = MAX_W; boxH = MAX_W; }

  return (
    <Modal visible transparent statusBarTranslucent animationType="none">
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />

        <Animated.View style={[styles.card, { width: boxW, height: boxH, transform: [{ scale: scaleAnim }] }]}>
          {placeholder ? (
            <View style={[styles.placeholder, { backgroundColor: placeholder.bg }]}>
              <Text style={{ fontSize: boxW * 0.38 }}>{placeholder.emoji}</Text>
            </View>
          ) : (
            <Image source={assetSource ?? { uri: photo }} style={styles.image} resizeMode="contain" />
          )}

          <TouchableOpacity style={styles.closeBtn} onPress={close}>
            <IconX size={20} color="#ffffff" />
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    flex: 1,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
