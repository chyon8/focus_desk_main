# 앱 디자인 리뉴얼 — 여기부터 읽는다

앱 디자인 검토 → **디자인 리뉴얼(앱 코드 수정)** → 스크린샷 → 랜딩. 출시 순서(docs/STATUS.md)와 따로 도는 작업이다.
브랜치 `design-review`, 고정 시점 태그 `freeze-2026-09-14`(리뉴얼 전 상태).

## "디자인 리뉴얼 착수"라고 하면

> **리뉴얼은 2026-09-15에 끝났다.** 아래 절차는 기록으로 남긴다. 다음 일은 바로 아래 "다음 세션은 여기부터".

1. 아래 **리뉴얼 단계** 표에서 ✅ 없는 첫 단계를 시작한다. 순서를 바꾸거나 건너뛰지 않는다
2. 시작 전에 사용자에게 `design-review` 브랜치인지 확인받는다(AI는 git 명령을 안 쓴다)
3. **첫 단계를 시작할 때 한 줄로 다시 알린다**: "공간 색이 사이드바·위젯에 묻어나는 것, 늘 보이던 캡션 입력칸, 사진 배경의 자동 밝기 판정이 없어진다." 사용자는 추천 전체에 "다 동의"로 답했지만, 이 셋에 대해 따로 답하지는 않았다
4. 단계마다: 고친다 → `npx tsc --noEmit` · `npm test` → 앱을 띄워 그 단계의 "확인" 화면을 본다 → 변경 리포트 · 체크리스트 → 사용자 컨펌 → git 명령 제공(CLAUDE.md 5장)
5. 끝난 단계는 표에 ✅와 날짜를 적는다. 도중에 정한 것은 "결정" 표에 추가한다

## 다음 세션은 여기부터 (2026-09-15 마지막 기록)

**지금 상태**
- **디자인 리뉴얼 끝.** 단계 1~9 반영·커밋. 사용자가 "디자인은 적용해도 된다"고 했고 `design-review`를 `main`에 합치기로 했다(명령은 사용자가 실행) — 새 세션에서 `git log main --oneline -15`에 리뉴얼 커밋이 있는지, `git status`에 안 올라간 것이 있는지 먼저 본다
- 강조색은 잉크에서 옛 앰버로 되돌렸다(결정 4·15)
- 컬럼 드래그 버그 여섯 개를 고쳤다 — 드롭 표시 색, 드롭 칸 계산 둘, 꺼낸 크기, 페이지(webview) 위에서 놓으면 드롭이 안 되던 것(끄는 동안 webview 포인터를 끈다, Canvas.tsx `.widget-dragging`). 이유는 각 코드 주석에 있다
- 단계와 따로 2026-09-15에 한 것:
  - 웹페이지 권한 창 답을 `userData/permissions.json`에 저장한다([electron/main.ts](../electron/main.ts) `rememberPermission`). `npm run dev`마다 google.com 위치 권한 창이 뜨던 것. Block도 계속 기억하고, 되돌리는 화면은 없다(파일을 지워야 한다)
  - 사진 위젯에 파일을 떨어뜨리면 캔버스에도 사진 위젯이 하나 더 생기던 것을 고쳤다(PhotoWidget `onDrop`의 `stopPropagation`)
  - 테마 썸네일 글자 "Aa 가" → "Aa"
  - `@fontsource-variable/instrument-sans` 의존성 삭제
  - 새로 넣은 사진 위젯 크기: 넓이 280 고정 + 높이만 맞춤이라 가로 사진이 280×158로 작았다 → 긴 변을 420에 맞춘다(PhotoWidget `FIT_LONG_SIDE`). 1280×720 → 420×236, 960×1440 → 280×420 확인

**2026-09-15 촬영 1차 끝 — 사용자 선택 대기.** 컷 13장을 캔버스로 보여줬다. 고른 번호를 받으면 작업 순서 7번(다듬기)부터. 결과·찾은 것은 맨 아래 "스크린샷 계획"의 "기록".

**그다음(끝남)** 전체 순서 3번 **스크린샷 촬영.** 기획은 2026-09-15에 사용자와 정했다 — 이 문서 맨 아래 **"스크린샷 계획 (Cloud 고정)"** 이 전부다. 사용자가 **"스크린샷 착수"**라고 하면 그 섹션의 "작업 순서" 1번부터 한다. 지난 피드백은 [landing-canvas/NOTES.md](landing-canvas/NOTES.md)의 "앱 스크린샷 시안". 앱 값은 [DESIGN.md](DESIGN.md)가 새 값으로 갱신돼 있다. 주의: 데모 공간 단색 스펙에 격자가 필요하면 `pattern: 'grid'`를 적는다(결정 20 — 기본이 꺼짐으로 바뀌었다).

**사용자가 확인한 것 / 안 한 것**: 전후 캡처 비교(단계 9)는 사용자가 건너뛰었다. 온보딩 화면은 테스트 창에 안 띄워서 눈으로 안 봤다 — 사용자가 "온보딩에서 색이 달라 보인다"고 했고, 원인 후보(온보딩 어두운 층 40%, 첫 안내의 45% 검정 층, Midnight Observatory에 걸린 따뜻한 golden-hour 층)만 말했다. 어느 화면인지 답을 아직 못 받았다.

**확인 스크립트를 쓸 때 주의 (2026-09-15에 틀린 것)**
- `evaluate`는 "Promise was collected"면 같은 식을 다시 보낸다. 위젯을 넣는 비동기 호출(`addDroppedFiles` 등)을 넣으면 두 번 들어간다. 위젯은 동기 `addWidget`으로 넣는다
- 크기 조절 손잡이·컬럼 카드 손잡이는 포인터 캡처로 따라간다. 끄는 동안 `mouseMoved`에 `button: 'left', buttons: 1`을 같이 보내야 움직인다(`button: 'none'`이면 안 움직인다)
- 사진 주소는 `focusdesk-image://local/…`다
- check 프로필 공간은 browser 위젯 하나(`b479f1ed…`), 카메라 0,0,1. 끝나면 이 상태로 되돌린다

**단계마다 추가로 할 것** — 스크린샷만 보고 끝내지 않는다. 그 단계가 건드린 CSS를 쓰는 **동작**을 실제 마우스로 해 본다: 위젯 선택, 컬럼에 넣기·빼기·순서 바꾸기, 꺼낸 크기, 크기 조절. 확인 스크립트는 세션 scratchpad에 있었고 저장소에는 없다 — `design-ref/landing-shots/tools/lib.mjs`의 `connect`로 `Input.dispatchMouseEvent`(움직일 때 `buttons: 1`)를 보내면 된다. 공간을 바꾸면 끝나고 원래대로 되돌린다(공간이 다 읽힌 뒤에 덮어쓸 것 — 덜 읽힌 채로 덮어쓰면 메모리에 공간 하나만 남는다).

## 전체 순서

| # | 할 일 | 상태 |
|---|---|---|
| 0 | 지금 상태 고정 (커밋 · 태그 · 브랜치) | ✅ 2026-09-14 |
| 1 | 앱 디자인 검토 → 캔버스 보고 | ✅ 2026-09-14 |
| 2 | **디자인 리뉴얼** — 아래 단계 1~9 | ✅ 2026-09-15 |
| 3 | 스크린샷 기획 → 컨펌 → 촬영 | 1차 촬영 끝 (2026-09-15) · 사용자 선택 대기 |
| 4 | 랜딩에 적용 — [landing-canvas/NOTES.md](landing-canvas/NOTES.md) | |

