# 디자인 시스템 재조정 — 판정 로그

세 문서의 역할을 갈라 둔다.

| 문서 | 답하는 질문 |
|---|---|
| `design-carryover.md` | 흡수로 **무엇이 사라졌나** (인벤토리, G1~G33) |
| **이 문서** | 그 각각을 **어떻게 할 것인가** (판정 · 계층 · 진행) |
| `design-system.md` | 최종적으로 **무엇이 규격인가** (구현과 일치해야 하는 계약) |

목표는 예전 브랜치의 복원이 아니다. **최신 기능 구조를 유지한 채, 쓸 만한 디자인 시스템
결정만 골라 올바른 계층에 다시 세우는 것**이다. 예전 구현이 자동으로 더 낫다고 보지 않는다.

## 판정 어휘

- **KEEP CURRENT** — 현재 구현이 더 적절하다
- **RESTORE** — 예전 결정을 되살린다 (구현까지 거의 그대로 쓸 수 있다)
- **REIMPLEMENT** — 의도는 맞지만 예전 구현을 복사하지 않는다. 현재 아키텍처로 다시 세운다
- **DROP** — 더는 쓸모가 없거나 불필요한 갈래를 만든다
- **DEFER** — 영향 범위가 커서 별도 승인이 필요하다

## 계층 (Systemize)

`token` → `primitive` → `component` → `layout` → `page` → `doc`(문서만)

**한 화면씩 값을 되살리지 않는다.** 재사용되는 규칙이면 공유 계층에 넣는다.

---

## 1. 검증 베이스라인 (2026-09-09, 커밋 `9e25060` 기준)

이후 변경이 회귀를 냈는지 판별할 기준선이다.

| 항목 | 값 |
|---|---|
| `npm run lint` | **0 errors / 3 warnings** — 전부 `MemberApprovalPanel.tsx`(미사용 `btnClass`·`busy`·`act`) |
| `npm run test` | **45 파일 / 510 테스트 전부 통과** (1.24s) |
| `node_modules` | 설치됨 (`--cache` 우회 필요, `booking-local-dev-postgres` 참고) |

### 시스템 일관성 실측 — 리팩터링의 근거

| 지표 | 측정값 | 뜻 |
|---|---|---|
| **선(border) 갈래** | `border-border-soft` 165 · `border-border` 87 · `/25` 81 · **`/15` 37 · `/20` 33 · `/40` 12 · `/30` 5 · `/60` 4 · `/50` 2 · `/10` 1** | 3단 규칙이 무너져 **94곳이 규칙 밖**이다 |
| `<table>` 직접 작성 | **29 파일** | 표 프리미티브(`SpecTable`)는 4곳뿐 |
| 세로 간격 임의값 | `mt/mb/py/pt/pb/gap` 두자리 **123곳** | 간격 팔레트가 없어 자리마다 숫자를 박았다 |
| 임의 폭·높이 | `w-[` `h-[` `max-w-[` 등 **52곳** | |
| 임의 글자 크기 | `text-[…]` **15곳** | |
| `accent-color` 설정 | **없음** | 체크박스·라디오가 브라우저 기본색으로 나온다 |
| `text-r` / `text-l` | **0곳** (토큰 정의도 없음) | 이미 정리돼 있다 — `globals.css:180` 주석에만 이름이 남아 있다 |

---

## 2. 문서-구현 불일치 — 먼저 해소한다

`design-system.md` 는 governing reference 인데, **표준으로 적힌 컴포넌트 상당수가 코드에
없다.** 문서가 앞서 나간 상태이므로 문서도 재조정 대상이다.

### 문서에는 표준인데 코드에 없는 것

| 이름 | 문서 위치 | 처리 |
|---|---|---|
| `LayoutCards` `LayoutFeatures` `LayoutHorizCards` `LayoutColumns` `LayoutTextColumns` `LayoutAlternating` `LayoutSticky` (Layout 1~7) | §4 레이아웃 모듈 표 | **문서에서 제거** (G19 DROP) |
| `CenterHeading` | §4 | 문서에서 제거 |
| `OverviewCards` `FacilityCard` `LabeledList` | §3 스팬 표 · §4 | 문서에서 제거 — 실제로는 `FeatureList`·`TitledCard`·`StatCards` 가 그 자리를 맡고 있다 |
| `ComparisonTable` | §4 「**모든 수치·데이터 표의 표준**」 | G17 로 재설계 — 표준을 지정했는데 물건이 없는 상태가 가장 위험하다. `StepConfigOptions.tsx:214` 주석도 이 이름을 참조한다 |
| `GroupedSpecTable` | §4 | G17 로 함께 판단 |
| `SplitSection` | §3·§4 (머리글 옆 배치의 표준) | G17 — 사용자 요구 「responsive split layout」 프리미티브로 재설계 |

