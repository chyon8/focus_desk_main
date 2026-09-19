# STATUS — 출시까지 남은 일

> 매 세션 이 파일부터 읽는다. **"착수해"라고 하면 아래 순서에서 ✅ 없는 첫 줄을 시작한다.**
> 끝난 단계는 지운다 — 무엇을 왜 했는지는 코드 주석과 git 이력에 있다.
> 다른 문서: [ARCHITECTURE.md](ARCHITECTURE.md) 코드 구조 / [VISION.md](VISION.md) 컨셉·타겟. 둘 뿐이다.

## 남은 순서

| # | 할 일 | 크기 | 끝난 기준 |
|---|---|---|---|
| 13 | **브라우저가 봇 검사에 덜 막히게** — D·A1~A3·B1·B2 끝, 다음은 B3 | 큼 | 아래 13번 A~C가 끝나고, D의 사이트 목록이 전후로 기록됐다 |
| 14 | **랜딩에 실제 스크린샷 반영** | 중간 | 고른 컷을 다듬어 2배로 뽑고 랜딩 시안에 넣었다. 진행 기록은 [APP-DESIGN-RENEWAL.md](../design-ref/APP-DESIGN-RENEWAL.md) 맨 아래 "스크린샷 계획", 랜딩 쪽은 [NOTES.md](../design-ref/landing-canvas/NOTES.md) |
| 10 | **온보딩** | 큼 | 임포트 / 웹앱 고르기 / 건너뛰기 세 갈래가 다 끝까지 간다 |
| 11 | 서명·공증 | — | **사용자만 가능.** 하드 블로커 |

> 순서 13 → 14는 2026-09-16 사용자가 정했다. 12(정렬)는 같은 날 끝나서 지웠다 — 정렬은 Grid · Stack(칸반: 열 폭 300, 한 줄씩) · Masonry(같은 열, 짧은 열부터) 셋이고, 모두 화면에 놓인 순서를 읽어 두 번 눌러도 결과가 같다(`orderFor`). 아래가 비는 건 그대로 둔다. 시도했다 뺀 방식과 이유는 [layout.ts](../src/canvas/layout.ts) `stackInto` 주석.
> 16(구글 로그인)은 2026-09-17에 끝나서 지웠다 — UA에 `FocusDesk/<버전>` 토큰을 넣고 패스키를 껐다. 사용자가 실제 계정으로 로그인이 되는 것을 확인했다. 조사 기록은 [LOGIN-ISSUE.md](LOGIN-ISSUE.md), 이유는 [main.ts](../electron/main.ts) 주석. 막히면 시스템 크롬에서 로그인하고 쿠키를 옮기는 방법(안 C)으로 간다.
> 15(공간 메뉴 여는 방법)는 2026-09-17에 끝나서 지웠다 — 레일 타일은 누르면 이동만 하고, 우클릭·모서리 `…`로 어느 공간이든 메뉴(이름·삭제)가 열린다. 로그인 스위치는 17-4에서 뺐다. 로그인 목록은 More → Sign-ins([SignInsPanel.tsx](../src/app/SignInsPanel.tsx)). 이유는 [Rail.tsx](../src/app/Rail.tsx) 주석.
> 1~9는 끝나서 지웠다. 7(겹치지 않게 놓기)은 2026-09-06에 계획에서 뺐다 — 번호는 안 당겼다.

---

## 13. 브라우저가 봇 검사에 덜 막히게 — B3부터 남았다

**완전히 막을 방법은 없다.** Electron은 크롬과 똑같지 않아서 검사가 엄격한 사이트는 알아챌 수 있다. 목표는 두 가지다 — 막히는 경우를 줄이고, 막혔을 때 빠져나갈 길을 둔다.

**D(측정), A1(같은 프로필 두 번 실행 막기), A2(검사 페이지 주소 저장 안 하기), A3(로그인 공유)은 끝났다 (2026-09-17).** A2는 주소 규칙(`addressToSave`)에 레딧 검사 파라미터·`/cdn-cgi/`를 더하고, 검사 제목(`isCheckTitle`)이 뜨면 리다이렉트 전 주소를 저장한다. A3는 새 공간이 `persist:shared`를 쓰고, 기존 공간은 `separate`로 옮겼다 — 공간 메뉴(우클릭)의 "Separate sign-ins" 스위치로 바꾼다. **사용자 쪽 할 일: 지금 쓰는 공간들은 아직 따로다. 공유로 쓰려면 공간마다 이 스위치를 끈다** 고친 뒤에 같은 방법으로 다시 재서 아래 "전"과 비교한다.

