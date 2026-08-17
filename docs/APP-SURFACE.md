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

### 프로토콜 — 동사 6개
```ts
// electron/apps/protocol.ts — 이식 계약서
type Cmd =
  | { cmd: 'list' }                                     // 설치된 앱 + 아이콘
  | { cmd: 'launch';  appKey }                          // 실행 or 활성화
  | { cmd: 'windows'; appKey }                          // 창 목록 (id, title, rect)
  | { cmd: 'place';   winId; rect; front: boolean }     // 이동·리사이즈·z
  | { cmd: 'capture'; winId; maxWidth }                 // → PNG
  | { cmd: 'watch' }                                    // frontmost 구독
type Ev =
  | { ev: 'frontmost'; appKey: string | null }
  | { ev: 'windows'; appKey; windows }
  | { ev: 'capture'; winId; png }
  | { ev: 'error'; cmd; reason }
```

| 동사 | macOS | Windows (미래) |
|---|---|---|
| list | `NSWorkspace` + `/Applications` | 시작 메뉴 `.lnk` 스캔 |
| launch | `NSWorkspace.openApplication` | `ShellExecute` |
| windows | `AXUIElementCopyAttributeValue` | `EnumWindows` |
| place | `AXPosition`/`AXSize` | `SetWindowPos` |
| capture | `ScreenCaptureKit` | DWM 썸네일 |
| watch | `didActivateApplicationNotification` | `SetWinEventHook` |

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
| | 범위 | 권한 | 검증 |
|---|---|---|---|
| **A** | `list`·`launch`·`watch`. 앱 위젯 + 시간 판정 + 앱별 Insights | 없음 | VSCode 40분 작업 → 사이드바 시간 +40분, Insights에 `VSCode 40m`. Slack으로 가면 멈춤 |
| **B** | `windows`·`capture`. IDLE→THUMB | 화면 기록 | 위젯에 실제 화면이 1fps로. 줌아웃하면 같이 축소. 썸네일 5개에 CPU 유의미하게 안 오름 |
| **C** | `place`. 최대화 시 LIVE + 크로스페이드 | 접근성 | 위젯을 열면 실제 창이 그 자리에 뜨고 타이핑됨. Esc로 썸네일 복귀. 공간 전환 시 따라 사라짐 |
| **D** | 창 크기 기억, 공간 진입 시 자동 실행 | — | 재시작 후에도 배치 복원 |

Phase A만으로도 "앱 전환하면 시간이 멈추는" 문제가 해결되고 앱별 통계가 생긴다.

## 파일 계획
```
electron/helper/macos/FocusDeskHelper.swift   신규
electron/apps/protocol.ts                     신규  ← 이식 계약서
electron/apps/helperClient.ts                 신규  spawn·JSON Lines·respawn
electron/ipc/apps.ts                          신규
electron/ipc/activity.ts                      수정  판정에 앱 집합 반영
electron/preload.ts                           수정  window.apps
src/widgets/AppWidget.tsx                     신규
src/widgets/defs.ts · registry.ts             수정  app 타입 등록
src/apps/useAppSurface.ts                     신규  IDLE/THUMB/LIVE
src/focus/appTime.ts (+ .test.ts)             신규  순수함수, vitest
src/stores/appTimeStore.ts                    신규
src/focus/FocusInsights.tsx                   수정  앱별 분해
```

## 리스크 (미검증 — 해당 Phase에서 실측)
| 항목 | 내용 |
|---|---|
| 창 재바인딩 | VSCode는 프로젝트별 창이 여러 개. `winId`는 앱 재시작 시 바뀜 → 창 제목으로 재바인딩. Phase C에서 가장 지저분한 부분 |
| 최소 창 크기 | 앱이 일정 이하로 못 줄어듦 → 그보다 작으면 LIVE 진입 차단 |
| macOS Spaces | 다른 데스크탑에 창이 있으면 안 따라옴 → 강제 이동 필요 |
| 렌더 스로틀 | 가려진 창은 macOS가 렌더를 늦출 수 있음 → 썸네일이 정지처럼 보일 가능성. **Phase B에서 실측** |
| 공증 | 헬퍼 바이너리도 서명·공증 대상 → 대기 중인 D-027과 같이 처리 |

## 결정됨
- 외부 앱을 쓰는 동안 Focus Desk 창이 최소화/뒤에 있어도 **카운트한다**(공간=프로젝트). 창 상태는 판정에 안 넣는다
