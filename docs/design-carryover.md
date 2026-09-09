# 디자인 이월 대장 (design carryover)

`design/venue-booking-ui` 가 기능 브랜치를 흡수할 때(AGENTS.md 「브랜치 운영」) **트리를
기능 브랜치와 완전히 동일하게 맞춘다** — 옛날 코드를 한 줄도 남기지 않으려면 부분 병합이
아니라 트리 교체여야 한다. 그 대가로 디자인 브랜치에만 있던 변경은 트리에서 사라진다.

이 문서는 **사라진 디자인을 잃지 않기 위한 대장**이다. 흡수할 때마다 아래 절차를 돈다.

## 절차

1. **흡수 전** — `git log --no-merges <기능브랜치>..<디자인브랜치>` 로 디자인 브랜치
   고유 커밋을 뽑고, 각 커밋의 변경을 항목(D번호)으로 이 문서에 옮겨 적는다.
   커밋 SHA를 반드시 남긴다 — 흡수 커밋의 첫 부모 쪽 조상으로 계속 접근할 수 있다.
2. **흡수** — 트리를 기능 브랜치와 동일하게 만든 merge 커밋 하나. `git diff <기능브랜치> HEAD`
   가 비어야 한다.
3. **분류** — 각 항목을 `재반영` / `폐기` / `무효` 로 판정한다. 판정 근거를 적는다.
   - `무효` 는 흡수한 코드에서 그 문제나 대상 자체가 사라진 경우다. 되살리면 안 된다.
4. **재반영** — 항목별로 현재 코드에 맞춰 다시 구현한다. 체크박스를 채우고 커밋 SHA를 적는다.
   **원본 diff 를 그대로 cherry-pick 하지 않는다** — 흡수한 쪽에서 같은 파일이 리팩터된
   경우가 많아 붙지 않거나 조용히 어긋난다.
5. 처리가 끝난 회차는 「지난 회차」로 접어 둔다.

---

## 회차 2026-09-09 — feat/phase-1 (735abe4) 흡수

- 흡수 커밋: `13b0ac6` (부모 셋: `8c589da` 디자인 · `735abe4` feat/phase-1 ·
  `c7a3452` claude/seoul-arena-booking-system-k6ivh4)
- 갈림점: `b66c79b` (2026-09-04). 디자인 고유 3커밋 / 기능 고유 197커밋.
- `c7a3452` 는 원격 기본 브랜치 설정에 잘못 남아 있는 2026-08-24 구버전이다. 고유 커밋
  3개(FAQ 말머리 datalist, 대관료 표 열 제목 폰트, 시설 제원 메뉴명)의 **내용은 이미
  feat/phase-1 에 들어 있다** — 트리 변화 없이 흡수 기록만 남겼다.

### 사라진 디자인 항목

| # | 내용 | 원본 | 판정 |
|---|---|---|---|
| D1 | 홈 히어로를 화면 세로 가운데로 (`justify-center`, `paddingTop` 을 `--header-h` 만으로), 제목 `text-d2` 를 `xl:` → `lg:` 에서 | `8c589da` `src/app/page.tsx` | **무효** |
| D2 | 홈 사진 무대: 시작 폭 3칼럼 → **4칼럼**, `useStageProgress(run, startAt)` 인자 추가해 `startAt=0.7` 로 더 일찍 올라오게 | `b4fbdca` `src/components/home/PhotoStage.tsx` | **무효** |
| D3 | `measure-4col` 을 `min-width:1024px` 에서만 적용(한 칼럼으로 쌓이는 화면에서는 지면을 꽉 채우게) | `8c589da` `src/app/globals.css` | **무효** |
| D4 | 펼친(모바일) 메뉴의 「대관신청」을 텍스트 대신 **검정 버튼**(`btnClass("primary","lg")`)으로, 왼쪽 선 정렬 | `8c589da` `src/components/PublicHeaderNav.tsx` | **재반영** |
| D5 | 푸터 Contact 이메일 주소를 항상 `whitespace-nowrap`(기존엔 `lg:` 이상에서만) | `8c589da` `src/components/ui/SiteFooter.tsx` | **재반영** |
| D6 | 위저드 요약 패널 윗변을 단계 바 아래 선에 맞춘다 — 단계 바를 본문 칼럼 안이 아니라 **그리드의 한 줄**로 올리고, 컨테이너 `gap-y-10`→`gap-y-0`, 본문·요약에 각각 `mt-10` | `93fabce` `StepNav.tsx` `SummaryPanel.tsx` `WizardShell.tsx` | **재반영** |