## 규칙

- 사용자가 착수라고 하기 전에는 저장소 파일을 바꾸지 않는다
- 없애는 기능은 아래 "결정"에 적힌 것만. 그 밖에 기능이 빠지거나 숨겨지면 먼저 묻는다(겉모양은 바꿔도 된다)
- 기준은 비주얼이다. 처음 보고 바로 예쁘다고 느껴야 한다
- 이유는 코드 옆 주석에 쓴다. 옛 이유가 적힌 주석은 새 이유로 고친다(DESIGN.md 참조 주석 포함)

---

## 결정 (2026-09-14, 사용자 확정)

검토 캔버스: https://claude.ai/code/artifact/4487c670-0be4-4023-ba89-1e31adc0f314 — 각 안의 모양은 캔버스 화면에 있다.

| # | 항목 | 결정 | 캔버스 |
|---|---|---|---|
| 1 | 카드 모양 | **흰 카드, 모서리 14px, 테두리 없음, 그림자 한 벌** (D안) | 카드 모양 · D |
| 2 | 카드 면 색 | **무채색 두 값. 밝음 `#ffffff` / 어두움 `#1f1f21`.** 사진 평균 색조를 안 넣는다. 사진 색은 그림자 색조에만 남긴다 | 배경색 · 제안 1·2 |
| 3 | 사진 배경 위 카드 밝기 | **밝은 카드가 기본.** 어두운 카드는 Atmosphere에서 고른다 | 배경색 · 제안 3 |
| 4 | 강조색 | **옛 번트 앰버로 되돌림 (2026-09-14 재결정).** 밝음 `#a9581b` / 어두움 `#e9a75f`. 단계 3의 잉크(`#141414`/`#f4f4f5`)는 본문·테두리와 섞여 선택·드래그 상태가 약했다 | 강조색 · B → 취소 |
| 5 | 색 마크 | **카드 전체를 옅게 칠한다.** 왼쪽 막대 없앰. 8색 값은 그대로 | 색 마크 · C |
| 6 | 사진 위젯 | **윗단·캡션 줄을 빼고 사진이 카드를 꽉 채운다. 캡션은 가리키면 보인다.** 사진을 넣을 때 위젯 비율을 사진 비율에 맞춘다 | 사진 위젯 |
| 7 | 폰트 | **IBM Plex Sans KR** (숫자는 JetBrains Mono 그대로) | 폰트 |
| 8 | 단색 팔레트 | **제안 8색으로 바꾸고 Tomato · Cobalt · Saffron · Violet을 추가** (Saffron·Violet은 2026-09-15 추가 — 둘만 두면 셋째 줄이 반만 찼다) | 단색 · 제안 |
| 9 | 그 밖 | 크기 조절 표시는 가리켰을 때만 · 메모 윗부분 색 번짐 제거 · 타이머 재생 버튼 평면 · 레일이 화면 높이를 다 차지하지 않게 · 웹앱 타일 윗줄 옅게 · 선택 표시 가볍게 | 그 밖 |

| 10 | 비네트 밝기 (단계 1에서 정함) | 사진이면 카드는 밝음이 기본이지만, 비네트는 사진 평균 휘도를 따른다. `useGround`가 `autoLight`(카드 기본)와 `backdropLight`(그림 밝기)를 따로 낸다 | — |
| 11 | `#1f1f21` 색폭 (단계 1에서 정함) | 파랑 채널이 2 높다. 값은 그대로 두고, 테스트의 "무채색 바탕 위 면 색폭" 기준을 0이 아니라 2 이하로 둔다 | — |
| 12 | 어두운 카드 가장자리 (단계 2에서 정함) | 어두운 방 사진·어두운 단색에서 묻혀서 안쪽 1px `rgba(255,255,255,0.07)` 선을 둔다. 메모처럼 면을 다 칠하는 내용에 가리지 않게 `outline`(offset -1px)으로, 선택 표시가 이기게 `:where`로. Editorial 제외 | — |
| 13 | 미리보기(peek) 그림자 (단계 2에서 정함) | 캔버스 위에 한 단 더 뜨는 위젯 미리보기는 `--shadow-float`(세 겹)를 그대로 쓴다. 카드·레일·독·패널만 `--shadow-card` 한 벌 | — |
| 14 | 선택 표시 (단계 3에서 정함) | 강조색 2px `outline`(offset 1px) + 4px로 퍼진 `--accent-ink` box-shadow. 링 안팎에 반대색 1px 선이 남는다. 위젯이 overflow: hidden이라 ::after는 안 쓴다 | — |
| 15 | 타이머 휴식 모드 숫자 색 | 강조색이 앰버로 돌아가서 따로 안 정한다. 휴식(BREAK) 숫자 `--accent`가 다시 본문 잉크와 갈리고, 온보딩 FirstSteps 색종이도 색이 돌아온다 | — |
| 16 | 색 마크 위 글자 (단계 4에서 정함) | 채움 밝음 16% / 어두움 22%에서 최하위 글자가 AA 아래(어두움 3.36, 밝음 4.09)로 떨어진다. 마크 위젯 안에서 보조·최하위를 본문 쪽으로 당긴다 — 밝음 15% / 어두움 30% (index.css `--mark-fill`·`--mark-ink-pull`). 배경 24개 × 8색에서 최하위 어두움 4.82 / 밝음 4.94 이상 | — |
| 17 | 브라우저·사진의 색 마크 (단계 4에서 정함, 사용자 결정) | 브라우저는 그대로 — 제목줄·주소줄만 칠해지고 페이지는 안 건드린다. 사진은 단계 5에서 색 마크가 있을 때만 6px 안쪽 여백을 두고 그 여백이 옅은 색으로 보이게 한다 | — |
| 18 | 레일 높이 (단계 8, 사용자 결정) | **그대로 화면 높이를 다 차지한다.** 내용 높이 판 하나 / 위아래 두 조각 두 안을 찍어 보였고 사용자가 둘 다 안 골랐다. 결정 9의 "레일이 화면 높이를 다 차지하지 않게"는 취소 | — |
| 19 | 온보딩 색 (단계 8, 사용자 결정 "개선할 게 있으면 개선") | 온보딩이 직접 적은 면 두 값을 카드와 같은 `#ffffff` / `#1f1f21`로(옛 `#f7f6f3` / `#201e1b`). 방 썸네일 모서리 12px → `rounded-surface`(14px). 사용자가 테스트 창에 온보딩 띄우는 걸 원치 않아 화면으로는 안 봤다 | — |
| 20 | 단색 격자 기본 (2026-09-15, 사용자 결정) | **기본은 무늬 없음.** 격자가 깔린 게 덜 예뻐 보였다. 켜는 건 Atmosphere의 Grid. 온보딩 Paper 방 미리보기도 격자를 뺐다(앱 바탕과 같게). 데모 공간 스펙에 `pattern`이 없으면 단색 공간 캡처에서 격자가 사라진다 — 스크린샷 때 필요하면 스펙에 `grid`를 적는다 | — |

