import React, { useEffect, useRef } from 'react';
import {
  Modal, View, Text, Animated, Pressable,
  Dimensions, StyleSheet, TouchableOpacity, Image,
} from 'react-native';
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

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 200, friction: 16, useNativeDriver: true }),
    ]).start();
  }, []);

  function close() {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.86, duration: 150, useNativeDriver: true }),
    ]).start(onClose);
  }

  if (!photo) return null;

  const placeholder = photo.startsWith('ph:') ? getPhotoPlaceholder(photo) : null;
  const assetSource = photo.startsWith('asset:') ? PHOTO_ASSETS[photo.slice(6)] : null;
  const size = 220;

  return (
    <Modal visible transparent statusBarTranslucent animationType="none">
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />

        <Animated.View style={[styles.card, { width: size, height: size, transform: [{ scale: scaleAnim }] }]}>
          {placeholder ? (
            <View style={[styles.placeholder, { backgroundColor: placeholder.bg }]}>
              <Text style={{ fontSize: size * 0.38 }}>{placeholder.emoji}</Text>
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
    backgroundColor: '#111',
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
