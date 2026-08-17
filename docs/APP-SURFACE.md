# APP-SURFACE — 외부 앱을 공간 안에서 쓰기

> 설계·단계 계획. 결정의 이유는 DECISIONS D-038·D-039.

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
  | { cmd: 'launch';  appKey }               // 실행 or 활성화
  | { cmd: 'watch' }                         // frontmost 구독
  | { cmd: 'permissions' }                   // 접근성·화면기록 상태
  | { cmd: 'place';   appKey; rect }         // 메인 창을 이 사각형에 + 앞으로
  | { cmd: 'restore'; appKey }               // 처음 place 전 위치로 되돌림
  | { cmd: 'capture'; appKey; maxWidth }     // → JPEG 한 장
  | { cmd: 'ask-capture-access' }
type Ev =
  | { ev: 'apps' | 'frontmost' | 'permissions' | 'placed' | 'capture' | 'error'; ... }
```

**창 id가 없다.** 설계 초안의 `windows` 동사는 구현하면서 없앴다 — `place`가 `AXMainWindow`(앱이 스스로 주 창이라 여기는 것)를 직접 잡으므로 id 레지스트리·재바인딩 문제가 통째로 사라진다. 대가는 창이 여러 개인 앱에서 주 창만 대상이 된다는 것. (D-040)

| 동사 | macOS | Windows (미래) |
|---|---|---|
| list | `NSWorkspace` + `/Applications` | 시작 메뉴 `.lnk` 스캔 |
| launch | `NSWorkspace.openApplication` | `ShellExecute` |
| watch | `didActivateApplicationNotification` | `SetWinEventHook` |
| place | `AXMainWindow` + `AXPosition`/`AXSize` | `SetWindowPos` |
| capture | `ScreenCaptureKit` | DWM 썸네일 |

**윈도우 이식 = 이 파일 하나 다시 씀.** 렌더러는 안 바뀐다.
`appKey`는 macOS bundle id / Windows exe 경로. 렌더러는 불투명 문자열로만 다룬다.

## 좌표
`월드 사각형 → worldToScreen(camera) → + win.getContentBounds() 원점 → 스크린(top-left)`
macOS `AXPosition`도 top-left points라 Electron DIP와 그대로 일치 — 변환 코드가 사실상 없다.
(Windows는 물리 픽셀이라 DPI 보정 필요 → 헬퍼가 흡수)

## 상태 머신 (위젯당)
| 상태 | 실제 창 | 캔버스 |
|---|---|---|
| `IDLE` | 미실행 | 앱 아이콘 + 이름 |
| `THUMB` | 실행 중, FocusDesk 창 **뒤** | 라이브 썸네일 (1fps) |
| `LIVE` | FocusDesk 창 **앞**, 위젯 사각형에 맞춤 | 없음 (실제 창이 덮음) |

- **숨기지 않고 뒤로 보낸다**: 숨긴 창은 ScreenCaptureKit이 캡처를 못 한다
- **LIVE는 위젯 최대화(D-030·031) 상태에서만** — 이유는 D-038
- LIVE 이탈: 공간 전환 / Esc / 앱 집합 밖으로 포커스 이동 / 창 소멸

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
| **B** | `capture`. 위젯에 라이브 썸네일(1fps, JPEG) | 화면 기록 | ✅ 2026-08-17 |
| **C** | `place`·`restore`. 최대화 시 실제 창이 위젯 자리로 | 접근성 | ✅ 2026-08-17 |
| **D** | 창 크기 기억, 공간 진입 시 자동 실행 | — | 미착수 |

Phase A만으로도 "앱 전환하면 시간이 멈추는" 문제가 해결되고 앱별 통계가 생긴다.

### 실측 (2026-08-17)
- 설치 앱 스캔 104개, 아이콘 전부 확보. 목록 1회 응답 829KB → main에서 캐시
- 캡처 400px 폭: PNG 335KB → **JPEG(0.6) 58KB**. 1fps로 흘리려면 JPEG여야 함
- 부모(Electron) 강제 종료 시 헬퍼도 자동 종료 — stdin EOF 경로 확인

## 파일 지도
```
electron/helper/macos/FocusDeskHelper.swift   유일한 네이티브 표면
electron/apps/protocol.ts                     이식 계약서
electron/apps/helperClient.ts                 spawn·JSON Lines·respawn(최대 5회)
electron/ipc/apps.ts                          ask() 요청·응답, 좌표 변환, 창 따라가기
electron/ipc/activity.ts                      판정에 앱 집합 반영 (D-039)
src/widgets/AppWidget.tsx                     피커 / 썸네일 / LIVE 세 얼굴
src/apps/useAppSurface.ts                     최대화 중 실제 창 배치(정지 후 90ms)
src/apps/useAppThumbnail.ts                   1fps 캡처, 창 포커스 있을 때만
src/apps/spaceApps.ts · useSpaceApps.ts       공간의 앱 집합 → main
src/focus/appTime.ts (+ .test.ts)             순수함수, vitest
src/stores/appTimeStore.ts                    space-app-time-v1
src/focus/FocusInsights.tsx                   앱별 분해 + Focus Desk 잔차
```

## 리스크
| 항목 | 상태 |
|---|---|
| 여러 창 | `AXMainWindow` 하나만 대상. VSCode 프로젝트별 창을 따로 지정하는 건 불가 (D-040) |
| 최소 창 크기 | 앱이 못 줄어들면 위젯보다 크게 삐져나옴. `placed` 이벤트가 실제 rect를 돌려주지만 아직 표시에 쓰지 않음 |
| macOS Spaces | 다른 데스크탑에 창이 있으면 안 따라옴 — 미해결 |
| 렌더 스로틀 | 가려진 창의 썸네일이 정지처럼 보일 가능성 — 실사용에서 확인 필요 |
| 공증 | 헬퍼 바이너리도 서명·공증 대상 → D-027과 같이 처리 |
| 권한 이관 | 접근성·화면기록은 바이너리 경로 기준. dev에서 준 권한은 패키징본에 안 따라옴 |

## 결정됨
- 외부 앱을 쓰는 동안 Focus Desk 창이 최소화/뒤에 있어도 **카운트한다**(공간=프로젝트). 창 상태는 판정에 안 넣는다
