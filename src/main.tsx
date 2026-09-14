import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
// 오프라인 앱이라 woff2를 번들한다. CDN 링크로 두면 패키징본에서 시스템 폰트로
// 조용히 떨어진다.
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-500.css';
// UI 글꼴(--font-ui). 앱이 쓰는 굵기 400·500·600·700을 다 싣는다 — 빠진 굵기는
// 브라우저가 가짜 굵기로 그린다. Noto는 Plex에 없는 글자를 받는다.
import '@fontsource/ibm-plex-sans-kr/300.css';
import '@fontsource/ibm-plex-sans-kr/400.css';
import '@fontsource/ibm-plex-sans-kr/500.css';
import '@fontsource/ibm-plex-sans-kr/600.css';
import '@fontsource/ibm-plex-sans-kr/700.css';
import '@fontsource/noto-sans-kr/400.css';
import '@fontsource/noto-sans-kr/700.css';
import '@fontsource/noto-sans-kr/900.css';
import './index.css';
import './themes/referenceThemes.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
