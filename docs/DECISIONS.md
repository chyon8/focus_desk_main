# DECISIONS — 기술 결정 기록 (append-only)

> 형식: 날짜 / 결정 / 이유 / 버린 대안. 뒤집을 때는 삭제하지 말고 새 항목으로 추가.

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
