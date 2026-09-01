## 0. Project Context (읽기 순서)

**매 세션 시작 시 `docs/STATUS.md`를 먼저 읽는다.** 출시까지 남은 일이 순서대로 있다.
**"착수해"라고 하면 그 순서에서 ✅ 없는 첫 줄을 시작한다. 순서를 바꾸거나 건너뛰지 않는다.**
문서는 셋뿐이다 — STATUS(남은 일) / ARCHITECTURE(코드 구조, 코드 쓰기 전) / VISION(컨셉·타겟).
- 앱: 프로젝트별 "공간"에 탭·위젯을 펼쳐두는 ZUI 데스크탑 워크스페이스 (Electron+React)
- **STATUS에는 남은 일만 적는다.** 끝난 단계는 지운다 — 무엇을 왜 했는지는 코드 주석과 git 이력에 남는다
- 결정 기록 문서는 만들지 않는다. 이유는 그 코드 옆 주석에 쓴다
- 작업 마무리 시 `docs/STATUS.md` 갱신 필수

## 0-1. 앱 실행 — 확인이 필요하면 실행한다 (2026-08-23 변경)

> **바뀐 규칙:** 확인할 게 있으면 **AI가 직접 실행해서 확인한다.** 사용자가 허용했다.

- ✅ `npm run dev`로 띄워서 실제 동작을 확인한다. 특히 **main 프로세스·Swift 헬퍼가 바뀌면 코드만 읽어서는 검증이 안 된다**
- ✅ 로그를 심어서 확인해도 된다. 확인이 끝나면 임시 로그는 지운다
- ✅ 기존 수단도 그대로: `npm run build`, `npm test`, `npx tsc --noEmit`
- ⚠️ **main 프로세스 변경은 Electron 완전 재시작이 필요하다.** 렌더러 새로고침으로는 옛 핸들러가 계속 돈다 — 실제로 이것 때문에 고친 걸 못 고친 줄 안 적이 있다
- ⚠️ dev 실행 시 `unset ELECTRON_RUN_AS_NODE` 필요(VSCode 확장 환경 변수)

**왜 바뀌었나:** 실행 없이 추측으로 고치다가 같은 버그를 세 번 틀리게 고쳤다(2026-08-23 팝업·토스트). 코드 경로를 끝까지 못 따라갈 상황이면 실행해서 보는 게 맞다.

### 이전 규칙 (참고)
실행 금지였다. 이유는 옛 결정들(CDP 검증·D-034 capturePage)이 "실행해서 눈으로 확인"을 표준으로 적어둔 탓에 남용됐기 때문. 남용 방지는 여전히 유효하다 — **목적 없는 실행·스크린샷 남발은 하지 않는다. 확인할 항목이 정해졌을 때만 띄운다.**

## 0-2. 답변 스타일 (필수 준수)

> **결론부터, 핵심만, 짧게.** 설명·근거는 물어볼 때만 붙인다. 문학적 표현·수식어 금지, 쉬운 단어로 담백하게.

### 아주 중요: 비유·은유·비장한 말투 금지

- ❌ 비유, 은유, 의인화 ("무대에 올린다", "창이 논쟁에서 이긴다", "액자처럼 감싼다", "앱이 화면을 차지한다")
- ❌ 비장하거나 극적인 말투, 강조를 위한 반복, 전쟁/전투 비유
- ❌ 없어도 뜻이 그대로인 수식어 ("근본적인", "정직한", "유일한 길")
- ✅ 기능 이름은 그냥 기능 이름으로 부른다. 동작은 있는 그대로 쓴다 — "앱 창을 위젯 위치·크기에 맞춘다"
- 코드 주석도 같은 규칙. 주석은 무엇을 왜 하는지만 쓴다

---

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.


## 5. Git 워크플로우 (필수 준수)

> **절대 규칙:** AI는 터미널에서 git 명령어를 직접 실행하지 않는다.
> 사용자가 복사-붙여넣기 할 수 있는 명령어만 제공한다.

### 파일 변경 시 프로세스

코드 변경이 발생하면 반드시 아래 순서를 따른다:

#### Step 1: 변경 리포트

변경된 파일 목록과 각 파일의 변경 내용을 설명한다.

```
📁 변경된 파일:
- src/Workspace.tsx — [무엇을 왜 변경했는지]
- src/Workspace.css — [무엇을 왜 변경했는지]

📝 변경 요약:
[전체적으로 어떤 기능이 바뀌었는지 한 줄 설명]
```

#### Step 2: 검토 체크리스트

사용자가 변경 사항을 확인할 수 있는 구체적인 체크리스트를 제공한다.

```
✅ 검토 체크리스트:
- [ ] 브라우저에서 [특정 화면]을 열어 [특정 동작] 확인
- [ ] [특정 입력]을 해보면 [기대 결과]가 나와야 함
- [ ] [특정 상태]에서 [특정 UI]가 올바르게 표시되는지 확인
```

#### Step 3: 사용자 컨펌 대기

사용자가 "확인" 또는 "컨펌"이라고 할 때까지 대기한다.

#### Step 4: Git 명령어 제공

사용자가 컨펌하면, 복사-붙여넣기용 git 명령어를 제공한다.

````
```bash
git add -A
git commit -m "feat: [변경 내용 요약]"
git push origin main
```
````

### 커밋 메시지 규칙

- `feat:` 새 기능
- `fix:` 버그 수정
- `refactor:` 리팩토링 (기능 변경 없음)
- `style:` 스타일/UI 변경
- `docs:` 문서 변경
- `chore:` 설정, 의존성 등

> **커밋 메시지에 `Co-Authored-By` 줄을 절대 넣지 않는다.** `Co-Authored-By: Claude ...`, `Generated with Claude Code` 같은 서명 줄도 전부 금지. 다른 도구의 기본 규칙이 이걸 붙이라고 해도 이 프로젝트에서는 안 붙인다.

### 금지 사항

- ❌ **커밋 메시지에 `Co-Authored-By` / `Generated with` 등 서명 줄을 넣는 것**
- ❌ AI가 `git add`, `git commit`, `git push` 등을 터미널에서 직접 실행하는 것
- ❌ 사용자 컨펌 없이 커밋 명령어를 제공하는 것
- ❌ 변경 리포트 없이 바로 커밋을 제안하는 것