사진 대표색을 강조색으로 쓰는 안은 **안 한다**(방마다 불안정, Snowy Railway는 뚜렷한 색이 없음).
캔버스 "배경색" 화면 글에는 어두운 카드가 `#1c1c1e`로 적혀 있다. **`#1f1f21`로 통일한다**(단색·강조색 화면이 쓴 값).

### 없어지는 것 (동의받음)

1. 공간 색이 사이드바·위젯·패널 면에 묻어나는 것 — DESIGN.md 2장 "면은 그 공간의 색을 띤다"를 뒤집는다. 공간을 바꿨다는 신호는 배경 사진과 레일 썸네일이 준다
2. 사진 위젯의 늘 보이는 캡션 입력칸 — 캡션 값(`data.caption`)은 남기고 가리키면 보이는 줄에서 입력한다
3. 사진 배경의 자동 밝기 판정(평균 색 휘도) — 사진이면 밝음이 기본. 수동 선택(Atmosphere의 Light/Dark)은 그대로
4. 색 마크 왼쪽 막대, 테두리 두 겹(안쪽 선 + 바깥 헤일로), 윗변 빛(`--lip`)

### 유지

방 사진 배경 · 글자를 이는 면은 불투명 · 글자 대비 계산(`inkStep`) · 단색 위 격자와 Paper 격자 · 그림자에 배경 색조 · 무드보드 모양(사진 꽉 채운 카드 모음) · 숫자 JetBrains Mono · Editorial 테마 자체(각진 모양·선·그림자 없음) · 색 마크 기능과 8색 · 레일 활성 공간 표시 **모양**(색만 강조색을 따른다. 모양을 바꾸려면 묻는다)

---

## 리뉴얼 단계

| 단계 | 내용 | 상태 |
|---|---|---|
| 1 | 색 계산 — 카드 면 무채색, 사진 배경 밝음 기본 | ✅ 2026-09-14 |
| 2 | 카드 틀 — 14px, 그림자 한 벌, 메모 번짐, 크기 조절 표시 | ✅ 2026-09-14 |
| 3 | 강조색 잉크, 선택 표시 | ✅ 2026-09-14 |
| 4 | 색 마크 옅은 채움 | ✅ 2026-09-14 (결정 16·17) |
| 5 | 사진 위젯 | ✅ 2026-09-15 |
| 6 | 폰트 IBM Plex Sans KR | ✅ 2026-09-15 (본문 14px 유지, Plex 300 import 유지, 폰트 번들 8.7→10.8MB) |
| 7 | 단색 팔레트 | ✅ 2026-09-15 (카드 밝기는 `cardsLightOn`, 12색 × 격자 확인) |
| 8 | 그 밖 — 타이머 버튼, 레일, 웹앱 타일, 온보딩 점검 | ✅ 2026-09-15 (결정 18·19) |
| 9 | 마무리 — 문서 값 갱신, 전체 캡처 | ✅ 2026-09-15 (DESIGN.md · NOTES.md 값 갱신, 빌드. 전후 캡처 비교는 사용자가 생략) |

### 단계 1. 색 계산

- [src/spaces/backgrounds.ts](../src/spaces/backgrounds.ts) `backgroundTokens`: `surface`를 `light ? '#ffffff' : '#1f1f21'`로. `inkSoft`·`inkFaint`는 `inkStep` 그대로 면 위에서 계산
  - `tintedSurface`, `GROUND_SHARE`, `LIGHT_GROUND_SHARE`, `SATURATION_FLOOR`, `SATURATION_CAP`, `BRIGHT_SURFACE_CHROMA`, `LIGHT_SURFACE`/`DARK_SURFACE`: 쓰는 곳이 없어지면 지운다. 테스트가 `tintedSurface`를 import하므로 테스트도 같이 고친다
  - 회색·흰색 바탕에서 분홍 카드, Editorial 색에서 노란 카드가 나오던 오류는 이걸로 없어진다(색상각 0 = 빨강 + 최소 색폭 0.05 때문이었다)
- [src/themes/referenceThemes.ts](../src/themes/referenceThemes.ts) Paper: `tokens.surface` `#f7f6f3` → `#ffffff`, `flat.darkTokens.surface` `#201e1b` → `#1f1f21`. Editorial은 그대로
- [src/themes/useTheme.ts](../src/themes/useTheme.ts) `useGround`의 `autoLight`: 사진이면 `true`. 단색이면 `SOLID_COLORS`의 `cards` 값(단계 7에서 추가), 목록에 없는 색(사용자 지정)은 `isLightBackground`. 그라데이션 테마는 `theme.mood` 그대로
  - `shadowTint(ground)`는 유지. `ground`는 계속 사진 평균 색이다(그림자 색조용)
  - [src/app/ThemePicker.tsx](../src/app/ThemePicker.tsx):372가 `({autoLight ? 'light' : 'dark'})`로 자동 값을 보여준다 — 새 규칙대로 나오는지 확인
- [src/themes/SceneLayer.tsx](../src/themes/SceneLayer.tsx):85 격자 선 색이 `autoLight`를 쓴다. **격자 선은 배경 휘도로 따로 판정**하게 한다(Tomato·Cobalt에 흰 카드를 걸어도 선은 바탕 밝기를 따라야 한다)
- [src/themes/themes.ts](../src/themes/themes.ts) 그라데이션 테마 3개의 `tokens.surface`는 사진을 못 읽었을 때의 `ground` 대용이다. 면 색으로는 안 쓰인다 — 확인만
- 테스트 [backgroundTokens.test.ts](../src/spaces/backgroundTokens.test.ts): 파일 머리 주석("면 색은 그 공간의 색을 띠어야")과 `면 색` describe(106 · 112 · 119줄)를 새 계약으로. 모든 `GROUNDS`·`NEAR_GREY`에서 면이 두 값 중 하나, 본문·보조·최하위 대비는 기존 기준(DESIGN.md 2장 표) 유지, `#e9e9e9`·`#ffffff`·`#f7f7f5`에서 면의 색폭(spread) 0
- 확인(앱): 방 4개 · Paper · Editorial · 단색 몇 개에서 위젯·레일·독·패널 면이 흰색/`#1f1f21`인지. Atmosphere에서 Light/Dark 수동 전환이 되는지

### 단계 2. 카드 틀

- [src/index.css](../src/index.css) `--radius-surface` 16px → **14px**. `rounded-surface`/`var(--radius-surface)` 35곳(위젯·패널·독·레일·타이머 버튼)이 같이 바뀐다. Editorial의 0px 덮어쓰기는 그대로
- `.widget-glass`(index.css 409줄 근처): `border` · 헤일로(`0 0 0 1px var(--halo)`) · `--lip`를 빼고 그림자 한 벌만. 값은 캔버스 D안:
  - 사진 배경: `0 2px 4px rgba(0,0,0,0.14), 0 22px 48px -16px rgba(0,0,0,0.55)`
  - 단색·Paper: `0 1px 2px rgba(var(--shadow-tint),0.06), 0 16px 38px -14px rgba(var(--shadow-tint),0.26)`
  - 두 값을 가르려면 루트에 배경 종류 속성이 필요하다 — `useThemeVariables`가 `data-polarity`를 다는 곳에 `data-ground="photo|color"`를 같이 단다
  - 어두운 카드(`#1f1f21`)가 어두운 사진에 묻히면 안쪽 1px `rgba(255,255,255,0.07)` 선만 둔다 — 띄워서 보고 정한다
