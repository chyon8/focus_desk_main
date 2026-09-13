# STATUS — 출시까지 남은 일

> 매 세션 이 파일부터 읽는다. **"착수해"라고 하면 아래 순서에서 ✅ 없는 첫 줄을 시작한다.**
> 끝난 단계는 지운다 — 무엇을 왜 했는지는 코드 주석과 git 이력에 있다.
> 다른 문서: [ARCHITECTURE.md](ARCHITECTURE.md) 코드 구조 / [VISION.md](VISION.md) 컨셉·타겟. 둘 뿐이다.

## 남은 순서

| # | 할 일 | 크기 | 끝난 기준 |
|---|---|---|---|
| 10 | **온보딩 ← 지금 여기** | 큼 | 임포트 / 웹앱 고르기 / 건너뛰기 세 갈래가 다 끝까지 간다 |
| 11 | 서명·공증 | — | **사용자만 가능.** 하드 블로커 |

> 1~9는 끝나서 지웠다. 7(겹치지 않게 놓기)은 2026-09-06에 계획에서 뺐다 — 번호는 안 당겼다.

---

## 10. 온보딩

**착수할 때 먼저 `npm run dev:fresh`로 띄워서 처음부터 끝까지 한 번 해본다.**

| # | 할 일 | 왜 |
|---|---|---|
| 9 | **새 위젯·고르기 창이 엉뚱한 곳에 뜬다 ← 다음** | 더블클릭으로 연 브라우저·웹앱이 화면 위로 잘려서 뜨고, 고르기 창도 마우스에서 떨어져 뜬다. 모든 공간에서 매번 겪는다 |
| 10 | 로봇 인증 화면이 계속 뜬다 — 근본 해결 | 로그인·웹앱이 이 앱의 핵심인데 인증에서 막힌다 |
| 8 | 온보딩 디자인 검토 | 첫 화면을 A(전체 화면 + 썸네일 줄)로 바꿨다(2026-09-13). 9·10 뒤에 한 번 |

**지금 온보딩 방**: Summer Lake · Rainy Attic · Midnight Observatory · Snowy Railway · Paper (2026-09-13). 사진 넷은 랜딩 페이지의 방 넷과 같다.
Paper가 보이는 동안(호버·고른 뒤)은 어두운 층을 걷고 글자를 어둡게 쓴다 — [Onboarding.tsx](../src/onboarding/Onboarding.tsx)의 `--ob-*` 변수.

**눈으로 본 것 (2026-09-13)**
- 방 고르기 → 다음 질문: Summer Lake·Paper. 전환 중 느린 프레임 0. 방을 공간에 거는 건 0.65초 뒤라 소리도 그때 켜진다(이유는 `takeRoom` 주석)
- 웹앱 고르기 길 끝까지: 6개를 고르면 앞 5개는 페이지가 열리고 6번째는 타일(`OPEN_WEBAPPS`). 사용자가 "전부 타일이면 투박하다"고 해서 바꿨다

### 10-9 ~ 10-10. QA (2026-09-13 사용자가 짚은 것 — 하나도 빼지 말 것)

전부 코드만 읽고 추정한 것이다. **고치기 전에 테스트 창(test 프로필 + CDP)으로 재현부터 한다** — 방법은 메모리 `electron-cdp-verify`.

**10-9. 새 위젯·고르기 창 위치**
- 증상 ①: 빈 캔버스 더블클릭 → 고르기 창 → 브라우저·웹앱을 고르면 위젯이 예상 못 한 위치, 화면 훨씬 위에 떠서 잘린다
- 증상 ②: 더블클릭으로 뜨는 고르기 창 자체도 마우스에서 조금 떨어진 곳에 뜬다
- 볼 곳: [Canvas.tsx](../src/canvas/Canvas.tsx) `onDoubleClick` → `openQuickAdd(screen, world)` / [QuickAdd.tsx](../src/app/QuickAdd.tsx) 창 위치(`left = x - PANEL_WIDTH/2`, `top = y - 12`) / [spaceStore.ts](../src/stores/spaceStore.ts) `addWidget`은 `at`(더블클릭 지점)을 **위젯 가운데**로 둔다
- 추정: 브라우저는 900×620이라 가운데를 클릭 지점에 맞추면 위·아래로 310px씩 뻗는다. 화면 위쪽을 더블클릭하면 위로 잘린다. 고르기 창도 가로 가운데 정렬이라 마우스 옆이 아니라 마우스 아래 가운데에 뜬다. 캔버스 요소가 사이드바 옆에서 시작하는 것(QuickAdd.tsx 21행 주석)과 좌표계가 어긋나는지도 볼 것
- 끝난 기준: 더블클릭한 곳 근처에 창이 뜨고, 새 위젯이 화면 안에 다 보인다

