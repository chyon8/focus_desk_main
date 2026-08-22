# APP-SURFACE — 외부 앱을 공간 안에서 쓰기

> 설계·단계 계획. 결정의 이유는 DECISIONS D-038~041·D-067~072.

## 정의
**앱 위젯** = 공간에 놓인, 실제 OS 앱(VSCode·Photoshop·FL Studio…)을 대리하는 위젯.
평소엔 라이브 썸네일, 열면 진짜 앱 창이 그 자리에 뜬다. 그 앱을 쓰는 시간은 그 공간에 쌓인다.

`WidgetType`에 `app` 하나 추가로 끝난다 — 월드 좌표·드래그·리사이즈·영속화는 위젯 시스템에서 공짜.

## 네이티브 경계: 헬퍼 바이너리 하나
플랫폼 코드가 새는 걸 막기 위해 네이티브 표면을 단 하나로 고정한다.

```
electron/helper/macos/FocusDeskHelper.swift  →  resources/focusdesk-helper
```
Electron이 자식 프로세스로 띄우고 **stdin/stdout JSON Lines**로 대화한다.
(네이티브 노드 애드온을 안 쓰는 이유는 D-038)

### 프로토콜
```ts
// electron/apps/protocol.ts — 이식 계약서
type Cmd =
  | { cmd: 'list' }                          // 설치된 앱 + 아이콘
  | { cmd: 'launch';  appKey; activate? }    // 실행 or 활성화 (false=배경 실행, D-046)
  | { cmd: 'watch' }                         // frontmost 구독
  | { cmd: 'permissions' }                   // 접근성 상태
  | { cmd: 'windows';  appKey }              // 이 데스크탑의 창 목록 + 다른 곳 개수(D-048)
  | { cmd: 'place';   appKey; rect; title?; avoid?; raise? }  // 창을 이 사각형에 + 클램프
  | { cmd: 'move';    appKey; rect }         // 위치만 (팬 추적, 절대 raise 안 함)
  // ev: 'window' — 우리가 안 시킨 창 이동/리사이즈 (0.3초 폴링)
  | { cmd: 'aside';   appKey }               // 창을 화면 밖으로(크기 그대로) — 돌아올 창 (D-072)
  | { cmd: 'restore'; appKey }               // 처음 place 전 위치로 되돌림 (+ unhide)
  | { cmd: 'raise';   appKey }               // 그 창만 다시 앞으로 (재배치 없이)
type Ev =
  | { ev: 'apps' | 'frontmost' | 'permissions' | 'placed' | 'error'; ... }
  // placed는 고른 창의 title을 실어 보낸다 → 위젯이 기억
```

**창 id가 없다.** 설계 초안의 `windows` 동사는 구현하면서 없앴다 — `place`가 창을 직접 고르므로 id 레지스트리·재바인딩 문제가 통째로 사라진다. 대가는 창이 여러 개인 앱에서 정확히 그 창을 못 고를 수 있다는 것(D-040) → **제목으로 메움**(D-045)

**창 선택 순서**: ① `title` 일치(**사용자가 배정**했거나 지난번 놓았던 창) → ② `AXFocusedWindow` → ③ 가장 큰 창. `avoid`(같은 공간의 다른 위젯이 이미 잡은 제목)는 ②③에서만 걸러내고, 후보가 그것뿐이면 무시한다. `AXMainWindow`는 안 쓴다 — FL Studio·Antigravity 둘 다 에러를 돌려준다(자체 툴킷 창은 주 창을 보고하지 않음). (D-040·045·048)

**배정된 창이 이 데스크탑에 없으면 대체하지 않는다.** AX 목록에 없고 `CGWindowList`엔 더 있으면 = 다른 Space → **즉시 `otherSpace`**로 알려 사용자가 옮기게 한다(앱을 활성화해 Space를 끌어오던 D-041 방식은 D-072에서 폐기 — 화면을 앱에 뺏기고 데스크가 묻힌다). 숨은 창이 아예 없으면(그냥 닫힌 제목) 조용히 ②③으로 폴백. (D-048)

| 동사 | macOS | Windows (미래) |
|---|---|---|
| list | `NSWorkspace` + `/Applications` | 시작 메뉴 `.lnk` 스캔 |
| launch | `NSWorkspace.openApplication` | `ShellExecute` |
| watch | `didActivateApplicationNotification` | `SetWinEventHook` |
| place | 제목/`AXFocusedWindow`/가장 큰 창 + `AXPosition`/`AXSize` | `SetWindowPos` |
| move | `AXPosition`만 | `SetWindowPos` (SWP_NOSIZE) |

**윈도우 이식 = 이 파일 하나 다시 씀.** 렌더러는 안 바뀐다.
`appKey`는 macOS bundle id / Windows exe 경로. 렌더러는 불투명 문자열로만 다룬다.

## 좌표
`월드 사각형 → worldToScreen(camera) → + win.getContentBounds() 원점 → 스크린(top-left)`
macOS `AXPosition`도 top-left points라 Electron DIP와 그대로 일치 — 변환 코드가 사실상 없다.
(Windows는 물리 픽셀이라 DPI 보정 필요 → 헬퍼가 흡수)

