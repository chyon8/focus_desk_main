# STATUS — 출시까지 남은 일

> 매 세션 이 파일부터 읽는다. **"착수해"라고 하면 아래 순서에서 ✅ 없는 첫 줄을 시작한다.**
> 끝난 단계는 지운다 — 무엇을 왜 했는지는 코드 주석과 git 이력에 있다.
> 다른 문서: [ARCHITECTURE.md](ARCHITECTURE.md) 코드 구조 / [VISION.md](VISION.md) 컨셉·타겟. 둘 뿐이다.

## 남은 순서

| # | 할 일 | 크기 | 끝난 기준 |
|---|---|---|---|
| 14 | **랜딩에 실제 스크린샷 반영** | 중간 | 고른 컷을 다듬어 2배로 뽑고 랜딩 시안에 넣었다. 진행 기록은 [APP-DESIGN-RENEWAL.md](../design-ref/APP-DESIGN-RENEWAL.md) 맨 아래 "스크린샷 계획", 랜딩 쪽은 [NOTES.md](../design-ref/landing-canvas/NOTES.md) |
| 10 | **온보딩** | 큼 | 임포트 / 웹앱 고르기 / 건너뛰기 세 갈래가 다 끝까지 간다 |
| 18 | **월페이퍼 정리** | 작음 | 번들 23장에서 뺄 것을 뺐고, 픽커 순서 상수에 남은 없는 파일 이름을 지웠다 |
| 11 | 서명·공증 | — | **사용자만 가능.** 하드 블로커 |

> 순서는 2026-09-16 사용자가 정했다. 끝난 것은 지운다 — 무엇을 왜 했는지는 코드 주석과 git 이력에 있다.
> 끝나서 지운 것: 1~9 · 12(정렬) · 13(봇 검사) · 15~17. 7(겹치지 않게 놓기)은 2026-09-06에 계획에서 뺐다 — 번호는 안 당겼다.

---

## 10. 온보딩

**착수할 때 먼저 `npm run dev:fresh`로 띄워서 처음부터 끝까지 한 번 해본다.**

| # | 할 일 | 왜 |
|---|---|---|
| 8 | **온보딩 디자인 검토 ← 다음** | 첫 화면을 A(전체 화면 + 썸네일 줄)로 바꿨다(2026-09-13). 크롬 임포트 길을 A에서 넘어온 상태로 아직 안 봤다 — 검토하면서 같이 본다 |
| 12 | 즐겨찾기·온보딩 앱 목록 수정 — 나중(런칭 전) | 사용자가 34개 목록([presets.ts](../src/webapps/presets.ts))에 이상한 게 있다고 했다(2026-09-13). 사용자가 뒤로 미뤘다. 무엇을 고칠지는 사용자에게 받는다 |

**온보딩 흐름 변경 — 랜딩 작업 뒤에 한다 (2026-09-15 사용자 동의).** 예시 공간(사용자가 지정, 웹 페이지·메모·사진이 펼쳐진 Cloud 단색 공간)을 먼저 보여준다 → 마지막에 "Make your own space"에서 지금의 방 고르기를 쓴다 → 예시 공간을 지울지 한 번 묻고(기본은 지우기) 새 공간으로 시작. 방 고르기 화면은 없애지 않고 마지막 단계로 옮긴다. 예시 공간에는 로그인·쿠키 창이 뜨는 페이지를 넣지 않는다. 표의 순서·범위는 착수할 때 사용자와 다시 정한다.

**지금 온보딩 방**: Summer Lake · Rainy Attic · Midnight Observatory · Snowy Railway · Paper (2026-09-13). 사진 넷은 랜딩 페이지의 방 넷과 같다.
Paper가 보이는 동안(호버·고른 뒤)은 어두운 층을 걷고 글자를 어둡게 쓴다 — [Onboarding.tsx](../src/onboarding/Onboarding.tsx)의 `--ob-*` 변수.