**10-10. 로봇 인증**
- 증상: 웹앱·브라우저 위젯에서 "로봇이 아닙니다" 인증 화면이 아직도 뜬다. 사용자는 **근본 해결**을 원한다
- 지금까지 한 것: [main.ts](../electron/main.ts) 40~54행 — user agent에서 `Electron/`·앱 이름을 빼고 Chrome 버전을 줄였다. 같은 주석에 "구글 unusual traffic 페이지는 이걸로 안 막힌다, IP로 정해진다(2026-09-01 측정)"고 적혀 있다
- 먼저 할 것: 어느 사이트에서 어떤 인증(reCAPTCHA / Cloudflare Turnstile / 구글 `/sorry`)이 뜨는지 사용자에게 받는다. 같은 사이트를 실제 Chrome에서 열어 비교한다
- 확인 후보: `Sec-CH-UA` 클라이언트 힌트에 Electron 브랜드가 남는지, `navigator.userAgentData`·`navigator.webdriver`·플러그인 목록이 Chrome과 다른지, webview 파티션 쿠키가 저장·유지되는지, 로그인 창을 앱 안이 아니라 시스템 브라우저로 여는 방식이 필요한지
- 끝난 기준: 사용자가 말한 사이트들에서 인증 없이 로그인까지 간다. 안 되는 사이트가 남으면 이유를 측정값으로 보고한다

**아직 안 본 것**: 크롬 임포트 길을 A 첫 화면에서 넘어온 상태로.

### 10-8. 온보딩 디자인 검토 — 평가는 이 다섯으로만

| 기준 | 묻는 것 |
|---|---|
| 표면 일관성 | 배경·레일·카드·독이 같은 색 규칙을 쓰는가 |
| 명암 극성 | 한 화면에 밝은 UI와 어두운 UI가 섞이지 않는가 |
| figure-ground | 카드가 배경에서 떨어져 보이는가 |
| 컨트롤 위치 | 조작 지점이 몇 군데로 흩어져 있는가 |
| 다중 위젯 내성 | 위젯 4~6개를 열었을 때 견디는가 |

**지난 세션에 버린 것** — 다시 꺼내지 말 것
- 호버하면 그 방 소리 미리듣기 — 브라우저가 첫 클릭 전엔 소리를 안 낸다. 이 화면의 첫 클릭이 방을 고르는 클릭이라 항상 무음이다
- "I'm a ___" 밑줄 빈칸 — 가입 폼 문법이라 안 맞았다. "What happens in this room?"으로 바꿨다
- 사진 위에 유리판 띄우는 레이아웃 — 흔한 템플릿으로 보였다. 지금은 사진이 선택지 자체다

---

## 11. 서명·공증

Developer ID 인증서 → 공증 → 자동 업데이트. **AI가 못 한다.** 지금 빌드는 Apple Development 서명뿐이라 남에게 주면 안 열린다.

---

## 내가 내려야 할 결정

- **타겟 사용자** — 온보딩 ④의 예시 문구가 곧 타겟 선언이 된다. 1순위 후보: 맥·유료 클라이언트 3개 이상 병행하는 1인 프리랜스 디자이너. 리스크: 개발자인 본인이 자기 유저가 아니게 된다. **탭 가져오기는 타겟과 무관해서 온보딩 개발은 기다리지 않아도 된다**
- **기본 배경 1장** — 온보딩 ②
- **앰비언스 자동 재생 여부와 볼륨** — 온보딩 ②
- **실제 앱 창 배치 기능의 첫 배포 포함 여부** — 앱 위젯을 단순 실행 카드로 둘지, 접근성 권한을 받아 실제 앱 창을 위젯 위치·크기에 맞출지
- **가격·유료화 시점** — 붙인다면 로그인 대신 라이선스 키(Lemon Squeezy / Paddle). 서버 없이 되는 가장 짧은 길
- **배포 채널** — 자체 사이트 / Product Hunt / 커뮤니티

---

## 손대지 말 것 (사용자가 정한 것)

이유는 각 파일의 주석에 있다. 고치기 전에 먼저 물을 것.