- `--halo`·`--lip`·`--shadow-float`를 쓰는 다른 곳(index.css의 `.glass-panel`·`.clock-face` 등, referenceThemes.css)을 찾아 같은 규칙으로 맞춘다. 레일·독·패널도 흰 면 + 그림자 한 벌
- `.memo-paper`(index.css 728줄 근처): 윗부분 `color-mix(var(--accent) 7%)` 그라데이션과 안쪽 그림자 두 줄을 빼고 `background: var(--paper)`. `--paper-edge`가 안 쓰이면 지운다
- 크기 조절 표시: [WidgetFrame.tsx](../src/canvas/WidgetFrame.tsx) 519~522줄 안쪽 `div`(`border-r-2 border-b-2`)를 위젯을 가리키거나 포커스가 있을 때만 보이게. 잡는 영역(513줄, 16px)은 그대로
- 확인(앱): 방 4개 + Paper + 단색(밝음·어두움)에서 메모·투두·사진·타이머·브라우저·웹앱 타일·컬럼. 레일·독·Atmosphere 패널

### 단계 3. 강조색 · 선택 표시

- [src/index.css](../src/index.css) `:root`(어두운 극성): `--accent` `#e9a75f` → `#f4f4f5`, `--accent-hover` → `#ffffff`, `--accent-ink` `#231f1a` → `#0b0b0b`, `--accent-soft` → `rgba(244,244,245,0.12)`
- `[data-polarity='light']`: `--accent` `#a9581b` → `#141414`, `--accent-hover` → `#2c2c2e`, `--accent-ink` `#fff7ef` → `#ffffff`, `--accent-soft` → `rgba(20,20,20,0.08)`
- 강조색 주석("번트 앰버 하나")을 고친다. `--danger` 값은 그대로 두고 "앰버와 같은 계열" 주석만 고친다
- 강조색을 쓰는 파일 14개 — 전부 눈으로 본다: index.css · Rail.tsx · ThemePicker.tsx · FocusInsights.tsx · Canvas.tsx · WidgetFrame.tsx · CalendarWidget · TimerWidget · TodoWidget(48줄 점) · ClockWidget · KanbanWidget · PhotoWidget(드롭 표시) · CanvasWidget · onboarding/FirstSteps.tsx(217 · 230줄 테두리, 254줄은 `--accent`·`--accent-hover`·`--ink`·`--ink-soft` 네 색 순환이라 검정 계열이 겹친다 — 보고 정한다)
- 선택 표시 `.widget-selected`(index.css 446줄 근처): 강조색 3px 링 + 흰 2px + 검정 8px 번짐 → **강조색 2px 링 + 반대색 1px 두 겹**으로. 밝은 카드가 어두운 사진 위에 있을 때 검정 링이 보이는지 반드시 본다. `.alt-pick`·`.widget-drop-target`·`.drop-spot`·`.drop-line`도 확인
- 레일 활성 공간 표시 `.rail-space-on::before`: 모양 유지, 색만 따라감
- 확인(앱): 체크 · 타이머 진행 막대 · 기본 버튼 · 브라우저 로딩 막대 · 볼륨 캡 · 포커스 링 · 선택 · 드롭 표시 · 달력 오늘 · 온보딩 첫 단계

### 단계 4. 색 마크 옅은 채움

- [src/index.css](../src/index.css) `.widget-marked::before`(424줄 근처) 삭제. 대신 `.widget-marked`에서 **`--surface`와 `--paper`를 다시 정의**한다: 밝음 `color-mix(in srgb, var(--mark) 16%, #ffffff)`, 어두움 `color-mix(in srgb, var(--mark) 22%, #1f1f21)`
  - 변수로 해야 하는 이유: 메모(`.memo-paper`)·사진(`.photo-paper`)은 제 배경을 칠해서 프레임 배경만 바꾸면 안 보인다. `--paper: var(--surface)`는 `:root`에서 이미 풀린 값이 상속되므로 `--paper`도 같이 적어야 한다
  - 옅게 칠한 면 위 글자 대비(`inkSoft`·`inkFaint`)가 기준 아래로 내려가지 않는지 8색 × 두 극성으로 잰다
- 주석(WidgetFrame.tsx 255줄 "왼쪽 변 막대를 그리는", index.css 색 마크 주석)을 고친다
- **내용이 면을 다 덮는 위젯은 채움이 안 보인다 — 착수 때 먼저 띄워서 결정**
  - 사진(꽉 채움): AI 제안은 색 마크가 있을 때만 6px 안쪽 여백을 두고 그 여백이 옅은 색으로 보이게
  - 브라우저: 제목줄·주소줄 면이 칠해지는지 확인
  - 웹앱 타일: `--plate` 판이 덮는지 확인
- 독 색 고르기 스와치 `.mark-swatch`(index.css 549줄 근처, [Dock.tsx](../src/app/Dock.tsx) 157~163줄): 왼쪽 막대 그림 → 칠했을 때 나오는 옅은 면 그대로
- 컬럼 안 카드 `.card-tile-marked`(index.css 277 · 281줄), [ColumnWidget.tsx](../src/widgets/ColumnWidget.tsx) 193~221줄(헤더 `color-mix 55%`, 2px 막대): 같은 옅은 채움으로
- [widgetColors.ts](../src/widgets/widgetColors.ts) 8색 값 유지. 주석 중 "위젯은 사진이 비치는 유리"는 지금과 안 맞으면 고친다
- 확인(앱): 줌 100% · 줌아웃 25%에서 묶음이 보이는지, 선택 표시와 헷갈리지 않는지, 컬럼 안 카드

### 단계 5. 사진 위젯

[src/widgets/PhotoWidget.tsx](../src/widgets/PhotoWidget.tsx)
- 121줄 `px-3 pb-3 pt-10` 제거. 131~140줄 안쪽 판의 `rounded-mark`와 `ink 8%` 배경 제거
- 색 마크가 있을 때만 사진 둘레에 6px 여백을 두고 그 여백에 칠한 면(`--paper`)이 보이게 한다 (결정 17)
- 사진 맞춤: `object-contain` → `object-cover`. 줌·이동·더블클릭 초기화는 유지 — 22~24줄 `panLimits`가 contain 기준으로 계산하므로 cover 기준으로 고친다
- 비율: 사진을 새로 넣을 때(`store(file)` 성공 시, 드롭·파일 선택 둘 다) 위젯 크기를 사진 비율에 맞춘다(spaceStore의 `resizeWidget`). 긴 변을 420에 맞춘다(2026-09-15 변경, 처음엔 넓이 유지·높이만 맞춤이었다). 이미 넣어둔 사진 위젯은 크기를 안 바꾼다 — cover라 끝이 잘릴 수 있다고 리포트에 적는다
- 캡션(197~202줄 input): 사진 아래쪽에 가리키면 뜨는 줄(투명 → `rgba(0,0,0,0.55)` 그라데이션, 흰 글자, 캔버스 사진 위젯 화면 오른쪽 카드) 안의 input으로 옮긴다. 입력 가능. 비어 있으면 가리켰을 때 "Write a caption", 줌 중이면 지금처럼 "Double-click the photo to reset the zoom"
- 가리켰을 때 뜨는 헤더 `.widget-header-float`(index.css 524 · 533~536줄)는 `background: var(--surface)`라 사진 윗부분을 흰 띠로 덮는다 → 사진 위젯에서는 위쪽 어두운 그라데이션 + 흰 글자·아이콘. WidgetFrame에 위젯 종류 class가 필요하면 추가
- 그대로: 넣기 실패 안내 줄(175~192줄), 빈 상태 "Drop or choose a photo", `defs.ts`의 `createData`
- **범위 밖**: [CanvasWidget.tsx](../src/widgets/CanvasWidget.tsx) 83줄도 `photo-paper pt-10`을 쓰지만 스케치 위젯이라 안 건드린다
- 확인(앱): 드롭 · 파일 선택 · 비율 맞춤 · 줌 · 이동 · 더블클릭 초기화 · 캡션 입력·저장 · 실패 안내 · 무드보드처럼 여러 장 모았을 때