**앱 디자인 리뉴얼이 온보딩에 준 변화 (2026-09-15)** — 온보딩 면 두 값을 카드와 같은 `#ffffff` / `#1f1f21`로, 방 썸네일 모서리 14px, Paper 방 격자를 뺐다(앱 단색 기본이 무늬 없음). 10-8 검토는 이 새 디자인으로 한다. 사용자가 "온보딩에서 색이 달라 보인다"고 했다 — 어느 화면인지 확인하는 것부터.

**눈으로 본 것 (2026-09-13)**
- 방 고르기 → 다음 질문: Summer Lake·Paper. 전환 중 느린 프레임 0. 방을 공간에 거는 건 0.65초 뒤라 소리도 그때 켜진다(이유는 `takeRoom` 주석)
- 웹앱 고르기 길 끝까지: 6개를 고르면 앞 5개는 페이지가 열리고 6번째는 타일(`OPEN_WEBAPPS`). 사용자가 "전부 타일이면 투박하다"고 해서 바꿨다

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

**코드 위치**
- **온보딩** = [Onboarding.tsx](../src/onboarding/Onboarding.tsx) · [FirstSteps.tsx](../src/onboarding/FirstSteps.tsx) · [samplePage.ts](../src/onboarding/samplePage.ts). ④의 답이 기본 공간의 이름이 되고 배경·앰비언스도 거기 붙는다
- **온보딩 화면의 색은 토큰을 안 쓴다.** 사진 위에 얹히는 화면이라 `glass-panel`·`chrome-button-on`이 너무 옅게 나온다 — 흰색 알파를 직접 쓴다. Paper 같은 단색 방에서는 `--ob-*` 변수로 밝은 색과 어두운 색이 자리를 바꾼다
- **첫 실행 판정** = `spaceStore.needsOnboarding`. 공간은 **비어 있게** 만든다
- **테스트 프로필** = `npm run dev:fresh`. 실제 프로필과 안 섞이므로 실사용 앱과 동시에 켜도 된다

## 18. 월페이퍼 정리 — 급하지 않다 (2026-09-19 사용자)

번들 월페이퍼는 `public/wallpapers` 23장이고 픽커는 폴더를 그대로 읽는다([images.ts](../electron/ipc/images.ts)의 `images:wallpapers`). 그래서 파일을 빼거나 이름을 바꾸는 것이 곧 목록 변경이다.

- **webp가 아닌 두 장** — `lofi_fireplace.jpeg`(2.7MB) · `sunset_landscape.png`(596KB). MVP 때 것이고 지금 스타일과 안 맞는다. 픽커에 "Lofi Fireplace" · "Sunset Landscape"로 보인다. 뺄지는 사용자가 본 뒤 정한다
- **없는 파일 이름 두 개** — [ThemePicker.tsx](../src/app/ThemePicker.tsx)의 `WALLPAPER_HEAD`에 `geometric-relief.png`, `WALLPAPER_TAIL`에 `anime-maple-veranda.png`. 파일이 없어서 순서에 영향은 없다. 지운다
- **`-v2`로 끝나는 3장** — 픽커에 "Alpine Cycle Bridge V2"로 보인다. 이름을 바꿀지 정한다
- **파일을 빼거나 이름을 바꾸면** [migrate.ts](../src/spaces/migrate.ts)의 `RETIRED` 표에 옛 이름 → 대체 월페이퍼를 넣는다. 안 넣으면 그 배경을 쓰던 공간이 빈 배경이 된다
- **장수와 주제 구성**(계절·비·밤이 몇 장씩, 겹치는 장면)은 사용자가 고른다. 새로 만들 때 기준은 [WALLPAPER-GENERATION-PROMPT.md](../design-ref/WALLPAPER-GENERATION-PROMPT.md)
- 같이 확인할 것: 패키징본에서 번들 월페이퍼가 실제로 보이는지. 빌드는 `dist/wallpapers`에 23장을 복사하므로 보일 것으로 보지만 실기로 안 봤다

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

