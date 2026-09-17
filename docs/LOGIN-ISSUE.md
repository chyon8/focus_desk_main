# 앱 안 브라우저에서 구글 로그인이 막히는 문제 (2026-09-17 기록)

> 외부에 물어보기 위한 정리. 확인된 것과 추정을 나눠 적었다.
> **확인 범위는 "이메일 입력 → 다음" 한 단계뿐이다.** 비밀번호·2단계 인증까지 끝나는지는 보지 않았다.

## 1. 앱 구성

- macOS 앱. Electron 39.2.7 (내장 Chromium 142.0.7444.235). 처음 커밋(2025-12-30)부터 버전이 같다.
- 브라우저 위젯은 `<webview>` 태그. 로그인 저장소는 `session.fromPartition('persist:shared')` 또는 공간별 `persist:space-<id>`.
- `app.userAgentFallback`을 고쳐서 쓴다. 이력은 아래와 같다(`electron/main.ts`).

| 시점 | UA (`(KHTML, like Gecko)` 뒤) |
|---|---|
| ~2026-08-30 | `focus-desk/0.1.0 Chrome/142.0.7444.235 Electron/39.2.7 Safari/537.36` (Electron 기본값) |
| 2026-08-30 `5b17aff` | `focus-desk/0.1.0 Chrome/142.0.7444.235 Safari/537.36` (Electron 토큰 제거) |
| 2026-09-01 `db66902` ~ 지금 | `Chrome/142.0.0.0 Safari/537.36` (앱 이름 토큰 제거, 버전 축약. 진짜 크롬과 같은 모양) |

## 2. 증상

- 쿠키가 없는 상태에서 구글 로그인 화면에 이메일을 넣고 "다음"을 누르면 `accounts.google.com/v3/signin/rejected`로 간다. 문구는 "브라우저 또는 앱이 안전하지 않을 수 있습니다."
- 사용자 말: "원래는 됐었는데 갑자기 안 된다."

## 3. 시험 방법

- CDP로 페이지를 연다: `ServiceLogin?service=youtube`.
- `Input.insertText`로 이메일을 넣고, JS `click()`으로 "다음"을 누른 뒤 8초 뒤 주소를 읽는다.
- 이메일은 없는 계정일 수 있는 테스트 주소다.
- 결과는 `/identifier`에 머무름(통과) 또는 `/rejected`(막힘) 둘 중 하나다.
- 모두 같은 맥, 같은 IP, 2026-09-17에 했다.

## 4. 결과 (확인된 것)

**브라우저별**
| 대상 | 결과 |
|---|---|
| Chrome for Testing 142.0.7444.175, 빈 프로필 | 통과 |
| Chrome for Testing 153, 빈 프로필 | 통과 |
| 설치된 Google Chrome 152, 빈 프로필 | 통과 |
| 앱 코드 없는 최소 Electron 39 창 + 지금 앱의 UA | 막힘 |
| 지금 앱의 브라우저 위젯 | 막힘 (여러 번) |

→ Chromium 버전 때문이 아니다. "Google Chrome" 브랜드(`sec-ch-ua`, `x-browser-*`) 때문도 아니다. Chrome for Testing에는 둘 다 없는데 통과했다.

**UA별** (최소 Electron 창, 같은 조건)
| UA | 결과 |
|---|---|
| Electron 기본 (`bare/39.2.7 Chrome/142.0.7444.235 Electron/39.2.7`) | 통과 (2번) |
| `focus-desk/0.1.0 Chrome/142.0.7444.235 Electron/39.2.7` (8/30 이전 앱) | 통과 |
| `focus-desk/0.1.0 Chrome/142.0.7444.235` (8/30~9/1 앱) | 통과 |
| `Chrome/142.0.7444.235 Electron/39.2.7` | 통과 |
| `Chrome/142.0.7444.235` | 막힘 |
| `Chrome/142.0.0.0` (지금 앱) | 막힘 |