### 판정 근거와 재반영 메모

- **D1 · D2 무효 (홈)** — 흡수한 쪽에서 **홈이 통째로 다시 짜였다.** 스크롤 사진 무대가
  사라졌다: `src/components/home/PhotoStage.tsx` 와 `StackedStatements.tsx` 가 삭제되고
  `Manifesto.tsx` 로 대체됐으며(Figma Wireframe › Layout / 608 규격), `useStageProgress`
  참조도 코드에 하나도 없다. `src/app/page.tsx` 는 185줄 바뀌어
  **히어로 → 브랜드 선언문(블랙 밴드) → 전환 CTA** 3단이 됐고, 히어로는 `Band tone="light"`
  안의 제목·리드·버튼 두 개·`Media ratio="21/9"` 다. 세로 가운데 정렬도, 사진 무대도
  되살릴 자리가 없다.
  요청자 방침("홈은 메인 기준, 애니메이션도 기존 기준")과 결과가 같으므로 그대로 닫는다.
  **흡수 후 홈 애니메이션의 기준은 스크롤 진행도가 아니라 진입 페이드업이다** —
  `animate-[fade-up_0.7s_ease_both]` 에 `[animation-delay:120ms]`·`200ms` 로 제목→리드→버튼
  계단을 준다(`page.tsx` 54~72행). 다른 페이지에 애니메이션을 얹을 때 이 결을 따른다.
- **D3 무효** — 흡수한 코드에 `measure-4col` 유틸리티가 없다. 산문 폭이 컬럼 스팬과 무관한
  절대값 `--measure: 48rem` 로 옮겨갔고(`globals.css` 94·358행), 그래서 좁은 화면에서 4/6
  폭으로 접히는 문제 자체가 없다. **되살리면 폭 규칙이 두 갈래로 갈린다.**
- **D4** — 흡수한 코드도 같은 자리에 텍스트 링크로 남아 있다(`PublicHeaderNav.tsx` 550~560행,
  주석 `[수정 2026-09-02]`). 원본 diff 가 거의 그대로 붙는다.
- **D5** — 흡수한 쪽에서 푸터가 `FooterField` 컴포넌트로 리팩터됐다(`SiteFooter.tsx` 54·141행).
  `mailto` 를 직접 쓰던 자리가 없어졌으므로 `FooterField` 의 `<a>` 에 적용해야 한다.
  Contact 만 nowrap 이 필요하니 필드 단위로 켤 수 있게 한다.
- **D6** — 흡수한 쪽에서 `WizardShell` 이 크게 바뀌었다(요약 패널 `lg:col-span-2` → `3`,
  STEP5 에서 요약 패널을 접는 분기 추가, 파일 길이 2배). 원본 diff 는 붙지 않는다.
  **다시 구현해야 한다.** 확인할 것: 요약 패널을 접는 단계에서도 본문 위 여백이 남는지,
  `StepNav` 의 `mb-10`(120행)과 새 `mt-10` 이 겹쳐 여백이 두 배가 되지 않는지.

---

## 회차 2026-09-09 추가 조사 — Revert 로 사라진 디자인 시스템 전체

**위 D1~D6 은 사라진 것의 전부가 아니었다.** 「디자인 브랜치 고유 커밋」만 세었기 때문이다.
실제로는 `feat/phase-1` 에

```
6470539 Revert "Merge remote-tracking branch 'origin/design/venue-booking-ui' into feat/phase-1"
        (2026-09-04, 0119de4 를 되돌림)
```

이 있다. 디자인 브랜치가 한 번 병합됐다가 **통째로 되돌려졌고**, 그 뒤 갈림점이 다시
잡혀서 고유 커밋이 3개로만 보였던 것이다. 그래서 갈림점 이전에 쌓인 디자인 시스템
전체가 흡수와 함께 트리에서 사라졌다.

측정으로 확인되는 규모: `rounded-surface` 86곳 · `rounded-btn` 81곳 → **0곳**,
`globals.css` 300줄 감소, `kit.tsx` 694줄 변경, `design-system.md` 233줄 변경.

