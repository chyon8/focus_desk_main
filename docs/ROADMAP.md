# ROADMAP — Phase별 목표와 검증 기준 (은퇴됨)

> ⚠️ **은퇴 (2026-08-16):** Phase 0~5 전부 완료. 지금부터의 작업은 실사용에서 나오는 문제/요청 기반이라
> 더 이상 Phase 단위가 아니다. **다음 할 일은 여기가 아니라 [STATUS.md](STATUS.md)의 "다음 할 일"이 유일한 출처.**
> 이 파일은 과거 계획의 기록 + 아직 안 붙은 백로그(맨 아래)로만 남긴다.

## Phase 0 — 골격 재정비
1. 기존 소스를 `legacy/`로 이동 (App.tsx, components/, types.ts 등)
2. ARCHITECTURE.md 폴더 구조 생성, zustand 도입
3. index.html에서 CDN/importmap 제거 → Tailwind v4 정식 설치
4. electron-builder 설정, vitest 설정
5. electron/main.ts 정리 (AI 생성 잔여물 제거, ipc/ 분리)

**검증:** `npm run dev`로 빈 캔버스 앱 실행 + `npm run build`로 패키징된 .app이 실행됨 + vitest 통과

## Phase 1 — ZUI 코어 스파이크 (최대 리스크 먼저)
1. 카메라(팬/줌/zoom-to-cursor) + 월드 좌표 위젯 드래그/리사이즈
2. 더미 위젯(색 박스)으로 60fps 확인 (위젯 30개 기준)
3. **WebContentsView bounds/zoomFactor 카메라 동기화 PoC** — 성립 여부가 제품 성립 여부

**검증:** 줌인/아웃하면서 웹페이지 카드가 위젯처럼 자연스럽게 스케일됨. 실패 시 → STATUS.md 열린 질문(폴백) 결정 후 진행

## Phase 2 — 스페이스 + 위젯 이식
1. 스페이스 CRUD/전환 + 스페이스별 JSON 영속화 + 스키마 마이그레이션 체인
2. 위젯 registry + legacy 위젯 이식 (우선순위: Todo, Memo, Timer → 나머지)
3. 중복 위젯 통합 (Memo/NewMemo, Editor/NewEditor)
4. MVP 사용자 데이터 1회 마이그레이션

**검증:** 스페이스 2개에 위젯 배치 → 앱 재시작 → 배치·내용·카메라 위치 복원

## Phase 3 — 브라우저 경험
1. BrowserCard 위젯 (탭 = 공간 위의 카드)
2. 스페이스별 세션 파티션 (로그인 분리)
3. Hibernation (비활성 스페이스 뷰 해제 + 스크린샷 placeholder)

**검증:** 스페이스 A/B에 각각 다른 구글 계정 로그인 유지. 스페이스 5개×탭 5개에서 메모리가 활성 스페이스 분량만 사용

## Phase 4 — PiP / 미니 모드
- always-on-top 미니 윈도우에 위젯(타이머/Todo) 띄우기

**검증:** 다른 앱 위에 고정된 채 타이머 조작 가능

## Phase 5 — 감성 레이어 이식 + 배포 준비
1. 앰비언스/라디오, 포커스 세션/통계, 배경/테마 이식
2. Share Desk 이식
3. 코드 서명/공증, 자동 업데이트, legacy/ 삭제

**검증:** MVP 기능 전부 신규 코어에서 동작 + 서명된 dmg 배포 가능

## 이후 (백로그)
- 협업 (Yjs, presence, 채팅) — 유저 확보 후
- 3D 배경 레이어 — 재검토 시에만
- 탭 임포트 (브라우저에서 가져오기)