### 단계 6. 폰트 IBM Plex Sans KR

- [src/index.css](../src/index.css) 14~16줄 `--font-ui` → `'IBM Plex Sans KR', 'Noto Sans KR', system-ui, -apple-system, sans-serif`. 15줄 주석(한글이 Instrument Sans에 없다)을 고친다
- [src/main.tsx](../src/main.tsx): Plex KR은 지금 300 · 400 · 600만 import한다. 앱이 쓰는 400 · 500 · 600 · 700이 필요하므로 **500 · 700을 추가**. 300은 Editorial이 쓰는지 찾아보고 안 쓰면 둔다(지우지 않는다). Instrument Sans import(6줄)는 다른 곳에서 안 쓰게 되면 지우고, `package.json` 의존성 제거는 사용자에게 묻는다
- [src/app/ThemePicker.tsx](../src/app/ThemePicker.tsx) 182줄 미리보기 글꼴 문자열(`"Instrument Sans Variable"`)을 새 글꼴로
- [referenceThemes.css](../src/themes/referenceThemes.css) Editorial의 `--font-ui`는 같은 값이 되므로 그대로 둬도 된다. `--text-body: 15px`는 Editorial 전용 — 기본 14px은 띄워서 보고 정한다(Plex가 조금 넓다)
- 확인(앱): 한글·영어 섞인 메모, 10px 대문자 라벨, 레일 공간 이름(9자 넘으면 잘림), 타이머 숫자(모노 그대로). `npm run build` 뒤 번들 크기 변화를 리포트에 적는다

### 단계 7. 단색 팔레트

- [src/spaces/backgrounds.ts](../src/spaces/backgrounds.ts) `SOLID_COLORS`를 `{ value, name, cards: 'light' | 'dark' }`로. 순서(윗줄 어두움 → 아랫줄 밝음 → 셋째 줄 강한 색):

| 줄 | 이름 | 값 | 카드 | 비고 |
|---|---|---|---|---|
| 어두움 | Ink | `#151515` | dark | 갈색 기 없는 검정 |
| 어두움 | Graphite | `#2c2c2e` | dark | 랜딩 종이 위에서 가장 잘 떨어짐 |
| 어두움 | Midnight | `#111a2c` | dark | 유지 |
| 어두움 | Forest | `#0f2419` | dark | 유지 |
| 밝음 | Cloud | `#f4f5f7` | light | mymind 쪽 |
| 밝음 | Canvas | `#e6e6e3` | light | Milanote 쪽 |
| 밝음 | Mist | `#dce3ea` | light | 옛 Mist `#dde7f2`에서 채도 낮춤 |
| 밝음 | Sage | `#d9dfd5` | light | 옛 Sage `#d7e2d4`에서 채도 낮춤 |
| 강한 색 | Tomato | `#e8553a` | light | 휘도로는 어둡지만 흰 카드 |
| 강한 색 | Cobalt | `#3552c8` | light | 휘도로는 어둡지만 흰 카드 |
| 강한 색 | Saffron | `#f0b429` | light | 2026-09-15 추가 |
| 강한 색 | Violet | `#6e56cf` | light | 2026-09-15 추가, 휘도로는 어둡지만 흰 카드 |

- 빠지는 색: Black `#191715`, Plum `#2b1b30`, Rose `#f0d8d6`, Lilac `#e5ddee`, 옛 Mist·Sage. 이 색을 쓰던 공간은 계속 칠해진다(값이 문자열로 저장됨) — 기존 주석대로. 머리 주석(4열 2행, ΔE, Rose 이유)을 새 목록 기준으로 고친다
- [ThemePicker.tsx](../src/app/ThemePicker.tsx) 272~296줄 `grid-cols-4`: 12개라 4×3. 주석 "네 열 두 줄"을 고친다
- 테스트: `GROUNDS`가 `SOLID_COLORS`를 읽으므로 새 색이 자동으로 대비 검사에 들어간다
- 확인(앱): 12색 각각 공간에 걸고 카드·격자 선(단계 1의 휘도 판정)·레일. 강한 색 넷 위 흰 카드

### 단계 8. 그 밖

- 타이머 [TimerWidget.tsx](../src/widgets/TimerWidget.tsx) 88~110줄: 재생 버튼(64px, `rounded-surface`, 테두리, `--shadow-lift`) → **높이 44px 알약, 강조색 채움, 아이콘 + Start/Pause 글자**. 리셋은 44px 원형, `--surface-2` 면, 테두리 없음. 캔버스 "그 밖" 화면 왼쪽 아래 그림
- 레일 [Rail.tsx](../src/app/Rail.tsx) 293줄 판 하나 + 316줄 `flex-1` 빈칸 때문에 화면 높이를 다 차지한다. 두 안(**내용 높이만큼 판 하나** / **위 목록 · 아래 버튼 두 조각**)을 띄워 찍어서 사용자에게 고르게 한다 — 이것만 안 정했다
- 웹앱 타일 [WebAppWidget.tsx](../src/widgets/WebAppWidget.tsx) 137줄 `--plate` 윗줄: 흰 카드에 맞춰 옅게(`--surface-2` 쪽). 띄워서 확인
- 온보딩: [Onboarding.tsx](../src/onboarding/Onboarding.tsx) `--ob-*`(57~65줄, Paper·잉크 값)와 FirstSteps 강조색이 새 카드·강조색과 맞는지 **보기만** 하고 고칠 게 있으면 보고한다. STATUS 8번(온보딩 디자인 검토)과 겹친다 — 그때 이 결과를 기준으로 본다

### 단계 9. 마무리

- `npx tsc --noEmit` · `npm test` · `npm run build`
- 데모 프로필로 전체 캡처(방 4개 · Paper · Editorial · Canvas · Ink · Tomato, 격자 있음/없음, 밝음/어두움) → 검토 캔버스와 전후 비교 캔버스
- [DESIGN.md](DESIGN.md) 값 갱신: 1장(투명·색조 설명), 2장(표 `--surface`, 액센트 문단, "면은 그 공간의 색을 띤다" 문단, 색 마크 문단), 3장(글꼴), 4장(라디우스 표, "세 겹이 항상 같이 켜져 있다"). B-review.md는 그대로 둔다
- [landing-canvas/NOTES.md](landing-canvas/NOTES.md) "정해진 것"의 "유채색은 앰버 하나 · 16px 라디우스 · 이중 테두리" 줄과 "확정 기획"의 clay/denim 막대를 새 앱 값에 맞게 고친다(랜딩 위젯은 앱 CSS를 따른다)
- 이 문서: 단계 표 ✅, 전체 순서 3번(스크린샷)으로