**D1 — 고치기 전 (Electron 39, check 프로필, 사이트마다 새 공간·새 브라우저 위젯, 15초 뒤 읽음)**
- 통과 18: 구글 검색 · 유튜브 · 지메일(소개 페이지로 감) · 구글 로그인(이메일 입력 화면까지) · 깃허브 · 노션 · 피그마 · X · 링크드인 · 인스타그램 · 네이버 · 챗GPT · 클로드 · 언스플래시 · 핀터레스트 · 아마존 · 디스코드 · 스포티파이
- 레딧: 통과. 단 JS 검사를 거쳐 주소가 `?solution=…&js_challenge=1&jsc_token=…`가 된다 — 이 주소가 위젯 주소로 저장되던 것은 A2에서 고쳤다. 같은 때 새 프로필 크롬 152는 "Prove your humanity" 화면이 떴다
- 쿠팡: 5번 중 1번 "Access Denied"(Akamai). 20곳을 연달아 열 때 났고, 따로 연 4번과 크롬은 통과
- 구글 로그인의 "안전하지 않은 브라우저"는 이메일을 넣어야 나오므로 안 봤다(C2, 사용자 계정으로 확인)

**D2 — 크롬 152와 다른 점** (sannysoft는 둘 다 전부 통과, browserscan은 둘 다 Normal, creepjs headless 비슷 38%/31%)
| 차이 | 앱 | 크롬 | 어디서 고치나 |
|---|---|---|---|
| 버전 | ~~142~~ → 152 | 152 | B1에서 맞췄다 |
| `Sec-Ch-Ua*` 요청 헤더 | ~~아예 안 보낸다~~ → 보낸다 | 보낸다 | B2에서 직접 붙였다 |
| `userAgentData.brands` | ~~Not_A Brand, Chromium~~ → 크롬과 같다 | Chromium, Not?A_Brand, Google Chrome | B2에서 맞췄다 |
| `Accept-Language` / `navigator.languages` | `ko` / ko, ko-KR, en-KR | `ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7` / ko-KR, ko, en-US, en | **그냥 둔다** (2026-09-17 사용자). 앱도 맥 언어를 따르고, 목록 길이만 다르다. 이것 때문에 막힌 사이트는 없었다 |
| `window.chrome` | 빈 객체 | loadTimes · csi · app | B3 |
| WebRTC | 내부 IP(192.168.x)가 그대로 보인다 | `.local` 주소로 가린다 | B3 — 권한을 `granted`로 답해서 생기는 것으로 본다 |
| 알림·위치 권한 조회 | granted | prompt | 의도한 것([main.ts](../electron/main.ts) 주석) |
| 페이지에 보이는 전역 | `__focusDeskFullscreen` · `__focusDeskLinks` | 없음 | B3 |
| `navigator.share` | 없음 | 있음 | 작다 |

**B1 끝 (2026-09-18)** — Electron 39.2.7 → 44.4.2, 크롬 142 → 152.0.7977.130. 깨진 API 없었다. `npm run dist`로 DMG까지 나온다.

**B2 끝 (2026-09-19)** — [clientHints.ts](../electron/clientHints.ts). 헤더 3개는 `onBeforeSendHeaders`로, `navigator.userAgentData`는 위젯·팝업마다 CDP로 건다. 이유와 시점은 그 파일 주석에 있다.

- **여기 적혀 있던 가설은 틀렸다.** UA 문자열 탓이 아니라 **Electron이 원래 client hints를 안 보낸다.** 설정으로 켤 방법이 없어 직접 붙였다
- 확인: 위젯·팝업 둘 다 헤더 3개와 brands가 크롬과 같음 · 깃허브 · 네이버 · 언스플래시 · 레딧 · 쿠팡 · ChatGPT · X 로드됨. 앱 자기 창은 안 건드렸다(⌥⌘I 그대로)

