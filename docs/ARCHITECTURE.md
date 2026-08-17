# ARCHITECTURE — 실제 구조

## 폴더 구조
```
electron/           # main process
  main.ts           # 윈도우 생성, 앱 라이프사이클만
  ipc/              # 도메인별 IPC 핸들러 (spaces, storage, images, window-mode)
  preload.ts
src/
  app/              # 엔트리, 전역 셸 (Sidebar, ControlBar, ArrangeMenu, ThemePicker)
  canvas/           # ZUI 코어: 카메라, 월드 컨테이너, WidgetFrame, 단축키
  spaces/           # 스페이스 문서 타입, 마이그레이션, 기본 월페이퍼 목록
  themes/           # 테마 정의 + 배경 스택 (SceneLayer, ParticleLayer, useTheme)
  widgets/          # 위젯 10종 + registry (아래 참조)
  ambience/         # Web Audio 합성 믹서 (D-016)
  focus/            # 포커스 세션, 통계
  stores/           # zustand: spaceStore / focusStore / uiStore
  index.css         # 테마 토큰을 소비하는 공용 클래스 (D-033)
legacy/             # 기존 MVP — 이식 완료됨, 삭제 대기 (STATUS "다음 할 일" 5번)
docs/
```

> 공용 컴포넌트 폴더(`ui/`)는 만들지 않았다. 공통 스타일은 컴포넌트가 아니라
> `index.css`의 토큰 클래스(`.glass`, `.t-ink`, `.field`, `.row` …)로 공유한다.

## 좌표계 & 카메라 (canvas/)
- 위젯 position은 **월드 좌표** (화면 픽셀 아님). `Camera = { x, y, zoom }`
- 렌더: 월드 컨테이너 하나에 `transform: translate(-cam.x, -cam.y) scale(cam.zoom)`
- 변환 유틸: `worldToScreen`, `screenToWorld` — vitest 대상
- 줌: 커서 중심(zoom-to-cursor). 팬: 스페이스바 드래그 + 트랙패드
- 위젯 드래그 중에는 transient 업데이트(리렌더 최소화), 드롭 시 스토어 커밋

## 상태 모델 (stores/)
- `spaceStore`: 스페이스 문서 단위. `{ id, name, schemaVersion, themeId, background, camera, ambience, widgets{} }`
  - `themeId`가 테마를, `background`는 사용자가 직접 고른 월페이퍼/색(**없으면 null** → 테마의 씬을 씀)
- `focusStore`: 포커스 세션(wall-clock 기반) + 통계. 통계만 영속, 앱 전역 (D-020)
- `uiStore`: 사이드바, 최대화 위젯 등 (비영속)
- 영속화: 스페이스별 JSON (D-005). 위젯 콘텐츠도 스페이스 문서 안에 포함

## 위젯 시스템 (widgets/)
- Registry 패턴, 2단 분리 (D-011): `defs.ts`(label/defaultSize/createData, React 무관) ↔ `registry.ts`(icon/Component 결합). 스토어는 defs만 import해 순환 참조를 피한다
- 위젯 컴포넌트는 **`{ id }`만** 받고 `useWidgetData<D>(id)`로 자기 데이터만 구독 (prop drilling 금지)
- 위젯 **본체는 투명**이고 색은 전부 테마 토큰에서 온다 (D-033). 새 위젯을 만들 때 `bg-white`/`bg-black/40` 같은 색을 직접 쓰지 말 것 — `.glass`, `.t-ink`, `.field`, `.row`, `.chrome-button`을 쓴다
- 예외: Photo·Sketch는 `.photo-paper`로 불투명 유지 (인쇄물이라는 개념)

## 브라우저 (widgets/BrowserWidget)
- 웹 탭 = 브라우저 위젯 안의 **`<webview>` 엘리먼트**(D-029). 웹 컨텐츠가 페이지 레이아웃 안에 있으므로 위치·스케일·클리핑·z-index를 브라우저가 처리 — main process 동기화 코드 없음
- 줌은 월드 컨테이너의 CSS 트랜스폼이 그대로 적용됨 → **페이지 리플로우 없음**
- 스페이스별 `partition="persist:space-<id>"` → 로그인 분리
- 스페이스 전환 = 언마운트 = 웹 컨텐츠 파괴. 돌아오면 `data.url`(마지막 방문 주소)로 재로드
- ⚠️ 과거 WebContentsView 방식은 D-029에서 폐기. 그 흔적(스냅샷·hibernation·클리핑)은 코드에 남아 있지 않음

## 배경 (themes/)
- `Theme = { scene, atmosphere, particles?, tokens }`. `SceneLayer`가 아래에서 위로 씬 → 스크림 → 글로우 → 파티클 → 비네트 → 그레인을 쌓는다
- `tokens`는 `useThemeVariables`가 `:root`에 CSS 변수로 주입(`--ink`, `--panel`, `--surface`, `--accent`, `--font-ui` …). UI 전체가 여기서 색을 읽는다
- **배경은 카메라를 따라가지 않는다** (D-035). 배경에 움직임을 넣으려면 카메라와 무관하게 스스로 움직이는 것(파티클·글로우)으로 할 것
- 코드로 씬을 그리는 시도(SVG·three.js)는 폐기됨 (D-034). 다시 하려면 아트 디렉션부터

## Legacy 이식 맵
| legacy | 이식처 | 비고 |
|---|---|---|
| components/widgets/* | src/widgets/* | registry로 재포장, 중복 위젯 통합 |
| AmbienceDock, 라디오 로직 | src/ambience/ | App.tsx의 오디오 로직 포함 |
| FocusSessionBar, FocusInsights, 통계 | src/focus/ | |
| electron/main.ts IPC | electron/ipc/* | browser-view 핸들러는 개선하며 이식 |
| GlassCard, 디자인 토큰 | src/index.css | 컴포넌트가 아니라 토큰 클래스로 (D-033) |
| MVP 사용자 데이터 (electron-store v13) | 마이그레이션 1회 | 스페이스별 JSON으로 변환 |
