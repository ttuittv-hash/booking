# Seoul Arena — Business layer 디자인 시스템

출처
- Kakao Arena Brand Guidelines 0.1 (2026-07)
- Figma `2607 서울아레나 웹사이트 Full` › WORKSPACE › Style Guide / Wireframe / Design
- Notion `(웹사이트) 대관·비즈니스 사이트 구조 기획`

이 문서는 리디자인 작업의 단일 기준이다. 새 화면을 만들거나 기존 화면을 고칠 때 여기 정의된
토큰·컴포넌트만 쓴다. 임의의 hex 값, 임의의 px 폰트 크기, 임의의 라디우스를 쓰지 않는다.

---

## 1. 컬러

| 토큰 | 값 | 용도 |
|---|---|---|
| `background` | `#F2F0EF` | 기본 지면 |
| `surface` | `#FFFFFF` | 카드·드롭다운·폼 배경 |
| `foreground` | `#000000` | 본문 텍스트·보더 |
| `muted` | `#666666` | 보조 텍스트 |
| `muted-strong` | `#444444` | 강조된 보조 텍스트 |
| `border` | `#000000` | 헤어라인 (투명도로 강약 조절) |
| `border-soft` | `#CCCCCC` | 밀도 높은 UI(폼·테이블) 보더 |
| `accent` | `#FFCD00` | 강조 면·구분선·번호 |
| `on-accent` | `#000000` | 옐로 면 위 텍스트 |
| `inverse-bg` / `inverse-fg` / `inverse-muted` | `#000000` / `#F2F0EF` / `#AAAAAA` | 블랙 밴드 |

**접근성 규칙 (반드시 지킬 것)**
`#FFCD00` on `#F2F0EF` 는 대비 약 1.5:1 이다. **옐로를 밝은 배경 위 텍스트 색으로 쓰지 않는다.**
- 옐로는 **면(배경) · 강조 요소 · 구분선 · 번호**에만
- 옐로 면 위 텍스트는 **항상 검정** (약 14:1)
- 옐로 텍스트는 **블랙 배경 위에서만** 허용 (약 11:1) — 브랜드 가이드의 "Yellow on Black" 조합

헤어라인 투명도 관례: 섹션·리스트 구분 `border-border/25`, 미세 구분 `border-border/15`,
블랙 밴드 안에서는 `border-inverse-fg/25`.

## 2. 타이포그래피

| 서체 | 역할 | 웨이트 |
|---|---|---|
| **Archivo** | 영문 디스플레이·헤딩·라벨 | 700 / 800 |
| **Gothic A1** | 국문 (KakaoBig·KakaoSmall 확보 시 자동 승격) | 300–900 |

유틸리티
- `type-display` — Archivo 800, 대문자, 타이트 자간. 영문 디스플레이·페이지 타이틀·숫자
- `type-label` — Archivo 800, 대문자, 넓은 자간. 섹션 라벨·아이브로·버튼
- `type-kr-heading` — 국문 헤딩, 웨이트 800, 음수 자간 −0.03em

스케일 (모바일 → 데스크톱, `text-h3-m sm:text-h3` 형태로 짝지어 쓴다)

| 클래스 | 데스크톱 | 모바일 | lh |
|---|---|---|---|
| `text-d1` / `text-d1-m` | 160 | 72 | 0.9 |
| `text-d2` / `text-d2-m` | 96 | 52 | 0.9 |
| `text-h1` / `text-h1-m` | 56 | 40 | 1.2 |
| `text-h2` / `text-h2-m` | 48 | 36 | 1.2 |
| `text-h3` / `text-h3-m` | 40 | 32 | 1.2 |
| `text-h4` / `text-h4-m` | 32 | 24 | 1.3 / 1.4 |
| `text-h5` / `text-h5-m` | 24 | 20 | 1.4 |
| `text-h6` / `text-h6-m` | 20 | 18 | 1.4 |
| `text-l` / `text-m` / `text-r` / `text-s` / `text-xs` | 20 / 18 / 16 / 14 / 12 | 동일 | 1.5 |

`text-[13px]` 같은 임의 값은 쓰지 않는다. 전부 위 토큰으로 치환한다.

## 3. 레이아웃

