# DECISIONS — 기술 결정 기록 (append-only)

> 형식: 날짜 / 결정 / 이유 / 버린 대안. 뒤집을 때는 삭제하지 말고 새 항목으로 추가.

## D-040 (2026-08-17) 앱 서피스 구현에서 설계와 달라진 것들 (D-038 보강)
Phase A~C를 만들면서 초안을 실물에 맞게 줄인 부분. 방향은 D-038 그대로.

- **창 id를 없앴다.** 초안의 `windows` 동사(창 목록 → id로 `place`)를 구현하지 않고, `place`가 창을 직접 고른다. 얻은 것: id 레지스트리·앱 재시작 시 재바인딩 문제가 통째로 사라짐(초안이 Phase C에서 "가장 지저분한 부분"이라 부른 것). 잃은 것: 창이 여러 개인 앱에서 특정 창을 못 고름. 필요해지면 그때 `windows`를 되살린다
- **`AXMainWindow`는 못 쓴다 — 가장 큰 창을 고른다.** FL Studio로 실측: `AXMainWindow`가 에러(-25212)를 돌려주고 `AXMain`도 0이다. 자체 툴킷으로 창을 그리는 앱은 주 창을 아예 보고하지 않는다. 캡처가 이미 "가장 큰 창"을 고르고 있었으므로 배치도 같은 기준으로 통일 — 썸네일에 보이는 창과 옮겨지는 창이 다르면 안 된다
- **창이 리사이즈를 거부할 수 있다.** FL Studio 창은 `AXPosition`은 settable인데 `AXSize`는 **NO**다(`AXSubrole=AXUnknown`, 닫기·최소화·확대 버튼 전부 nil인 비표준 창). 크기 요청이 조용히 무시되므로, 위젯 좌상단에 창의 좌상단을 맞추면 1920×973 창이 위젯 밖으로 흘러 화면 아래로 빠져나가 **자기 타이틀바까지 화면 밖으로 나가 드래그 불가 상태**가 된다(실제로 발생시킴). 대응: ① `AXSize` settable 여부를 먼저 확인 ② 못 줄이는 창은 크기를 그대로 두고 위젯 사각형 **중앙에** 놓는다 ③ 모든 배치를 `NSScreen.visibleFrame`(AX 좌표로 변환)에 클램프해 화면 밖으로 못 나가게 한다 ④ `placed` 이벤트에 `resizable`을 실어 위젯이 "이 앱은 자기 크기를 고집함"이라고 표시
- **리사이즈는 size → position → size.** 화면 가장자리에 있는 창은 첫 리사이즈가 그 자리의 여유만큼 잘리므로, 옮긴 뒤 한 번 더 써야 원하는 크기가 들어간다
- **원래 창 위치를 저장했다 되돌린다.** 헬퍼가 첫 `place` 직전의 프레임을 appKey별로 기억하고 `restore`가 복원. 안 그러면 사용자의 FL Studio 창이 위젯 크기로 영구히 남는다. 재배치(창 따라가기)는 저장본을 덮어쓰지 않는다
- **썸네일은 JPEG.** 400px 폭 캡처가 PNG 335KB / JPEG(0.6) 58KB. 1fps로 IPC를 건너야 하므로 PNG는 성립 불가. 앱 아이콘은 그대로 PNG(한 번만 오가고 투명도가 필요)
- **배치 시점은 "사각형이 90ms 멈춘 뒤"**. rAF로 위젯의 실제 DOM 사각형을 지켜보다 값이 멎으면 배치한다. 카메라 계산을 다시 하지 않고 `getBoundingClientRect()`를 쓰므로 사이드바 슬라이드·창 리사이즈·위젯 크롬이 전부 자동으로 반영됨. 창 드래그 중에는 60ms 간격으로 따라붙는다(main의 `move`/`resize`)
- **`release`는 헬퍼 명령이 아니다.** 앱을 뒤로 보내는 AX 동작 대신 Electron이 `win.focus()`로 자기를 앞으로 올린다. 결과가 같고, 창이 숨겨지지 않아 계속 캡처된다
- **권한은 지연 요청.** `place`가 실패할 때 접근성 프롬프트가 뜨고, 화면기록은 위젯의 "Preview" 버튼으로만 요청한다. 앱 시작 시 권한 두 개를 먼저 묻지 않는다 — 앱 위젯을 안 쓰는 사용자에게는 물을 이유가 없다

## D-039 (2026-08-17) ⚠️ 체류 시간 판정을 "창 포커스"에서 "공간 소속 앱 집합"으로 (D-037 일부 뒤집음)
- D-037은 `win.isFocused()` 하나로 판정했다. 앱 위젯(D-038)을 넣으면 VSCode를 클릭하는 순간 blur → **시계가 멈춘다**. 브라우저 위젯 때문에 문서 포커스를 버렸던 것과 같은 문제가 한 층 위에서 재발
- 새 판정: `active = frontmost ∈ ( {FocusDesk} ∪ 현재 공간의 앱 위젯들 )`. 메인이 헬퍼의 `frontmost` 이벤트를 이 집합과 대조해 기존 `activity:changed`를 그대로 쏜다 → **`useSpaceTimeTracker.ts`는 안 바뀐다.** 판정 근거만 바뀌고 인터페이스는 동일
- 앱별 분해는 새 키 `space-app-time-v1` = `{ [spaceId]: { [date]: { [appKey]: seconds } } }`에 **따로** 쌓는다. 기존 `space-time-v1`은 총합 그대로 → 마이그레이션 불필요. "Focus Desk 자체" 시간은 총합 − 앱합(잔차라 계산이 아님)
- D-037에서 유지되는 것: 매 틱 날짜별 적립, `MAX_TICK_MS`, 슬립·잠금 처리, 저장 전략, 유휴 감지 안 넣음
- 부작용: 공간에 넣어둔 앱으로 딴짓하면(Chrome으로 유튜브) 그대로 카운트된다. 이건 사용자 책임으로 두고 감지하지 않는다 — 유휴 감지를 뺀 것과 같은 이유

