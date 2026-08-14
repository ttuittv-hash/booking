# Seoul Arena — Business layer 디자인 시스템

출처
- Kakao Arena Brand Guidelines 0.1
- Figma `2607 서울아레나 웹사이트 Full` › WORKSPACE › **Wireframe** / **Style Guide** / Design
- Notion `(웹사이트) 대관·비즈니스 사이트 구조 기획`

새 화면을 만들거나 기존 화면을 고칠 때 **여기 정의된 레이아웃과 컴포넌트만** 쓴다.
없으면 Figma에서 먼저 찾고, 그래도 없으면 만들지 말고 물어본다.

---

## 0. 절대 규칙

1. **아이브로(Tagline)를 쓰지 않는다.** Figma 레이아웃에 Tagline 슬롯이 있어도 비운다.
2. **버튼·컨트롤은 Figma UI Elements 에 있는 것만.** 옐로 버튼은 시스템에 없다.
3. **이미지 슬롯은 `Media` 컴포넌트.** `src` 가 없으면 회색 플레이스홀더가 나온다. 임의의 그라디언트·아이콘을 만들지 않는다.
4. **코너는 샤프.** `rounded-*` 를 새로 붙이지 않는다.
5. **임의 값 금지.** `text-[13px]`, 하드코딩 hex, 임의 radius 전부 토큰으로.
6. **옐로는 밝은 지면 위 텍스트로 쓰지 않는다.** (#FFCD00 on #F2F0EF = 1.5:1) 면·강조·구분선에만. 옐로 면 위 텍스트는 검정(14:1), 블랙 면 위 옐로 텍스트는 허용(11:1).

## 1. 컬러

Primitive (Figma Style Guide › Variables)

| | |
|---|---|
| White `#FFFFFF` · Neutral Lightest `#F2F0EF` · Lighter `#CCCCCC` · Light `#AAAAAA` | Neutral `#666666` · Dark `#444444` · Darker `#222222` · Darkest `#000000` |
| Accent Yellow `#FFCD00` | |

컴포넌트는 항상 시맨틱 토큰을 쓴다. 원시값(hex)을 직접 쓰지 않는다.

| 토큰 | 값 | 용도 |
|---|---|---|
| `background` | `#F2F0EF` | 지면. **순백은 지면에 쓰지 않는다** |
| `surface` | `#F2F0EF` | 섹션 면 (오프화이트) |
| `panel` | `#FFFFFF` | 박스·카드 (백오피스 패널 등) |
| `foreground` | `#000000` | 본문·보더 |
| `muted` | `#666666` | 보조 텍스트 |
| `border` / `border-soft` | `#000000` / `#CCCCCC` | 헤어라인 / 밀도 높은 UI |
| `placeholder` | `#D9D7D6` | 이미지 플레이스홀더 |
| `inverse-bg` / `inverse-fg` | `#000` / `#F2F0EF` | 블랙 밴드 |
| `accent` / `on-accent` | `#FFCD00` / `#000000` | 옐로 면 / 그 위 텍스트 |

**`Band` 는 톤별로 토큰을 국소적으로 뒤집는다.** `tone="dark"` 안에서는 `foreground` 가 밝은 색이 되므로
버튼·보더·`text-muted` 가 자동으로 맞는다. 컴포넌트에 tone prop 을 넘기지 마라.

다크모드는 제공하지 않는다.

## 2. 타이포그래피

| 서체 | 역할 | 웨이트 |
|---|---|---|
| **Archivo** | 영문 디스플레이·헤딩 (`type-display`) | 700 / 800 |
| **Gothic A1** | 국문 (KakaoBig·KakaoSmall 확보 시 자동 승격) | 300–900 |

`type-display` 영문 대문자 디스플레이 · `type-kr-heading` 국문 헤딩(음수 자간 −0.03em)
`type-wordmark` 푸터 워드마크 — 컨테이너 폭(cqw)에 비례해 **크기만** 커진다.
글자를 늘려서(`textLength`·`scaleX`) 폭을 채우지 않는다. 부모에 `[container-type:inline-size]` 필요

스케일 — 모바일/데스크톱을 짝지어 쓴다: `text-h3-m sm:text-h3`

국문 본문·헤딩이 두 줄 이상 흐르면 `break-keep` 을 함께 준다. 없으면 "스케 / 일과" 처럼 어절 중간에서 끊긴다.

`tall:` 변형 — `@media (min-height: 820px)`. **오픈 메뉴처럼 한 화면에 다 들어와야 하는 UI 전용.**
창이 낮으면 기본(작은) 값이 남고, 높을 때만 타이포·여백이 커진다. 일반 페이지에는 쓰지 않는다.

`d1`(160/72) · `d2`(96/52) · `h1`(56/40) · `h2`(48/36) · `h3`(40/32) · `h4`(32/24) · `h5`(24/20) · `h6`(20/18)
본문 `l`(20) · `m`(18) · `r`(16) · `s`(14) · `xs`(12), 모두 lh 1.5

## 3. 레이아웃 모듈 (Figma Wireframe › 컨텐츠 종류별 레이아웃)

`@/components/ui/kit` 에서 가져다 쓴다. **모듈을 변형하지 말고 그대로 쓴다.**

| 컴포넌트 | Figma | 언제 쓰나 |
|---|---|---|
| `LayoutCards` | Layout / 1 | 센터 헤딩 + 카드 그리드(이미지 위 / 텍스트 아래, 보더). 시설 3종처럼 나란한 대등 항목 |
| `LayoutFeatures` | Layout / 2 | 보더 없는 특징 그리드. 가벼운 소개 묶음 |
| `LayoutHorizCards` | Layout / 3 | 가로형 카드(좌 이미지 / 우 텍스트). 항목당 설명이 짧을 때 |
| `LayoutColumns` | Layout / 4 | 좌측 헤딩 블록 + 하단 텍스트 컬럼. 섹션 도입 + 항목 나열 |
| `LayoutTextColumns` | Layout / 5 | 텍스트 컬럼만. 절차·원칙처럼 이미지 없는 나열 |
| `LayoutAlternating` | Layout / 6 | 좌우 교차(텍스트 ↔ 이미지) 블록. 무대 특장처럼 항목마다 설명이 길 때 |
| `LayoutSticky` | Layout / 7 | 좌측 스티키 이미지 + 우측 번호 텍스트. 순차 서사 |
| `ComparisonTable` | Comparison / 1 | **모든 수치·데이터 표의 표준** |
| `SpecTable` | Comparison 행 리듬 | 값이 하나뿐인 라벨/값 나열 |
| `CTABand` | CTA / 1 | 섹션 말미 전환 |
| `PageHeading` | Header / 1-1 | 페이지 상단 헤딩 + 보조 문구 |
| `CenterHeading` | Layout 1/3/6 헤더 | 센터 정렬 섹션 헤딩 |
| `RowList` / `Row` | **Stacked List / 1** (Application Components) | 목록(공지·FAQ·신청 내역). 헤더(제목·리드·우측 컨트롤) + 헤어라인 행 |

### 반응형

**스냅 포인트는 `sm`(640px) 하나로 통일한다.** 그 아래는 1컬럼, 그 위는 2컬럼.
컴포넌트마다 다른 지점에서 무너지면 화면 폭을 줄일 때 레이아웃이 계단처럼 어긋난다.

- 오픈 메뉴: `sm` 미만이면 카테고리 제목을 페이지 목록 위로 올린 1컬럼.
  대신 링크를 2열로 깔아 세로 길이를 줄인다 (한 화면 규칙을 320px 까지 지킨다)
- `Row`: `sm` 미만이면 우측 메타·액션이 좌측 블록 아래로 떨어진다
- 확인 폭: 1920 / 1440 / 1024 / 834 / 768 / 640 / 480 / 390 / 360 / 320

## 4. 표 만들기 (읽기 쉽게)

`ComparisonTable` 규칙:

- **`table-fixed` 다.** 열 폭은 내용이 아니라 컴포넌트가 정한다 —
  같은 열 수의 표는 어디에 놓여도 같은 폭이다. 폭을 손으로 만지지 마라
- **값 열은 기본 우측 정렬.** 숫자 기둥이 맞아야 비교가 된다.
  문장이 들어가는 열만 `align: "left"`
- **카테고리는 표를 쪼개지 말고 `groups` 로.** 표를 여러 개 만들면
  묶음마다 열 폭이 달라진다 (이 페이지가 난장판이 되는 1번 원인)
- **모든 셀이 `—` 인 열은 만들지 않는다.** 정보가 아니라 소음이다
- **좁은 컬럼에 5열 이상 넣지 않는다.** 보조 수치는 `note` 로 항목 아래에 내린다
- **단위 행(헤더 보조행)을 두지 않는다.** 단위가 있는 열과 없는 열이 섞이면 헤더 높이가
  어긋난다. 수량은 숫자만, 금액은 셀마다 `₩` (`won()`), 그 밖의 단위는 항목명 옆에
- 해당 없음은 `—`, 포함은 `✓` · 숫자는 `tabular-nums`
- `dense` 옵션으로 밀도를 높일 수 있다 (백오피스·긴 목록)

### 페이지 그리드

한 페이지 안의 모든 섹션은 **하나의 그리드 상수**를 공유한다.
섹션마다 컬럼비·`pt`·`max-w` 를 다르게 주면 세로 기준선이 흐트러진다.

```tsx
const SPLIT = "grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:items-start lg:gap-16";
// 좌: 제목·설명 / 우: 데이터. 예) src/app/packages/page.tsx
```

### 버튼 크기

크기는 "누가 쓰나"가 아니라 **"어디에 놓이나"** 로 정한다. 같은 역할의 버튼이 화면마다
다른 크기로 나오면 안 된다. Figma Style Guide 의 버튼은 높이 48 / 40 두 가지다.

| 크기 | 높이 | 쓰는 자리 |
|---|---|---|
| `lg` | 48 | 페이지·섹션의 주 액션. 히어로 · 섹션 말미 · CTA 배너 · EmptyState · 위저드 이전/다음. **`ButtonLink` 의 기본값** — 공개 페이지에서는 size 를 적지 않는다 |
| `md` | 40 | 폼 제출. 백오피스·인증 화면 등 밀도 높은 폼 전용 |
| `sm` | 32 | 카드·표 안의 인라인 액션 |

### 선택 상태

**선택 = 검정 채움.** 이 언어 하나만 쓴다 (`choiceClass` + `CHOICE_SELECTED_VARS`).
옐로 하이라이트·좌측 컬러 바·"선택됨" 배지를 만들지 않는다.
보조 고지문도 색면 박스가 아니라 `Note` (헤어라인 + 작은 글씨) 로 쓴다.

### 목록 페이지 이동 (페이지네이션)

`Pagination` 하나만 쓴다. 화면마다 따로 만들지 않는다 (`src/components/Pagination.tsx`).

- 목록과는 **헤어라인**으로 나눈다. 색면 박스·라운드 박스를 만들지 않는다.
- 숫자·이전·다음은 목록 안 인라인 컨트롤이므로 **`sm`(32)** 이다.
- **현재 페이지는 검정 채움** — 위의 선택 상태 언어를 그대로 따른다. 악센트 컬러 금지.
- 총 건수·현재 페이지는 왼쪽에 `text-xs text-muted`, 숫자는 `tabular-nums`.
- 페이지가 1개뿐이면 컨트롤 없이 "전체 N건"만 남긴다.
- 현재 페이지 주변 5개만 노출한다 — 페이지가 많아져도 줄바꿈이 나지 않는다.
- 좁은 화면에서는 건수 줄과 컨트롤 줄이 세로로 쌓인다 (`sm` 스냅).

## 5. 컴포넌트

| | |
|---|---|
| `AuthShell` | 인증 화면. `variant="card"`(Login / 3) · `variant="tabs"`(Sign up / 1) |
| `Pagination` | 목록 하단 페이지 이동. 공개·백오피스 공용 — 화면마다 따로 만들지 않는다 |
| `PublicHeader` | 메뉴 아이콘은 **원**이다. 닫힘 = 검정 채움 원 / 열림 = 검정 아웃라인 원 + 내부 ×. 두 상태의 지름이 같아 아이콘이 튀지 않는다 |
| `SiteFooter` | Figma Design › Footer / 1. 상단 Address·Contact + 사이트맵 → **컨테이너 전폭 워드마크** → 헤어라인 → 카피라이트·정책. 오프화이트 지면 |
| `choiceClass` | 선택 칩 (Figma Multi-step Forms). 선택 = 검정 채움 |
| `Note` | 보조 고지문. 색면 박스를 쓰지 않는다 |
| `Band` | 풀블리드 섹션. `tone` = light·white·accent·dark, `size` = sm·md·lg. 섹션은 여백이 아니라 **색면 전환**으로 나눈다 |
| `ButtonLink` / `btnClass` | `variant` = **primary**(검정 채움) · **secondary**(아웃라인) · **tertiary**(텍스트), `size` = sm·md·lg |
| `Media` | 이미지. `src` 없으면 회색 플레이스홀더. 스크롤 진입 시 옐로 리빌(`Reveal`)이 자동으로 걸린다 — 끄려면 `reveal={false}` |
| `Reveal` | 뷰포트 진입 시 악센트 면이 덮었다가 위로 걷히는 와이프 인. **사진·카드에만** 쓰고 텍스트에는 쓰지 않는다. **화면 밖으로 나가면 다시 덮이고 재진입할 때 또 재생한다** (되돌릴 때는 트랜지션을 꺼 역재생을 막는다). `prefers-reduced-motion` 존중 |
| `CTABand` | 페이지 하단 옐로 배너. 높이는 `CTA_BAND_MIN` 으로 고정 — 카피 길이가 달라도 페이지마다 같은 높이여야 한다. 옐로 배너를 직접 만들지 말고 이걸 쓴다 |
| `Badge` | 상태 배지 |
| `EmptyState` | 준비 중 콘텐츠. 위아래 헤어라인 사이 빈 블록 — **점선 보더를 쓰지 않는다**(Figma 시스템에 점선이 없다) |
| `Multiline` | seed 의 `\n` 유지 렌더 |
| 입력 필드 | `field-base` 유틸리티. 배경은 지면과 같고 1px 보더로만 구분 |

주의: Tailwind v4 에서 base 에 `outline-none` 을 넣으면 이후 `focus:outline-2` 가 죽는다. 쓰지 마라.

### 외부 조회 결과·법적 고지 (사업자 진위확인 · 전자 날인)

기능이 새로 붙어도 **표시 언어는 늘리지 않는다.** 다음 두 갈래로만 표현한다.

- **판정이 있는 것 → `Badge` 의 `tone`.** 사업자 진위확인 결과처럼 상태가 갈리는 값은
  emerald·red 같은 임의 색을 쓰지 말고 `Badge tone`(good·warn·bad·accent) 으로만 표시한다.
  조회 원문(상호·대표자·과세유형·조회 시각)은 `SpecTable` 또는 표 규격 그대로 늘어놓는다.
- **읽고 넘어가는 것 → `Note`.** 가입 화면의 "국세청 진위확인으로 조회합니다" 고지,
  계약 화면의 전자 날인 동의 문구처럼 판정이 아닌 안내는 색면 박스가 아니라 `Note` 다.
  경고색 배경·아이콘·테두리 강조를 붙이지 않는다.

동의 체크박스는 폼 안의 컨트롤이므로 제출 버튼은 `md`, 화면 자체의 주 액션이면 `lg` 다.

## 6. 페이지 골격

```tsx
<div className="flex flex-1 flex-col">
  <PublicHeader active="/venue" currentUser={user} />
  {/* 브레드크럼은 3뎁스부터만. items 2개 미만이면 자동으로 렌더되지 않는다 */}
  <Breadcrumb items={[{ label: "내 신청 내역", href: "/mypage" }, { label: "1:1 문의" }]} />
  <main className="flex flex-1 flex-col">
    <Band tone="light" size="lg">
      <PageHeading title="시설 제원" lead="…" />
    </Band>
    {/* 이후 Band 톤 교대 + 레이아웃 모듈 */}
  </main>
  <SiteFooter />
</div>
```

## 7. 정보구조

**YOUR STAGE / BOOK IT / KNOW IT / HOST IT 은 카테고리 타이틀일 뿐 페이지가 아니다.**
실제 페이지는 각 카테고리의 하위 목록이고, 이 정의는 `src/components/ui/nav-items.ts` 한 곳에 있다.
헤더 메뉴와 푸터가 이 파일을 함께 쓴다. 한 페이지 안의 섹션은 메뉴에 올리지 않는다.

따라서:

- **페이지 타이틀은 카테고리명이 아니라 그 페이지 이름이다.** `대관 양식함` 이지 `Book It` 이 아니다
- **카테고리를 브레드크럼에 넣지 않는다.** 링크할 상위 페이지가 없다.
  브레드크럼은 실제 3뎁스에서만 (`items` 2개 미만이면 자동으로 렌더되지 않는다)
- `PublicHeader active` 에는 **그 페이지의 실제 경로**를 넘긴다.
  상위처럼 보이는 경로를 넘기면 메뉴에서 엉뚱한 항목이 볼드로 표시된다

```
Your Stage  (카테고리 타이틀 — 링크 아님)
  ├ 시설 개요        /venue                  (개요·시설 3종·강점·층별 키맵)
  ├ 시설 제원        /venue/specs
  ├ 무대 특장        /venue/stage-features
  └ 부대시설         /venue/amenities
Book It
  ├ 대관 안내        /guide                 (개요·절차·대관료·규약은 이 한 페이지 안)
  ├ 대관 패키지      /packages
  ├ 커넥티드 라이브   /guide/connected-live
  ├ 대관 양식함      /guide/forms
  └ 이미지 가이드    /guide/image-guide
Know It
  ├ 공지사항        /notices
  ├ FAQ            /faq
  └ 1:1 문의        /mypage/inquiries
Host It
  ├ 대관 신청        /apply
  └ 내 신청 내역     /mypage
```

### 설계 선언 (홈)

홈의 매니페스토 섹션은 Figma Wireframe › **Layout / 608** (Desktop) 규격이다.
슬로건 디스플레이(d2) + 리드 + 번호 붙은 설계원칙 4개, 블랙 지면 위 흰 텍스트.
내용 기준은 Notion `대관·비즈니스 사이트 구조 기획 › HOST IT (HOME)` 이고,
**수치는 여기에 쓰지 않는다** — 숫자는 Your Stage 에서, 그 숫자의 이유가 여기다.

### 신청 위저드

Figma MARKETING COMPONENTS › Multi-step Forms › **Multi Form / 5** 규격.

- 스텝 인디케이터 — 원형 번호 칩(24) + 스텝 제목(14). 완료는 체크 원, 현재는 검정 채움 원
- 단계 제목 — `StepHeading` (Heading 32 · Text 16, **가운데 정렬**, 폭 640 안쪽)
- 폼 — 라벨 위 · 필드 높이 48 · 전폭
- 하단 버튼 — 좌우로 벌리지 않고 **우측에 나란히**. 이전(아웃라인) + 다음(검정 채움), 높이 48

## 8. 카피 원칙 (브랜드 가이드 3.1 / 3.2)

- **Clear** 쉬운 단어, 10–15단어 짧은 문장 · **Confident** 사실 기반 능동 표현 · **Engaging** 진정성
- 수동 → 능동. 정량 정보는 **의도 → 근거(수치) → 결과** 순서로
- 히어로 카피는 진입부 1회

## 9. 하지 말 것

- 프로토타입에 있는 **기능·카테고리를 삭제하지 않는다.** 이동·재배치만 허용
- URL 경로를 바꾸지 않는다
- `globals.css` · `kit.tsx` · `PublicHeader` · `SiteFooter` · `Breadcrumb` · `seed.ts` ·
  `content/types.ts` · `lib/pricing/*` 는 파운데이션이다. 페이지 작업 중 임의로 고치지 않는다