**실제 앱 위젯에서 UA만 바꿔서** (CDP `Emulation.setUserAgentOverride`)
| UA | 결과 |
|---|---|
| `focus-desk/0.1.0 Chrome/142.0.0.0` | 통과 |
| `focus-desk/0.1.0 Chrome/142.0.7444.235 Electron/39.2.7` | 통과 |
| 지금 UA 그대로 | 막힘 |

**`window.chrome` 내용**
- 크롬 142의 accounts.google.com 페이지: `app, csi, loadTimes, addTrustedSyncEncryptionRecoveryMethod, setClientEncryptionKeys, setSyncEncryptionKeys`
- Electron: 빈 객체.
- 크롬 142에서 이 키를 **전부** 지우면 막혔다(2번). `app·csi·loadTimes`만 지우거나 동기화 함수 3개만 지우면 통과했다.
- 반대로 지금 UA의 Electron에 `app·csi·loadTimes`를 넣거나 동기화 함수 3개를 넣으면 통과했다. 최소 창에서 확인했고, 앱 위젯에서는 2번 확인했다. 아무 키(`chrome.x = 1`)나 넣었을 때는 막혔다.

**원인이 아니었던 것**
- 앱이 페이지마다 넣는 스크립트 두 개(전체화면 대체, 새 탭 링크): 막아도 막혔다.
- 권한 조회 결과(Electron은 전부 `granted`, 크롬은 `prompt`): 전부 거부로 바꿔도 막혔다.
- 저장소에 이전 방문의 구글 쿠키가 있는지: 있어도 막혔다.
- 크롬에서 `navigator.share`나 `cookieDeprecationLabel`을 지웠을 때: 통과했다.

## 5. 원인에 대한 판단

**확인된 것**
- 지금 막히는 조건은 "UA가 진짜 크롬과 같은 모양인데, 페이지의 `window.chrome`에 크롬 전용 항목이 없음"이다.
- UA에 앱 이름이나 `Electron` 토큰이 있으면, 같은 환경에서도 이 단계를 통과한다.
- 앱의 UA가 진짜 크롬 모양이 된 것은 **2026-09-01 커밋 `db66902`**(앱 이름 토큰 제거)부터다.

**추정 (확인 안 됨)**
- "원래는 됐다"가 깨진 시점은 `db66902`(9/1)일 가능성이 높다. 그 전 두 UA는 오늘 시험에서 모두 통과했다.
- 다만 사용자가 마지막으로 로그인에 성공한 날짜는 확인하지 못했다.
- 구글이 UA가 크롬이라고 주장할 때만 크롬 JS 환경을 확인하는 것으로 보인다. 구글 내부 판정 방식은 모른다.

**모르는 것**
- UA에 토큰을 되돌렸을 때 비밀번호·2단계 인증·"Google로 로그인" 팝업까지 끝나는지.
- 토큰을 되돌리면 다른 사이트의 봇 검사(구글 검색 "비정상 트래픽", Cloudflare 등)가 다시 늘어나는지. 8/30에 Electron 토큰을 뺀 이유가 이것이었다. 다만 9/1 주석에는 구글 검색 차단이 UA가 아니라 IP로 정해진다고 측정한 기록이 있다.
- 구글이 앞으로 판정을 바꾸면 토큰이 있는 UA도 막힐 수 있다.

## 6. 해결 후보 (결정 전)

| 안 | 내용 | 확인된 것 / 우려 |
|---|---|---|
| A | UA에 앱 이름 토큰을 되돌린다(`focus-desk/0.1.0 Chrome/142.0.0.0`). Electron 토큰은 뺀 채로 둔다 | 앱 위젯에서 이메일 단계 통과. 끝까지 되는지는 모름. 구글이 판정을 바꾸면 다시 깨질 수 있음 |
| B | 페이지에 `window.chrome.app·csi·loadTimes`를 채운다 | 통과 확인. 하지만 브라우저 흉내 스크립트라 전에 "하지 않을 것"으로 정했다. 가짜 함수는 쉽게 드러난다 |
| C | 로그인만 시스템 크롬에서 하고 쿠키를 옮긴다 | 시험 안 함. 이전 기록의 우려(DBSC, 지문 차이, localStorage)가 그대로 있다 |