## D-038 (2026-08-17) 외부 앱은 "앱 서피스"로 — 배경층 고정 아이디어는 폐기
목표는 하나였다: **외부 앱(VSCode·Photoshop·FL Studio)을 Focus Desk 공간 안에서 쓴다.** 접근법 두 개를 놓고 앱 서피스를 택함. 설계·단계는 [APP-SURFACE.md](APP-SURFACE.md).

- **폐기: 배경층 고정** (`kCGDesktopWindowLevel`로 창을 데스크탑 배경층에 내리고 앱이 그 위에 뜨게). 그 층에서는 클릭·키보드를 제대로 못 받는다 — Übersicht·Plash가 거기 있는 이유가 "보여주기만" 해서다. 그러면 Todo·Kanban·브라우저 위젯이 전부 장식품이 되고, 줌/팬해도 위의 앱들은 안 움직여 공간이라는 착시가 깨지며, 공간을 바꿔도 앱은 남는다. 즉 "외부 앱을 Focus Desk 안에서"가 아니라 **"Focus Desk를 외부 앱 뒤에"**가 되어 주객이 반대. 사설 API 성격이라 OS 업데이트마다 깨지는 것도 감점. STATUS의 해당 항목도 함께 삭제
- **채택: 앱 서피스.** 공간이 앱을 *소유*한다 — 전환하면 따라오고, 시간이 그 공간에 쌓이고, 위젯은 계속 살아 있다. 컨셉(프로젝트별 공간)과 방향이 같고 접근성 API·ScreenCaptureKit은 공개·문서화·권한 기반. 대가는 구현 무게와 권한 2개(접근성·화면 기록)
- **macOS에 진짜 임베드는 불가능**: 다른 프로세스 창을 내 창의 자식으로 붙이는(reparenting) 공개 API가 없다. Windows는 `SetParent`로 되지만 GPU 가속 앱이 깨지고 메뉴·모달이 튀어나오며, 무엇보다 자식 창은 *스케일*이 아니라 *리사이즈*라 ZUI 줌이 어차피 성립 안 함 → 윈도우에서도 같은 앱 서피스 방식으로 간다
- **네이티브 표면은 헬퍼 바이너리 하나**(Swift, stdin/stdout JSON Lines). 네이티브 노드 애드온 기각: Electron ABI 리빌드 부담, 크래시가 앱을 같이 죽임. 헬퍼는 죽어도 respawn이면 끝이고, 윈도우 이식이 이 파일 하나 교체로 끝난다
- **LIVE(실제 창 배치)는 위젯 최대화 상태에서만.** 캔버스에 실물 창을 자유롭게 띄우면 ① 실제 창이 항상 위라 사이드바를 가리고 ② 위젯 간 z-order가 무너지고 ③ 캔버스 밖 클리핑이 불가하고 ④ 팬/줌 매 프레임 `place` 호출로 창이 떨린다. 최대화 전용으로 좁히면 넷 다 사라지고, 잃는 "캔버스에 실물 창 여러 개"는 어차피 ②③ 때문에 예쁘게 안 나온다. 캔버스에서는 항상 썸네일
- **THUMB에서 창을 숨기지 않고 뒤로 보낸다**: 숨긴(hide) 창은 ScreenCaptureKit이 캡처를 못 한다. 가려진 창은 캡처된다
- 대안(기각): 웹 대체제만 쓰기(Photopea·code-server). 진짜 공간 안에 들어가는 유일한 방법이지만 FL Studio 같은 건 대체제가 없어 커버리지가 반쪽. 브라우저 위젯으로 이미 가능하므로 별도 기능으로 만들지 않음
- 대안(기각): 픽셀 스트리밍 임베드(캡처 + `CGEvent` 입력 주입). 진짜 임베드처럼 보이지만 가려진 창 렌더 스로틀·입력 좌표 매핑·툴팁이 캡처 밖으로 튀는 문제로 실사용 불가

## D-037 (2026-08-17) 스페이스 체류 시간 — "창 포커스" 기준, 매 틱 날짜별로 적립
- 데이터: `space-time-v1` = `{ [spaceId]: { 'YYYY-MM-DD': seconds } }`. 1초 틱마다 **그 순간의** 활성 스페이스·로컬 날짜에 적립하므로 자정 넘김·스페이스 전환에 별도 처리가 없다
- 활성 판정은 **문서 포커스가 아니라 창 포커스**(`electron/ipc/activity.ts`). 브라우저 위젯을 클릭하면 문서 포커스는 webview의 WebContents로 넘어가서 `document.hasFocus()`가 false가 된다 — 유튜브 보는 중에 시계가 멈추면 안 됨
- 슬립·화면잠금은 `powerMonitor`로 away 처리. 이중 방어로 틱 간격이 `MAX_TICK_MS`(5초)를 넘으면 그 초과분은 버린다(슬립·스로틀·시계 조정)
- 저장은 10초마다 + 창이 비활성될 때 즉시. 종료 직전 마지막 저장은 `beforeunload`에서 `store:set-sync`(동기 IPC) — `invoke`는 창 파괴와 경합해서 유실됨
- 로드 전에 적립된 초는 로드 결과와 **합산**(덮어쓰기 아님), 로드 전에는 저장하지 않음
- 안 넣은 것: 유휴(idle) 감지. 입력이 없어도 앱을 보고 있는 경우(영상·음악)가 이 앱의 핵심 용도라 오히려 과소 계산이 됨. 대신 창 포커스 하나만 기준으로 둠
- 상단 Start focus(D-020)는 별개로 유지. Insights는 이 데이터 기준으로 교체