- **Unsplash가 "Making sure you're not a bot! Calculating…"에서 안 넘어간다 (2026-09-16, 원인 미확정).** Unsplash 앞의 Anubis(BotStopper) 계산 검사다. check 프로필에서는 새 공간·부하·앱 숨김 모두 1~6초에 통과했다. 계산 속도는 보통 700 kH/s대인데, 페이지 10개를 한꺼번에 열 때 3 kH/s까지 떨어졌다 — 그 속도면 몇 분 걸린다. 사용자 쪽에는 실제 프로필(`focus-desk`)을 쓰는 dev 앱이 두 개(3000·3002번) 떠 있었고, 둘 다 같은 공간의 쿠키 저장소를 열고 있었다 — 유력한 원인이지만 재현은 못 했다. 검사 주소를 위젯 주소로 저장하던 문제는 고쳤다(`addressToSave`). 같은 프로필로 두 번 뜨는 것도 막았다(2026-09-17, [main.ts](../electron/main.ts) `requestSingleInstanceLock`) — 다시 나면 이 원인은 아니다

- **컬럼 카드의 웹앱은 아직 프리셋 이모지일 수 있다.** 캔버스 위젯은 2026-09-09에 고쳤지만, 컬럼 안 카드는 `PagePreview`를 그리고 `WebAppWidget`을 안 띄우므로 그 경로로는 로고가 안 올라온다. 카드만 있는 웹앱은 한 번 꺼내거나 열어야 한다
- **체류 시간이 디스플레이만 꺼진 상태도 카운트**한다 (유휴 감지는 의도적 제외)

---

## 확인 안 된 것

출시 전에 꼭 볼 것만 남긴다. 나머지는 그 기능을 손댈 때 같이 본다.

- **웹뷰 우클릭** — 이미지 위(`Send image to the canvas`) / 글 선택 후 / 링크 위. **투어 3단계가 통째로 여기 달려 있다.** 네이티브 메뉴라 CDP로 못 한다
- **크롬 임포트 `Bring in`** — 창 목록까지는 봤다(2026-09-08). 창 2개 이상 골라서 공간이 그 개수만 생기는지, 앞 4개가 진짜 페이지로 뜨는지
- **패키징본 실사용 QA** (`release/mac-arm64`) — 접근성 권한을 새로 줘야 하고 dev를 같이 띄우면 안 된다. 팝업·링크 / 앱 숨김 알림 / 앱·웹앱 위젯 / 로그인 / 독 아이콘 / 네트워크 없이 IBM Plex Sans KR·Noto Sans KR
- **사이트 권한 묻기 창** ([main.ts](../electron/main.ts) `setPermissionRequestHandler`) — Meet에서 카메라를 켜면 Allow/Block이 뜨는지, Block 후 다시 안 묻는지. 답은 `permissions.json`에 남아 재시작해도 안 묻는다 — Block을 풀 방법이 파일 삭제뿐인 게 괜찮은지
- **빈 프로필 가져오기** — `mv ~/Library/Application\ Support/focus-desk{,.real}` → ⚙ Import → `Added N spaces`. 끝나면 되돌린다

---

## 규칙

CLAUDE.md에 없는 것만 적는다.

- **`npm install`은 Electron 바이너리를 안 받는다** (Electron 42부터). 첫 실행 때 받거나 `npx install-electron`
- **같은 프로필로는 앱이 하나만 뜬다.** 두 번째는 `already running … quitting`을 찍고 꺼진다. 확인용을 같이 띄우려면 `FOCUS_DESK_PROFILE`을 다르게 준다
- **dev 중에 md 파일을 고치면 vite가 페이지를 새로 고친다** — 온보딩 진행 상태가 날아간다
- 확인용 앱: `FOCUS_DESK_PROFILE=check FOCUS_DESK_DEBUG_PORT=9334 npx vite --port 3005 --strictPort` → CDP로 누르고 찍는다. 3000·3001은 사용자 것일 수 있다
