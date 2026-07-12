import { Platform } from 'react-native';
import { lightHaptic } from '../haptics';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

const Haptics = require('expo-haptics');

describe('lightHaptic (약한 진동)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('네이티브에서는 Light 세기로 햅틱을 울린다', async () => {
    await lightHaptic();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
  });

  it('웹에서는 아무것도 하지 않는다', async () => {
    const original = Platform.OS;
    (Platform as any).OS = 'web';
    await lightHaptic();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    (Platform as any).OS = original;
  });

  it('햅틱 모듈이 에러를 던져도 조용히 넘어간다 (구버전 빌드 OTA 안전)', async () => {
    (Haptics.impactAsync as jest.Mock).mockRejectedValueOnce(new Error('missing native module'));
    await expect(lightHaptic()).resolves.toBeUndefined();
  });
});