### 코드에 있는데 문서에 없는 것

`EYEBROW` · `FILE_INPUT` · `ICON_BTN_SM` · `PLAIN_SURFACE_VARS` · `CHOICE_SELECTED_VARS` ·
`valueHeadingClass` · `Badge` · `EmptyState` · `StatCards` · `TitledCard` · `Note` ·
`Dialog`/`DialogProvider` · `Toast`/`ToastProvider` · `Breadcrumb` · `AuthShell`/`AuthField` ·
`MoneyInput` · `PasswordInput` · `PasswordMatchHint` · `InputCheckMark` · `Reveal` ·
`QueryTabs` · `Prose` · `RichText` · `Multiline` · `Media` · `PhotoHero` · `DocumentList`

→ 최종 `design-system.md` 의 **UI 프리미티브 / 레이아웃 프리미티브** 절에서 실물 기준으로
다시 쓴다. 문서가 실제 시스템을 설명하지 못하면 다음 작업자가 또 국소 규칙을 만든다.

---

## 3. G1~G33 판정

| # | 항목 | 판정 | 계층 | 근거 |
|---|---|---|---|---|
| G1 | 버튼 호버 = 옐로 면 | **REIMPLEMENT** | token + primitive | 현재 버튼에 호버 피드백이 **아예 없다**. 다만 예전처럼 색을 클래스에 흩지 않고 `--btn-hover-*` 토큰 + `btnClass` 한 곳에서만 |
| G2 | 버튼 사이즈 스케일 | **KEEP CURRENT** | — | 예전은 `md`·`lg` 에 `text-base`(16)를 썼는데, 같은 브랜치가 「16은 푸터 전용」이라고 정해 놓았다 — 자기 규칙과 모순. 현재 `text-s` 가 §2 와 맞다 |
| G3 | 토글·칩 `text-s` | **KEEP CURRENT** + 문서 갱신 | doc | 현재 `sm` 버튼과 토글이 모두 `text-xs` 로 **밀도 위계가 일관**된다. 문서 §2 의 「컨트롤도 `text-s`」를 「밀도 높은 컨트롤(sm·토글)은 `text-xs`」로 고쳐 실물에 맞춘다 |
| G4 | 링크 밑줄 호버 `foreground` | **RESTORE** | primitive | 현재 `decoration-accent` 는 밝은 지면에서 대비 **1.5:1** — 호버 피드백이 사실상 보이지 않는다 |
| G5 | select 화살표 직접 그리기 | **REIMPLEMENT** | token | 기능적 결손(기본 화살표가 오른쪽 벽에 붙는다)은 실재한다. 그러나 예전 구현은 SVG stroke 를 `%23000` 으로 **하드코딩**해 검정 면에서 사라진다 → `currentColor` 기반으로 다시 |
| G6 | 입력 포커스 표시 | **REIMPLEMENT** | token | 양쪽 다 그대로 쓰지 않는다. 현재(옐로 아웃라인)는 대비 1.5:1 로 **접근성상 약하고**, 예전(테두리 색만)은 형태 변화가 없어 약하다 → 고대비 `foreground` 아웃라인 |
| G7 | 체크박스·라디오 지면 반대색 | **RESTORE** | token | 현재 `accent-color` 설정이 **하나도 없다** — 브라우저 기본색이 그대로 나온다 |
| G8 | 간격 팔레트 | **REIMPLEMENT** | token | 임의값 123곳이 근거다. 다만 예전 20여 토큰을 통째로 되살리지 않는다 — `article-search`(90) 처럼 **한 화면 전용 값은 one-off** 라 재도입하지 않고, 역할 기반 소수(섹션·머리·블록·카드·인라인)로 줄인다 |
| G9 | 루트 글자 크기를 화면 폭에 매달기 | **적용 완료 + 하한 보정** (승인 2026-09-09) | token | `html { font-size: max(0.875rem, min(1rem, 100vw / 90)) }`, `lg` 이상. 하한 없이 넣었더니 1024 에서 루트 11.4 → 본문 **10px** 이라 요청으로 하한 14 를 넣었다(본문 12.25 에서 멈춘다). 하한이 `rem` 이라 사용자 기본 글자 크기 설정에 비례하는 부수 효과도 있다 |
| G10 | 상단바를 축소에서 빼기 | **적용 완료 (REIMPLEMENT)** | token + component | **예전 구현은 무효였다** — `.header-scale-lock { --text-s: 14px }` 로 잠그려 했지만 크기 토큰이 `@theme inline` 이라 `.text-s` 가 `font-size: .875rem` 로 값이 인라인돼 변수를 보지 않는다. 간격만 변수로 잠기므로(`calc(var(--spacing) * n)`) 간격은 `.header-scale-lock` 으로, 글자는 상단바 전용 단(`text-nav-xs`·`text-nav`·`text-nav-lg`)으로 나눠 세웠다. `PublicHeaderNav` 23곳 치환 |
| G11 | `text-r`·`text-l` 팔레트에서 빼기 | **이미 반영됨** | — | 토큰 정의도 사용처도 없고 문서도 「팔레트에서 뺐다」고 적고 있다 — 세 곳이 일치한다. 처음에 「각 1곳 사용」으로 센 것은 `globals.css:180` 의 **주석**을 사용처로 잘못 센 것이다 |
| G12 | 선 3단 | **RESTORE** + 리팩터 | token + refactor | **최우선.** 현재 8갈래 중 94곳이 규칙 밖이다. 같은 역할의 선이 화면마다 다른 진하기로 보인다 |
| G13 | 면 규칙 (지면·패널·검정 밴드) | **KEEP CURRENT** | doc | `BandTone`·`PLAIN_SURFACE_VARS` 로 이미 구현돼 있다. 문서화만 |
| G14 | 결과 안내 상자 한 종류 | **REIMPLEMENT** | primitive | 현재 `Note` 는 안내 상자가 아니라 **각주**(`border-t` + `text-xs` + muted, 4곳). 접수·반려·오류를 담을 규격이 없다 → 별도 프리미티브 |
| G15 | 선택 = 검정 채움 | **KEEP CURRENT** | doc | `CHOICE_SELECTED_VARS`·`choiceClass` 로 구현돼 있다(9곳). 문서화 |
| G16 | 컨트롤 단일 출처 | **REIMPLEMENT** | refactor + doc | 표 29파일·버튼 다수가 헬퍼를 우회한다. 한 번에 못 고치므로 프리미티브를 먼저 세우고 점진 이행 |
| G17 | 표 프리미티브 | **REIMPLEMENT** | component | `<table>` 직접 29파일 vs `SpecTable` 4곳. 예전 `ComparisonTable` 을 그대로 되살리는 대신 **현재 표 사용 패턴을 조사해 필요한 것만** 정의한다. `SplitSection` 은 「responsive split layout」 프리미티브로 |
| G18 | `EYEBROW_CAPS`·`InlineLinks`·`Label` 등 | **DROP** (부분) | — | `EYEBROW` 는 이미 있다. 나머지는 현재 코드에 수요가 없다 — 쓰이지 않는 헬퍼는 갈래만 늘린다 |
| G19 | Layout 1~7 정리 | **DROP** | doc | 코드에 이미 없다. **문서에서만 지우면 끝** |
| G20 | `FilePicker` | **REIMPLEMENT** | primitive | 현재는 `FILE_INPUT` 상수뿐이다. 요구된 프리미티브 목록에 들어 있고, 파일 첨부는 위저드의 필수 경로다 |
| G21 | `ScrollFillText` | **DROP** | — | 현재 `Reveal`(옐로 커튼 와이프)이 모션 프리미티브로 있다. 둘 다 두면 모션 언어가 갈린다 |
| G22 | 푸터 소셜 | **부분 RESTORE** | component | 아이콘 자체는 Figma Style Guide 근거가 있어 **KEEP**. 그러나 **`href: null` 인 YouTube 가 실제로 실려 있다**(`SiteFooter.tsx:35`) — 「링크 없는 채널은 싣지 않는다」 규칙만 되살린다 |
| G23 | 푸터 타이포 2단 | **KEEP CURRENT** | doc | 현재 `FooterField` 가 `text-s` 로 통일돼 있다. 예전 16(=`text-r`)은 G11 과 충돌 |
| G24 | 푸터 링크 `whitespace-nowrap` | **RESTORE** | component | 지면 전역 `overflow-wrap: break-word` 때문에 채널·페이지 이름이 실제로 접힌다 |
| G25 | 사이트맵에서 `Book It` 제외 | **DROP** | — | 현재 3열이 Figma Footer/1 규격이다 |
| G26 | 상단바 페이드 60%부터 3단 | **RESTORE** | token | 84% 한 단은 알파가 급히 떨어져 **아랫변에 선이 그어진 것처럼** 보인다 |
| G27 | 탭 없는 화면도 탭 자리를 비워 제목 높이 통일 | **REIMPLEMENT** | layout | 화면 간 제목 높이가 어긋나는 것은 시스템 문제다. 다만 `tabbar: 72` 고정값 대신 `QueryTabs` 실측 높이에 맞춘 토큰으로 |
| G28 | 목차 — 가로줄 없음 · 개수 배지를 제목 옆에 | **부분 RESTORE** | component | `ArticleLayout` 한 곳이라 국소 처리. 배지를 오른쪽 끝에 두면 어느 장의 개수인지 다시 이어 붙여야 한다 |
| G29 | FAQ 규격 | **보류** | — | `FaqAccordion` 현재 구현 실측 후 판정 |
| G30 | 절차 다이어그램 화살표 제거 | **KEEP CURRENT** | — | 현재 4박스×2줄+화살표가 Figma `ProcessSteps` 정본에 더 가깝다. 예전 근거(「순서는 번호가 말한다」)도 타당하지만 정본을 이긴다고 보기 어렵다 |
| G31 | 펼친 메뉴 「대관신청」 검정 버튼 | **RESTORE** | component | 카테고리 제목이 줄줄이 선 목록에서 텍스트로 두면 그중 하나로 묻힌다 |
| G32 | 위저드 요약 패널 윗변 정렬 | **REIMPLEMENT** | layout | `WizardShell` 이 크게 바뀌어(요약 `col-span-2`→`3`, STEP5 접기 분기) 예전 diff 가 붙지 않는다 |
| G33 | `register/preview` 미리보기 | **KEEP CURRENT** | — | `WizardTextPreview` 로 대체됐다 |

