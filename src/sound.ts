// ping 효과음 헬퍼.
// 오디오 세션을 믹스 모드(ambient)로 설정해 다른 앱에서 듣던 음악(Apple Music/Spotify 등)을
// 끊지 않고 효과음만 얹는다. 실패해도 조용히 넘어가 발행 흐름을 막지 않는다.
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { lightHaptic } from './haptics';

let audioModePromise: Promise<void> | null = null;

/**
 * 오디오 세션을 믹스 모드로 1회 설정한다.
 * 실패하면 null로 되돌려 다음 재생 때 재시도한다.
 */
function ensureMixAudioMode(): Promise<void> {
  if (!audioModePromise) {
    audioModePromise = setAudioModeAsync({
      interruptionMode: 'mixWithOthers',
      playsInSilentMode: false, // 무음 스위치 존중
      shouldPlayInBackground: false,
    }).catch(() => { audioModePromise = null; });
  }
  return audioModePromise;
}

/** 테스트 전용: 오디오 모드 설정 캐시 초기화 */
export function __resetAudioModeForTest() {
  audioModePromise = null;
}

/**
 * ping 발행 효과음을 울린다 (약한 진동 포함).
 * 실패해도 조용히 넘어간다 — 발행 흐름을 막지 않기 위해.
 */
export async function playPing(): Promise<void> {
  lightHaptic();
  try {
    await ensureMixAudioMode();
    const player = createAudioPlayer(require('../assets/ping.wav'));
    player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) player.remove();
    });
    player.play();
  } catch (_) {}
}
