import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
// 오프라인 앱이라 woff2를 번들한다. CDN 링크로 두면 패키징본에서 시스템 폰트로
// 조용히 떨어진다. Instrument Sans는 가변 축(400~700) 하나로 네 굵기를 다 낸다.
import '@fontsource-variable/instrument-sans/wght.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-500.css';
// Match the reference's loaded faces, including its Noto fallback, offline.
import '@fontsource/ibm-plex-sans-kr/300.css';
import '@fontsource/ibm-plex-sans-kr/400.css';
import '@fontsource/ibm-plex-sans-kr/600.css';
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