### 판정 집계

**KEEP CURRENT 8** · **RESTORE 7**(부분 1 포함) · **REIMPLEMENT 10** · **DROP 5** ·
**이미 반영 1** · **보류 1** · **적용 완료 2**(G9 · G10)

---

## 4. 실행 순서

계층이 낮은 것부터 간다 — 토큰이 흔들리는 상태에서 컴포넌트를 고치면 두 번 고친다.

| 단계 | 내용 | 항목 |
|---|---|---|
| **1** | 문서-구현 불일치 해소 (문서에서 허수 컴포넌트 제거) | §2, G19 |
| **2** | 토큰 정리 — 선 3단, 간격 팔레트, 타이포 단 축소 | G12 · G8 · G11 |
| **3** | 폼·컨트롤 토큰 — 포커스, select 화살표, 체크박스, 버튼 호버 | G6 · G5 · G7 · G1 · G4 |
| **4** | 프리미티브 — 안내 상자, FilePicker, 표/split | G14 · G20 · G17 |
| **5** | 레이아웃 — 제목 높이 통일, 위저드 요약 정렬 | G27 · G32 |
| **6** | 국소 — 푸터 3건, 상단바 페이드, 목차, 펼친 메뉴 | G22 · G24 · G26 · G28 · G31 |
| **7** | `design-system.md` 전면 재작성 (실물 기준) | 전체 |