## 상태 머신 (위젯당)
| 상태 | 실제 창 | 캔버스 |
|---|---|---|
| `RESTING` | 미실행 또는 FocusDesk 창 **뒤** | 앱 아이콘 + 이름 + 오늘 시간 + 창 제목 |
| `HERE` | 위젯 사각형에 맞춰진 채 FocusDesk 창 **앞** | 없음 (실제 창이 덮음) |
| `ASIDE` | **화면 밖(아래), 크기는 그대로** — 슬롯은 계속 잡고 있다 (D-072) | 왜 물러났는지 + 돌아오는 조건 |
| `AWAY` | 사용자가 옮겨둔 자리에 그대로 | "밖에 나감 · 다시 데려오기" |

- **여는 것은 아이콘 클릭이고, 최대화와 무관하다**(D-067이 D-038의 "최대화 전용"을 뒤집음). 위젯 크기 그대로 창이 뜨고 그대로 쓴다. 여러 개 동시에 가능
- **창은 위젯 중 캔버스에 보이는 부분에 놓는다**(D-072). 사이드바·상단 크롬에 걸친 위젯도 나머지 부분에 창이 온다(최소 120×90). **앱이 크기를 거부하면 그 크기 그대로 둔다** — 옆을 덮더라도 안 보이는 것보단 낫다. 위젯이 거의 다 캔버스 밖으로 나갔을 때만 **창을 화면 밖으로 옮긴다**(`aside`, 크기 그대로, 카드에 "다시 가져오기" 버튼). 나갈 때 400ms·돌아올 때 80ms
- **위젯 크기를 바꾸는 건 셋뿐**: 사용자가 위젯을 리사이즈 / **사용자가 앱 창 모서리를 끔**(앱 위젯의 리사이즈 방법 — 위젯 손잡이는 창 밑이라 못 잡는다) / 앱을 열 때 한 번. 줌 때문에 앱이 거부한 크기는 위젯에 안 쓴다 (D-072)
- **창을 직접 옮기거나 크기를 바꾸면 위젯이 따라간다**(헬퍼가 0.3초마다 프레임 확인). 캔버스를 벗어나면 `AWAY`. 단 **배치 후 1.5초** 안의 변화는 앱이 시작하며 자기 창을 복원하는 것으로 보고 3회까지 되돌린다
- **추적 루프는 `setInterval`**(32ms) + `backgroundThrottling: false`. 덮인 창에는 macOS가 프레임을 안 줘서 rAF가 멈춘다
- **팬은 `move`(위치만), 줌은 `place`(크기까지, 카메라가 멈춘 뒤 1회).** `AXSize` 쓰기는 앱이 인터페이스를 다시 잡게 만들어 비싸고, `AXPosition`은 싸다
- **라이브 썸네일은 폐기**(D-047) — 화면기록 권한도 같이 사라짐
- **데스크는 앱 창 밑(레벨 −1)이라 앱 창이 항상 보인다.** 캔버스를 클릭해도 앱이 안 가려진다. 대신 **데스크가 포커스를 받으면 이 공간의 앱을 뺀 나머지를 숨긴다**(`hideOthers`, ⌘H와 동일) — 안 그러면 크롬 하나에 공간이 통째로 가려진다 (D-072)
- **다른 데스크탑·전체화면 창은 `otherSpace`로 알린다** — 재시도를 다 쓴 뒤(약 5초)에만. 시작 중인 앱과 구분이 안 되기 때문 (D-072가 D-041의 "앱을 activate해 Space를 끌어온다"를 뒤집음)
- 이탈: 위젯 헤더의 내보내기 버튼 / 공간 전환 / 위젯 삭제 / 종료
- **같은 앱 위젯 2개를 동시에 열 수 없다** — 헬퍼가 앱별로 원래 크기를 기억하므로 뒤엣것이 앞엣것의 기억을 덮어쓴다. 새로 열면 앞엣것이 닫힌다

## 시간 추적
```
active = frontmost ∈ ( {FocusDesk} ∪ 현재 공간의 앱 위젯들 )
```
메인이 `watch` 이벤트를 이 집합과 대조해 기존 `activity:changed`를 그대로 쏜다
→ `useSpaceTimeTracker.ts`는 안 바뀐다. 판정 근거만 바뀌고 인터페이스는 동일. (D-039)

앱별 분해는 **별도 키** `space-app-time-v1` = `{ [spaceId]: { [date]: { [appKey]: seconds } } }`
→ 기존 `space-time-v1` 마이그레이션 불필요. "Focus Desk 자체" 시간은 총합 − 앱합(잔차).

## 단계 (각 단계는 혼자 배포 가능)
| | 범위 | 권한 | 상태 |
|---|---|---|---|
| **A** | `list`·`launch`·`watch`. 앱 위젯 + 시간 판정 + 앱별 Insights | 없음 | ✅ 2026-08-17 |
| **B** | ~~`capture`. 라이브 썸네일(1fps, JPEG)~~ | ~~화면 기록~~ | ❌ **폐기**(D-047) — 아이콘 얼굴로 대체 |
| **C** | `place`·`restore`·`raise`. 실제 창이 위젯 자리로, 왕복 가능 | 접근성 | ✅ 2026-08-17. 위젯 재클릭 왕복 검증됨 |
| **D** | 창 크기 기억(D-044) · 창 여러 개 = 제목 기억(D-045) · 공간 진입 시 자동 실행(D-046) | — | ✅ 2026-08-17, **실기 미검증** |