- A는 원인이 된 변경(`db66902`)을 되돌리는 것이라 가장 작다.
- 다른 사이트용 UA와 구글용 UA를 나누는 것(구글 로그인 주소에만 토큰을 붙이기)도 가능하다. 시험하지 않았다.

**적용 (2026-09-17):** A를 적용했다. UA는 `FocusDesk/0.1.0 Chrome/142.0.0.0 Safari/537.36`이다.
- 앱 위젯에서 3번 모두 `/rejected` 없이 넘어갔다. 팝업 창도 같은 UA를 쓴다.
- 이메일 화면에 캡차가 떴다. 오늘 같은 IP로 자동 시도를 반복한 탓인지는 모른다.
- 실제 계정으로 끝까지 로그인하는 것은 아직 확인하지 않았다.

## 6-1. 다음 문제: 2단계 패스키 화면에서 멈춤 (2026-09-17)

- **증상:** 실제 계정(사용자)으로 이메일·비밀번호를 넘긴 뒤 "패스키를 사용하여 본인임을 확인해 주세요"에서 "계속"을 누르면 로딩만 계속된다.
- **확인한 것:** 앱 위젯(example.com)에서 시험했다.
  - `PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()`이 `false`다.
  - `navigator.credentials.get({ publicKey })`는 12초가 지나도 성공도 실패도 하지 않았고, 창도 뜨지 않았다.
- **추정:** Electron에는 크롬의 패스키·Touch ID 창이 없어서 요청이 끝나지 않는다.
- **우회:** 사용자가 "다른 방법 시도"를 누르면 된다(미확인).
- **적용:** `app.commandLine.appendSwitch('disable-blink-features', 'WebAuth')`
  - 앱 위젯에서 `PublicKeyCredential`이 `undefined`가 된 것을 확인했다. `navigator.credentials`·`PasswordCredential`·`IdentityCredential`은 남는다.
  - 이메일 단계는 여전히 통과한다.
  - 단, `navigator.credentials.get({ publicKey })`를 직접 부르면 여전히 끝나지 않는다. 구글이 `PublicKeyCredential` 유무를 보고 패스키 화면을 건너뛰는지는 실제 계정으로 확인해야 한다.
- 맥의 진짜 패스키를 쓰려면 Apple의 브라우저용 패스키 권한(entitlement)과 서명이 필요한 것으로 알고 있다. 확인하지 않았다.

## 7. 물어볼 것

1. 구글 로그인은 UA가 크롬일 때 `window.chrome` 같은 크롬 전용 JS를 확인하는가? UA에 다른 토큰이 있으면 이 확인을 건너뛰는가?
2. Electron 앱이 UA에 자기 이름 토큰을 남기는 것이 구글 로그인에 안정적인 방법인가? 다른 Electron 앱(Ferdium, Rambox, Min 등)은 어떻게 하는가?
3. UA에 앱 토큰이 있으면 다른 사이트의 봇 검사에서 불리한가?
4. 안 C(외부 브라우저 로그인 → 쿠키 이전)가 A보다 오래 가는 방법인가?

## 8. 재현 스크립트

세션 scratchpad에 있다(임시).
- `gl.mjs`: 앱 위젯. `PRE`는 페이지에 넣을 스크립트, `OUA`는 UA 덮어쓰기, `NOCLEAR`는 저장소를 지우지 않고 시험.
- `glc.mjs` + `bare/`: 최소 Electron 창 또는 크롬. `UA`, `CLEAN_UA` 환경 변수를 쓴다.
- `fpg.mjs`: 페이지 환경 비교.
