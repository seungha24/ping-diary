import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { ADFIT_UNIT_WEB } from '../config';

const AD_WIDTH = 320;
const AD_HEIGHT = 100;

/**
 * 카카오 AdFit 웹 배너 (320×100). 탭바 위에 상시 노출용.
 * - react-native-web에서 View의 ref는 실제 DOM 노드라서, 공식 스니펫
 *   (<ins class="kakao_ad_area"> + ba.min.js)을 useEffect에서 직접 붙인다.
 * - ins는 display:none으로 시작하고 로드 성공 시에만 ba.min.js가 펼치므로
 *   로딩 중·미승인·no-fill 상태에서 빈 박스가 보이지 않는다.
 * - 광고단위 ID(EXPO_PUBLIC_ADFIT_UNIT_WEB) 미설정, 로드 실패, 애드블록이면
 *   영역 자체를 렌더하지 않는다.
 */
export default function AdBanner() {
  const { mode } = useTheme();
  const hostRef = useRef<View>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!ADFIT_UNIT_WEB || failed) return;
    const host = hostRef.current as unknown as HTMLElement | null;
    if (!host) return;

    // AdFit data-ad-onfail 규약: 전역 함수 이름을 문자열로 전달
    const failCbName = '__pingAdfitFail';
    (window as any)[failCbName] = () => setFailed(true);

    const ins = document.createElement('ins');
    ins.className = 'kakao_ad_area';
    ins.style.display = 'none';
    ins.setAttribute('data-ad-unit', ADFIT_UNIT_WEB);
    ins.setAttribute('data-ad-width', String(AD_WIDTH));
    ins.setAttribute('data-ad-height', String(AD_HEIGHT));
    ins.setAttribute('data-ad-onfail', failCbName);

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://t1.daumcdn.net/kas/static/ba.min.js';
    script.onerror = () => setFailed(true); // 애드블록·네트워크 차단

    host.appendChild(ins);
    host.appendChild(script);

    return () => {
      try { (window as any).adfit?.destroy?.(ADFIT_UNIT_WEB); } catch {}
      while (host.firstChild) host.removeChild(host.firstChild);
      delete (window as any)[failCbName];
    };
  }, [failed]);

  if (!ADFIT_UNIT_WEB || failed) return null;

  return (
    <View
      ref={hostRef}
      style={{
        alignItems: 'center',
        backgroundColor: mode === 'dark' ? '#171f2e' : '#ffffff',
      }}
    />
  );
}