---

## 앱 띄워서 확인하는 법

- 규칙: CLAUDE.md 0-1(main 프로세스가 바뀌면 Electron 완전 재시작, `unset ELECTRON_RUN_AS_NODE`), 메모리 `electron-cdp-verify`(내 PID만 끄기)
- 데모 프로필(공간·사진이 들어 있음, 영어): `unset ELECTRON_RUN_AS_NODE; FOCUS_DESK_PROFILE=demo FOCUS_DESK_DEBUG_PORT=9337 npx vite --config design-ref/landing-shots/tools/vite/vite.config.mjs` — 창이 뜬다고 먼저 말한다
- 찍기: `design-ref/landing-shots/tools`에서 `node shot.mjs <공간 id> out/x.png --rail id,id` (2배). 자세한 옵션은 NOTES.md "다시 찍는 법"
- 공간 JSON 넣기: `node push.mjs specs/<파일>.mjs`. 보드 공간(2·14·15)은 먼저 `python3 make_assets.py`

## 레퍼런스 (사용자가 준 캡처, 2026-09-14)

값은 캡처를 눈으로 본 근사값이다.

| 서비스 | 보이는 것 |
|---|---|
| Milanote (Project Ideas 보드) | 밝은 회색 바탕(약 `#e9e9e9`) · 흰 카드, 테두리 거의 없음, 옅은 그림자 · 사진이 곧 카드 · 굵은 검정 워드마크 · 강한 빨강 스와치 · 초록 손그림 화살표 · 표·파일 카드 |
| mymind (로그인 화면) | 차가운 오프화이트 바탕(약 `#f7f8fa`) · 큰 검정 세리프 제목 · 주황빨강 알약 버튼(약 `#ff5533`) · 흰 알약 버튼 + 넓고 옅은 그림자 · 회청색 보조 글자 |

이전 레퍼런스: mindweaver.space, techbukket.com(Editorial 테마 출처) — NOTES.md "정해진 것".

## 검토에서 찾은 것 (근거)

카드 색 값은 앱 코드(`backgroundTokens`)에 실제 방 사진의 16×16 평균 색을 넣어 계산했다.

| 방 | 사진 평균 | 지금 어두운 카드 | 지금 밝은 카드 | 자동 판정 |
|---|---|---|---|---|
| Summer Lake | `#548485` | `#234445` | `#d5e9e9` 민트 | 어두움 |
| Rainy Attic | `#433534` | `#352321` 적갈 | `#e6d9d8` 분홍 | 어두움 |
| Midnight Observatory | `#2a2042` | `#241c37` 보라 | `#dcd6ea` | 어두움 |
| Snowy Railway | `#313240` | `#232438` 남색 | `#d9dae8` | 어두움 |

- 무채색 바탕 오류: `#e9e9e9` → `#fcf2f2`(분홍), `#ffffff` → `#fef5f5`, `#f7f7f5` → `#f8f8e1`(노랑), `#f7f8fa` → `#f3f6fd`
- 단색 밝은 줄 4개가 모두 파스텔이고 카드도 파스텔이 됐다. 회색·오프화이트·중립 검정이 없었다
- 색 마크 막대는 둥근 카드 + 왼쪽 색 막대 모양이고, 줌아웃하면 1px이다
- 사진 위젯은 위 40px · 옆 12px 여백 + 회색 판 + 캡션 줄이라 사진이 작았다
- 그 밖: 크기 조절 표시가 늘 보임, 메모 윗부분 앰버 번짐, 타이머 입체 버튼, 레일이 화면 높이 전부, 웹앱 타일 회색 윗줄, 선택 표시 세 겹

캔버스를 고치려면 artifact를 읽어 다시 만든다(생성 스크립트는 그 세션의 scratchpad에만 있었다).

## 지금 값이 있는 곳 (리뉴얼 전)

| 무엇 | 파일 |
|---|---|
| 기본 토큰 (모서리·글자·그림자·액센트) | [src/index.css](../src/index.css) 1~120줄 |
| 위젯 틀 · 색 마크 · 선택 · 헤더 · 레일 CSS | [src/index.css](../src/index.css) 400~600줄 |
| 색 마크 8색 | [src/widgets/widgetColors.ts](../src/widgets/widgetColors.ts) |
| 사진 → 평균 색 | [src/spaces/photoTone.ts](../src/spaces/photoTone.ts) → [src/themes/useTheme.ts](../src/themes/useTheme.ts) |
| 면·글자 색 계산, 단색 팔레트 | [src/spaces/backgrounds.ts](../src/spaces/backgrounds.ts) |
| Paper · Editorial 테마 | [src/themes/referenceThemes.ts](../src/themes/referenceThemes.ts) · [referenceThemes.css](../src/themes/referenceThemes.css) |
| 폰트 번들 | [src/main.tsx](../src/main.tsx) |
| 디자인 시스템 옛 값·이유 | [DESIGN.md](DESIGN.md) (A2) · [B-review.md](B-review.md) |

## 스크린샷 계획 (Cloud 고정) — 2026-09-15 사용자와 정함

> "스크린샷 착수"라고 하면 아래 "작업 순서" 1번부터. 기획은 끝났으니 다시 묻지 않는다.
> **컷을 여러 개 만들어 캔버스로 나란히 보여주고, 사용자가 좋은 것을 고른다.** 랜딩에는 적용하지 않는다.

### 정한 것

| # | 항목 | 결정 | 이유 |
|---|---|---|---|
| S1 | 배경 | **모든 컨셉 컷을 Cloud `#f4f5f7` 하나로 고정. 격자 없음(`pattern` 안 적음), 밝은 카드** | 사진·웹 페이지가 화면의 색을 다 가져가게 바탕은 무채색으로 둔다(mymind·Cosmos·Are.na 방식). 흰 카드가 옅은 회색에 옅게 붙어 보이는 게 리뉴얼 카드 모양(결정 1)이 가장 잘 보이는 조건이다. 배경이 컷마다 바뀌면 보는 사람이 내용 대신 배경 차이를 본다 |
| S2 | 한 화면에 주제 하나 | 컨셉 컷은 **내용이 주제**라 방 사진 배경을 안 깐다 | 사진 위젯 여러 장 + 방 사진 배경이면 이미지가 두 겹이라 둘 다 안 보인다. 지난 무드보드 시안(Ondo·Birch·Nightbird)이 산만했던 이유 |
| S3 | 색 마크 | **디자인상 어울리면 몇몇 위젯에만 쓴다(한 컷에 1~2개).** 나머지는 흰 카드 | 2026-09-15 사용자가 금지를 풀었다. 금지했던 건 옛 왼쪽 막대 방식 때문이고, 리뉴얼에서 옅은 채움(단계 4)으로 바뀌었다. build.mjs가 `color`를 넘긴다 |
| S4 | 사진 | **컷마다 예쁜 사진 1~2장, 브레인스토밍 컷만 3~4장.** 무드보드처럼 한 곳에 붙여 모은다 | 사용자 요청(2026-09-15) |
| S5 | 범위 | **스크린샷을 찍어서 고르는 것까지만.** 랜딩에 어떻게 넣을지는 나중에 사용자가 한다. 랜딩 기획은 건드리지 않는다 | 사용자(2026-09-15) |
| S6 | 공간 유지 | **찍은 공간은 데모 프로필(`focus-desk-demo`)에 남긴다.** 사용자가 데모 앱을 열어 직접 고친다. 사용자가 고친 뒤 다시 찍을 때는 `push.mjs`로 덮어쓰지 않고 그 상태로 `shot.mjs`만 돌린다 | 사용자(2026-09-15). 평소 프로필에 붙이지 않는 이유: 실제 공간 목록에 데모 공간이 섞이고, 스크립트가 공간 파일을 덮어쓴다 |