| 단계 | 할 일 | 왜 |
|---|---|---|
| B3 | D2 표의 나머지 차이 — `window.chrome`, WebRTC 내부 IP, 페이지 전역 | 하나씩 효과와 부작용을 보고 고른다 |
| C1 | **막혔을 때 "Open in Chrome" 버튼** — 검사 화면이 15초 넘게 떠 있으면 위젯 위에 띄운다 | 막히는 사이트가 남아도 사용자가 멈추지 않는다 |
| C2 | **구글 로그인** — "안전하지 않은 브라우저"로 막히면 로그인만 시스템 브라우저로 하는 방법을 검토 | 구글은 임베디드 브라우저 로그인을 막는 경우가 있다. D1에서 확인 |
| D3 | **D1의 사이트 20곳을 다시 재기** — D1과 같은 방법(사이트마다 새 공간·새 위젯, 15초 뒤 읽음) | 13번의 끝난 기준이 전후 기록이다. B3까지 끝내고 한 번에 잰다. B2 확인 때 본 것은 위젯 하나를 옮겨가며 본 것이라 D1과 방법이 다르다 |

**하지 않을 것** — 자동화 탐지를 속이는 스크립트 주입(stealth 플러그인류). 사이트가 바뀔 때마다 깨지고, 들키면 더 강하게 막힌다.

---

## 17. 로그인 정리 — 끝 (2026-09-18)

**17-1~17-3은 끝났다 (2026-09-17, 확인용 앱에서 봄).** 새 공간은 Cloud 단색·밝은 UI로 열린다(`newSpace`). 로그인 목록 이름은 "Sites with saved data"다. 구글 차단 화면(`/sorry/`)을 받으면 1초 뒤 원래 주소를 한 번만 다시 연다(`BrowserWidget`의 `blockRetried`) — 확인 때 이 IP가 실제로 막혀 있어서, 다시 열린 뒤 또 막혔고 거기서 멈췄다.

**17-4는 끝났다 (2026-09-18).** 로그인은 공간이 아니라 위젯이 고른다. 화면에 쓰는 말은 **sign-in**, 실체는 쿠키 저장소 하나다. 기본 이름은 **Main**이다.

- **고르기**: 브라우저 위젯 주소줄의 사람 버튼, 또는 위젯 우클릭([SignInPicker.tsx](../src/widgets/SignInPicker.tsx)의 `SignInMenu`가 둘 다 쓴다). 카드로 닫힌 위젯은 주소줄이 없어서 우클릭이 유일한 길이다. 열린 페이지 안의 우클릭은 페이지 메뉴라 위젯 머리·테두리에서 눌러야 한다
- **관리는 한 곳**: 설정 → Sign-ins([SignInsPanel.tsx](../src/app/SignInsPanel.tsx)). 목록(이름·쓰는 위젯 수) → 한 개 상세(사이트별 Sign out, ⋯ 메뉴의 이름 바꾸기·전체 로그아웃·삭제). 만들기는 목록과 고르기 메뉴 둘 다에 있다
- **쓰는 위젯 0개**면 목록에 "safe to delete"로 표시한다. 자동으로 안 지운다 — 쿠키가 남아 있으면 로그인이 살아 있는 것이다
- **삭제**하면 쿠키를 지우고 그 위젯들은 Main으로 돌아간다(경고 문구에 위젯 수를 적는다). 위젯 문서는 안 고친다 — `partitionFor`가 없는 id를 Main으로 읽는다
- **표시**: 위젯 머리에 이름을 옅은 글씨로. Main은 안 붙는다
- **데이터**: 목록은 앱 단위([signInStore.ts](../src/stores/signInStore.ts)), 위젯은 `data.signIn`에 id. 이사(schemaVersion 16)는 따로 쓰던 공간마다 그 이름의 sign-in을 만들고 `persist:space-<id>`를 그대로 쓴다. 상세에 "공간에서 왔다"고 적는다(`isFromSpace`)
- **새 탭**은 원래 위젯의 sign-in을 따라간다. 팝업은 같은 세션이라 자동
- **백업에 쿠키는 없다.** 목록만 복원되고 로그인은 다시 해야 한다
- **이름 칸에 회색 상자를 쓰지 않는다** (2026-09-18 사용자). 이름은 그 자리에서 고친다 — 배경 없음, 고치는 동안만 밑줄([index.css](../src/index.css)의 `.name-input`). sign-in 이름·공간 이름·새 공간·"다른 공간으로 옮기기"가 이 방식이다. 주소창과 코드 칸만 상자로 남는다
- 우클릭 메뉴는 `createPortal`로 body에 그린다 — 캔버스가 transform이라 프레임 안에서는 `fixed`도 화면 기준이 아니다([WidgetFrame.tsx](../src/canvas/WidgetFrame.tsx) 주석)
- 확인(실제 프로필 복사본): 공간 7개 이사 · 쿠키 유지 · 새 sign-in에서 로그아웃 상태로 다시 뜸 · 새 탭 상속 · 카드 우클릭으로 바꾸기 · 패널 목록/상세/⋯ 메뉴. 확인 뒤 복사본은 지웠다

