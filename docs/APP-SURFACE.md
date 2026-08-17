# APP-SURFACE — 외부 앱을 공간 안에서 쓰기

> 설계·단계 계획. 결정의 이유는 DECISIONS D-038~042.

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
  | { cmd: 'place';   appKey; rect }         // 창을 이 사각형에 + 화면 밖이면 클램프
  | { cmd: 'restore'; appKey }               // 처음 place 전 위치로 되돌림
  | { cmd: 'raise';   appKey }               // 그 창만 다시 앞으로 (재배치 없이)
  | { cmd: 'capture'; appKey; maxWidth }     // → JPEG 한 장
  | { cmd: 'ask-capture-access' }
type Ev =
  | { ev: 'apps' | 'frontmost' | 'permissions' | 'placed' | 'capture' | 'error'; ... }
```

**창 id가 없다.** 설계 초안의 `windows` 동사는 구현하면서 없앴다 — `place`가 창을 직접 고르므로 id 레지스트리·재바인딩 문제가 통째로 사라진다. 대가는 창이 여러 개인 앱에서 정확히 그 창을 못 고를 수 있다는 것. (D-040)

**창 선택은 `AXMainWindow`가 아니다.** FL Studio·Antigravity 둘 다 그 속성이 에러를 돌려준다(자체 툴킷으로 창을 그리는 앱은 주 창을 보고하지 않음). 대신 `AXFocusedWindow`(마지막으로 포커스했던 창) 우선, 없으면 가장 큰 창. 창 여러 개일 때 "마지막에 쓰던 그 창"을 가져오게 되지만, 재시작하면 다시 아무 창이나 잡힐 수 있음 — 여기서 제목 기억 방식(다음 섹션 참조)이 필요해지는 지점 (D-040)

| 동사 | macOS | Windows (미래) |
|---|---|---|
| list | `NSWorkspace` + `/Applications` | 시작 메뉴 `.lnk` 스캔 |
| launch | `NSWorkspace.openApplication` | `ShellExecute` |
| watch | `didActivateApplicationNotification` | `SetWinEventHook` |
| place | `AXFocusedWindow`/가장 큰 창 + `AXPosition`/`AXSize` | `SetWindowPos` |
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
- LIVE 이탈(=`release`, 원래 위치 복원): 공간 전환 / Esc
- **Focus Desk를 클릭해 앱이 뒤로 가는 것은 LIVE 이탈이 아니다.** 두 창은 OS z-order를 공유하지 않으므로 이 자체는 막을 수 없다 — `⌥Space`(전역 단축키) 또는 위젯 표면 재클릭으로 앱을 다시 앞으로 부르는 `raise`가 왕복 수단 (D-042)

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
| **C** | `place`·`restore`·`raise`. 최대화 시 실제 창이 위젯 자리로, 왕복 가능 | 접근성 | ✅ 2026-08-17. 위젯 재클릭 왕복 검증됨, **⌥Space는 아직 미검증** |
| **D** | 창 크기 기억(종료·창 닫기 시 원래 크기 복원, D-044) | — | ✅ 2026-08-17 / 공간 진입 시 자동 실행은 미착수 |

Phase A만으로도 "앱 전환하면 시간이 멈추는" 문제가 해결되고 앱별 통계가 생긴다.

### 실측 (2026-08-17)
- 설치 앱 스캔 104개, 아이콘 전부 확보. 목록 1회 응답 829KB → main에서 캐시
- 캡처 400px 폭: PNG 335KB → **JPEG(0.6) 58KB**. 1fps로 흘리려면 JPEG여야 함
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
                                               ⌥Space 전역 단축키(D-042)
electron/ipc/activity.ts                      판정에 앱 집합 반영 (D-039)
src/widgets/AppWidget.tsx                     피커 / 썸네일 / LIVE 세 얼굴, 왕복 UI(D-042)
src/apps/useAppSurface.ts                     최대화 중 실제 창 배치(첫 배치 즉시, 이후 60ms 디바운스)
src/apps/useAppThumbnail.ts                   1fps 캡처, 창 포커스 있을 때만
src/apps/spaceApps.ts · useSpaceApps.ts       공간의 앱 집합 → main
src/focus/appTime.ts (+ .test.ts)             순수함수, vitest
src/stores/appTimeStore.ts                    space-app-time-v1
src/focus/FocusInsights.tsx                   앱별 분해 + Focus Desk 잔차
```

## 리스크
| 항목 | 상태 |
|---|---|
| 여러 창 | 포커스된 창 우선, 없으면 최대 창. 앱 재시작하면 다시 아무 창이나 잡힐 수 있음. **미구현**: 위젯이 처음 연 창의 제목을 기억해두고 다음부터 그 제목의 창을 우선 찾는 방식(설계는 대화 기록에 있음, 문서화 안 됨) — 필요성 재확인 후 착수 |
| 최소 창 크기 / 리사이즈 거부 | 해결(D-040): `AXSize` settable 여부 확인 → 못 줄이면 원래 크기로 위젯 중앙에 배치 + 화면 클램프. FL Studio류는 위젯 크기에 못 맞추는 게 앱 자체 한계이며 더 손쓸 수 없음 |
| macOS Spaces / 전체화면 | 해결(D-041): 앱을 활성화해 그 Space를 꺼내고 → 전체화면을 풀고 → 배치. Focus Desk는 LIVE 동안 모든 Space에 보이게 해서 따라간다 |
| **LIVE 중 Focus Desk 클릭 → 앱이 뒤로 감** | z-order를 공유하지 않는 두 창의 근본 한계, 막을 수 없음. 위젯 재클릭 왕복은 실기 확인됨(2026-08-17). `⌥Space`(앱 → 데스크 방향)는 아직 미검증 |
| 원래 창 크기 유실 | 정상 종료·창 닫기는 해결(D-044). 강제 종료(SIGKILL)·헬퍼 크래시는 여전히 유실 — 영속화는 미채택 |
| 렌더 스로틀 | 가려진 창의 썸네일이 정지처럼 보일 가능성 — 실사용에서 확인 필요 |
| 썸네일 프레임레이트 | 1fps 고정, `capture` 요청-응답 방식이라 이 이상 부드럽게 하려면 `SCStream`(연속 스트림)으로 교체 필요. 보류 중 |
| 공증 | 헬퍼 바이너리도 서명·공증 대상 → D-027과 같이 처리 |
| 권한 이관 | 접근성·화면기록은 바이너리 경로 기준. dev에서 준 권한은 패키징본에 안 따라옴 |

## 결정됨
- 외부 앱을 쓰는 동안 Focus Desk 창이 최소화/뒤에 있어도 **카운트한다**(공간=프로젝트). 창 상태는 판정에 안 넣는다