**버린 판단 (되살리지 말 것):** 2026-09-15에 "카드가 바탕에서 얼마나 떨어지나" 대비 점수로 Snowy Railway 1위·Cloud 꼴찌를 냈다가 사용자가 "디자인 감각이 없다"고 했다. 배경 판단을 대비 수치로 하지 않는다.

### 구성 규칙 (사용자 첨부 화면에서 나온 문제 → 고치는 법)

2026-09-15 사용자가 올린 Cloud 테스트 화면(test2 공간)의 문제를 기준으로 삼는다.

| 문제 | 규칙 |
|---|---|
| 위젯이 전부 비슷한 크기로 화면 전체에 흩어져 초점이 없음 | **크기 위계:** 큰 것 1개(화면의 약 40%) · 중간 2~3개 · 작은 것 2~3개 |
| 간격이 제각각, 빈 곳이 여기저기 | **한 덩어리로 모으고 간격을 같게**(월드 기준 20~24px). 바깥은 넓게 비우거나, 한쪽을 화면 끝에서 잘리게 둔다 |
| 타이머 2개·시계·달력이 다 있어 대시보드처럼 보임 | 도구 위젯(타이머·시계·달력)은 **한 컷에 하나만** |
| 민트색 카드(색 마크)만 튐 | 흰 카드만 (S3) |
| ChatGPT 쿠키 창, Claude 로그인 창, Google 검색 결과 | **그 자체로 예쁜 페이지만:** 사진이 많은 페이지, 지도, 잘 만든 매거진·문서. 로그인·쿠키·봇 확인 창이 뜨는 곳 금지(NOTES "찾은 것"의 되는 사이트 목록 참고) |
| "kkk", 빈 메모, 공간 이름 test2 | 메모·할 일은 **진짜 영어 글 3~5줄**, 공간 이름은 실제 프로젝트 이름(레일에서 9자 이하) |
| 줌 71%라 글자가 안 읽힘 | **줌 90~100%.** 카드가 작으면 싸 보인다 |

사진 규칙:
- 한 컷 안에서 사진 톤을 맞춘다 — 같은 계절, 같은 빛. 따뜻한 빛·필름 톤, 사람 없는 사물·풍경. 채도 높은 네온·원색은 안 쓴다
- 1~2장이면 한 장은 크게(세로 4:5), 한 장은 작게 옆에 붙인다. 캡션은 비운다(가리킬 때만 보이는 모양이라 찍히지 않는다)
- 일반 스톡보다 컨셉에 맞는 소재(패키지·질감·스와치·워드마크)가 낫다(2026-09-14 찾은 것)
- 할 일은 월드 폭 320 안쪽, 컬럼에는 페이지 카드만(NOTES "찾은 것")

### 컷 목록 (1차)

번호는 1부터. 컨셉마다 구도 A·B를 찍고, 되는 컨셉은 C도 찍는다.
- **A 모음:** 위젯을 화면 가운데 한 덩어리로, 바깥 여백 넓게
- **B 잘림:** 덩어리를 한쪽으로 붙이고 반대쪽 끝에서 카드가 잘리게 — 공간이 화면보다 넓다는 느낌
- **C 큰 것 하나:** 큰 것 하나가 화면 절반, 나머지는 옆에 작게

| 번호 | 컨셉 | 공간 이름(예) | 큰 것 | 나머지 | 컷의 색 |
|---|---|---|---|---|---|
| 1 | 여행 계획 | Lisbon | 오후 햇빛 골목 사진(세로) | 바다 사진(작게) · 메모 Day 1 / Day 2 · 지도 페이지 · 할 일(예약할 것) | 테라코타 + 하늘색 |
| 2 | 디자인 브레인스토밍 | Ondo | 사진 3~4장을 붙여 모은 덩어리 | 스와치 2 · Are.na 페이지 · 결정 메모 · 타이머 | 크래프트 + 러스트 |
| 3 | 보고서 작성 | Q3 Report | 차트가 있는 자료 페이지 | 긴 메모(실제 문단) · 사진 1 · 할 일 | 올리브 + 회색 |
| 4 | 개발 문서·아이디어 | Northline | 컬럼(문서·GitHub 페이지 카드) | 아이디어 메모 · 사진 1 · 브라우저(문서 페이지) | 남색 + 흰색 |
| 5 | 브라우저 여러 개 | Studio | 서로 다른 사이트 3개를 계단식으로 크게 | 사진 1 · 할 일 | 페이지 색을 따름 |

레일에는 이 다섯 공간이 같이 보이게 한다(`--rail`).

### 작업 순서

1. **도구 점검** — [landing-shots/tools](landing-shots/tools)는 리뉴얼 전(2026-09-14)에 만들었다. `lib.mjs`의 `PROFILE`은 홈 기준이라 그대로 된다. 스펙 단색 배경은 `background: { type: 'COLOR', value: '#f4f5f7' }`, `polarity`는 비워 둔다(Cloud는 `cards: 'light'`). 기존 `specs/_desk.mjs`의 슬롯·`DESK_ZOOM 0.72`는 옛 배치라 새 스펙은 따로 쓴다. 데모 앱을 띄워(창이 뜬다고 먼저 말한다) 빈 Cloud 공간 하나를 넣고 찍어서 카드·레일이 리뉴얼 모양으로 나오는지 먼저 본다
2. **사진 모으기** — `node unsplash.mjs <폴더> "<검색어>"`(무료 라이선스만)로 컷마다 후보를 받고, 톤이 맞는 1~2장(브레인스토밍 3~4장)을 고른다. 스와치·워드마크는 `make_assets.py` 방식으로 만든다
3. **스펙 쓰기** — 컷마다 `specs/`에 새 파일. 위 구성 규칙표를 하나씩 대조
4. **찍기** — `node push.mjs`, `node shot.mjs <공간 id> out/<번호><구도>.png --rail …`(2배, 2880×1800). 페이지가 다 뜬 뒤 찍는다. 쿠키·안내 창이 보이면 그 컷은 다시
5. **스스로 거르기** — 사용자에게 보이기 전에 구성 규칙표로 한 장씩 본다. 걸리는 컷은 고쳐서 다시 찍는다
6. **캔버스로 보고** — 컨셉별로 A·B·C를 나란히(`make_canvas.py` → /design 스킬). 사용자가 고른다
7. **다듬기** — 고른 컷만 사진·글·위치를 다듬어 다시 찍는다. 끝나면 3007·9337의 내 PID만 끈다. 이 섹션에 고른 번호와 날짜를 적는다

