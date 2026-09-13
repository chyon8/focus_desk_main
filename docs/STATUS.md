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
| 6 | **방 다섯 재구성 ← 다음** | 첫 화면 다섯 장이 앱에서 제일 좋은 다섯 장이어야 한다 |
| 7 | 온보딩 디자인 검토 | 출시 전 한 번. 방 재구성 뒤에 본다 |

**지금 온보딩 배경**: Rainy Attic · Snowfall · Swiss Editorial · Midnight Observatory · Meadow 순서.
Swiss Editorial 호버 중에는 원본 `#f7f7f5` 배경·검은 글자·IBM Plex Sans KR를 쓴다.

### 10-6. 방 다섯 재구성 — 정한 것 (2026-09-12)

**문제는 "그라데이션이라 심심하다"가 아니라 썸네일에 초점이 없는 것이다.** `quiet-snow`·`midnight-observatory`·`snow-lake-greenhouse-v2`는 눈밭·능선·흐린 호수뿐이라 300px로 줄이면 회색 사각형이 된다. `rainy-attic`은 창·램프·침대가 있어서 작아도 읽힌다.

**고르는 기준 셋**
1. 썸네일에 읽히는 대상이 있을 것 (창·램프·사람·건물)
2. 다섯 장의 계절·시간·안팎이 다 다를 것 — 골라야 할 이유가 생긴다
3. 가운데가 조용할 것 — 위젯이 그 위에 놓인다

**추천 다섯** (22장 다 보고 고름)

| | 파일 | 무엇이 다른가 |
|---|---|---|
| 1 | `rainy-attic` | 비 · 밤 · 실내. 지금도 제일 강하다 |
| 2 | `afternoon-records` | 오후 햇빛 · 실내. 유일한 따뜻한 낮 |
| 3 | `ghibli-night-tram` | 밤 · 이동 중. 제일 독특하다 |
| 4 | `summer-lake-landing` | 여름 · 야외 · 밝음. 유일한 바깥 낮 |
| 5 | `winter-lake-greenhouse` | 겨울 · 밤 · 야외. 유일한 겨울 |

- **온보딩에서 뺄 것**: `quiet-snow` · `midnight-observatory` · `snow-lake-greenhouse-v2`. 배경 목록에는 남긴다
- **대기 후보**: `rainy-laundrette`(독특함 최고) · `late-summer-aquarium` · `spring-kite-cove`
- **카페 후보 검토**: `assets/wallpapers/originals/morning-coast-cafe.png` — 배경 목록에 추가할지 결정
- **`sunset_landscape`는 혼자 플랫 벡터라 화풍이 안 맞는다.** 어디에 두든 튄다

### 10-6-1. 흰/검정 무지 카드를 섞는 안 — 다음 세션에 시안 두 개 (2026-09-12)

사진 다섯이면 "어느 그림이 예쁜가"를 고르게 되고, 무지가 섞이면 "어떤 성격의 공간인가"를 고르게 된다. 질문이 더 좋아진다. **단 조건이 둘이다.**

- **무지 카드를 진짜로 디자인해야 한다.** 지금 Swiss Editorial이 빈 사각형으로 보이는 건 그라데이션이라서가 아니라 아무것도 안 그려져 있어서다. 사진 옆에 빈 면을 같은 크기로 놓으면 "아직 안 만든 칸"으로 읽힌다. 격자 선·큰 타이포·색 블록이 실제로 카드 안에 들어가야 스타일로 읽힌다
- ⚠️ **흰 방은 위젯이 안 보인다.** 앱 위젯이 반투명 흰 글래스라 흰 바탕에서 사라진다. 지금은 Swiss Editorial 호버 중에만 검은 글자로 뒤집는데, **흰 방을 정식으로 넣으려면 그 방에 들어간 뒤에도 위젯이 계속 뒤집혀 있어야 한다.** 그게 없으면 고르는 순간 못 쓰는 방이 된다. 이게 이 안의 진짜 비용이다
- **순서는 사진 먼저.** 흰 → 검정 → 사진이 아니라 사진 → 사진 → 무지 → 사진 → 무지. 첫 칸이 흰 면이면 앱이 밋밋해 보인다

**만들 시안 두 개** — 둘 다 온보딩 화면 통째로(제목·카드 격자·다음 버튼) 그린다. 카드만 놓으면 판단이 안 된다.
- **섞기**: 사진 3(`rainy-attic`·`afternoon-records`·`summer-lake-landing`) + Swiss 화이트 1 + Swiss 다크 1
- **사진만**: 위 추천 다섯

### 10-7. 온보딩 디자인 검토 — 평가는 이 다섯으로만

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
- **격자(Pattern)는 단색 위에만** (2026-09-12, [SceneLayer.tsx](../src/themes/SceneLayer.tsx)). 아래로 흐려지지 않고 화면 전체에 고르게 깐다. **기본은 모든 테마에서 끔**(2026-09-13) — 배경이 카메라를 안 따라가서 위치 기준이 못 된다
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
- **온보딩 화면의 색은 토큰을 안 쓴다.** 사진 위에 얹히는 화면이라 `glass-panel`·`chrome-button-on`이 너무 옅게 나온다 — 흰색 알파를 직접 쓴다
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