Phase A만으로도 "앱 전환하면 시간이 멈추는" 문제가 해결되고 앱별 통계가 생긴다.

### 실측 (2026-08-17)
- 설치 앱 스캔 104개, 아이콘 전부 확보. 목록 1회 응답 829KB → main에서 캐시
- 부모(Electron) 강제 종료 시 헬퍼도 자동 종료 — stdin EOF 경로 확인
- FL Studio·Antigravity 둘 다 `AXMainWindow` 에러(-25212) — 자체 툴킷 창은 이 속성을 안 준다
- FL Studio 창: `AXPosition` settable, `AXSize` **NOT** settable — 크기 요청이 조용히 무시됨. 좌상단을 맞추면 창이 화면 밖으로 흘러 타이틀바까지 못 잡는 상태가 실제로 재현됨 → 리사이즈 거부 창은 중앙 정렬 + 화면 클램프로 대응 (D-040)
- 전체화면 앱(FL Studio·Antigravity 둘 다 재현): `AXWindows` 0개, `CGWindowList`엔 존재 — 전용 Space에 있어 접근성 API에 안 보임. 처음엔 "전체화면이면 거부"로 막았다가 **잘 되던 앱까지 같이 막는 오판**이었음 → 활성화해서 Space를 꺼내고 전체화면을 풀어달라고 요청하는 방식으로 교체 (D-041)

## 파일 지도
```
electron/helper/macos/FocusDeskHelper.swift   유일한 네이티브 표면
electron/apps/protocol.ts                     이식 계약서
electron/apps/helperClient.ts                 spawn·JSON Lines·respawn(최대 5회)
electron/ipc/apps.ts                          ask() 요청·응답, 좌표 변환, 창 따라가기,
                                               ⌃⌥D 전역 단축키(D-072)
electron/ipc/activity.ts                      판정에 앱 집합 반영 (D-039)
src/widgets/AppWidget.tsx                     앱 피커 / 아이콘 / 창 배정(D-048) / 왕복 UI(D-071)
src/apps/useAppSurface.ts                     창이 위젯을 정확히 덮는 동안만 슬롯 유지 (D-072) —
                                               팬=move 60ms, 줌=place 140ms 정지 후, 못 덮으면 aside
src/apps/spaceApps.ts · useSpaceApps.ts       공간의 앱 집합 → main (자동 실행은 D-054에서 폐기)
src/focus/appTime.ts (+ .test.ts)             순수함수, vitest
src/stores/appTimeStore.ts                    space-app-time-v1
src/focus/FocusInsights.tsx                   앱별 분해 + Focus Desk 잔차
```

## 리스크
| 항목 | 상태 |
|---|---|
| 여러 창 | 해결(D-045·048): 위젯에서 **창 배정** + 제목 기억(갱신형) + 다른 위젯이 잡은 제목 회피. 남는 한계: 제목 없는 창은 배정 불가, 같은 제목 창 두 개는 구분 불가, 다른 데스크탑 창은 개수만 보임 |
| 최소 창 크기 / 리사이즈 거부 | 해결(D-040): `AXSize` settable 여부 확인 → 못 줄이면 원래 크기로 위젯 중앙에 배치 + 화면 클램프. FL Studio류는 위젯 크기에 못 맞추는 게 앱 자체 한계이며 더 손쓸 수 없음 |
| macOS Spaces / 전체화면 | **미해결로 인정**(D-072): 보이는 창이면 전체화면을 풀고 배치, 다른 Space면 즉시 알리고 사용자가 옮긴다. 앱을 activate해 Space를 끌어오던 D-041 방식은 앱이 화면을 차지하고 데스크가 묻히게 만들어 폐기 |
| **두 창의 z-order를 못 섞음** | 해결 불가. 데스크를 클릭하면 앱 창이 뒤로 간다 — 다시 부르는 건 위젯 클릭·⌃⌥D·앱 열기 (D-072) |
| 원래 창 크기 유실 | 정상 종료·창 닫기는 해결(D-044). 강제 종료(SIGKILL)·헬퍼 크래시는 여전히 유실 — 영속화는 미채택 |
| 자동 실행 | 공간 진입 시 그 공간의 앱을 배경 실행(D-046). 무거운 앱이 여럿인 공간에서 어떻게 느껴지는지는 실사용에서 확인 필요 |
| 공증 | 헬퍼 바이너리도 서명·공증 대상 → D-027과 같이 처리 |
| 권한 이관 | 접근성은 바이너리 경로 기준. dev에서 준 권한은 패키징본에 안 따라옴 |

## 결정됨
- 외부 앱을 쓰는 동안 Focus Desk 창이 최소화/뒤에 있어도 **카운트한다**(공간=프로젝트). 창 상태는 판정에 안 넣는다