- **소리(Sound)** — 2026-09-07에 사용자가 직접 고쳤다
- **사이드바가 배경색을 따라가는 것** — 사용자가 이 앱에서 마음에 들어한 것이다. 약하게 만들지 말 것. `backgroundTokens.test.ts`가 대비와 색조를 같이 지킨다 — 값을 만지면 둘 중 하나가 조용히 깨지므로 **테스트를 먼저 보고 고칠 것**
- **`SOLID_COLORS`는 8색** (2026-09-12, [backgrounds.ts](../src/spaces/backgrounds.ts)). Greige 자리는 Rose `#f0d8d6`. 랜딩 바탕색 `#efe7d9`는 단색이 아니라 **Paper 테마**로 올렸다(2026-09-13, [referenceThemes.ts](../src/themes/referenceThemes.ts)). 배경 패널 윗줄이 Editorial · Paper · Rainy Night · Snowfall 네 칸이다
- **`MINIMAL_THEMES`는 없앴다** (2026-09-07)
- **격자(Pattern)는 단색 위에만** (2026-09-12, [SceneLayer.tsx](../src/themes/SceneLayer.tsx)). 아래로 흐려지지 않고 화면 전체에 고르게 깐다. **기본은 격자, 단색 전체**(2026-09-13) — 끄는 건 Atmosphere의 Plain. Paper가 제 색일 때는 랜딩 격자 값(44px·갈색 9%)
- **Editorial(옛 Swiss Editorial, id `swiss`)·Paper에 단색을 고르면 테마가 유지된다** (2026-09-12, [spaceStore.ts](../src/stores/spaceStore.ts)의 `setBackground`)
- **위젯 마크 8색은 액센트를 안 따른다** · **브라우저 위젯에 탭 줄을 안 넣는다**(묶는 건 컬럼이 한다) · **Atmosphere 패널 순서는 안 바꾼다**
- **CSS 변수 + 토큰 클래스 12종 구조** — 배경을 바꾸면 전부 따라온다. 갈아엎지 말 것

---

## 알려진 버그

- **컬럼 카드의 웹앱은 아직 프리셋 이모지일 수 있다.** 캔버스 위젯은 2026-09-09에 고쳤지만, 컬럼 안 카드는 `PagePreview`를 그리고 `WebAppWidget`을 안 띄우므로 그 경로로는 로고가 안 올라온다. 카드만 있는 웹앱은 한 번 꺼내거나 열어야 한다
- **체류 시간이 디스플레이만 꺼진 상태도 카운트**한다 (유휴 감지는 의도적 제외)

---

## 확인 안 된 것

**손으로만 되는 것** (네이티브 메뉴·자동화 권한·창 순서라 CDP로 못 한다)
- **웹뷰 우클릭** — 이미지 위(`Send image to the canvas`) / 글 선택 후 / 링크 위. **투어 3단계가 통째로 여기 달려 있다**
- **기능 목록의 `drag-out`·`chrome` 두 줄** — 나머지 다섯은 2026-09-05에 확인했다
- **크롬 임포트 `Bring in`** — 읽고 창 목록 그리는 데까지는 봤다(2026-09-08). 창 2개 이상 골라서: 공간이 딱 그 개수만 생기는지 / 앞 4개가 진짜 페이지로 뜨는지 / 줌아웃 끝 배율이 1.0인지 / 카드에 로고와 사이트 색이 붙는지(1~2초 뒤) / G를 눌렀을 때 큰 타일 2개가 브라우저인지
- **팝업 창이 메인 창 뒤로 안 숨는지** — `parent: win`을 넣었다. 사이트에서 로그인 팝업을 띄우고 캔버스를 눌러볼 것
- **빈 프로필 가져오기** — `mv ~/Library/Application\ Support/focus-desk{,.real}` → ⚙ Import → `Added N spaces` → Show them. 끝나면 되돌린다
- **빈 프로필 첫 실행에 접근성 프롬프트 없음** — 앱 위젯을 만들어 클릭. 스위치를 켜면 그때 뜨는지도
- **세션 패널의 로그아웃 버튼** — `session:clear-site`가 `siteOf`로 묶이게 바뀐 것. 실제 로그인이 지워지므로 아무 사이트에서나 하면 안 된다

**실기로 봐야 하는 것**
- **앱 아이콘** (2026-09-12에 교체·패키징까지 함). `release/mac-arm64/Focus Desk.app`을 열어 독에서 새 아이콘이 뜨는지. **dev는 기본 Electron 아이콘이다.** 옛 아이콘이 남으면 `killall Dock Finder`
- **패키징본 실사용 QA** (2026-09-12 빌드, `release/mac-arm64`). 접근성 권한을 새로 줘야 하고, dev 인스턴스를 같이 띄우면 안 된다 — 팝업·링크 / 앱 숨김 알림 / 앱·웹앱 위젯 / 공간별 로그인
- **Swiss Editorial 폰트** — 패키징본에서 네트워크 없이 IBM Plex Sans KR·Noto Sans KR가 뜨는지
- **월페이퍼 23장** — 재시작 후 복원·공간별 독립 저장, 16:9·16:10·울트라와이드 잘림, 수동 Light/Dark. 새 장면 생성 기준은 [WALLPAPER-GENERATION-PROMPT.md](../design-ref/WALLPAPER-GENERATION-PROMPT.md)
- **컬럼 카드 높이 210** (196→210). 컬럼 높이 계산이 이 상수를 쓰므로 **기존 컬럼이 열렸을 때 카드가 안 겹치는지**
- **컬럼 카드 안 위젯 12종 스케일** — 어두운 배경 한 번만 봤다. **메모 카드가 세로줄로 보이던 것**도 같이 본다
- **독이 한 줄에 컨트롤 8개다.** 창을 좁히면 넘치는지 안 봤다
- **focus 정렬을 위젯 종류가 섞인 공간에서** — 앞 2개가 커지는 게 말이 되는지. 테스트는 크기·순서만 본다
- **UA 수정 후 Google 검색** — "비정상적인 트래픽"·reCAPTCHA가 실제로 줄어드는지는 며칠 써봐야 안다

