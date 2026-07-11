import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/themed';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Splash'>;
};

export default function SplashScreen({ navigation }: Props) {
  const styles = useThemedStyles(lightStyles);
  const { accent } = useTheme();
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={[styles.logoBox, { backgroundColor: accent }]}>
          <Text style={styles.logoText}>p!ng</Text>
        </View>

        <View style={styles.taglineContainer}>
          <Text style={styles.tagline}>나만의 감정 p!ng</Text>
          <Text style={styles.subtitle}>매일의 순간을 기록하고{'\n'}AI 친구와 함께 대화해보세요</Text>
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.btnFilled, { backgroundColor: accent }]}
            onPress={() => navigation.replace('Main')}
          >
            <Text style={styles.btnFilledText}>시작하기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnOutline}
            onPress={() => navigation.replace('Main')}
          >
            <Text style={styles.btnOutlineText}>로그인</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const lightStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 32,
  },
  logoBox: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  taglineContainer: { alignItems: 'center', gap: 8 },
  tagline: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  buttons: { width: '100%', gap: 12, marginTop: 8 },
  btnFilled: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnFilledText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  btnOutline: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutlineText: { color: '#374151', fontSize: 15, fontWeight: '500' },
});
