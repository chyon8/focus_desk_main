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
  | { cmd: 'launch';  appKey; activate? }    // 실행 or 활성화 (false=배경 실행, D-046)
  | { cmd: 'watch' }                         // frontmost 구독
  | { cmd: 'permissions' }                   // 접근성 상태
  | { cmd: 'windows';  appKey }              // 이 데스크탑의 창 목록 + 다른 곳 개수(D-048)
  | { cmd: 'place';   appKey; rect; title?; avoid? }  // 창을 이 사각형에 + 클램프
  | { cmd: 'restore'; appKey }               // 처음 place 전 위치로 되돌림
  | { cmd: 'raise';   appKey }               // 그 창만 다시 앞으로 (재배치 없이)
type Ev =
  | { ev: 'apps' | 'frontmost' | 'permissions' | 'placed' | 'error'; ... }
  // placed는 고른 창의 title을 실어 보낸다 → 위젯이 기억
```

**창 id가 없다.** 설계 초안의 `windows` 동사는 구현하면서 없앴다 — `place`가 창을 직접 고르므로 id 레지스트리·재바인딩 문제가 통째로 사라진다. 대가는 창이 여러 개인 앱에서 정확히 그 창을 못 고를 수 있다는 것(D-040) → **제목으로 메움**(D-045)

**창 선택 순서**: ① `title` 일치(**사용자가 배정**했거나 지난번 놓았던 창) → ② `AXFocusedWindow` → ③ 가장 큰 창. `avoid`(같은 공간의 다른 위젯이 이미 잡은 제목)는 ②③에서만 걸러내고, 후보가 그것뿐이면 무시한다. `AXMainWindow`는 안 쓴다 — FL Studio·Antigravity 둘 다 에러를 돌려준다(자체 툴킷 창은 주 창을 보고하지 않음). (D-040·045·048)

**배정된 창이 이 데스크탑에 없으면 대체하지 않는다.** AX 목록에 없고 `CGWindowList`엔 더 있으면 = 다른 Space → 앱을 활성화해 꺼내보고(D-041), 실패하면 `otherSpace`로 알려 사용자가 옮기게 한다. 숨은 창이 아예 없으면(그냥 닫힌 제목) 조용히 ②③으로 폴백. (D-048)

| 동사 | macOS | Windows (미래) |
|---|---|---|
| list | `NSWorkspace` + `/Applications` | 시작 메뉴 `.lnk` 스캔 |
| launch | `NSWorkspace.openApplication` | `ShellExecute` |
| watch | `didActivateApplicationNotification` | `SetWinEventHook` |
| place | 제목/`AXFocusedWindow`/가장 큰 창 + `AXPosition`/`AXSize` | `SetWindowPos` |

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
| `LIVE` | FocusDesk 창 **앞**, 위젯 사각형에 맞춤 | 없음 (실제 창이 덮음) |

- **라이브 썸네일은 폐기**(D-047). 캔버스 얼굴이 하나로 줄어 `THUMB`/`IDLE` 구분도 없어졌다 — 화면기록 권한도 같이 사라짐
- **숨기지 않고 뒤로 보낸다**: LIVE 이탈은 창을 숨기는 게 아니라 데스크를 앞으로 올리는 것(D-040)
- **LIVE는 위젯 최대화(D-030·031) 상태에서만** — 이유는 D-038. 크기 문제가 아니라 실제 창이 항상 우리 창 **위에** 그려져 잘라낼 수도, 쌓임 순서를 지킬 수도, 줌에 따라갈 수도 없기 때문. "위젯 자리에 그대로 열기"를 하려면 뷰포트 안에 완전히 들어와 있을 때만 배치하고 걸치면 자동 이탈하는 규칙이 필요 (미착수)
- **전체화면(⌃⌘F) 중 LIVE는 데스크 창 레벨을 일반으로 내린다**(D-051). 안 내리면 메뉴바 위 레벨이라 앱이 그 위로 못 올라와 왕복이 죽는다
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
| **B** | ~~`capture`. 라이브 썸네일(1fps, JPEG)~~ | ~~화면 기록~~ | ❌ **폐기**(D-047) — 아이콘 얼굴로 대체 |
| **C** | `place`·`restore`·`raise`. 최대화 시 실제 창이 위젯 자리로, 왕복 가능 | 접근성 | ✅ 2026-08-17. 위젯 재클릭 왕복 검증됨, **⌥Space는 아직 미검증** |
| **D** | 창 크기 기억(D-044) · 창 여러 개 = 제목 기억(D-045) · 공간 진입 시 자동 실행(D-046) | — | ✅ 2026-08-17, **실기 미검증** |
| **E** | **펼침(Spread)** — 카메라를 잠그고 그 공간의 앱 위젯을 동시에 각자 자리에 | — | 계획 완료, 착수 대기 |

Phase A만으로도 "앱 전환하면 시간이 멈추는" 문제가 해결되고 앱별 통계가 생긴다.

## Phase E — 펼침(Spread)

**왜**: 지금 LIVE는 위젯 최대화 전용이라 "앱 하나, 화면 꽉"이다. 공간이 아니라 앱 전환기다.
**버린 대안(B)**: 위젯이 뷰포트에 들어오면 자동 배치. **실제 창은 스케일되지 않는다** — 줌 0.5면 창을 *리사이즈*해야 하고 그건 앱 레이아웃 리플로우 + 최소 크기 충돌이라 사실상 줌 1.0에서만 성립한다(D-038이 Windows `SetParent`를 기각한 그 이유). 팬할 때마다 창이 사라졌다 나타나는 깜빡임이 기본 리듬이 된다.
**채택(C)**: 카메라를 **잠근다**. 그러면 추격·클리핑·스케일 문제가 통째로 사라지고, 남는 대가는 "펼친 동안 팬/줌 못 함" 하나뿐이다.

**성공 기준**: 앱 위젯 2개인 공간에서 펼침 → 두 실제 창이 각자 위젯 자리에 → Esc → 둘 다 원래 크기·위치.

| 단계 | 할 일 | 검증 |
|---|---|---|
| 1. 모드 | `uiStore.spreadMode`(비영속). 진입=ControlBar 버튼, 이탈=Esc. 진입 시 `useCameraControls`가 팬/줌 입력을 무시 | 펼침 중 스크롤·핀치해도 캔버스가 안 움직임 |
| 2. 선별 | `app` 위젯 중 ⓐ `canvasArea` 안에 완전히 들어오고 ⓑ 리사이즈 되는 창(D-040 `resizable`)만. 탈락은 위젯 얼굴에 이유 표시 | FL Studio류는 배치 안 되고 이유가 보임 |
| 3. 배치 | `useAppSurface`를 "위젯 1개·최대화 전제"에서 다중으로 일반화. 진입 시 1회 `place`(카메라가 잠겨 추격 불필요), 창 드래그/리사이즈 추격은 기존대로 | 두 창이 각자 위젯 사각형에 |
| 4. 복원 | 이탈 시 전부 `restore`. D-044의 `before-quit`·창 `close` 복원 경로도 N개로 확장 | 펼침 중 ⌘Q → 창들이 원래 크기로 |
| 5. 셸 보호 | 진입 시 사이드바 접기 + 배치 rect를 `canvasArea`로 클램프(헬퍼는 화면 클램프만 함) | 사이드바·컨트롤바가 안 덮임 |
| 6. 왕복 | ⌥Space(D-042)는 전역이라 그대로. 위젯 표면 클릭 `raise`도 펼침에서 동작 | 데스크 클릭 후 ⌥Space로 복귀 |

**새 프로토콜 없음** — `place`/`restore`/`raise` 그대로, 호출 개수만 늘어난다.
**리스크**: macOS는 앱 단위 활성화라 펼친 창 하나를 클릭하면 그 앱의 *다른* 창까지 앞으로 나와 캔버스를 덮는다(막을 수 없음). 위젯이 앱의 최소 창 크기보다 작으면 창이 삐져나온다 → 2단계에 최소 크기 조건을 넣을지는 실측 후 결정.

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
                                               ⌥Space 전역 단축키(D-042)
electron/ipc/activity.ts                      판정에 앱 집합 반영 (D-039)
src/widgets/AppWidget.tsx                     앱 피커 / 아이콘 / 창 배정(D-048) / LIVE, 왕복 UI(D-042)
src/apps/useAppSurface.ts                     최대화 중 실제 창 배치(첫 배치 즉시, 이후 60ms 디바운스),
                                               창 제목 왕복(D-045)
src/apps/spaceApps.ts · useSpaceApps.ts       공간의 앱 집합 → main, 진입 시 배경 실행(D-046)
src/focus/appTime.ts (+ .test.ts)             순수함수, vitest
src/stores/appTimeStore.ts                    space-app-time-v1
src/focus/FocusInsights.tsx                   앱별 분해 + Focus Desk 잔차
```

