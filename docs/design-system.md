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

## 1. 컬러 · 다크모드

Primitive (Figma Style Guide › Variables)

| | |
|---|---|
| White `#FFFFFF` · Neutral Lightest `#F2F0EF` · Lighter `#CCCCCC` · Light `#AAAAAA` | Neutral `#666666` · Dark `#444444` · Darker `#222222` · Darkest `#000000` |
| Accent Yellow `#FFCD00` | |

시맨틱 토큰은 라이트/다크에서 값만 바뀐다. **컴포넌트는 항상 시맨틱 토큰을 쓴다.**

| 토큰 | Light | Dark |
|---|---|---|
| `background` | `#F2F0EF` | `#000000` |
| `foreground` | `#000000` | `#F2F0EF` |
| `muted` | `#666666` | `#AAAAAA` |
| `border` | `#000000` | `#F2F0EF` |
| `border-soft` | `#CCCCCC` | `#444444` |
| `placeholder` | `#D9D7D6` | `#1A1A1A` |
| `inverse-bg` / `inverse-fg` | `#000` / `#F2F0EF` | `#F2F0EF` / `#000` |
| `accent` / `on-accent` | `#FFCD00` / `#000000` | 동일 |

다크모드는 `html.dark` 클래스. 전환 UI는 오픈 메뉴 하단의 Light/Dark 토글.
`dark:` 유틸리티를 직접 쓸 일은 거의 없다 — 토큰이 이미 뒤집힌다.

**`Band` 는 톤별로 토큰을 국소적으로 뒤집는다.** `tone="dark"` 안에서는 `foreground` 가 밝은 색이 되므로
버튼·보더·`text-muted` 가 자동으로 맞는다. 컴포넌트에 tone prop 을 넘기지 마라.

## 2. 타이포그래피

| 서체 | 역할 | 웨이트 |
|---|---|---|
| **Archivo** | 영문 디스플레이·헤딩 (`type-display`) | 700 / 800 |
| **Gothic A1** | 국문 (KakaoBig·KakaoSmall 확보 시 자동 승격) | 300–900 |

`type-display` 영문 대문자 디스플레이 · `type-kr-heading` 국문 헤딩(음수 자간 −0.03em)

스케일 — 모바일/데스크톱을 짝지어 쓴다: `text-h3-m sm:text-h3`

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
| `RowList` / `Row` | Card / List | 목록(공지·FAQ·신청 내역) |

## 4. 표 만들기 (읽기 쉽게)

`ComparisonTable` 규칙:

- **단위는 열 헤더에 한 번만.** 셀마다 "n개 포함", "원/일" 을 반복하지 않는다
- 라벨 열은 좌측 고정, 값은 바로 옆 열. 라벨과 값을 멀리 떼어놓지 않는다
- 숫자는 `tabular-nums`
- 해당 없음은 `—`, 포함은 `✓` (텍스트로 "포함" 이라 쓰지 않는다)
- 행이 20개를 넘으면 카테고리로 묶고 묶음마다 소제목을 준다
- `dense` 옵션으로 밀도를 높일 수 있다 (백오피스·긴 목록)

## 5. 컴포넌트

| | |
|---|---|
| `Band` | 풀블리드 섹션. `tone` = light·white·accent·dark, `size` = sm·md·lg. 섹션은 여백이 아니라 **색면 전환**으로 나눈다 |
| `ButtonLink` / `btnClass` | `variant` = **primary**(검정 채움) · **secondary**(아웃라인) · **tertiary**(텍스트), `size` = sm·md·lg |
| `Media` | 이미지. `src` 없으면 회색 플레이스홀더 |
| `Badge` | 상태 배지 |
| `EmptyState` | 준비 중 콘텐츠 |
| `Multiline` | seed 의 `\n` 유지 렌더 |
| 입력 필드 | `field-base` 유틸리티. 배경은 지면과 같고 1px 보더로만 구분 |

주의: Tailwind v4 에서 base 에 `outline-none` 을 넣으면 이후 `focus:outline-2` 가 죽는다. 쓰지 마라.

## 6. 페이지 골격

```tsx
<div className="flex flex-1 flex-col">
  <PublicHeader active="/venue" currentUser={user} />
  {/* 브레드크럼은 3뎁스부터만. items 2개 미만이면 자동으로 렌더되지 않는다 */}
  <Breadcrumb items={[{ label: "내 신청 내역", href: "/mypage" }, { label: "1:1 문의" }]} />
  <main className="flex flex-1 flex-col">
    <Band tone="light" size="lg">
      <PageHeading title="공연장 소개" lead="…" />
    </Band>
    {/* 이후 Band 톤 교대 + 레이아웃 모듈 */}
  </main>
  <SiteFooter />
</div>
```

## 7. 정보구조

메뉴는 **실제로 존재하는 페이지와 1:1**로 맞춘다. 한 페이지 안의 섹션은 메뉴에 올리지 않는다.

```
Your Stage  /venue                    (하위 없음 — 개요·제원·무대특장·부대시설은 같은 페이지)
Book It     /guide                    (하위 없음 — 개요·절차·대관료·규약은 같은 페이지)
  ├ 대관 패키지      /packages
  ├ 대관 양식함      /guide/forms
  └ 이미지 가이드    /guide/image-guide
Know It     (그룹)
  ├ 공지사항        /notices
  ├ FAQ            /faq
  └ 1:1 문의        /mypage/inquiries
Host It     /apply
```

## 8. 카피 원칙 (브랜드 가이드 3.1 / 3.2)

- **Clear** 쉬운 단어, 10–15단어 짧은 문장 · **Confident** 사실 기반 능동 표현 · **Engaging** 진정성
- 수동 → 능동. 정량 정보는 **의도 → 근거(수치) → 결과** 순서로
- 히어로 카피는 진입부 1회

## 9. 하지 말 것

- 프로토타입에 있는 **기능·카테고리를 삭제하지 않는다.** 이동·재배치만 허용
- URL 경로를 바꾸지 않는다
- `globals.css` · `kit.tsx` · `PublicHeader` · `SiteFooter` · `Breadcrumb` · `seed.ts` ·
  `content/types.ts` · `lib/pricing/*` 는 파운데이션이다. 페이지 작업 중 임의로 고치지 않는다