## D-036 (2026-08-17) 상단 드래그 스트립은 맨 앞·맨 아래에 두고 위젯이 구멍을 뚫는다
- 드래그 영역은 OS가 페이지보다 먼저 히트테스트하므로, 그 위에 있는 위젯도 클릭을 못 받는다(D-032에서 z-60으로 올렸던 게 원인)
- 영역은 drag 사각형들의 **합집합 − no-drag 사각형들**이고 순서대로 계산된다 → 스트립을 DOM 맨 앞·z-0에 두고 `WidgetFrame`에 `no-drag`를 주면 위젯이 겹친 부분만 구멍이 난다
- 결과: 위젯을 최상단에 붙여도 헤더 드래그는 위젯 이동, 빈 배경은 창 이동

## D-035 (2026-08-17) 배경은 카메라를 따라가지 않는다 — 패럴랙스·드리프트 제거
- 캔버스를 패닝/줌할 때 배경을 살짝 밀어 깊이를 주려 했으나(`SceneLayer`의 PARALLAX 0.03, `.scene-drift` 64s 켄번즈) **커서 기준 줌이 카메라 x/y를 같이 바꾸기 때문에 줌할 때마다 배경이 미끄러졌다**
- 배경이 내비게이션에 반응하면 깊이가 아니라 산만함이 된다. 배경은 완전 고정
- 남긴 것: 스크림, 글로우(숨쉬기/불꽃), 파티클, 비네트, 그레인 — 전부 카메라와 무관하게 스스로 움직이는 것들
- 오버스캔(`inset: -8%`)도 패럴랙스 전용이었으므로 제거

## D-034 (2026-08-17) ⚠️ 코드로 그리는 씬 — SVG·three.js 둘 다 시도 후 폐기
- **1차 CSS/SVG**: 도형 레이어를 속도 다르게 흘려 깊이를 흉내 냄 → 납작해서 폐기
- **2차 three.js**: 지형 버텍스 셰이더, 인스턴싱, 실제 point light 감쇠까지 구현. 기술적으로는 동작했고 스크린샷도 그럴듯했지만 **앱의 배경으로서 원하는 느낌이 아니었음** → 폐기, `three` 의존성 제거(번들 942KB→398KB)
- 결론: 배경은 **사진/그라디언트 + 분위기 레이어**로 간다. 감성은 씬을 만들어서가 아니라 스크림·빛·파티클·질감에서 나온다
- 다시 시도한다면: 코드로 씬을 그리는 것 자체가 문제였다기보다 **아트 디렉션이 없는 상태에서 형태부터 만든 것**이 문제. 레퍼런스 아트를 먼저 확보할 것
- **남길 만한 교훈**: `patch`는 GLSL 예약어라 변수명으로 쓰면 셰이더 컴파일이 실패하는데 three가 이걸 조용히 삼켜 지형이 통째로 안 그려졌다. `linkProgram`을 감싸 `getProgramInfoLog`를 읽어야 보인다
- **검증 방법은 유효했음**: Electron `capturePage`로 배경만 오프스크린 렌더해 PNG로 확인. 눈으로 안 보고 만들면 안 되는 종류의 작업이라는 게 이번에 증명됨

## D-033 (2026-08-16) 색은 전부 테마 토큰. 위젯 본체는 투명
- `--ink/--ink-soft/--panel/--surface/--panel-border/--accent/--font-ui`를 `:root`에 주입, `index.css`의 `.glass/.glass-panel/.t-*/.field/.row/.chrome-button`이 소비. 앱 전체 하드코딩 색 0개
- **위젯 본체를 투명으로 바꿈**: 기존엔 `bg-white`/`bg-[#18181b]` 불투명이라 배경을 아무리 예쁘게 만들어도 위젯이 다 가리고 있었음. 이게 레퍼런스와 벌어진 진짜 차이
- 그 결과 **위젯별 LIGHT/DARK 토글 제거** — 흰/검정을 강제로 박는 구조라 테마와 양립 불가. 저장된 `theme` 필드는 마이그레이션 리스크 때문에 남겨둠(미사용)
- 예외: Photo·Sketch는 `--surface`로 불투명 유지(인쇄물), MiniView는 별도 창이라 배경이 없어서 불투명

## D-001 (2026-08-16) 기존 코드 처리: 코어 재작성 + 위젯 이식
- 같은 폴더·같은 repo에서 진행. MVP 소스는 `legacy/`로 이동 후 위젯을 하나씩 이식, 이식 완료 시 legacy 삭제
- 이유: ZUI·협업 대비 상태 모델이 코어 전면 교체를 요구. 위젯 15종은 자기완결적이라 재사용 가치 높음
- 대안(기각): 전체 재활용(코어가 발목), 새 repo(git 히스토리·위젯 접근성 손해)

## D-002 (2026-08-16) 상태 관리: zustand
- 이유: 보일러플레이트 없음, 셀렉터로 리렌더 제어(위젯 수십 개 대비), transient update 지원(드래그 성능)
- 대안(기각): useState 갓 컴포넌트(현 MVP 문제), Redux(과함), jotai(팀 친숙도)