## 리스크
| 항목 | 상태 |
|---|---|
| 여러 창 | 해결(D-045·048): 위젯에서 **창 배정** + 제목 기억(갱신형) + 다른 위젯이 잡은 제목 회피. 남는 한계: 제목 없는 창은 배정 불가, 같은 제목 창 두 개는 구분 불가, 다른 데스크탑 창은 개수만 보임 |
| 최소 창 크기 / 리사이즈 거부 | 해결(D-040): `AXSize` settable 여부 확인 → 못 줄이면 원래 크기로 위젯 중앙에 배치 + 화면 클램프. FL Studio류는 위젯 크기에 못 맞추는 게 앱 자체 한계이며 더 손쓸 수 없음 |
| macOS Spaces / 전체화면 | 해결(D-041): 앱을 활성화해 그 Space를 꺼내고 → 전체화면을 풀고 → 배치. Focus Desk는 LIVE 동안 모든 Space에 보이게 해서 따라간다 |
| **LIVE 중 Focus Desk 클릭 → 앱이 뒤로 감** | z-order를 공유하지 않는 두 창의 근본 한계, 막을 수 없음. 위젯 재클릭 왕복은 실기 확인됨(2026-08-17). `⌥Space`(앱 → 데스크 방향)는 아직 미검증 |
| 원래 창 크기 유실 | 정상 종료·창 닫기는 해결(D-044). 강제 종료(SIGKILL)·헬퍼 크래시는 여전히 유실 — 영속화는 미채택 |
| 자동 실행 | 공간 진입 시 그 공간의 앱을 배경 실행(D-046). 무거운 앱이 여럿인 공간에서 어떻게 느껴지는지는 실사용에서 확인 필요 |
| 공증 | 헬퍼 바이너리도 서명·공증 대상 → D-027과 같이 처리 |
| 권한 이관 | 접근성은 바이너리 경로 기준. dev에서 준 권한은 패키징본에 안 따라옴 |

## 결정됨
- 외부 앱을 쓰는 동안 Focus Desk 창이 최소화/뒤에 있어도 **카운트한다**(공간=프로젝트). 창 상태는 판정에 안 넣는다