---

## 코드 위치

- **온보딩** = [Onboarding.tsx](../src/onboarding/Onboarding.tsx) · [FirstSteps.tsx](../src/onboarding/FirstSteps.tsx) · [samplePage.ts](../src/onboarding/samplePage.ts). ④의 답이 기본 공간의 이름이 되고 배경·앰비언스도 거기 붙는다
- **온보딩 화면의 색은 토큰을 안 쓴다.** 사진 위에 얹히는 화면이라 `glass-panel`·`chrome-button-on`이 너무 옅게 나온다 — 흰색 알파를 직접 쓴다. Paper 같은 단색 방에서는 `--ob-*` 변수로 밝은 색과 어두운 색이 자리를 바꾼다
- **첫 실행 판정** = `spaceStore.needsOnboarding`. 공간은 **비어 있게** 만든다
- **테스트 프로필** = `npm run dev:fresh`. 실제 프로필과 안 섞이므로 실사용 앱과 동시에 켜도 된다
- **공간 모양** = [ThemePicker.tsx](../src/app/ThemePicker.tsx) — 배경·날씨·UI 밝기를 현재 공간에만 건다. 값은 [backgrounds.ts](../src/spaces/backgrounds.ts) · [SceneLayer.tsx](../src/themes/SceneLayer.tsx)
- **월페이퍼 폴더** = `userData/wallpapers`. 앱이 들고 오는 사진은 번들(`/wallpapers/…`), 사용자 것은 `focusdesk-image://wallpaper/…`([images.ts](../electron/ipc/images.ts)). **패키징본에서는 번들 쪽이 asar 안이라 못 쓴다**
- **앱 아이콘** = [make_icon.py](../build/make_icon.py)가 그려서 `build/icon.png`·`icon.icns`를 만든다. 색 상수 3개와 좌표만 고치면 다시 나온다. `electron-builder.yml`이 icns를 쓴다
- **백업** = [backup.ts](../electron/ipc/backup.ts). 하루 1회 스냅샷(최근 5개). **가져오기는 id가 같으면 건너뛴다** — 같은 프로필에 되가져오면 "Nothing new"가 정상이다. 쿠키는 백업에 없다
- **앱 창 붙이기** = `prefsStore.attachApps`, 기본 `false`. 접근성 프롬프트는 헬퍼의 `place`·`windows` 두 곳에서만 뜬다
- **2회차 훅** = [useWelcomeBack.ts](../src/focus/useWelcomeBack.ts). 마지막으로 쓴 날의 제일 오래 머문 공간을 sticky 토스트로 말한다
- **기능 목록 위젯** = `TOUR_LINES`. 줄은 `TodoItem.hint`로 식별한다([types.ts](../src/spaces/types.ts)의 `TourHint`) — 텍스트로 맞추면 사용자가 글을 고치는 순간 깨진다

---

## 규칙

- git 명령은 사용자가 직접 실행 (CLAUDE.md 워크플로우)
- dev 실행 시 `unset ELECTRON_RUN_AS_NODE` 필요(VSCode 확장 변수)
- **main 프로세스 변경은 Electron 완전 재시작이 필요하다.** 렌더러 새로고침으로는 옛 핸들러가 계속 돈다
- **dev 중에 md 파일을 고치면 vite가 페이지를 새로 고친다** — 온보딩 진행 상태가 날아간다. 확인하는 동안은 문서를 안 고친다
- **다른 세션이 `dev:fresh`(test 프로필)를 쓰고 있을 수 있다.** 확인용은 따로 띄운다: `rm -rf "$HOME/Library/Application Support/focus-desk-check" && FOCUS_DESK_PROFILE=check FOCUS_DESK_DEBUG_PORT=9333 npx vite` → CDP로 누르고 찍는다
