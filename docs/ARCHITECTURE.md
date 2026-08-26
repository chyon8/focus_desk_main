# ARCHITECTURE — 실제 구조

## 폴더 구조
```
electron/           # main process
  main.ts           # 윈도우 생성, 앱 라이프사이클만
  ipc/              # 도메인별 IPC 핸들러 (spaces, storage, images, window-mode)
  preload.ts
src/
  app/              # 엔트리, 전역 셸 (Sidebar, WidgetPalette, ArrangeMenu, ThemePicker)
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
- 셸은 **사이드바 하나**(D-057). 하단 컨트롤바는 없앴고 정리·맞춤·줌%·통계·단축키표는 사이드바로 갔다. 단축키 N·G·F는 웹페이지에 포커스가 있으면 안 오므로 **⌥N·⌥G·⌥F**가 같은 일을 한다(main의 `before-input-event`가 전달). 위젯 추가는 **빈 캔버스 더블클릭 = 그 자리**, **N = 화면 가운데**, 사이드바 팔레트 = 훑어보기(D-063). 전체 목록은 앱 안 `?` 표(D-064)

## 캔버스 밀도·가독성 (1·2단계 완료 2026-08-18 — 3단계는 눈으로 보고 판단)
위젯 6개를 펼쳐두면 미션 컨트롤보다 훨씬 작고 구멍이 많고 위가 잘려 보인다. 원인 4개:

1. **`canvasArea()`가 상단 크롬을 안 뺀다** — [uiStore.ts](../src/stores/uiStore.ts)가 `y: 0`, `height = innerHeight − 76`(컨트롤바)만 계산하는데, 위쪽 84px(`Canvas.tsx`의 `TOP_CHROME_HEIGHT` — 드래그 스트립 + 플로팅 버튼)은 실제로 덮여 있다. fit·arrange·새 위젯 배치가 전부 이 틀린 사각형을 쓴다 → **맨 윗줄이 크롬 아래로 들어가 잘린다**
2. **`packGrid`의 셀 폭이 전체 최대 폭** — [layout.ts](../src/canvas/layout.ts) `cellWidth = Math.max(...widths)`. 브라우저(900) 하나가 있으면 메모(360)까지 900폭 칸에 놓여 가로로 구멍이 생기고, bounding box가 부풀어 fit이 더 줌아웃한다. `FIT_PADDING = 48`이 양쪽 96px을 더 먹는다
3. **미션 컨트롤은 크기를 유지하지 않는다** — 창을 격자 셀에 꼭 맞게 개별 스케일해 화면을 채운다. 우리 `arrange`는 "preserving each box's size"라 위치만 옮긴다. 게다가 미션 컨트롤은 전체화면 + 크롬 0인데 우리는 사이드바 256 + 컨트롤바 76 + 상단 84
4. **글자는 레이아웃으로 못 고친다** — 위젯 본문은 월드 CSS px로 그려진 뒤 scale된다. 줌 0.43이면 글자도 0.43배. "6개를 한 화면"은 각자 1/6 면적이라는 산수이고 미션 컨트롤도 같다 — 거기가 괜찮은 건 축소본을 **읽지 않고 알아보기만** 하기 때문이다

**고치는 순서**
| | 할 일 | 검증 |
|---|---|---|
| ✅1 | `canvasArea()`에 상단 84 인셋(`TOP_CHROME_HEIGHT`가 uiStore로 이동), `fitCamera`가 `area.y`만큼 아래로 프레이밍, 새 위젯도 그만큼 내려서 생성 | fit 후 맨 윗줄이 안 잘림 |
| ✅2 | `packGrid` 셀 폭을 **열별** 최대 폭으로(`offsets()` 헬퍼), `FIT_PADDING` 48 → 20 | 같은 공간에서 fit 줌이 올라감 |
| 3 | fit/arrange 시 사이드바 자동 접기 — **보류**(2026-08-18 사용자 결정). 자동으로 접히면 공간 전환이 한 박자 늦고 "내가 안 접었는데" 위화감. 1·2로 부족하면 그때 | 가로 256px 회수 |
| ✗4 | **자동 열 수를 화면 비율에 맞추기** — 열 수 1~n을 다 팩해보고 fit 줌이 최대인 것 선택(`bestColumnCount`). 구현했으나 **체감 차이가 없어 되돌림**(2026-08-18). 열 수는 병목이 아니었다 | |
| 5 | 여기까지 눈으로 보고, 아래가 정말 필요한지 판단 ← **지금 여기** | |

**남은 카드**(1·2를 눈으로 본 뒤, 4번이 실패했으므로 여기서 고른다): ⓐ "한눈에 보기" = 배치할 때 위젯 **크기까지** 화면 격자에 맞추는 모드(원래 크기를 기억해 되돌릴 수 있어야 함) ⓑ 위젯 헤더만 `scale(1/zoom)` 역보정(D-049 기법) → 축소해도 무슨 위젯인지 읽힘 ⓒ 줌 0.6 미만이면 브라우저 위젯 본문을 대표 얼굴(제목·favicon·썸네일)로 = LOD. 미션 컨트롤에 제일 가깝지만 제일 비싸다

## 상태 모델 (stores/)
- `spaceStore`: 스페이스 문서 단위. `{ id, name, schemaVersion, themeId, background, camera, ambience, widgets{} }`
  - `themeId`가 테마를, `background`는 사용자가 직접 고른 월페이퍼/색(**없으면 null** → 테마의 씬을 씀)
- `focusStore`: 포커스 세션(wall-clock 기반) + 통계. 통계만 영속, 앱 전역 (D-020)
- `uiStore`: 사이드바, 최대화 위젯 등 (비영속)
- 영속화: 스페이스별 JSON (D-005). 위젯 콘텐츠도 스페이스 문서 안에 포함

## 위젯 시스템 (widgets/)
- Registry 패턴, 2단 분리 (D-011): `defs.ts`(label/defaultSize/createData, React 무관) ↔ `registry.ts`(icon/Component 결합). 스토어는 defs만 import해 순환 참조를 피한다
- **위젯 추가는 사이드바의 팔레트**([WidgetPalette.tsx](../src/app/WidgetPalette.tsx), D-056): 클릭하면 화면 가운데, 캔버스로 끌어다 놓으면 그 자리(`addWidget(type, data, at)`). 하단 컨트롤바에는 위젯 버튼이 없다
- **위젯을 키우면 본문도 커진다**(D-059): `WidgetFrame`이 본문에 `scale(width / defaultSize.width)`(0.5~3배)를 건다. 브라우저 위젯만 예외(페이지가 스스로 리플로우)
- **다중 선택**(D-060): ⇧+빈 캔버스 드래그 = 밴드 선택, ⌥+클릭 = 토글, ⌥ 누르는 동안 hover 테두리. 선택이 있으면 정렬·맞춤·드래그가 그것만 건드린다(`uiStore.selectedIds`, 비영속)
- **Esc는 지우지 않는다**(D-061): 최대화 복귀 → 선택 해제까지만. 위젯 ✕는 8초 Undo 토스트(`UndoToast`)로 되돌릴 수 있다
- **메모는 문서다**(D-080): Tiptap. `/`가 블록 메뉴(표·다이어그램·체크리스트·제목…), 저장은 HTML. 표·다이어그램은 **별도 위젯 타입이 아니라** 노트 안의 블록이고, 팔레트의 Table·Diagram은 그 블록이 미리 들어간 노트다. 다이어그램은 Mermaid(`src/widgets/editor/`)
- **런처 `K`**(페이지 안에서는 `⇧K`, D-082): 공간의 위젯·저장한 웹앱·설치된 앱·자주 간 사이트·프리셋·위젯 종류를 한 목록에서. 색인은 [launcherItems.ts](../src/app/launcherItems.ts). 사이드바 웹앱 독이 같은 `openWebApp`을 쓴다
- **위젯 복제**: 헤더 hover 아이콘, 또는 선택이 있을 때 `⌘D`
- 위젯 컴포넌트는 **`{ id }`만** 받고 `useWidgetData<D>(id)`로 자기 데이터만 구독 (prop drilling 금지)
- 위젯 **본체는 투명**이고 색은 전부 테마 토큰에서 온다 (D-033). 새 위젯을 만들 때 `bg-white`/`bg-black/40` 같은 색을 직접 쓰지 말 것 — `.glass`, `.t-ink`, `.field`, `.row`, `.chrome-button`을 쓴다
- 예외: Photo·Sketch는 `.photo-paper`로 불투명 유지 (인쇄물이라는 개념)

## 브라우저 (widgets/BrowserWidget)
- 웹 탭 = 브라우저 위젯 안의 **`<webview>` 엘리먼트**(D-029). 웹 컨텐츠가 페이지 레이아웃 안에 있으므로 위치·스케일·클리핑·z-index를 브라우저가 처리 — main process 동기화 코드 없음
- 캔버스 줌은 월드 컨테이너의 CSS 트랜스폼이라 **페이지 리플로우가 없다**(확대만 된다)
- 그래서 **페이지 줌이 따로 있다**(D-058): 주소창 −/%/+ 와 ⌘+·⌘−·⌘0 → `setZoomFactor`, `data.zoom`에 영속. 위젯을 드래그해 키우는 건 확대가 아니라 **뷰포트를 넓히는 것**
- 스페이스별 `partition="persist:space-<id>"` → 로그인 분리
- 스페이스 전환 = 언마운트 = 웹 컨텐츠 파괴. 돌아오면 `data.url`(마지막 방문 주소)로 재로드
- ⚠️ 과거 WebContentsView 방식은 D-029에서 폐기. 그 흔적(스냅샷·hibernation·클리핑)은 코드에 남아 있지 않음

### 페이지에서 캔버스로 (D-081)
게스트 `webContents`의 `context-menu` → 이미지·선택한 글을 그 위젯 **오른쪽 옆**에 위젯으로. 이미지는 `images:from-url`이 **그 공간의 세션으로** 받아 파일로 복사한다. 캔버스의 드롭 핸들러도 같은 규칙(`text/uri-list`·`text/html`·`text/plain`)이라 앱 밖에서 끌어오는 것도 받는다. **webview→호스트 드래그가 실제로 오는지는 미검증**

### 새 창으로 열리는 링크 (고침 2026-08-18, D-055 — 실기 미검증)
유튜브 설명란 링크(`youtube.com/redirect?q=…`를 `target="_blank"`로)가 앱 안에도 밖에도 아무것도 안 띄우던 문제. `allowpopups`는 켜져 있었지만 `setWindowOpenHandler`가 없어 팝업이 조용히 버려졌다. 지금은 [main.ts](../electron/main.ts)의 `web-contents-created`에서 `deny` + URL과 게스트 id를 렌더러로 → **옆에 새 브라우저 위젯이 뜬다**(D-055 → D-065). `LINK_SHIM`은 `<a target="_blank">` 클릭을 가로채 네이티브 `window.open`으로 돌려준다(그래야 핸들러까지 온다).

- **남은 후보**: 줌이 1이 아닐 때도 열리는지 확인해야 한다. 안 되면 원인은 `scale()`된 월드 컨테이너 안의 `<webview>` 히트테스트 어긋남 — 위젯을 최대화(`scale(1/zoom)`=1)하고 같은 링크를 눌러 구분한다
- 같이 고침: `browser-window-created`가 모든 창에 `close → restoreLive()`를 붙여, 개발자도구 창을 닫는 것만으로 배치된 앱이 원래 크기로 돌아갔다 → 메인 창 확인 후 동작

## 배경 (themes/)
- `Theme = { scene, atmosphere, particles?, tokens }`. `SceneLayer`가 아래에서 위로 씬 → 스크림 → 글로우 → 파티클 → 비네트 → 그레인을 쌓는다
- **공간이 테마 위에 덮어쓰는 것 두 가지**: `background`(씬) / `particles`(날씨, `'none'` 포함 — D-066). 둘 다 없으면 테마 것, 테마를 바꾸면 둘 다 초기화
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