**흡수 전 디자인 브랜치는 `8c589da` 로 영구 접근할 수 있다**(흡수 커밋 `13b0ac6` 의 첫
부모). 아래 항목은 전부 `git diff 8c589da <현재> -- <파일>` 로 원본을 꺼낼 수 있다.

### 제외 합의 (2026-09-09)

요청자 방침에 따라 **세 갈래는 메인 기준으로 두고 되살리지 않는다.**

| 제외 | 사라진 내용(참고용) |
|---|---|
| 홈 화면 | 히어로 세로 가운데, `PhotoStage`(스크롤 사진 무대), `StackedStatements`, `--stack-head`, `text-lead`(40/24 히어로 전용 단) |
| 그리드 변경 | 6컬럼(현재 12), 마진 32·거터 12 고정(현재 64~20 / 40~16), `measure-4col`, 2col+4col 분할(현재 3col+9col), 스팬 2의 배수 규칙 |
| rounded corner | `--radius-surface: 12` · `--radius-btn: 4`, Tailwind `sm/md/lg` 되돌림, 입력칸·토글의 `rounded-btn` |

### 남는 항목 — 재반영 후보

| # | 갈래 | 내용 | 원본 위치 |
|---|---|---|---|
| G1 | 버튼 호버 | **호버 = 옐로 면 하나로 통일**(`--btn-hover-bg`/`--btn-hover-fg`, `BTN_HOVER`). 옐로 지면(CTA 배너)에서는 밴드가 흰색으로 뒤집는다(`BAND_VARS.accent`). 현재는 호버 연출이 없다 | `globals.css` · `kit.tsx` |
| G2 | 버튼 규격 | 사이즈 스케일이 다르다 — 디자인: `sm h-11 px-4 text-s` / `md px-4 text-base` / `lg h-12 px-4 text-base`, 현재: `sm text-xs` / `md px-5 text-s` / `lg px-6 text-s` | `kit.tsx` `btnClass` |
| G3 | 토글·칩 | `px-4 text-s`(현재 `px-3 text-xs`) | `kit.tsx` `toggleClass` |
| G4 | 링크 호버 | 밑줄 색이 `foreground` 로 진해진다(현재 `accent`) | `kit.tsx` |
| G5 | select 화살표 | **화살표를 직접 그린다.** 브라우저 기본 화살표는 패딩 밖 테두리 안쪽에 붙어 오른쪽 여백이 아무리 커도 벽에 닿은 채 남는다 — 배경 SVG 로 깔아 **왼쪽 글자 여백과 같은 14** 만큼 띄운다 | `globals.css` `@utility field` |
| G6 | 입력 포커스 | 포커스 표시를 **테두리 색 하나**로(회색→검정). 현재는 옐로 `outline: 2px` + offset 1 이라 입력칸이 경고 상자처럼 보인다 | `globals.css` |
| G7 | 체크박스·라디오 | 규칙은 **지면과 반대색** — 지면 위에서는 검정 채움/흰 표시, 선택된 칩(검정 면) 안에서는 흰 채움/검정 표시. `--check-fill` 토큰 + `.bg-inverse-bg` 두 경로 | `globals.css` |
| G8 | 간격 팔레트 | **이름 있는 세로 간격 토큰 20여 개.** `section-top 80`, `section-lg/md/sm 80·64·40`, `head-lead 64`, `head-block 40`, `lead-action 40`, `inline 12`, `block 48`, `card-pad 32`, `card-body 40`, `cta-gap/pad/pad-x 40·80·24`, `foot-top/bottom/label/mark 96·40·16·80`, `tabbar 72`, `article-search 90`. 이름은 크기가 아니라 **역할**이라 한 줄만 고치면 그 역할을 쓰는 모든 화면이 함께 움직인다. 현재는 「제목→국문 16 · 머리글→리드 12 · 머리글→본문 40」 세 값뿐 | `globals.css` |
| G9 | 반응형 타이포 | **루트 글자 크기를 화면 폭에 매단다** — `html { font-size: min(1rem, 100vw / 90) }` (1024 이상). 크기 값이 전부 `rem` 이라 루트 하나만 줄이면 지면 전체가 같은 비율로 줄고 **줄바꿈이 유지된다**(1440 에서 두 줄이던 제목이 1200 에서 세 줄이 되던 문제) | `globals.css` |
| G10 | 상단바 크기 고정 | `.header-scale-lock` — 상단바만 G9 축소에서 뺀다. 메뉴는 읽는 글이 아니라 **누르는 도구**라 함께 작아지면 글자도 누를 자리도 줄어든다 | `globals.css` |
| G11 | 타이포 팔레트 | `text-r`(16)을 **푸터 전용**으로 좁히고 `text-l`(20)은 팔레트에서 뺐다. `text-m` 줄높이 1.6(현재 1.5) | `globals.css` |
| G12 | 선 3단 | `border-border`(검정) 덩어리 시작·끝 / `border-border/25` 항목 사이 헤어라인 / `border-border-soft`(#CCC) 입력칸. **그 사이 값(`/15`·`/40`·`/60`)을 만들지 않는다.** 여러 항목을 더하는 목록은 항목 사이에 선을 긋지 않고 여백으로 가른다 | `design-system.md` §4 |
| G13 | 면 규칙 | `bg-background` 지면(순백 금지) / `bg-panel` 카드·패널 / `bg-inverse-bg` 검정 밴드. 검정 밴드 안 흰 카드는 `PLAIN_SURFACE_VARS` 로 색 토큰을 국소 반전. **섹션을 가르는 것은 가로선이 아니라 카드다** | `design-system.md` §4 |
| G14 | 안내 상자 | 접수 안내·반려 사유·초대 링크·오류를 **한 종류**로 — 흰 면·테두리 없음, 종류는 **글자 색으로만**(오류 `text-danger`). 테두리 색으로 종류를 나누지 않는다 | `design-system.md` §4 |
| G15 | 선택 표현 | **선택 = 검정 채움.** 옐로 하이라이트·컬러 바·배지 같은 다른 언어를 만들지 않는다 | `design-system.md` §0 |
| G16 | 컨트롤 단일 출처 | 버튼·컨트롤은 `btnClass`/`toggleClass`/`choiceClass` **로만** 만든다 | `design-system.md` §0 |
| G17 | 표 컴포넌트 | `ComparisonTable`(모든 수치·데이터 표의 표준) · `GroupedSpecTable`(묶음 있는 라벨/값, `SpecTable` 과 값 열이 같은 세로선에 떨어져 위아래로 놓을 수 있다) · `SplitSection`. **이 셋이 현재 코드에 없다** — `design-system.md` 표에는 남아 있어 문서와 코드가 어긋난 상태다. `SpecTable` 은 있다(`kit.tsx` 502행) | `kit.tsx` |
| G18 | kit 보조 | `EYEBROW_CAPS` · `INVERSE_SURFACE_VARS` · `headingFontClass`(영문 Archivo / 국문 KakaoBig 자동 전환) · `InlineLinks` · `Label` · `RemoveIcon` | `kit.tsx` |
| G19 | 레이아웃 모듈 정리 | 디자인 브랜치는 `LayoutCards`~`LayoutSticky`(Layout 1~7) · `PageHeading` · `CenterHeading` 을 **정리해 없앴다**(모듈이 겹쳐 같은 화면을 두 갈래로 만들었다). 현재 코드에도 `Layout*` 과 `CenterHeading` 은 **없다** — 남은 것은 `PageHeading` 뿐이다. 다만 `design-system.md` §4 표는 아직 일곱 모듈을 표준으로 적고 있다(문서만 앞서 있음) | `kit.tsx` |
| G20 | 파일 선택 | `FilePicker` 컴포넌트(152줄). 현재 없다 | `src/components/ui/FilePicker.tsx` |
| G21 | 스크롤 텍스트 | `ScrollFillText` — 스크롤에 따라 글자가 채워지는 효과. 현재 없다 | `src/components/ScrollFillText.tsx` |
| G22 | 푸터 소셜 | 소셜을 **아이콘 대신 이름 텍스트**로. 아이콘 세 개가 나란히 서면 주소·연락처와 다른 종류의 덩어리로 보여 왼쪽 열이 두 겹으로 읽혔다. **링크가 없는 채널(YouTube)은 싣지 않는다** — 눌러야 없다는 걸 아는 링크는 고장으로 보인다. 현재는 브랜드 아이콘 SVG 3종 | `SiteFooter.tsx` |
| G23 | 푸터 타이포 | 열 머리 14 대문자 옅게 / 본문 16 한 크기(주소부터 페이지 이름까지). **굵기가 아니라 크기와 색으로만** 가른다 | `SiteFooter.tsx` |
| G24 | 푸터 줄바꿈 | 푸터 링크 전체 `whitespace-nowrap`. 지면에 `overflow-wrap: break-word` 가 걸려 있어 열 폭이 168 인데도 "Instagram" 이 "Instag / ram", "대관 절차" 가 "대관 / 절차" 로 접혔다 (D5 를 이 규칙으로 흡수) | `SiteFooter.tsx` |
| G25 | 푸터 사이트맵 | `Book It` 도 뺀다 — 링크 한 장짜리라 열 하나를 차지할 내용이 없고 상단바에 늘 떠 있다. 현재는 3열(Your Stage / Your Guide / Book It) | `SiteFooter.tsx` |
| G26 | 상단바 페이드 | 상단바 아래 페이드를 **60% 지점부터 3단**으로. 84% 에서 한 번에 투명으로 떨어뜨리면 사람 눈이 알파의 선형 변화를 고르게 보지 않아 **아랫변에 선이 그어진 것처럼** 보인다. 현재는 84% 한 단 | `globals.css` |
| G27 | 페이지 머리글 | `PageHead` — 탭이 없는 화면도 `tabbar`(72) 만큼 빈 자리를 두어 **탭 유무와 무관하게 제목이 같은 높이에서** 시작한다. 탭 유무로 제목이 72 씩 오르내리면 메뉴를 옮길 때마다 화면이 덜컥거린다 | `kit.tsx` |
| G28 | 목차 | 항목 사이 **가로줄을 두지 않는다**(목차는 표가 아니라 목록이고, 줄이 촘촘하면 본문보다 먼저 눈에 들어온다). 검색 개수 배지는 **제목 바로 옆**(현재는 오른쪽 끝으로 밀려 어느 장의 개수인지 다시 이어 붙여야 한다). 검색 이동 버튼은 옐로 호버. 본문은 검색 블록 한 통(`article-search` 90)만큼 내려가 목차 머리와 같은 줄에서 시작 | `ArticleLayout.tsx` |
| G29 | FAQ | 글자는 본문 한 단만 — **질문 14 Bold / 답변 14 Regular**. 묶음 번호·`Q`·`A` 말머리를 두지 않는다(구조가 이미 같은 말을 한다). 우측 셰브런은 펼치면 180° 회전, 행 좌우 패딩 16 | `FaqAccordion.tsx` |
| G30 | 절차 다이어그램 | `ProcessSteps` — 카드 사이 **화살표와 테두리를 두지 않는다**(순서는 번호가 이미 말한다). 현재는 한 줄 4박스 × 2줄 + 사이 화살표 | `kit.tsx` |
| G31 | 펼친 메뉴 | 펼친(모바일) 메뉴의 「대관신청」을 검정 버튼으로 (= D4) | `PublicHeaderNav.tsx` |
| G32 | 위저드 요약 | 요약 패널 윗변을 단계 바 아래 선에 맞춤 (= D6) | `WizardShell.tsx` 외 |
| G33 | 미리보기 화면 | `register/preview`(가입 약관 미리보기) · `admin/content/wizard-preview`. 현재는 후자가 `WizardTextPreview` 컴포넌트로 대체돼 있다 | 해당 경로 |

### 주의

- **G8·G9·G11 은 서로 물려 있다.** 간격 팔레트가 `rem` 이라는 전제 위에서 G9(루트 축소)가
  성립한다. 셋 중 하나만 되살리면 여백이 두 체계로 갈린다.
- **G17 은 문서가 이미 앞서 있다.** `design-system.md` 표가 `ComparisonTable` 등을 표준으로
  적고 있는데 코드에 없다 — 재반영하든 문서를 고치든 한쪽으로 맞춰야 한다.
- G12~G16 은 코드가 아니라 **규칙**이다. 되살리려면 문서(`design-system.md` §0·§4)를
  먼저 되돌리고 화면을 그 규칙에 맞춰 고치는 순서다.