## D-003 (2026-08-16) ZUI: 자체 카메라 구현 (라이브러리 없이)
- 월드 좌표 + 단일 컨테이너 CSS transform(translate+scale). ~200줄 수준
- 이유: WebContentsView(네이티브 뷰) bounds/zoom 동기화가 어차피 커스텀. tldraw SDK는 자체 셰이프 모델을 강제해 위젯 시스템과 충돌
- 대안(보류): tldraw SDK — 셀렉션·미니맵 등 캔버스 기능이 불어나면 재검토
- 대안(기각): react-zoom-pan-pinch(제스처만 해결, 좌표 모델은 어차피 직접)

## D-004 (2026-08-16) 브라우저: Electron WebContentsView 유지
- 이유: 진짜 브라우저 엔진, 세션 파티션(스페이스별 로그인 분리) 가능, MVP에서 이미 검증
- 카메라 동기화: 뷰는 항상 축 정렬 사각형 → bounds×scale + zoomFactor=cameraZoom으로 동기화 (Phase 1 스파이크로 검증, 실패 시 기획 조정)
- 메모리: 비활성 스페이스 뷰는 hibernate(스크린샷 대체 후 destroy)
- 대안(기각): webview 태그(반쯤 deprecated), iframe(X-Frame-Options에 막힘)

## D-005 (2026-08-16) 영속화: 스페이스별 JSON 파일 + 스키마 버전
- `userData/spaces/<id>.json`, 파일마다 `schemaVersion`, 로드 시 마이그레이션 함수 체인. 쓰기는 debounce
- 이유: 현 MVP는 전체 blob을 매 변경마다 통째 저장 + 'v13' 키 난립. 스페이스 단위 분리로 쓰기 비용↓, 마이그레이션 가능
- CRDT(Yjs)는 **보류**: 협업 시점에 도입. 단, 상태를 "스페이스 문서" 단위로 유지해 도입 장벽을 낮춰둠
- 대안(기각): electron-store 단일 blob(현 문제), 지금 Yjs(스펙 없는 복잡도, CLAUDE.md simplicity 원칙 위배)

## D-006 (2026-08-16) 스타일: Tailwind v4 정식 설치 (CDN 제거)
- 이유: 현 index.html이 Tailwind CDN + aistudiocdn importmap(AI Studio 잔여물)에 의존 — 오프라인 불가·빌드 최적화 불가. npm 의존성과 이중화되어 있음
- framer-motion, lucide-react는 유지

## D-007 (2026-08-16) 패키징·품질: electron-builder + vitest, Phase 0부터
- 이유: 현재 배포 불가능 상태. 늦게 붙일수록 비쌈. 테스트는 코어 로직(카메라 수학, 마이그레이션)만 — UI 스냅샷 테스트는 안 함
- 코드 서명/공증은 배포 직전 Phase에서

## D-008 (2026-08-16) 3D 제외
- 이유: VISION.md "하지 않을 것" 참조. 사용자 결정 완료

## D-009 (2026-08-16) package.json에서 `"type": "module"` 제거 → Electron 번들은 CJS
- 증상: `"type":"module"`이면 vite-plugin-electron이 main을 ESM으로 뽑는데 Electron이 그 번들의 `electron` named import를 해석 못 해 실행 즉시 종료
- vite.config에서 형식만 덮어쓰려 했으나 실패: vite `mergeConfig`는 **배열을 concat**해서 `formats`가 `['es','cjs']`가 되고, 두 출력이 같은 파일명으로 서로 덮어써 파일이 깨짐
- 해결: `"type": "module"` 제거. 그러면 플러그인이 알아서 `main.js`/`preload.js`를 CJS로 뽑음. vite.config.ts는 설정 오버라이드 없이 깔끔하게 유지
- 주의: VSCode 확장 환경 셸은 `ELECTRON_RUN_AS_NODE=1`이 설정돼 있어 `npx electron`이 Node로 동작함. 앱 실행 테스트 시 `env -u ELECTRON_RUN_AS_NODE` 필요

