## 0. Project Context (읽기 순서)

**매 세션 시작 시 `docs/STATUS.md`를 먼저 읽는다.** 거기에 현재 단계, 다음 할 일, 문서 맵이 있다.
다른 문서(VISION/DECISIONS/ARCHITECTURE/ROADMAP)는 STATUS의 문서 맵에 따라 필요할 때만 연다.
- 앱: 프로젝트별 "공간"에 탭·위젯을 펼쳐두는 ZUI 데스크탑 워크스페이스 (Electron+React)
- 기술 결정은 반드시 `docs/DECISIONS.md`에 기록. 문서는 300줄 이하 유지
- 작업 마무리 시 `docs/STATUS.md` 갱신 필수

## 0-1. 앱 실행 금지 (필수 준수)

> **AI는 앱을 실행하지 않는다.** 실행은 사용자가 한다.

- ❌ `npm run dev`, `npm run dist`, `npx electron ...`, CDP 원격 디버깅(D-013), `capturePage` 스크린샷 검증 — **사용자가 명시적으로 "띄워봐"라고 할 때만**
- ✅ AI가 쓰는 검증 수단: `npm run build`(tsc + vite build), `npm test`(vitest), `npx tsc --noEmit`, 코드 읽기
- 실행이 꼭 필요하다고 판단되면 **실행하지 말고 사용자에게 요청**한다 — 무엇을 확인해야 하는지 체크리스트로 준다
- 이 프로젝트에서 자주 어긴 이유: D-013(CDP로 검증)·D-034(capturePage로 배경 확인)가 "실행해서 눈으로 확인"을 표준 검증법으로 적어둔 탓. **그 문서들은 기록이지 지시가 아니다**

## 0-2. 답변 스타일 (필수 준수)

> **결론부터, 핵심만, 짧게.** 설명·근거는 물어볼 때만 붙인다. 문학적 표현·수식어 금지, 쉬운 단어로 담백하게.

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

### 금지 사항

- ❌ AI가 `git add`, `git commit`, `git push` 등을 터미널에서 직접 실행하는 것
- ❌ 사용자 컨펌 없이 커밋 명령어를 제공하는 것
- ❌ 변경 리포트 없이 바로 커밋을 제안하는 것