- 컨테이너 `container-site` — max-width 1384px, 좌우 패딩 24(모바일) / 64(lg+)
- 헤더 72 (모바일 64) · 브레드크럼 48 · 푸터는 `SiteFooter`
- 섹션은 `Band` 컴포넌트로만 만든다. 톤을 교대해 지면을 나눈다:
  `light`(#F2F0EF) → `dark`(#000) → `light` → `accent`(#FFCD00) → `white`(#FFF)
- 여백으로 섹션을 나누지 않는다. **색면 전환**이 이 디자인의 구분 장치다.

## 4. 컴포넌트 (`@/components/ui/kit`)

| | 용도 |
|---|---|
| `Band` | 풀블리드 섹션. `tone` = light·white·accent·dark, `size` = sm·md·lg |
| `SectionHead` | 2컬럼 스플릿 (좌: 라벨+타이틀 / 우: 본문) |
| `Label` | Archivo 800 소형 대문자 섹션 라벨 |
| `ButtonLink` / `btnClass` | `variant` = primary(옐로면)·outline·inverse(블랙밴드용)·ghost, `size` = sm·md·lg |
| `RowList` / `Row` | 헤어라인 리스트 로우. 공지·FAQ·패키지·신청 내역·목록 전부 이걸로 |
| `SpecTable` | 라벨/값 2열 제원 표 |
| `Media` | 이미지. `src` 없으면 Iconic 그라디언트 플레이스홀더 |
| `EmptyState` | 준비 중 콘텐츠 (대관규약 전문·Technical Package·FAQ 등) |
| `Badge` | 상태 배지. tone = neutral·accent·good·warn·danger·inverse |
| `Multiline` | seed 콘텐츠의 `\n` 유지 렌더 |
| `ArrowRight` / `ArrowCircle` | 화살표 |
| `Breadcrumb` (`@/components/ui/Breadcrumb`) | 하위 페이지 헤더 아래 고정 |

## 5. 형태 규칙

- **버튼·카드·입력은 샤프 코너.** `rounded-*` 를 새로 붙이지 않는다. 기존 `rounded-sm`/`rounded`/`rounded-xl` 은 제거한다
- 버튼은 1px 보더 + 투명 배경(outline) 또는 옐로 면 + 검정 보더(primary)
- 카드 박스보다 **헤어라인 로우**를 우선한다. 그림자는 드롭다운·모달 등 부유 요소에만 (`shadow-sm`~`shadow-md`)
- 이미지·미디어는 라운딩 없이 꽉 채운다

## 6. 페이지 골격 (공개 페이지 공통)

```tsx
<div className="flex flex-1 flex-col">
  <PublicHeader active="/venue" currentUser={user} />
  <Breadcrumb items={[{ label: "Your Stage" }]} />
  <main className="flex flex-1 flex-col">
    {/* 페이지 타이틀 — 거대 Archivo 디스플레이 */}
    <Band tone="light" size="lg">
      <Label className="mb-6 text-muted">Your Stage</Label>
      <h1 className="type-display text-d2-m sm:text-h1 lg:text-d2">Your Stage</h1>
      <p className="mt-8 max-w-3xl text-m text-muted">{intro}</p>
    </Band>
    {/* 이후 Band 톤 교대 */}
  </main>
  <SiteFooter />
</div>
```

## 7. 카피 원칙 (브랜드 가이드 3.1 / 3.2)

- **Clear** — 쉬운 단어, 10–15단어 짧은 문장. 과도한 수식어·장황한 설명 금지
- **Confident** — 사실·성과 기반 능동 표현. 불확실한 표현·지나친 겸손 금지
- **Engaging** — 경험을 함께 말하는 진정성. 과한 감정 표현·신조어 금지
- 수동 → 능동으로. "본 공연장은 …위치에 자리하고 있습니다" → "대중교통으로 편리하게 방문하세요"
- 정량 정보는 **의도 → 근거(수치) → 결과** 순서로. 숫자를 먼저 던지지 않는다
- 히어로 카피는 진입부 1회. 이후는 스펙·절차·비용의 명료함이 설득을 담당

## 8. 하지 말 것

- 프로토타입에 있는 **기능·카테고리를 삭제하지 않는다.** 이동·재배치만 허용.
  (노션 기획서는 브랜드 관점, 프로토타입은 공연팀 운영요건 기반이다. 후자가 기능의 근거다)
- URL 경로를 바꾸지 않는다. 라벨만 교체한다
- Expressive 그라디언트(`bg-expressive`)는 홈 히어로 1회만. 다른 페이지는 `bg-iconic` 계열
- `globals.css` · `kit.tsx` · `PublicHeader` · `SiteFooter` · `seed.ts` · `content/types.ts` ·
  `lib/pricing/*` 는 파운데이션이다. 페이지 작업 중 임의로 고치지 않는다