**왜 바꿨나 (사용자 지적, 2026-09-17)** — 공간 스위치는 껐다 켜면 로그아웃처럼 보였고(저장소가 바뀐 것이다), 한 화면에 두 계정을 띄울 수 없었다.

**미확인:** 유튜브가 로그아웃된 원인. 후보는 ① 스위치를 꺼서 공용 저장소로 바뀜 ② 오늘 UA 변경으로 구글이 세션을 끊음.

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
- **B2 뒤 실사용** — 구글 로그인 팝업이 끝까지 가는지, 유튜브·스포티파이 DRM 재생, 새 위젯의 첫 페이지. check 프로필에서 사이트 로드는 봤지만 로그인과 재생은 안 봤다
- **UA 수정 후 Google 검색** — "비정상적인 트래픽"·reCAPTCHA가 실제로 줄어드는지는 며칠 써봐야 안다. 구글 차단 페이지가 계속 뜨던 건 저장된 주소 탓이라 고쳤다(2026-09-13, `addressToSave`). 다른 사이트에서 인증이 또 뜨면 Electron 버전부터 본다 — 2026-09-18에 Electron 44.4.2(크롬 152)로 올렸다
- **사이트 권한 묻기 창** ([main.ts](../electron/main.ts) `setPermissionRequestHandler`) — Meet에서 카메라를 켜면 Allow/Block 창이 뜨는지, Block 후 다시 안 묻는지. 답은 `permissions.json`에 저장해 앱을 다시 켜도 안 묻는다(2026-09-15) — 재시작 후에도 그런지, Block을 풀 방법이 파일 삭제뿐인 게 괜찮은지. 구글 로그인 창이 요청하는 저장소 권한(`storage-access`)은 묻지 않고 허용하게 바꿨다(2026-09-14) — 사이트를 열 때마다 "wants to use its sign-in here" 창이 떴다

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
- **기능 목록 위젯** = `TOUR_LINES`. 줄은 `TodoItem.hint`로 식별한다([types.ts](../src/spaces/types.ts)의 `TourHint`) — 텍스트로 맞추면 사용자가 글을 고치는 순간 깨진다

---

## 규칙

- git 명령은 사용자가 직접 실행 (CLAUDE.md 워크플로우)
- dev 실행 시 `unset ELECTRON_RUN_AS_NODE` 필요(VSCode 확장 변수)
- **`npm install`은 Electron 바이너리를 안 받는다** (Electron 42부터). 첫 실행 때 받거나 `npx install-electron`
- **같은 프로필로는 앱이 하나만 뜬다.** 두 번째는 로그에 `already running … quitting`을 찍고 꺼지고, 첫 창이 앞으로 온다. 확인용 앱을 같이 띄우려면 `FOCUS_DESK_PROFILE`을 다르게 준다
- **main 프로세스 변경은 Electron 완전 재시작이 필요하다.** 렌더러 새로고침으로는 옛 핸들러가 계속 돈다
- **dev 중에 md 파일을 고치면 vite가 페이지를 새로 고친다** — 온보딩 진행 상태가 날아간다. 확인하는 동안은 문서를 안 고친다
- **다른 세션이 `dev:fresh`(test 프로필)를 쓰고 있을 수 있다.** 확인용은 따로 띄운다: `rm -rf "$HOME/Library/Application Support/focus-desk-check" && FOCUS_DESK_PROFILE=check FOCUS_DESK_DEBUG_PORT=9333 npx vite` → CDP로 누르고 찍는다