### 기록

**2026-09-15 2차 — 많이 띄운 책상 (사용자 피드백)**
- 1차 컷은 위젯이 3~6개라 안 된다. 사용자가 올린 test2 화면처럼 **한 화면에 위젯 12~16개**: 컬럼, 사진 여러 장, 브라우저 여러 개, 메모·할 일·달력·타이머·시계를 섞는다. 줌 70%(B는 90%로 가까이). 여행은 큰 사진 하나를 유지
- 컨셉 셋: 디자인 브레인스토밍(`d01-ondo`) · 여행 계획(`d02-lisbon`) · 프로덕트 아이디어 브레인스토밍(`d03-kiln`)
- 색 마크: 데님·민트(teal) 계열로 몇몇 위젯에. 위 "구성 규칙"의 "도구 위젯은 한 컷에 하나"·"크기 위계 1/2~3/2~3"은 2차에는 적용하지 않는다
- 1차 13장과 공간은 그대로 두고, 같은 캔버스 2페이지에 추가한다
- 사용자 추가 지시: 카페 디자인·커피 사진은 쓰지 않는다 → 디자인 브레인스토밍은 `d01-tide`(찬물 수영복 브랜드). 카페 공간 `d01-ondo`는 지웠다. 1차의 `c02-ondo`·`c02c-ondo`는 1페이지 그대로
- 찍은 것: `d01-tide` · `d02-lisbon` · `d03-kiln`, 각 A(줌 70% 전체)·B(줌 90% 왼쪽 위) — 캔버스 2페이지. 레일은 `_cloud.mjs` `RAIL_DENSE`
- **2배로 찍으면 줌 70% 공간의 브라우저 위젯 안 페이지가 크게 다시 그려진다**(Earth 도구줄·Cosmos 글자가 두 배). 1페이지(줌 90·100%)는 괜찮았다. 이 맥 창의 기본 배율이 1이라 2배는 `setDeviceMetricsOverride`가 필요하다. 그래서 2페이지는 1배 원본(`landing-shots/cloud/D*-1x.jpg`)으로 올렸다. 고른 컷을 2배로 뽑기 전에 원인(웹뷰 줌 계산이 배율을 따라가는지)을 본다
- Google Earth 안내창: 누르기가 안 먹는 공간이 있어 `shot.mjs --clicktext`가 페이지 안에서 버튼을 JS로 누르고, 그래도 남으면 그 작은 상자를 숨긴다
- 촬영 중에 `shot.mjs`를 강제로 끄면 앱의 화면 캡처가 멈춘다(페이지 새로고침으로도 안 풀림). 데모 앱을 다시 띄워야 풀린다. 프로세스를 끌 때는 `lsof -ti tcp:3007` · `tcp:9337` 결과를 `xargs kill`로(zsh에서 변수 하나로 넘기면 kill이 거부한다)

**2026-09-15 1차 촬영** — 캔버스: https://claude.ai/artifact/NgDfRg5riCNkKgde4kjvqR
- 찍은 컷: 1 Lisbon · 2 Ondo · 3 Q3 Report는 A·B·C, 4 Northline · 5 Studio는 A·B (13장). 4·5에 C가 없는 이유는 캔버스 메모에 있다
- 스펙: `landing-shots/tools/specs/c01~c05`(A·B 공용, 카메라만 다름) · `c01c~c03c`(C 배치, 내용은 원래 스펙에서 가져온다) · 공통 값 `_cloud.mjs`
- 찍기: `node cloud.mjs <폴더> specs/c01-lisbon.mjs …` — 스펙의 카메라마다 `shot.mjs --camera`를 부른다. A를 마지막에 찍어 공간이 A 카메라로 남는다
- 공간은 데모 프로필에 남겼다(S6): `c01-lisbon` `c01c-lisbon` `c02-ondo` `c02c-ondo` `c03-report` `c03c-report` `c04-northline` `c05-studio`. C 공간도 이름이 같다(Lisbon 두 개). 옛 시안 공간(`s01`~`s98`)도 그대로 있다
- 2배 원본: `landing-shots/cloud/*.jpg` (커밋 안 함)

**찍으면서 찾은 것**
- 위젯 안 글자는 `넓이 ÷ 기본 넓이`로 확대된다(WidgetFrame `contentScale`). 메모 420 · 할 일 320 · 타이머 340이 100%. 메모를 320으로 두면 글자가 작아진다
- 높이: 할 일은 항목 3개에 280, 타이머는 260 이상. 216에서는 항목이 잘리고 타이머의 Take a Break가 시간과 겹쳤다
- 데모 앱이 떠 있는 동안 `design-ref/` 아래 파일을 쓰면 Vite가 페이지를 새로고침해 찍던 컷이 실패한다. 결과물은 scratchpad에 찍고, 문서·jpg는 촬영이 끝난 뒤에 쓴다
- Google Earth 첫 방문 안내창: 크기 0인 숨은 "Dismiss"가 먼저 잡힌다. `shot.mjs --clicktext`가 보이는 것만 누르고 사라질 때까지 반복한다. 페이지가 여러 개면 늦게 떠서 Studio는 `--wait 16000`
- Our World in Data: grapher 주소는 전부 explorer로 넘어가고, 80%에서는 왼쪽 빈 열이 생긴다. **페이지 줌 100%**면 한 열이 돼 차트가 폭을 채운다(스크롤 300)
- Are.na: 폭 700·80%에서 Log in / Sign up 버튼이 보인다 → 70%
- Google 지도는 영어로 띄워도 한국어로 나오고 교통 카드가 뜬다 → Earth를 쓴다. It's Nice That은 구독 팝업 → 안 쓴다. Cosmos · React 문서 · GitHub는 창 없이 뜬다
- 카드 미리보기: electronjs.org 문서는 그림이 없어 지구본 칸이 나온다. GitHub 저장소는 그림이 있다


- **git에 넣는 것과 안 넣는 것 (2026-09-16 `.gitignore`로 정리)**
  - 안 넣음: `landing-shots/cloud`(촬영 원본 7.7MB) · `landing-shots/user`(사용자가 직접 찍은 것) · `tools/assets`의 스와치·워드마크 15개(9.9MB). 전부 스펙이나 `python3 tools/make_assets.py`로 다시 만든다
  - 넣음: `tools/specs/*` · `tools/cloud.mjs` · tide 자산 넷(`swatch-tide-*` · `wordmark-tide`) — 이 넷은 `make_assets.py`에 생성 코드가 없어서 지우면 못 만든다
  - 옛 컷 `landing-shots/*.jpg` 15장과 `before/`는 이미 커밋돼 있다(문서에 "커밋 안 했다"고 적혀 있던 건 틀린 기록이었다). 그대로 둔다
- 데모 프로필 `~/Library/Application Support/focus-desk-demo`는 git 밖이다
- **사용자가 직접 찍은 컷 (2026-09-16, `landing-shots/user/`)** — `U1-lisbon-summerlake.png`: Lisbon 내용을 Summer Lake 방 사진 위에 올린 것. `U2-test2-cloud.png`: Cloud 배경 test2 공간
- 온보딩 흐름 변경은 랜딩 뒤에 한다 — [docs/STATUS.md](../docs/STATUS.md) 10번
