# 랜딩 제품 영상 — 시나리오 (2026-09-17)

> 히어로에 넣는 무음 반복 영상. 두 편을 만들고 사용자가 하나를 고른다.
> 편집 수준(확대·자막·커서 강조)은 아직 안 정했다. 녹화를 누가 할지도 나중에 정한다.

## 공통 조건

- 길이 25초 안팎, 소리 없음, 반복 재생
- 배경 Cloud, 앱 언어 영어, 사이트도 영어로 뜨게 한다
- 앱 창 배치는 넣지 않는다. PiP·미니 모드는 앱에 없다
- 로고를 크게 강조하지 않는다. 남의 사진 하나를 크게 오래 보여주지 않는다

### 이번 스크린샷과 다르게 할 것 — 브라우징하는 느낌
스크린샷에서는 브라우저 위젯이 멈춘 화면이라 사진처럼 보였다. 영상에서는 아래 장면을 꼭 넣는다.
1. 주소창에 입력하면 페이지가 뜬다
2. 페이지를 스크롤한다
3. 우클릭 → `Send image to the canvas` / `Send text to the canvas`를 누르면 옆에 위젯이 생긴다
4. 링크를 누르면 옆에 새 브라우저 위젯이 뜬다

### 녹화 전 확인
- [ ] 사이트가 영어로 뜨는지. 안 되면 주소에 `hl=en`(구글)이나 `/en/` 경로를 쓴다
- [ ] 쿠키 배너·로그인 팝업은 미리 닫아둔다. 공간마다 세션이 따로라 **녹화할 공간에서** 닫아야 한다
- [ ] 시작하기 전에 한 번 끝까지 돌려서 페이지를 캐시에 올려둔다(로딩 대기 줄이기)
- [ ] Dock의 정렬을 Masonry로 맞춰둔다(`G`가 이 방식으로 정렬한다)
- [ ] 반복 재생의 이음매: 끝 화면이 첫 화면과 달라진다(정렬 때문). 편집에서 페이드로 잇거나, 첫 화면을 정렬된 상태로 두고 중간에 위젯을 흩뜨리는 장면을 넣는다 — 편집 수준을 정할 때 같이 고른다

---

## 1편 — Prague Trip (여행 계획)

### 시작 상태 (녹화 전에 만들어 둔다)
공간 이름 `Prague Trip`. 위젯은 약간 흩어진 상태로 둔다.

| 위젯 | 내용 |
|---|---|
| Browser | Google Maps — Prague 지도 |
| Browser | Airbnb — Prague 숙소 목록 |
| Browser | 빈 탭 (장면 2에서 주소를 입력한다) |
| Memo | 제목 `Itinerary`, Day 1~3 표 (Old Town / Prague Castle / Vyšehrad) |
| Todo | Book flights ✓ · Get CZK · Buy tram pass · Reserve dinner |
| Column | 제목 `Must-see`, 사진 2장 (Charles Bridge, Old Town Square) |
| Calendar | 여행 날짜가 보이는 달 |

### 순서
| 초 | 할 것 | 보여주는 기능 |
|---|---|---|
| 0–3 | 멀리서 공간 전체를 보여준다. 가만히 둔다 | 한 공간에 여행 자료가 다 모여 있음 |
| 3–5 | 빈 브라우저 위젯 쪽으로 줌 인 | 줌 |
| 5–9 | 주소창에 `prague castle`을 입력하고 Enter. 결과에서 Wikipedia 또는 관광 페이지를 연다 | 브라우저 위젯 |
| 9–12 | 페이지를 천천히 스크롤한다 | 실제 브라우징 |
| 12–15 | 성 사진 우클릭 → `Send image to the canvas` → 오른쪽에 사진 위젯이 생긴다 | 페이지 → 캔버스 |
| 15–18 | 사진 위젯을 끌어 `Must-see` 컬럼에 넣는다 | 컬럼 |
| 18–21 | 운영 시간 문장을 드래그로 선택 → 우클릭 → `Send text to the canvas` | 페이지 → 캔버스 |
| 21–23 | 줌 아웃하고 `G` → 위젯이 Masonry로 정렬된다 | 정렬 |
| 23–25 | `F` → 모든 위젯이 화면에 맞게 보인다 | 한 번에 보기 |

---

## 2편 — New App Idea (브레인스토밍)

### 시작 상태
공간 이름 `New App Idea`.

| 위젯 | 내용 |
|---|---|
| Browser | Product Hunt — 오늘의 제품 목록 |
| Browser | Dribbble — `habit tracker app` 검색 결과 |
| Memo | 제목 `Idea: Habit app`, 문제·타겟·기능 글머리표 5줄 |
| Kanban | Todo: Interview 5 users · Sketch onboarding / Doing: Competitor research / Done: Name ideas |
| Column | 제목 `References`, 앱 화면 2장 |
| Sketch | 화면 흐름 낙서 하나 |
| Timer | 25:00 |

### 순서
| 초 | 할 것 | 보여주는 기능 |
|---|---|---|
| 0–3 | 멀리서 공간 전체를 보여준다 | 아이디어 하나에 공간 하나 |
| 3–5 | Product Hunt 위젯으로 줌 인 | 줌 |
| 5–8 | 목록을 스크롤한다 | 실제 브라우징 |
| 8–11 | 제품 링크 우클릭 → `Open link in a new tab` → 옆에 새 브라우저 위젯이 뜬다 | 링크 → 새 위젯 |
| 11–14 | Dribbble 위젯으로 이동. 화면 이미지 우클릭 → `Send image to the canvas` | 페이지 → 캔버스 |
| 14–16 | 그 이미지를 `References` 컬럼에 넣는다 | 컬럼 |
| 16–20 | Memo 끝에서 `/` → Diagram → 미리 복사해 둔 흐름(`Sign up → Pick habit → Daily check → Streak`)을 붙여넣는다 | 메모 안 다이어그램 |
| 20–22 | Kanban에서 `Competitor research`를 Done으로 옮긴다 | Kanban |
| 22–25 | 줌 아웃 → `G` 정렬 → `F` | 정렬 · 한 번에 보기 |

---

## 두 편에서 뺀 것 (넣으려면 시간이 더 필요)
- 공간 전환 (돌아오면 그대로): 편당 한 공간만 쓰기로 해서 빠졌다. 넣는다면 마지막에 Rail에서 다른 공간을 눌렀다 돌아오는 3초
- 런처 `K`, 포커스 세션, 공간별 로그인 분리
