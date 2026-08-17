# STATUS — 세션 스타팅 포인트

> 매 세션 이 파일부터 읽는다. 다른 문서는 필요할 때만 연다.
> 작업이 끝날 때마다 이 파일을 갱신한다 (최근 완료 / 다음 할 일).

## 현재 단계
**Phase 0~5(ROADMAP) 전부 완료. 지금은 실사용 QA 기반 개선 + 앱 서피스 착수 단계.**

> **다음 세션에서 "다음꺼 해"라고 하면 아래 1번(앱 서피스 Phase A)을 바로 착수한다. 방향·설계 합의 끝(2026-08-17).**

## 문서 맵 (필요할 때만 참조)
| 문서 | 내용 | 언제 읽나 |
|---|---|---|
| [VISION.md](VISION.md) | 컨셉, 타겟, 하지 않을 것, 디자인 방향 | 기능/방향 판단이 필요할 때 |
| [DECISIONS.md](DECISIONS.md) | 스택·기술 결정 + 이유 (append-only) | 기술 선택하거나 뒤집고 싶을 때 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 폴더 구조, 좌표계, 상태, 브라우저 전략 | 코드 작성 전 |
| [APP-SURFACE.md](APP-SURFACE.md) | 외부 앱을 공간 안에서 — 헬퍼 프로토콜·상태머신·Phase A~D | 앱 위젯 작업 전 (D-038·039) |
| [ROADMAP.md](ROADMAP.md) | ⚠️ 은퇴됨 — Phase 0~5 완료 기록 + 장기 백로그만 남음 | 옛 Phase 이력 궁금할 때만 |

## 최근 완료
- 2026-08-16: **Phase 0~5**(MVP·ZUI·위젯 10종·브라우저·앰비언스·포커스 세션) — 상세는 [ROADMAP.md](ROADMAP.md), DECISIONS D-001~D-032
- 2026-08-16: **테마 시스템**(6종) + 전면 토큰화(D-033, 위젯 본체 투명화)
- 2026-08-17: 씬 폐기(D-034)→배경 고정(D-035) / 드래그 스트립 구멍(D-036) / **체류 시간**(D-037) / 앱 아이콘·이름 확정 / 유튜브 자동재생·월페이퍼 스캔·빌드 배경 경로 수정
- 2026-08-17: **앱 서피스 설계 확정**(D-038·039) — 배경층 고정 아이디어 폐기, [APP-SURFACE.md](APP-SURFACE.md)

## 다음 할 일
1. **앱 서피스 Phase A** ← 여기부터. 설계·검증 기준은 [APP-SURFACE.md](APP-SURFACE.md)
   - Swift 헬퍼(`list`·`launch`·`watch`) + `electron/apps/` + `app` 위젯 타입
   - 시간 판정을 앱 집합 기준으로 교체(D-039) + `space-app-time-v1` 앱별 적립 + Insights 분해
   - 권한 불필요(`NSWorkspace` 알림). Phase B(썸네일)·C(LIVE)는 이게 검증된 뒤
2. **사용성 QA** — UX가 최선인지, 실사용 오류 없는지 훑는 라운드
3. **배포 마무리**(D-027) — Developer ID 인증서 → 공증 + 자동 업데이트 (아이콘 완료). 헬퍼 바이너리 서명도 여기서 같이
4. 미검증: 60fps 실측, 앰비언스 소리 품질 / 정리: `legacy/` 삭제
5. Reader 위젯: 보류(D-028). 원하면 착수

## 정리 대기 (급하지 않음, 발견 시 같이 처리)
- **PiP 삭제 + 유튜브 진짜 전체화면**(순위 내림, 2026-08-17). PiP는 안 쓰므로 제거: `MiniView.tsx`, `uiStore`의 mini 상태, `WidgetFrame`의 ⧉ 버튼, `App.tsx`의 isMini 분기, `window-mode.ts`의 set-mini, `preload.ts`·`vite-env.d.ts` 타입, `.mini-shell`. `--surface` 토큰은 Photo/Sketch·모달 스크림도 쓰므로 남긴다. 전체화면은 `webview`의 `enter-html-full-screen`/`leave-html-full-screen`을 받아 위젯 최대화 + 앱 전체화면을 자동으로 같이 걸고 같이 풀기(버튼 추가 없음, `browserFullscreen.ts` 같이 정리)
- 체류 시간: 디스플레이만 꺼진 상태(시스템 슬립·잠금 아님)는 계속 카운트됨. 유휴 감지는 의도적으로 안 넣음(D-037)
- 빌드본에서는 월페이퍼가 asar 안이라 폴더에 넣어도 안 보임 — 필요하면 userData 폴더도 같이 스캔
- 위젯 데이터의 `theme: 'LIGHT'|'DARK'` 필드가 미사용 — 지우려면 스키마 마이그레이션 필요
- `src/spaces/backgrounds.ts`의 `isLightBackground()`는 dead code (테마의 `mood`가 대체)

## 열린 질문 (사용자 결정 대기)
- **월페이퍼 조달**: 라이선스 명확한 곳(itch.io, Unsplash/Pexels)에서 사용자가 구해온다. 장수보다 **톤 통일**(같은 작가/시리즈 3~4장). 현재 8장
- **디자인 톤**(합의됨): 감성은 배경·빛·사운드·여백에서, 위젯 크롬은 조용하게

## 규칙 요약
- git 명령은 사용자가 직접 실행 (CLAUDE.md 워크플로우 준수)
- 문서는 300줄 이하 유지, 이 파일은 50줄 이하 유지 (늘어나면 "최근 완료"부터 압축)
