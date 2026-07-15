import { Platform } from 'react-native';
import { lightHaptic, selectionHaptic, successHaptic, warningHaptic } from '../haptics';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

const Haptics = require('expo-haptics');

describe('haptics 헬퍼', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lightHaptic: 네이티브에서는 Light 세기로 햅틱을 울린다', async () => {
    await lightHaptic();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
  });

  it('selectionHaptic: selection 틱을 울린다', async () => {
    await selectionHaptic();
    expect(Haptics.selectionAsync).toHaveBeenCalled();
  });

  it('successHaptic: Success 노티피케이션 햅틱을 울린다', async () => {
    await successHaptic();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
  });

  it('warningHaptic: Warning 노티피케이션 햅틱을 울린다', async () => {
    await warningHaptic();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('warning');
  });

  it('웹에서는 아무것도 하지 않는다', async () => {
    const original = Platform.OS;
    (Platform as any).OS = 'web';
    await lightHaptic();
    await selectionHaptic();
    await successHaptic();
    await warningHaptic();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    (Platform as any).OS = original;
  });

  it('햅틱 모듈이 에러를 던져도 조용히 넘어간다 (구버전 빌드 OTA 안전)', async () => {
    (Haptics.impactAsync as jest.Mock).mockRejectedValueOnce(new Error('missing native module'));
    await expect(lightHaptic()).resolves.toBeUndefined();
    (Haptics.notificationAsync as jest.Mock).mockRejectedValueOnce(new Error('missing native module'));
    await expect(successHaptic()).resolves.toBeUndefined();
  });
});