각 단계 끝에 lint·test 와 390/320 폭 확인을 돌리고 커밋한다. **push 는 승인 후에만.**

## 4-1. 요청으로 추가된 결정 (G 목록 밖)

| 날짜 | 내용 | 계층 | 근거 |
|---|---|---|---|
| 2026-09-09 | **루트 축소에 하한 14** — `max(0.875rem, …)` | token | 1024 에서 본문이 10px 까지 내려가 읽기 부담스러웠다 |
| 2026-09-09 | **홈 브랜드 선언문 제목을 지면 폭에 유동시킨다** — `text-d2-fluid` = `clamp(40px, 6.6667vw, 96px)` | token + page | `text-h1-m sm:text-d2` 라 **640 에서 40 → 96 으로 점프**하고 그 뒤로는 루트 축소만 따랐다. 루트 축소는 `lg` 이상 전용이고 하한이 붙은 뒤 1024~1260 도 고정이라, 640~1260 이 통째로 비어 좁은 데스크톱에서 제목 한 글자가 지면의 6분의 1을 먹었다. `vw` 로 600~1440 을 연속으로 잇는다. 계수 6.6667vw = 96/1440 이라 정본 폭에서 `text-d2` 와 값이 같다. `rem` 을 섞지 않는다 — 루트 축소와 겹쳐 이중으로 줄어든다 |

홈은 「메인 기준」이 방침이므로 **선언문 제목 한 곳만** 바꿨다. 히어로(`text-d2-m lg:text-d2`)도
같은 점프를 갖고 있지만 요청 범위가 아니라 두었다 — 필요하면 같은 유틸리티를 쓰면 된다.

## 5. 승인 이력

- **G9 · G10 — 2026-09-09 승인, 적용 완료.** 검증: 빌드 성공, 컴파일된 CSS 에
  `html{font-size:min(1rem,1.11111vw)}` · `.text-nav{font-size:14px}` ·
  `.header-scale-lock{--spacing:4px}` 생성 확인, lint 0 errors / 3 warnings(베이스라인
  동일), test 45파일 510개 통과(동일). 축소가 `lg` 이상에서만 걸려 390·320 모바일에는
  영향이 없다. `<header>` 는 portal 을 쓰지 않아 변수 상속이 끊기지 않는 것도 확인했다.
  **아직 못 한 검증: 실제 브라우저에서 1024·1280·1440 폭의 눈 확인** — 로컬 서버(Postgres)
  구동이 필요해 다음 단계에서 환경을 세울 때 함께 한다.
