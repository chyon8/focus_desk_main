# ARCHITECTURE — 목표 구조

## 폴더 구조 (목표)
```
electron/           # main process
  main.ts           # 윈도우 생성, 앱 라이프사이클만
  ipc/              # 도메인별 IPC 핸들러 (browser-views.ts, storage.ts, images.ts)
  preload.ts
src/
  app/              # 엔트리, 전역 레이아웃 셸 (사이드바, 컨트롤바)
  canvas/           # ZUI 코어: 카메라, 월드 컨테이너, 드래그/리사이즈
  spaces/           # 스페이스 CRUD, 전환, 영속화, 마이그레이션
  widgets/          # 위젯별 폴더 (registry 패턴, 아래 참조)
  ambience/         # 사운드 믹서, 라디오
  focus/            # 포커스 세션, 통계
  stores/           # zustand 스토어
  ui/               # 공용 컴포넌트 (GlassCard 등)
legacy/             # 기존 MVP (이식 후 삭제)
docs/
```

## 좌표계 & 카메라 (canvas/)
- 위젯 position은 **월드 좌표** (화면 픽셀 아님). `Camera = { x, y, zoom }`
- 렌더: 월드 컨테이너 하나에 `transform: translate(-cam.x, -cam.y) scale(cam.zoom)`
- 변환 유틸: `worldToScreen`, `screenToWorld` — vitest 대상
- 줌: 커서 중심(zoom-to-cursor). 팬: 스페이스바 드래그 + 트랙패드
- 위젯 드래그 중에는 transient 업데이트(리렌더 최소화), 드롭 시 스토어 커밋

## 상태 모델 (stores/)
- `spaceStore`: 스페이스 문서 단위. `{ id, name, schemaVersion, background, theme, ambience, camera, widgets[] }`
- `sessionStore`: 포커스 세션, 앱 사용 시간 (휘발성 + 통계만 영속)
- `uiStore`: 활성 위젯, focus mode, 사이드바 등 (비영속)
- 영속화: 스페이스별 JSON (D-005). 위젯 콘텐츠도 스페이스 문서 안에 포함

## 위젯 시스템 (widgets/)
- Registry 패턴: 위젯마다 `{ type, defaultSize, defaultData, component }` 등록 → App의 switch문/삼항 연산자 지옥 제거
- 위젯 컴포넌트는 `(data, onUpdate)`만 받는다. 세션/라디오 등 전역은 스토어에서 직접 구독 (prop drilling 금지)
- legacy 이식 시 통합: Memo+NewMemo → Memo, Editor+NewEditor → Editor

## 브라우저 (widgets/BrowserWidget)
- 웹 탭 = 브라우저 위젯 안의 **`<webview>` 엘리먼트**(D-029). 웹 컨텐츠가 페이지 레이아웃 안에 있으므로 위치·스케일·클리핑·z-index를 브라우저가 처리 — main process 동기화 코드 없음
- 줌은 월드 컨테이너의 CSS 트랜스폼이 그대로 적용됨 → **페이지 리플로우 없음**
- 스페이스별 `partition="persist:space-<id>"` → 로그인 분리
- 스페이스 전환 = 언마운트 = 웹 컨텐츠 파괴. 돌아오면 `data.url`(마지막 방문 주소)로 재로드
- ⚠️ 과거 WebContentsView 방식은 D-029에서 폐기. 그 흔적(스냅샷·hibernation·클리핑)은 코드에 남아 있지 않음

## PiP / 미니 모드
- 별도 BrowserWindow (`alwaysOnTop: true`, 작은 크기) + 선택한 위젯 1개 렌더
- Phase 4. main process에 window manager 모듈 추가

## Legacy 이식 맵
| legacy | 이식처 | 비고 |
|---|---|---|
| components/widgets/* | src/widgets/* | registry로 재포장, 중복 위젯 통합 |
| AmbienceDock, 라디오 로직 | src/ambience/ | App.tsx의 오디오 로직 포함 |
| FocusSessionBar, FocusInsights, 통계 | src/focus/ | |
| electron/main.ts IPC | electron/ipc/* | browser-view 핸들러는 개선하며 이식 |
| GlassCard, 디자인 토큰 | src/ui/ | 디자인 언어 유지 (VISION.md) |
| MVP 사용자 데이터 (electron-store v13) | 마이그레이션 1회 | 스페이스별 JSON으로 변환 |
