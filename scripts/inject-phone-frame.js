const fs = require('fs');
const path = require('path');

const distIndex = path.join(__dirname, '../dist/index.html');
let html = fs.readFileSync(distIndex, 'utf8');

const css = `
<style id="phone-frame">
  /* ── Override expo-reset ── */
  html { background: #f3f4f6 !important; height: auto !important; overflow: auto !important; }
  body {
    overflow: auto !important;
    height: auto !important;
    background: #f3f4f6 !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: flex-start !important;
    min-height: 100vh !important;
    padding: 36px 0 64px !important;
    gap: 16px !important;
    margin: 0 !important;
  }

  /* ── 폰 외관 ── */
  .phone-outer {
    width: 393px; height: 874px;
    flex-shrink: 0;
    border-radius: 52px;
    background: #111;
    padding: 13px;
    position: relative;
    box-shadow: 0 0 0 1.5px #333, 0 0 0 3.5px #111, 0 60px 160px rgba(0,0,0,0.9);
  }
  .phone-outer::before {
    content: '';
    position: absolute; left: -3.5px; top: 112px;
    width: 3.5px; height: 32px;
    background: #2e2e2e; border-radius: 2px 0 0 2px;
    box-shadow: 0 52px 0 #2e2e2e, 0 100px 0 #2e2e2e;
  }
  .phone-outer::after {
    content: '';
    position: absolute; right: -3.5px; top: 172px;
    width: 3.5px; height: 76px;
    background: #2e2e2e; border-radius: 0 2px 2px 0;
  }

  /* ── 화면 전체 래퍼 ── */
  .phone-screen {
    width: 100%; height: 100%;
    border-radius: 40px;
    overflow: hidden;
    background: #fff;
    display: flex;
    flex-direction: column;
    position: relative;          /* 홈바 absolute 기준점 */
    transform: translate3d(0,0,0); /* fixed 자식 containing block (Safari 호환) */
    isolation: isolate;
  }

  /* ── 상태바: Dynamic Island 포함, 앱 콘텐츠와 분리 ── */
  .phone-status-bar {
    height: 50px;
    flex-shrink: 0;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    z-index: 100;
  }
  .phone-island {
    width: 120px; height: 34px;
    background: #000; border-radius: 20px;
  }

  /* ── 앱 콘텐츠 영역 (overflow/transform은 phone-screen이 담당) ── */
  .phone-content {
    flex: 1;
    position: relative;
  }

  /* ── 홈 인디케이터: phone-screen 안에서 absolute ── */
  .phone-home-bar {
    position: absolute;
    bottom: 8px; left: 0; right: 0;
    display: flex;
    justify-content: center;
    pointer-events: none;
    z-index: 200;
  }
  .phone-home-bar::after {
    content: '';
    width: 134px; height: 5px;
    background: rgba(0,0,0,0.18);
    border-radius: 3px;
  }

  #root {
    display: flex !important;
    width: 100% !important;
    height: 100% !important;
    flex: 1 !important;
    overflow: visible !important; /* phone-screen이 클리핑 담당 */
  }

  .phone-label {
    color: rgba(0,0,0,0.25);
    font-size: 12px;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    letter-spacing: 0.1em; font-weight: 500;
    user-select: none;
  }

  /* ── 실제 모바일: 프레임 제거 ── */
  @media (max-width: 480px) {
    html { background: #fff !important; }
    body {
      background: #fff !important; padding: 0 !important;

      display: block !important; min-height: 100% !important;
    }
    .phone-outer {
      width: 100vw !important; height: 100dvh !important;
      border-radius: 0 !important; padding: 0 !important;
      box-shadow: none !important; background: #fff !important;
    }
    .phone-outer::before, .phone-outer::after { display: none !important; }
    .phone-screen { border-radius: 0 !important; }
    .phone-status-bar, .phone-home-bar, .phone-label { display: none !important; }
  }
</style>`;

// expo-reset 스타일 바로 뒤에 phone-frame 스타일 삽입
html = html.replace('</style>', `</style>${css}`);

// <div id="root"></div>를 폰 프레임으로 감싸기
html = html.replace(
  '<div id="root"></div>',
  `<div class="phone-outer">
  <div class="phone-screen">
    <div class="phone-status-bar">
      <div class="phone-island"></div>
    </div>
    <div class="phone-content">
      <div id="root"></div>
    </div>
    <div class="phone-home-bar"></div>
  </div>
</div>
<span class="phone-label">p!ng · preview</span>`
);

fs.writeFileSync(distIndex, html);
console.log('✓ Phone frame injected into dist/index.html');