## D-010 (2026-08-16) ZUI × WebContentsView 동기화 성립 — Phase 1 스파이크 성공
- 방식: 렌더러가 placeholder div의 `getBoundingClientRect()`를 rAF로 측정해 `browser-view:sync(id, url, rect, zoom)` 전송 → main이 `setBounds(rect)` + `setZoomFactor(camera.zoom)`
- 카메라 변환 수학을 IPC 쪽에서 재구현하지 않는 것이 핵심 (브라우저가 이미 계산해 줌)
- 검증: world(0,0) 900×620 위젯, camera{-40,-40,0.75} → 실측 bounds {31,55,674,441} zoom 0.75 (기대 30,54,675,441, 차이는 테두리 1px)
- 한계: Chromium zoomFactor 하한 0.25. 그 아래로 줌아웃하면 뷰를 destroy하고 placeholder 노출 → Phase 3에서 스냅샷으로 대체
- 함정 2개(코드에 주석으로 남김): `DOMRect`는 IPC 구조화 복제로 전달 안 됨(평범한 객체로 복사), zustand `useShallow` 셀렉터가 튜플 배열을 반환하면 매번 새 참조라 무한 렌더(React #185)

## D-011 (2026-08-16) 위젯은 registry 패턴, 정의(데이터)와 컴포넌트를 분리
- `src/widgets/defs.ts`(label/defaultSize/createData, React 무관) ↔ `src/widgets/registry.ts`(icon/Component 결합)
- 이유: 스토어가 defs만 import하면 `store → registry → widget → store` 순환이 안 생김
- 위젯 컴포넌트는 `{ id }`만 받고 `useWidgetData<D>(id)`로 자기 데이터만 구독 (prop drilling 금지, ARCHITECTURE.md 원칙)

## D-012 (2026-08-16) zustand 셀렉터 규칙 — 새 객체/배열을 만들지 말 것
- `useShallow`는 요소를 `Object.is`로 비교하므로, 셀렉터가 새 객체·튜플을 만들면 항상 불일치 → 무한 렌더(React #185). Phase 1·2에서 각각 한 번씩 이 버그를 냈음
- 규칙: 목록은 **id 배열(문자열)** 만 구독하고, 각 행/프레임이 자기 항목을 개별 구독한다 (`SpaceRow`, `WidgetFrame`이 그 형태)
- 부수 효과로 한 위젯을 드래그해도 그 프레임만 리렌더됨

## D-013 (2026-08-16) GUI 없는 환경에서의 검증 수단: CDP 원격 디버깅
- `npx electron dist-electron/main.js --remote-debugging-port=9222` + `http://localhost:9222/json`의 **file:// 타겟**에 WebSocket으로 `Runtime.evaluate`
- 실제 DOM을 클릭/입력해 스토어·영속화·IPC까지 한 번에 검증 가능 (스크린샷 권한 없이도)
- 주의: 앱이 WebContentsView를 띄우면 타겟 목록에 그 페이지도 섞이므로 file:// 로 필터링할 것
- React 제어 input에 값을 넣을 땐 `HTMLInputElement.prototype.value` 네이티브 setter + `input` 이벤트 dispatch

## D-014 (2026-08-16) 자동정렬 = 월드 그리드 + 카메라 fit
- `src/canvas/layout.ts`의 순수 함수 2개(`arrangeGrid`, `fitCamera`)로 분리해 테스트. 정렬 후 자동으로 fit까지 해야 결과가 화면에 보임
- 정렬은 **크기를 유지**하고 읽기 순서(y→x)로 재배치. legacy처럼 위젯을 화면에 맞춰 늘리지 않음 — ZUI에서는 줌이 그 역할을 함
- 단축키 `G`(정렬) / `F`(맞춤). 입력 중에는 발동 안 함

## D-015 (2026-08-16) 웹뷰 hibernation = 마지막 프레임 스냅샷
- 줌 < 0.25(Chromium 하한)이거나 스페이스 전환으로 위젯이 unmount되면 `capturePage()` → dataURL 보관 → 뷰 destroy. 렌더러는 그 이미지를 placeholder로 표시
- 위젯 unmount는 스페이스 전환으로도 발생하므로 unmount는 **hibernate**, 실제 삭제는 store의 `removeWidget`이 **destroy** 호출로 구분
- 세션 파티션 `persist:space-<spaceId>` → 스페이스마다 로그인 분리 (검증: userData/Partitions에 디렉터리 생성 확인)

## D-016 (2026-08-16) 앰비언스는 Web Audio 합성 (음원 파일 없음)
- legacy 라디오 URL 4개 중 2개가 이미 403. 외부 CDN 의존은 깨지기 쉽고 라이선스도 불명확
- 대신 노이즈 합성: rain=화이트노이즈 bandpass, fire=브라운노이즈 lowpass + 랜덤 크래클, cafe=브라운노이즈 강한 lowpass
- 이점: 오프라인 동작, 에셋 0바이트, 라이선스 무관. 무음일 때는 AudioContext를 아예 만들지 않음(자동재생 정책·배터리)
- 참고: legacy의 앰비언스 슬라이더는 볼륨만 저장하고 실제로 소리가 난 적이 없음

## D-017 (2026-08-16) PiP는 별도 창이 아니라 메인 창의 미니 모드
- `window:set-mini` IPC로 메인 창을 380×300 + `alwaysOnTop('floating')` + 전체화면 위에도 표시로 전환, 복귀 시 이전 bounds 복원
- 이유: 두 번째 창을 띄우면 렌더러 간 상태 동기화(브로드캐스트 계층)가 필요해짐. 미니 모드는 같은 스토어를 그대로 씀
- 브라우저 위젯은 pop out 불가 — 네이티브 뷰가 캔버스 좌표에 합성되므로 미니 창을 따라가지 못함

## D-018 (2026-08-16) 캔버스는 셸(chrome) 영역을 침범하지 않는다
- 문제: 위젯이 사이드바 밑으로 들어가 손댈 수 없게 되고, 네이티브 웹뷰는 **모든 HTML 위에** 그려져 사이드바·컨트롤바를 덮음
- 해결: `uiStore.canvasArea()`가 셸을 제외한 영역을 정의 → ① Canvas가 그만큼 인셋(사이드바 열림 시 left 256) ② 정렬·fit·위젯 추가가 이 영역 기준 ③ 네이티브 뷰 bounds를 `clipToArea()`로 잘라냄(`electron/ipc/clip.ts`, 테스트 있음)
- 사이드바 상태를 `uiStore`로 올린 이유: 캔버스가 그 폭만큼 인셋해야 하므로 지역 state로는 부족
- 트레이드오프: 클리핑은 페이지 뷰포트 크기를 바꾸므로 경계에서 리플로우가 생김. 창 밖으로 나가는 경우는 창이 알아서 자르므로 클리핑 불필요

## D-019 (2026-08-16) 정렬은 4가지 모드
- grid(≈정사각), columns(한 줄), rows(한 열), cascade(계단식 겹침). `arrange(boxes, mode, columns?)` 하나로 통일
- 정렬 후 항상 fit — 결과가 화면 밖이면 정렬한 의미가 없음

## D-032 (2026-08-16) 상단 셸이 위젯을 먹던 문제 — 원인은 타이틀바 드래그 영역
사용자: "우상단 버튼이 안 눌린다 / 사이드바가 뒤로가기를 가린다 / 버튼이 안 보인다 / 전체화면에서 못 나갔다"

- **범인**: `App.tsx`의 `fixed top-0 left-0 right-0 h-6 z-[60]` 드래그 영역. 창을 옮기려고 깔아둔 투명 띠가 **화면 최상단 24px의 모든 클릭을 삼킴** — 위젯 헤더 버튼이 정확히 그 자리. 숨기든 말든 안 눌리는 게 당연했음 → 트래픽 라이트 쪽(좌측 256px)만 남김
- **최대화 위젯이 상단 셸과 겹침**: 사이드바 토글(`top-9 left-6`)·Start focus 필·앰비언스 버튼이 전부 y 36~76에 떠 있는데 최대화 위젯이 y=0부터 시작했음 → 최대화 rect를 **상단 84px 아래로** 내림. 그러면 겹칠 일이 없으므로 앰비언스/배경 버튼 숨기던 처리도 제거
- **탈출 불가**: 웹 페이지에 포커스가 있으면 키 입력이 페이지에 갇혀 Esc·⌃⌘F가 앱에 도달하지 않음 → main에서 webview의 `before-input-event`를 받아 렌더러로 전달. 클릭 가능한 "Esc to restore" 버튼도 추가
- **너무 작음**: 헤더 32px/아이콘 12px → 헤더 40px/아이콘 14px/히트영역 28px
- 검증(CDP): 최대화 후 Restore 버튼 클릭 → 복귀, 페이지 안에서 Esc → 복귀, 뒤로가기 버튼 위치 (265,131)로 사이드바 토글과 분리

## D-031 (2026-08-16) 영상 전체화면은 위젯 안에 가둔다 — 게스트에 fullscreen API를 심음
- 요구: 유튜브 전체화면 버튼 → **영상만 커지고 위젯은 제자리**. 앱/창은 그대로
- 측정해보니 Electron의 실제 fullscreen은 전부 아니면 전무: `<webview>` 게스트가 fullscreen → **창까지 OS 전체화면**, 창을 되돌리면(`setFullScreen(false)`) **게스트도 fullscreen에서 튕겨나옴**. 둘이 묶여 있어서 창 쪽만 막는 방법은 불가능
- 그래서 게스트에 **가짜 fullscreen API를 주입**(`widgets/browserFullscreen.ts`, `dom-ready`마다 `executeJavaScript`+`insertCSS`). 플레이어는 평소대로 fullscreen 레이아웃으로 전환하되 "화면"이 위젯이 됨(게스트 뷰포트 = 위젯이므로 100vw/100vh가 곧 위젯)
- 별칭을 **전부** 덮어야 함. 처음에 `requestFullscreen`/`webkitRequestFullscreen`만 덮었더니 YouTube가 대문자 S인 `webkitRequestFullScreen`을 써서 진짜 전체화면이 나갔다
- 검증(실제 YouTube, CDP): 전체화면 버튼 클릭 → 창 1440×900 유지, `ytp-fullscreen` 진입, video rect 574×323 → 818×492(위젯 꽉 참), 다시 클릭 → 원복
- 한계: `:fullscreen` CSS 의사클래스는 매칭되지 않으므로 그걸로만 스타일하는 사이트는 다르게 보일 수 있음. 더 크게 보려면 위젯 최대화(D-030) 또는 앱 전체화면(⌃⌘F)과 겹쳐 쓰면 됨

## D-030 (2026-08-16) 위젯 최대화는 "월드 rect 오버라이드", 리페어런팅 금지
- 헤더 더블클릭(또는 헤더 ⛶ 버튼) → 그 위젯이 캔버스를 꽉 채움. Esc 또는 다시 더블클릭으로 복귀
- 구현: `uiStore.maximizedWidgetId`(비영속) → Canvas가 "현재 화면을 덮는 월드 rect"를 계산해 `fullRect` prop으로 내려줌. WidgetFrame은 저장된 x/y/w/h 대신 그걸 쓴다
- **DOM 트리에서 위젯을 옮기지 않는 게 핵심.** 오버레이 레이어로 옮기면 리마운트 → `<webview>`가 재로드 → 음악이 끊긴다. 검증: 최대화 전후 `getWebContentsId()` 동일(2 → 2), rect는 698×412 → 1182×756
- 위젯 좌표는 손대지 않으므로 복귀 시 원래 자리 그대로. 최대화 중에는 드래그·리사이즈 비활성
- 영상 전체화면(HTML5)은 그대로 OS 전체화면 — 표준 동작이라 유지 (D-027의 ⌃⌘F와 별개 기능)

## D-029 (2026-08-16) ⭐ 브라우저 위젯을 `<webview>`로 전면 교체 (D-010 뒤집음)
사용자 지적: 웹뷰가 위젯 프레임에서 어긋난 채 뜨고, 움직이면 정상화됨. 근본 원인을 다시 봄.

**왜 뒤집나**
`WebContentsView`는 페이지 위에 떠 있는 **네이티브 뷰**라 z-index·클리핑·CSS 트랜스폼이 통하지 않는다. 그래서 ZUI 캔버스 위에 얹으려면 매 프레임 bounds를 손으로 계산해 동기화해야 하고, 그 동기화는 store/resize 이벤트에만 걸려 있어서 **이벤트 없이 화면 위치가 변하는 순간(사이드바 트랜지션 등) 그대로 어긋난다.** D-018·D-021·D-024·D-025·D-026이 전부 같은 뿌리의 증상을 하나씩 때운 것 — 클리핑, 스냅샷, 오클루전, park/hibernate 전부.

**바꾼 것**
`<webview>`(웹 컨텐츠가 페이지 레이아웃 안에 들어옴, `webviewTag: true`) → 위치·스케일·클리핑·스택 순서를 **브라우저가 알아서 한다.**
- 삭제: `ipc/browser-views.ts`, `ipc/overlap.ts`(+테스트), preload `browserView` API 전체, `uiStore.bottomOverlayHeight`, `layout.isCovered`, 스냅샷·hibernation·bounds 동기화 로직 전부
- 줌은 CSS 트랜스폼이라 **리플로우가 원천적으로 없음**(D-024/025가 싸우던 문제 자체가 사라짐). 겹침·팝오버·리사이즈 핸들도 그냥 z-index대로 동작
- 덤: 브라우저 위젯도 PiP(미니 모드) 가능해져서 제외 조건 제거. 주소창이 실제 이동을 따라감(`did-navigate`)
- 비용: Electron 문서는 `<webview>`를 "권장하지 않음"이라 표시(WebContentsView 권장). 하지만 그 권장은 **캔버스 안에 웹을 얹는 케이스를 상정하지 않은 것**이고, 실제로 이 앱에는 in-page 합성이 필수. deprecated는 아니며 계속 지원됨
- 검증(CDP 스크린샷): 브라우저 2개 겹침 정상, 그 위에 메모 위젯 정상, 리사이즈 핸들 동작(698×448 → 770×496), 74% 줌에서 선명, 도크가 웹 컨텐츠 위에 그려짐

## D-028 (2026-08-16) YouTube Music은 위젯이 아니라 브라우저 프리셋
- 우려했던 X-Frame-Options는 **해당 없음**. legacy는 iframe이라 막혔지만 지금은 `WebContentsView`라 그냥 로드됨
- 그래서 새 위젯 타입을 만들지 않고 컨트롤바에 "YouTube Music" 버튼 하나 = `addWidget('browser', { url: 'https://music.youtube.com' })`. 스키마 변경 없음
- legacy 위젯이 더 갖고 있던 것(주소창·뒤로/앞으로·CSS 주입)은 브라우저 위젯에 이미 있거나 없어도 되는 것들
- **Reader는 보류**: 본문 추출에 `@mozilla/readability` 의존성 + main에서 HTML fetch(CORS 회피)가 필요. 기술적으로는 가능하지만, 브라우저 위젯이 90%를 대체하므로 비용 대비 가치가 낮음. 사용자가 원하면 그때 착수

## D-027 (2026-08-16) 배포는 "본인 머신용 dmg"까지만, 서명/자동업데이트는 보류
- `electron-builder.yml` mac target을 `dir` → `dmg`(arm64). `npm run dist` → `release/Focus Desk-0.1.0-arm64.dmg` (121MB)
- 키체인의 **Apple Development** 인증서로 자동 서명됨 → 본인 맥에서는 그냥 실행됨. 하지만 남에게 배포하려면 **Developer ID Application** 인증서 + 공증(notarize)이 필요 (Apple Developer Program 연 $99). 계정 확보 전까지 이 부분은 진행 불가
- 자동 업데이트(electron-updater + GitHub Releases)도 macOS에선 서명된 빌드가 전제라 같이 보류
- 아이콘 없음 → 기본 Electron 아이콘 사용 중. 만들면 `build/icon.icns`에 넣으면 됨

## D-026 (2026-08-16) 웹뷰 3종 후속 수정 (사용자 실사용 지적)
- **겹침**: 네이티브 뷰가 z-index를 무시해 앞에 있는 위젯(그 위젯의 **헤더/드래그 바 포함**)이 뒤 브라우저 뷰에 먹힘. 해결: **위에 겹친 위젯이 하나라도 있으면 그 브라우저 뷰는 숨고 스냅샷으로 대체**(`isCovered()` in `canvas/layout.ts` — 렌더러가 월드 좌표로 판정해 `sync`로 전달). 스냅샷은 일반 HTML이라 스택 순서가 다른 위젯과 완전히 동일하게 동작함
- 대안(기각): `addChildView` 재정렬로 뷰끼리 순서만 맞추기 — 브라우저끼리는 해결되지만 브라우저 위에 올린 메모·투두는 여전히 먹힘. 비용: 뒤로 밀린 브라우저는 정지화면이 된다(맨 앞이면 항상 라이브)
- **리사이즈 불가**: 뷰가 위젯 본문 전체를 덮어 우하단 리사이즈 핸들의 포인터 이벤트를 삼킴 → 본문에 `mb-4`를 줘서 핸들 자리를 HTML로 남김
- **줌아웃 시 새로고침/음악 끊김**: 줌 < 0.25에서 `hibernate()`(webContents 파괴)하던 것을 `setVisible(false)`로 변경. 더불어 **숨어 있는 동안 bounds·zoomFactor를 갱신하지 않는다** — 둘 다 페이지 뷰포트라, 안 보이는 사이에 위젯을 따라다니면 리플로우가 나서 재생이 끊긴다. 파괴는 스페이스 전환·위젯 언마운트에만 남김
- 트레이드오프: 줌아웃해도 웹뷰가 살아있어 메모리를 계속 쓴다. D-015의 메모리 절약보다 "음악이 안 끊긴다"가 우선

## D-025 (2026-08-16) ✅ D-024 해결 — 클리핑 대신 "겹치면 숨기고 스냅샷"
- `clipToArea()` 폐기(`clip.ts`/테스트 삭제). bounds는 **항상 위젯 전체 크기** → 페이지 리플로우 없음
- 대신 `overlapsShell(rect, area, windowSize)`(`electron/ipc/overlap.ts`)로 셸과 겹치는지만 판정. 겹치면 `view.setVisible(false)` + 마지막 프레임을 렌더러가 `<img>`로 표시. 창 밖으로 나가는 부분은 창이 알아서 자르므로 판정에서 제외
- **D-024 권장안과 다른 점 ①**: 겹칠 때 `hibernate()`(webContents 파괴)가 아니라 `setVisible(false)`. 드래그·팝오버처럼 수시로 일어나는 상황에서 페이지를 죽이면 스크롤·재생·입력 상태가 날아감. 파괴는 줌아웃/스페이스 전환(D-015)에만 유지
- **D-024 권장안과 다른 점 ②**: `bottomOverlayHeight`(uiStore)를 **제거하지 않고 유지**. 클리핑이 사라졌으니 부작용(뷰 축소)도 사라졌고, 이 값이 있어야 정렬 팝오버 위의 웹뷰가 스스로 숨어 메뉴가 보임. 제거하면 팝오버가 다시 가려짐

## D-024 (2026-08-16) ⚠️ D-018·D-021의 클리핑 방식 폐기 — 다시 만들 것 (→ D-025에서 해결)
사용자가 실제로 써보고 지적한 문제. **다음 세션의 첫 작업.**

**증상**
1. 브라우저 위젯을 사이드바 쪽으로 옮기면 페이지가 쪼그라든다 — `clipToArea()`가 `setBounds`의 width/height를 줄이는데, 그게 곧 페이지 뷰포트 크기라 리플로우가 일어남. "잘라내기"가 아니라 "창 축소"가 됨
2. 정렬 메뉴를 열면 웹뷰가 이상하게 비치고/겹쳐 보인다 — `bottomOverlayHeight`로 캔버스 영역을 줄이는 순간 웹뷰 높이도 같이 줄어서 생기는 부작용

**원인 (핵심)**
WebContentsView는 z-index를 무시하고 모든 HTML 위에 그려진다. bounds는 위치이자 **뷰포트 크기**라, bounds를 잘라 가리는 방식은 원리적으로 페이지를 리사이즈하는 것과 같다. 클리핑으로는 절대 해결 안 됨.

**수정 방향 (권장)**
bounds는 **항상 위젯 전체 크기 그대로** 두고(리플로우 없음), 셸과 겹치는 동안에는 뷰를 park하고 스냅샷(HTML `<img>`)으로 대체한다. 스냅샷은 일반 HTML이라 z-index·클리핑이 정상 동작함. hibernation 기계장치(D-015)가 이미 있으니 그대로 재사용.
- 겹침 판정만 main에서 하고, 겹치면 `hibernate()` → 스냅샷 반환
- 창 밖으로 나가는 경우는 창이 알아서 자르므로 아무 처리도 필요 없음 (지금도 불필요하게 자르고 있음)
- `bottomOverlayHeight`(uiStore)는 이 방식이면 필요 없어짐 → 제거
- `electron/ipc/clip.ts`와 그 테스트도 함께 제거

**대안(검토는 했으나 비추)**: 사이드바를 오버레이가 아니라 창 자체를 분할하는 구조로 바꾸기 — 변경 범위가 너무 큼

## D-021 (2026-08-16) 정렬 옵션은 "열 개수"
- Auto(≈√n) + 1~5열 + Cascade. 1열=세로 스택, n열=한 줄이므로 별도 rows/columns 모드는 불필요해 제거
- 팝오버가 네이티브 웹뷰에 가려지는 문제: 웹뷰는 z-index를 무시하므로, 메뉴가 열린 동안 `uiStore.bottomOverlayHeight`로 캔버스 영역을 줄여 뷰가 그 자리에 못 오게 함 (D-018의 안전 영역 재사용)

## D-022 (2026-08-16) 이미지는 userData에 복사하고 커스텀 프로토콜로 제공
- `images:save`가 내용 해시로 `userData/images/<sha1>.<ext>`에 저장하고 `focusdesk-image://local/<name>` 반환. `protocol.handle`이 images 디렉터리 밖은 절대 서빙하지 않음
- 이유: base64를 스페이스 JSON에 넣으면 문서가 메가바이트 단위로 부풀고 저장이 느려짐. 해시 이름이라 같은 사진 재사용 시 중복 저장 없음
- Photo 위젯과 배경 업로드가 같은 경로를 공유

## D-023 (2026-08-16) Sketch 위젯: SVG 스트로크, 진행 중 획은 ref
- 좌표를 고정 1000×1000 user space에 저장 → 위젯 리사이즈·카메라 줌에도 그림이 그대로
- 진행 중인 획은 **state가 아니라 ref**. pointermove가 리렌더보다 빨라서 state로 받으면 stale copy에 append하게 됨(실제로 이 버그를 냈다가 고침)
- legacy CANVAS(도형·텍스트·이미지 모델)는 대응 모델이 달라 마이그레이션에서 제외 — 반쯤 변환하느니 빼는 편이 정직함

## D-020 (2026-08-16) 포커스 세션은 wall-clock 기반, 통계는 전역
- `startedAt`(타임스탬프) + `banked`(일시정지분) 저장 → setInterval 누적이 아니라 실제 경과 시간이라 탭 비활성·시스템 슬립에도 정확
- 통계는 스페이스가 아니라 앱 전역(`electron-store` 키 `focus-stats-v1`). 하루 기준은 로컬 캘린더(UTC 아님)
- Todo 체크 = 완료 카운트 +1(해제해도 차감 안 함), Todo 항목의 ▶ = 그 태스크 이름으로 세션 시작
