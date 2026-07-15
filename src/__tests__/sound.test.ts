import { playPing, __resetAudioModeForTest } from '../sound';

jest.mock('expo-audio', () => ({
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
  createAudioPlayer: jest.fn(() => ({
    addListener: jest.fn(),
    play: jest.fn(),
    remove: jest.fn(),
  })),
}));
jest.mock('../haptics', () => ({ lightHaptic: jest.fn() }));
jest.mock('../../assets/ping.wav', () => 1, { virtual: true });

const { setAudioModeAsync, createAudioPlayer } = require('expo-audio');
const { lightHaptic } = require('../haptics');

describe('playPing (발행 효과음)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetAudioModeForTest();
  });

  it('다른 앱 음악을 끊지 않도록 믹스 모드를 설정하고 재생한다', async () => {
    await playPing();
    expect(setAudioModeAsync).toHaveBeenCalledWith({
      interruptionMode: 'mixWithOthers',
      playsInSilentMode: false,
      shouldPlayInBackground: false,
    });
    expect(createAudioPlayer).toHaveBeenCalled();
    expect(lightHaptic).toHaveBeenCalled();
  });

  it('오디오 모드 설정은 여러 번 재생해도 1회만 호출한다', async () => {
    await playPing();
    await playPing();
    expect(setAudioModeAsync).toHaveBeenCalledTimes(1);
    expect(createAudioPlayer).toHaveBeenCalledTimes(2);
  });

  it('오디오 모드 설정이 실패하면 다음 재생 때 재시도한다', async () => {
    (setAudioModeAsync as jest.Mock).mockRejectedValueOnce(new Error('session error'));
    await playPing();
    await playPing();
    expect(setAudioModeAsync).toHaveBeenCalledTimes(2);
  });

  it('재생이 실패해도 조용히 넘어간다', async () => {
    (createAudioPlayer as jest.Mock).mockImplementationOnce(() => {
      throw new Error('no audio module');
    });
    await expect(playPing()).resolves.toBeUndefined();
  });
});
