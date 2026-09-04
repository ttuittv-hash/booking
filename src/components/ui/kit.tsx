import Link from "next/link";
import type { ReactNode } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { splitParagraphs } from "@/lib/content/prose";
import { parseInlineLinks } from "@/lib/content/inlineLinks";

/* --------------------------------------------------------- 리치텍스트 ----- */

/* ------------------------------------------------------------- 평문 문단 --- */

/**
 * 운영자가 콘텐츠 관리에서 입력한 평문을 문단으로 싣는다.
 * 빈 줄이 새 문단, 한 번의 줄바꿈은 줄바꿈이다. 리드·설명처럼 여러 문단이
 * 들어올 수 있는 자리에는 `{text}` 를 그대로 그리지 말고 이것을 쓴다 —
 * HTML 은 줄바꿈을 공백으로 접기 때문에 운영자가 나눈 문단이 사라진다.
 */
/**
 * `[대관료](/rates)` 표기를 링크로 그린다 (2026-09-02).
 * 무엇을 링크로 볼지(우리 사이트 안만)는 content/inlineLinks.ts 가 정한다 — 그쪽에
 * 테스트가 붙어 있다.
 */
export function InlineLinks({ text }: { text: string }) {
  return (
    <>
      {parseInlineLinks(text).map((part, i) =>
        part.type === "link" ? (
          <Link
            key={i}
            href={part.href}
            className="underline decoration-border-soft underline-offset-4 transition-colors hover:decoration-accent"
          >
            {part.text}
          </Link>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

/**
 * `**강조**` 를 굵게 그린다 (2026-09-03).
 *
 * 홈 선언문(`components/home/Manifesto.tsx`)만 알던 표기를 본문 렌더 한 곳으로 올렸다 —
 * 운영자가 콘텐츠 관리에서 문장 일부를 굵게 하고 싶은 자리가 홈에만 있는 게 아니다.
 * 굵게 안쪽에도 링크 표기(`[말](/주소)`)가 들어갈 수 있다.
 */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-bold text-foreground">
            <InlineLinks text={part.slice(2, -2)} />
          </strong>
        ) : (
          <InlineLinks key={i} text={part} />
        ),
      )}
    </>
  );
}

export function Prose({
  text,
  className = "",
  gap = "mt-4",
}: {
  text: string | null | undefined;
  className?: string;
  /** 문단 사이 간격 — 리드처럼 좁게 붙는 자리에서 바꿔 쓴다 */
  gap?: string;
}) {
  const blocks = splitParagraphs(text);
  if (blocks.length === 0) return null;
  return (
    <div className={className}>
      {blocks.map((block, i) => (
        <p key={i} className={`whitespace-pre-line break-keep ${i > 0 ? gap : ""}`}>
          <RichText text={block} />
        </p>
      ))}
    </div>
  );
}

/* ============================================================================
   Seoul Arena — Business layer UI kit
   Figma "2607 서울아레나 웹사이트 Full" › WORKSPACE › Wireframe / Style Guide

   이 파일의 레이아웃 컴포넌트는 Figma Wireframe 페이지의 "컨텐츠 종류별 레이아웃"
   (Layout / 1 ~ 7, Header, FAQ, CTA, Comparison)을 그대로 옮긴 것이다.
   새 화면을 만들 때는 여기 있는 것만 조합하고, 없으면 Figma에서 먼저 찾는다.

   규칙
     · Tagline(아이브로) 슬롯은 쓰지 않는다
     · 버튼·체크박스 등 UI 컨트롤은 모노크롬. 옐로 버튼은 시스템에 없다
     · 옐로는 면·강조·구분선에만. 밝은 배경 위 옐로 텍스트 금지
     · 코너는 샤프. radius 를 새로 붙이지 않는다
   ========================================================================= */

/* -------------------------------------------------------------- Band ----- */

export type BandTone = "light" | "white" | "accent" | "dark";

const BAND_TONE: Record<BandTone, string> = {
  light: "bg-background text-foreground",
  white: "bg-surface text-foreground",
  accent: "bg-accent text-on-accent",
  dark: "bg-inverse-bg text-inverse-fg",
};

/**
 * 밴드 안에서 색 토큰을 국소적으로 뒤집는다.
 * 이렇게 해두면 버튼·보더·보조 텍스트가 밴드 톤에 자동으로 맞춰지고,
 * 컴포넌트마다 tone prop 을 넘길 필요가 없다.
 *
 * dark 밴드는 inverse 토큰을 쓰므로 다크모드에서는 자동으로 밝은 면이 되어
 * 지면과의 명암 교대가 그대로 유지된다.
 */
const BAND_VARS: Record<BandTone, React.CSSProperties> = {
  light: {},
  white: { ["--background" as string]: "var(--surface)" },
  accent: {
    ["--background" as string]: "var(--accent)",
    ["--foreground" as string]: "var(--on-accent)",
    ["--muted" as string]: "var(--n-dark)",
    ["--border" as string]: "var(--n-darkest)",
    ["--border-soft" as string]: "rgba(0,0,0,0.25)",
    ["--btn-primary-bg" as string]: "var(--n-darkest)",
    ["--btn-primary-fg" as string]: "var(--n-white)",
    ["--btn-primary-bg-hover" as string]: "var(--n-darker)",
  },
  dark: {
    ["--background" as string]: "var(--inverse-bg)",
    ["--foreground" as string]: "var(--inverse-fg)",
    ["--muted" as string]: "var(--inverse-muted)",
    ["--border" as string]: "var(--inverse-fg)",
    ["--border-soft" as string]: "color-mix(in srgb, var(--inverse-fg) 30%, transparent)",
    ["--btn-primary-bg" as string]: "var(--inverse-fg)",
    ["--btn-primary-fg" as string]: "var(--inverse-bg)",
    ["--btn-primary-bg-hover" as string]: "var(--inverse-muted)",
  },
};

/**
 * 밴드가 아닌 곳(카드·섹션 박스)을 검정 면으로 만들 때 쓰는 토큰 반전.
 * `Band tone="dark"` 와 같은 값이라 그 안의 입력 필드·보조 텍스트·보더가
 * 자동으로 지면에 맞는다 — 검정 배경에 검정 글자가 나오는 사고를 막는다.
 */
export const INVERSE_SURFACE_VARS: React.CSSProperties = BAND_VARS.dark;

/**
 * `INVERSE_SURFACE_VARS` 의 반대 — **검정 밴드 안의 카드 한 장만** 다시 밝은 면으로
 * 되돌린다. 검정 지면에서는 `--border`·`--foreground` 가 흰색으로 뒤집혀 있으므로,
 * 이걸 걸지 않고 흰 카드를 그리면 흰 배경에 흰 글자·흰 보더가 나온다.
 */
export const PLAIN_SURFACE_VARS: React.CSSProperties = {
  ["--background" as string]: "var(--n-white)",
  ["--foreground" as string]: "var(--n-darkest)",
  ["--muted" as string]: "var(--n-mid)",
  ["--border" as string]: "var(--n-darkest)",
  ["--border-soft" as string]: "var(--n-lighter)",
};

export function Band({
  tone = "light",
  children,
  className = "",
  id,
  divide = false,
  size = "md",
}: {
  tone?: BandTone;
  children: ReactNode;
  className?: string;
  id?: string;
  divide?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  /*
    세로 여백은 세 단뿐이다. 넉넉함보다 리듬이 중요해서, 한 화면에 두 밴드가
    같이 보이도록 값을 줄여 잡았다 (예전 80/112/128 → 64/80/96).
      lg  페이지 머리글 · 1급 섹션   56 / 64 / 80
      md  일반 섹션 (기본)            40 / 48 / 64
      sm  밀도 높은 섹션 · 목록 상단   32 / 40
  */
  const pad =
    size === "lg"
      ? "py-14 sm:py-16 lg:py-20"
      : size === "sm"
        ? "py-8 sm:py-10"
        : "py-10 sm:py-12 lg:py-16";
  return (
    <section
      id={id}
      style={BAND_VARS[tone]}
      /*
        `light` 와 `white` 는 같은 오프화이트다 — 색이 바뀌지 않으므로 두 밴드가 이어지면
        아래 패딩 + 위 패딩이 그대로 더해져 빈 공간처럼 보인다. 같은 지면끼리 붙었을 때는
        위 패딩을 지워 간격을 하나로 만든다(globals.css 의 `[data-band]` 규칙).
      */
      data-band={tone === "light" || tone === "white" ? "plain" : tone}
      className={`${BAND_TONE[tone]} ${pad} ${divide ? "border-t border-border" : ""} ${className}`}
    >
      <div className="container-site">{children}</div>
    </section>
  );
}

/* ============================================================================
   아이브로 — 블록 위의 작은 라벨. **크기는 언제나 작은 단(12)** 이고 두 종뿐이다.

     EYEBROW      국문·공용 — 12 Bold, 자간 없음
     Label / LABEL_CAPS   영문 캡스 — 12 ExtraBold Archivo, 자간 0.08em

   같은 12 라도 굵기·자간이 자리마다 다르면 크기가 다른 것처럼 보인다. 그래서
   한글에 `uppercase`(효과 없음) + `tracking-wide` 를 걸어 두는 식의 변형을 두지
   않는다 — 한글에 자간을 벌리면 같은 12 가 더 커 보인다.
   ========================================================================= */

/** 국문·공용 아이브로. 색은 자리에 맞게 `text-muted` / `text-foreground` 를 붙인다. */
export const EYEBROW = "text-xs font-bold";

/** 푸터 컬럼 제목 등 영문 캡스 라벨. 헤딩 위 아이브로로는 쓰지 않는다. */
export function Label({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={`text-xs font-extrabold uppercase tracking-[0.08em] [font-family:Archivo,sans-serif] ${className}`}
    >
      {children}
    </p>
  );
}

/* ------------------------------------------------------------ Button ----- */
/* ============================================================================
   버튼 규칙 — 사이트 전체에서 이것만 쓴다
   기준: Figma Style Guide › UI Elements › Buttons

   ┌ 모양 ────────────────────────────────────────────────────────────────┐
   │ 코너 0 (샤프) · 테두리 1px · 폭은 글자 + 좌우 패딩 · 세로는 아래 3단만  │
   └──────────────────────────────────────────────────────────────────────┘

   **높이는 "누가 쓰나"가 아니라 "어디에 놓이나"로 정한다.** 같은 자리의 버튼이
   화면마다 다른 높이로 나오지 않게 하는 규칙이다.

     lg (48)  페이지·단계의 주 액션 — 히어로 CTA · 섹션 말미 · 위저드 이전/다음 ·
              EmptyState. `ButtonLink` 의 기본값이라 공개 페이지에서는 size 를 적지 않는다.
     md (40)  폼과 인라인 컨트롤 — 폼 제출 · 선택 칩 · 카드/표 머리의 액션 · 탭.
     sm (32)  행 안의 보조 액션 — 표 행의 삭제·수정 · 수량 스테퍼(±) · 페이저(‹ ›) ·
              토글 칩. `toggleClass()` / `ICON_BTN_SM` 도 같은 32 다.

   변형은 네 가지뿐이다.
     primary    검정 채움 / 흰 글자     — 화면에 하나. 그 화면이 원하는 단 하나의 행동
     secondary  검정 테두리 / 투명 면   — primary 옆의 대안, 보조 이동
     tertiary   테두리 없음 / 호버 밑줄 — 취소·닫기처럼 무게가 없어야 하는 것
     danger     빨강 테두리 → 호버 채움 — 되돌릴 수 없는 삭제의 **확정** 버튼에만

   금지
     · `py-*` 로 높이를 만들지 않는다 — 높이는 h-8 / h-10 / h-12 뿐이다
       (`px-3 py-1.5` 처럼 쓰면 글꼴 줄높이에 따라 30·31·33px 이 섞여 나온다)
     · `rounded-*` 금지 — **네모는 실행(버튼), 알약은 이동(탭)** 이다. 알약은 탭 계열
       전용이다(페이지 전환 탭 `QueryTabs` pill · 위저드 하위 단계 `StepNav`)
     · 옐로를 면·글자색으로 쓰지 않는다 — 옐로는 포커스 링과 밑줄 강조에만
     · 임의 px 글자 크기 금지 — 48·40 은 text-s(14), 32 는 text-xs(12)
     · 같은 줄에 높이가 다른 컨트롤을 섞지 않는다(입력 필드도 같은 단으로 맞춘다)
   ========================================================================= */

type BtnVariant = "primary" | "secondary" | "tertiary" | "danger";
type BtnSize = "sm" | "md" | "lg";

const BTN_VARIANT: Record<BtnVariant, string> = {
  primary:
    "border-transparent bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:bg-[var(--btn-primary-bg-hover)]",
  secondary:
    "border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-background",
  tertiary: "border-transparent bg-transparent text-foreground hover:underline underline-offset-4",
  /* 파괴적 동작의 확정 버튼. 평소엔 조용하고 호버에서만 빨강 면이 된다 —
     목록 안의 인라인 "삭제"는 버튼 네모가 아니라 텍스트(adminUi 의 REMOVE_BTN)를 쓴다 */
  danger: "border-danger bg-transparent text-danger hover:bg-danger hover:text-background",
};

/**
 * Figma Style Guide › UI Elements › Buttons 는 높이 48 / 40 두 가지다.
 *
 * 크기는 "누가 쓰나"가 아니라 **"어디에 놓이나"** 로 정한다. 같은 역할의 버튼이
 * 화면마다 다른 크기로 나오지 않게 하는 규칙이다.
 *   lg(48) — 페이지·섹션의 주 액션. 히어로 · 섹션 말미 · CTA 배너 · EmptyState.
 *            `ButtonLink` 의 기본값이므로 공개 페이지에서는 size 를 적지 않는다.
 *   md(40) — 폼 제출 버튼. 백오피스·인증 화면 등 밀도가 높은 폼 전용.
 *   sm(32) — 카드·표 안의 인라인 액션. 본문 흐름을 끊지 않아야 하는 자리.
 */
// 모바일에서는 어떤 크기든 44px 을 확보한다 — h-8(32px)·h-10(40px)은 손가락으로
// 누르기에 작다. sm 브레이크포인트부터는 원래 높이로 돌아가 촘촘한 표가 유지된다.
const BTN_SIZE: Record<BtnSize, string> = {
  sm: "h-11 px-4 text-xs sm:h-8",
  md: "h-11 px-5 text-s sm:h-10",
  lg: "h-12 px-6 text-s",
};

export function btnClass(variant: BtnVariant = "secondary", size: BtnSize = "md") {
  return [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap border font-bold",
    "transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2",
    "focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40",
    BTN_VARIANT[variant],
    BTN_SIZE[size],
  ].join(" ");
}

/** 공개 페이지의 링크 버튼. 기본은 페이지 액션 크기(lg) — 크기를 적지 않는 것이 정상이다. */
export function ButtonLink({
  href,
  children,
  variant = "secondary",
  size = "lg",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: BtnVariant;
  size?: BtnSize;
  className?: string;
}) {
  return (
    <Link href={href} className={`${btnClass(variant, size)} ${className}`}>
      {children}
    </Link>
  );
}

export function ArrowRight({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className={`h-3 w-3 shrink-0 ${className}`}>
      <path
        d="M3 8h9M8.5 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ------------------------------------------------------------- Media ----- */

/**
 * 이미지 슬롯. 실제 이미지가 없으면 Figma 와이어프레임과 같은 회색 플레이스홀더.
 * 이미지/영상을 받으면 src 만 채우면 그대로 대체된다.
 *
 * 스크롤로 처음 화면에 들어올 때 옐로 면이 덮고 있다가 위로 걷힌다(`Reveal`).
 * 사이트의 모든 사진 슬롯이 이 컴포넌트를 쓰므로 리빌은 여기 한 곳에만 둔다.
 * 리빌이 방해되는 자리(인쇄 화면 등)에서는 `reveal={false}`.
 */
export function Media({
  src,
  alt,
  ratio = "16 / 9",
  className = "",
  reveal = true,
  revealDelay = 0,
}: {
  src?: string | null;
  alt: string;
  ratio?: string;
  className?: string;
  reveal?: boolean;
  revealDelay?: number;
}) {
  const inner = src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      style={{ aspectRatio: ratio }}
      className={`block w-full object-cover ${reveal ? "" : className}`}
    />
  ) : (
    <div
      style={{ aspectRatio: ratio }}
      role="img"
      aria-label={alt}
      className={`flex w-full items-center justify-center bg-placeholder ${reveal ? "" : className}`}
    >
      <svg aria-hidden viewBox="0 0 24 24" fill="none" className="h-10 w-10 text-placeholder-mark">
        <rect x="3" y="4" width="18" height="16" rx="1" fill="currentColor" />
        <circle cx="8.5" cy="9.5" r="1.6" className="fill-placeholder" />
        <path d="M3.5 17.5 9 12l4 4 3-2.5 4.5 4" stroke="var(--placeholder)" strokeWidth="1.6" />
      </svg>
    </div>
  );

  if (!reveal) return inner;
  return (
    <Reveal delay={revealDelay} className={className}>
      {inner}
    </Reveal>
  );
}

/* --------------------------------------------------- Section headings ---- */

/** Figma Header / 1-1 — 좌측 정렬 헤딩 + 보조 문구 */
export function PageHeading({
  title,
  lead,
  actions,
  as: As = "h1",
  size = "lg",
}: {
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  as?: "h1" | "h2";
  size?: "lg" | "md";
}) {
  const cls =
    size === "lg"
      ? "type-kr-heading text-h3-m sm:text-h3"
      : "type-kr-heading text-h3-m sm:text-h3";
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <As className={cls}>{title}</As>
        {lead && <div className="mt-6 text-m text-muted">{lead}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
    </div>
  );
}

/** Layout 1 / 3 / 6 의 센터 헤더 */
export function CenterHeading({ title, lead }: { title: ReactNode; lead?: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <h2 className="type-kr-heading text-h3-m sm:text-h3">{title}</h2>
      {lead && <p className="mt-5 text-m text-muted">{lead}</p>}
    </div>
  );
}

/* --------------------------------------------------- Comparison / 1 ------ */

export type CompareColumn = {
  key: string;
  title: ReactNode;
  /** 값 정렬. 기본은 우측(숫자 기준). 문장이 들어가는 열만 "left" 로 바꾼다. */
  align?: "left" | "right";
};
export type CompareRow = { label: ReactNode; note?: string; cells: ReactNode[] };
export type CompareGroup = { title: string; rows: CompareRow[] };

/** 라벨 열 폭(%) — 값 열이 많을수록 좁힌다. 이 표의 유일한 폭 규칙. */
const LABEL_PCT: Record<number, number> = { 1: 54, 2: 46, 3: 40, 4: 36, 5: 30 };

/**
 * Figma Comparison / 1 — 수치·데이터 표의 표준.
 *
 * 레이아웃 규칙 (표가 화면마다 달라 보이지 않게 하는 핵심)
 *   · `table-fixed` — 열 폭이 내용이 아니라 이 컴포넌트의 규칙으로만 정해진다.
 *     같은 열 수의 표는 어디에 놓여도 같은 폭이 된다.
 *   · 값 열은 기본 우측 정렬. 숫자 기둥이 맞아야 비교가 된다.
 *   · 카테고리로 묶을 때는 표를 여러 개 만들지 말고 `groups` 를 쓴다.
 *     표를 쪼개면 묶음마다 열 폭이 달라진다.
 *   · **단위 행을 두지 않는다.** 헤더에 단위 보조행이 있는 열과 없는 열이 섞이면
 *     헤더 높이가 어긋난다. 수량은 단위 없이 숫자만, 금액은 셀마다 `₩` 를 붙인다.
 */
export function ComparisonTable({
  rowLabel,
  columns,
  rows,
  groups,
  footer,
  dense = false,
  labelWidth,
}: {
  /** 좌측 상단 라벨 열 제목 */
  rowLabel?: string;
  columns: CompareColumn[];
  rows?: CompareRow[];
  /** 카테고리별 소제목 행이 들어간 단일 표 */
  groups?: CompareGroup[];
  footer?: ReactNode;
  dense?: boolean;
  /**
   * 라벨 열 폭을 고정한다(예: `"12rem"`). `SpecTable`·`GroupedSpecTable` 과 같은
   * 화면에 놓여 값 열이 같은 세로선에서 시작해야 할 때만 쓴다. 비우면 열 수에
   * 따른 기본 비율(`LABEL_PCT`)을 쓴다.
   */
  labelWidth?: string;
}) {
  const body: CompareGroup[] = groups ?? (rows ? [{ title: "", rows }] : []);
  const n = Math.max(columns.length, 1);
  const labelPct = LABEL_PCT[n] ?? 30;
  const colPct = (100 - labelPct) / n;
  const cellPad = dense ? "py-2.5" : "py-4";
  // 열이 늘어도 셀이 뭉개지지 않게 최소 폭을 준다. 넘치면 가로 스크롤.
  const minWidth = `${11 + n * 7}rem`;

  const align = (c: CompareColumn) => (c.align === "left" ? "text-left" : "text-right");

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed border-collapse text-left" style={{ minWidth }}>
        <colgroup>
          <col style={{ width: labelWidth ?? `${labelPct}%` }} />
          {columns.map((c) => (
            <col
              key={c.key}
              style={{ width: labelWidth ? `calc((100% - ${labelWidth}) / ${n})` : `${colPct}%` }}
            />
          ))}
        </colgroup>
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className={`${cellPad} pr-4 align-bottom text-xs font-bold text-muted`}>
              {rowLabel}
            </th>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={`${cellPad} pl-4 align-bottom ${align(c)}`}>
                <span className="block break-keep text-s font-bold">{c.title}</span>
              </th>
            ))}
          </tr>
        </thead>
        {body.map((group, gi) => (
          <tbody key={group.title || gi}>
            {group.title && (
              <tr>
                <th
                  scope="colgroup"
                  colSpan={n + 1}
                  className={`border-b border-border pb-2 text-left text-xs font-bold text-muted ${
                    gi === 0 ? "pt-5" : "pt-9"
                  }`}
                >
                  {group.title}
                </th>
              </tr>
            )}
            {group.rows.map((r, ri) => (
              <tr key={ri} className="border-b border-border">
                <th
                  scope="row"
                  className={`${cellPad} pr-4 align-top text-s font-normal text-muted`}
                >
                  <span className="block break-keep">{r.label}</span>
                  {r.note && <span className="mt-0.5 block text-xs text-muted">{r.note}</span>}
                </th>
                {r.cells.map((cell, i) => (
                  <td
                    key={columns[i]?.key ?? i}
                    className={`${cellPad} whitespace-pre-wrap pl-4 align-top text-s font-bold tabular-nums ${
                      columns[i]?.align === "left" ? "break-keep text-left" : "text-right"
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
      {footer && <div className="mt-6">{footer}</div>}
    </div>
  );
}

/**
 * 선택 카드 — 제목 + 설명이 들어가는 클릭 가능한 네모.
 *
 * **버튼의 3단 높이(48/40/32) 규칙 밖이다.** 높이가 내용에서 나오기 때문이다. 대신
 * 패딩을 두 가지로만 고정해 화면마다 다른 카드가 되지 않게 한다.
 *   기본(20)  — 한 화면에 2~3장 놓이는 큰 선택(회원 유형 등)
 *   dense(16/12) — 격자로 여러 장 놓이는 선택(패키지 등)
 *
 * **선택 = 검정 채움.** 옐로 하이라이트도, 좌측 컬러 바도, "선택됨" 배지도 쓰지 않는다.
 * 검정 면 위에서 안쪽 글자가 사라지지 않도록 호출부에서 `CHOICE_SELECTED_VARS` 를
 * 함께 style 로 넘긴다.
 */
export function choiceClass(
  selected: boolean,
  { disabled = false, dense = false }: { disabled?: boolean; dense?: boolean } = {},
) {
  return [
    "block w-full border text-left outline-none transition-colors",
    dense ? "px-4 py-3" : "px-5 py-5",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
    disabled
      ? "cursor-not-allowed border-border-soft opacity-45"
      : selected
        ? "cursor-pointer border-foreground bg-inverse-bg text-inverse-fg"
        : "cursor-pointer border-border-soft hover:border-foreground",
  ].join(" ");
}

/**
 * 작은 토글 칩 — 날짜 역할(셋업·공연일·철수), 필터, 값 스테퍼처럼 표·카드 안에 놓이는
 * 인라인 컨트롤. 버튼 크기는 시스템의 세 단만 쓴다(48 / 40 / **32**) — 이건 32 다.
 * 선택 = 검정 채움 한 가지 언어. 같은 줄에 놓이는 컨트롤은 전부 이 높이로 맞춘다.
 */
export function toggleClass(selected: boolean, disabled = false) {
  return [
    "inline-flex h-11 items-center justify-center gap-1 whitespace-nowrap border px-3 text-xs font-bold sm:h-8",
    "transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
    "focus-visible:outline-foreground",
    disabled
      ? "cursor-not-allowed border-border-soft opacity-40"
      : selected
        ? "cursor-pointer border-foreground bg-inverse-bg text-inverse-fg"
        : "cursor-pointer border-border-soft text-muted hover:border-foreground hover:text-foreground",
  ].join(" ");
}

/**
 * 파일 선택 입력 — 브라우저가 그리는 "파일 선택" 버튼도 시스템 버튼처럼 보이게 한다.
 * 네모 아웃라인 · 샤프 코너 · 32(버튼 sm 과 같은 단). 필드 자체는 한 줄 입력이라 40.
 */
export const FILE_INPUT =
  // `my-[3px]` 는 광학 보정이다. 브라우저는 파일 버튼을 글자 **베이스라인**에 얹으므로
  // 40 필드 안에서 위 1 / 아래 7 로 치우친다(실측). 3px 을 주면 4.0 / 4.2 로 가운데 온다.
  // display:flex 나 align-items 는 파일 입력 내부에 먹지 않는다(크로미움).
  "field-base file:mr-3 file:my-[3px] file:inline-flex file:h-8 file:items-center file:border file:border-foreground file:bg-transparent file:px-4 file:text-xs file:font-bold file:text-foreground";

/** 아이콘 버튼(±, ‹ ›) — 토글과 같은 32 높이의 정사각형 */
export const ICON_BTN_SM =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center border border-border-soft text-s text-muted transition-colors hover:border-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40";

/** 선택된 칩 안에서 text-muted·border 가 지면에 맞게 뒤집히도록 */
export const CHOICE_SELECTED_VARS: React.CSSProperties = {
  ["--muted" as string]: "var(--inverse-muted)",
  ["--border" as string]: "var(--inverse-fg)",
};

/** 보조 고지문 — 색면·좌측 바를 쓰지 않고 헤어라인 위 작은 글씨로만 */
export function Note({ children, className = "" }: { children: ReactNode; className?: string }) {
  // 문단이 여러 개인 고지문(`Prose`)도 들어오므로 `<p>` 가 아니라 `<div>` 다 —
  // p 안의 p·div 는 잘못된 중첩이라 하이드레이션이 깨진다(규약 화면에서 실제로 깨졌다).
  return (
    // p 가 아니라 div — 호출부가 Prose(div) 같은 블록을 자식으로 넘기는데,
    // p 안의 div 는 잘못된 중첩이라 브라우저가 파싱 중 재배치해 하이드레이션이
    // 통째로 깨진다(/rules 에서 React #418 로 실제 발생).
    <div className={`border-t border-border pt-3 text-xs leading-5 text-muted ${className}`}>
      {children}
    </div>
  );
}

/** 값이 하나뿐인 라벨/값 나열 — Comparison 의 행 리듬을 그대로 쓴다 */
export function SpecTable({
  rows,
  className = "",
  dense = false,
}: {
  rows: [string, string][];
  className?: string;
  dense?: boolean;
}) {
  const pad = dense ? "py-2.5" : "py-4";
  return (
    <dl className={`border-t border-border ${className}`}>
      {/* 같은 라벨이 반복되는 표가 있다(RATE INCLUDES 의 "공간" 두 행) — 인덱스를 키에 섞는다 */}
      {rows.map(([k, v], i) => (
        <div
          key={`${k}-${i}`}
          className={`grid gap-1 border-b border-border ${pad} sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:gap-6`}
        >
          <dt className="text-s text-muted">{k}</dt>
          <dd className="whitespace-pre-wrap text-s font-bold">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * 묶음이 있는 라벨/값 표. 열 배치는 `SpecTable` 과 완전히 같다 —
 * 같은 페이지에 두 표가 위아래로 놓일 때(RATE INCLUDES ↔ ADDITIONAL CHARGES)
 * 값 열이 다른 자리에서 시작하면 세로 기준선이 어긋나기 때문이다.
 */
export interface SpecGroup {
  title: string;
  rows: { label: string; value: string; note?: string }[];
}

export function GroupedSpecTable({
  groups,
  className = "",
  dense = false,
}: {
  groups: SpecGroup[];
  className?: string;
  dense?: boolean;
}) {
  const pad = dense ? "py-2.5" : "py-4";
  // 첫 묶음 제목에 이미 아래 테두리가 있다. 감싸는 요소에 위 테두리를 또 두면
  // 섹션 제목과 첫 묶음 사이에 줄이 두 개 겹쳐 보인다 — 위 테두리는 두지 않는다.
  return (
    <div className={className}>
      {groups.map((g, gi) => (
        <section key={`${g.title}-${gi}`}>
          <h4
            className={`border-b border-border pb-2 text-xs font-bold text-muted ${
              gi === 0 ? "pt-4" : "pt-8"
            }`}
          >
            {g.title}
          </h4>
          <dl>
            {g.rows.map((r, i) => (
              <div
                key={`${r.label}-${i}`}
                className={`grid gap-1 border-b border-border ${pad} sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:gap-6`}
              >
                <dt className="text-s text-muted">{r.label}</dt>
                {/* 보조 문구(단위·조건)는 값 **옆에** 붙인다 — 아래 줄로 내리면 한 항목이
                    두 줄이 되어 목록의 행 리듬이 깨진다 */}
                <dd className="text-s font-bold">
                  {r.value}
                  {r.note && <span className="ml-2 text-xs font-normal text-muted">{r.note}</span>}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

/* ------------------------------------------------------- 카드 / 스탯 ----- */

/**
 * 검정 머리(제목) + 흰 본문 카드. 아웃라인은 검정 실선이다.
 * 12칼럼에서 6칼럼씩(2-up) 놓이며, 시설 제원의 수용인원 카드와 대관료의
 * 포함 항목 카드가 같은 물건을 쓴다.
 */
export function TitledCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={`flex h-full min-w-0 flex-col border border-border bg-panel lg:col-span-6 ${className}`}
    >
      {title && (
        <header className="bg-inverse-bg px-6 py-5 text-inverse-fg" style={INVERSE_SURFACE_VARS}>
          <h4 className={`${headingFontClass(title)} break-keep text-h5-m sm:text-h5`}>{title}</h4>
        </header>
      )}
      <div className="flex-1 p-6">{children}</div>
    </article>
  );
}

/**
 * 값이 **수치**인지 — 한글이 없고 숫자가 있으면 수치로 보고 Archivo 를 쓴다.
 * `isLatinHeading` 은 ASCII 만 통과시켜 `3,553㎡` 같은 기호 섞인 수치를 놓쳤다.
 * 한글이 섞인 값(`최대 3,060석`)에는 절대 Archivo 를 걸지 않는다 — 한글 글립이 없다.
 */
function isNumericValue(text: string): boolean {
  return /\d/.test(text) && !/[가-힣]/.test(text);
}

/**
 * 카드·스탯의 **값** 한 덩어리에 붙일 서체 클래스.
 * 수치면 Archivo(대문자 변환은 끈다 — 단위는 대소문자로 뜻이 갈린다),
 * 한글이 섞이면 국문 헤딩 서체.
 */
export function valueHeadingClass(text: string): string {
  return isNumericValue(text) ? "type-display normal-case" : "type-kr-heading";
}

/**
 * **Archivo Medium(500)** — 시설 제원 개요 카드의 값 전용 (2026-09-03).
 *
 * `type-display` 는 Archivo **ExtraBold(800) + 대문자 변환**이라 개요 문구처럼 긴
 * 영문 나열("CONCERT · FAN MEETING · SHOWCASE · PRIVATE EVENT")에 걸면 너무 무겁다.
 * 한 단 가벼운 500 을 쓰고 대소문자는 원문 그대로 둔다.
 *
 * 한글이 섞이면 국문 헤딩으로 떨어뜨린다 — Archivo 에는 한글 글립이 없어 깨진다.
 */
function archivoMediumClass(text: string): string {
  return /[가-힣]/.test(text)
    ? "type-kr-heading"
    : "font-medium normal-case [font-family:Archivo,sans-serif]";
}

/**
 * 4-up 스탯 카드 — 굵은 윗선 + 작은 라벨 + 큰 값(+ 부연 한 줄).
 * 시설 제원의 상위 4개 포인트와 대관료의 기본 이용 기준이 같은 레이아웃을 쓴다.
 * 12칼럼에서 3칼럼씩 떨어진다. 값에 줄바꿈을 넣으면 그대로 줄이 나뉜다.
 *
 * 크기는 **값이 얼마나 짧은가**로 고른다.
 *   lg (H3)  `22,500` 처럼 수치 한 덩어리 — 한 줄에 떨어진다
 *   md (H4)  `좌석형 · 스탠딩형 가변 구성` 처럼 서술문 — H3 로 두면 3줄까지 접힌다
 *   sm (H5)  기본. 표 옆이나 밀도 높은 자리
 * lg·md 는 수치면 Archivo 로 쓰고, sm 은 국문 헤딩으로 고정한다.
 */
const STAT_VALUE_SIZE = {
  sm: "text-h5-m sm:text-h5",
  md: "text-h4-m sm:text-h4",
  lg: "text-h3-m sm:text-h3",
} as const;

export function StatCards({
  items,
  size = "sm",
  valueFont = "auto",
}: {
  items: { label: string; value: string; note?: string }[];
  size?: keyof typeof STAT_VALUE_SIZE;
  /**
   * 값의 서체. `auto` 는 수치면 Archivo ExtraBold, 아니면 국문 헤딩.
   * `archivo` 는 **시설 제원 개요 카드 전용** — Archivo Medium 으로 한 단 가볍게 쓴다.
   */
  valueFont?: "auto" | "archivo";
}) {
  /*
    [개정 2026-09-03] 개수에 따라 폭이 정해진다 — 카드가 몇 장이든 **한 줄을 꽉 채운다.**
      1장  12칼럼(지면 전체)   2장  6칼럼씩(1/2)   3장 이상  3칼럼씩(4-up)
    예전에는 몇 장이든 3칼럼씩이라, 한두 장일 때 오른쪽이 통째로 비어 카드가 잘리다 만
    것처럼 보였다. 3장이면 4-up 격자에서 한 자리가 남는데, 그건 4장으로 채울 자리라는
    뜻이라 그대로 둔다.
  */
  const span =
    items.length === 1 ? "lg:col-span-12" : items.length === 2 ? "lg:col-span-6" : "lg:col-span-3";
  // 한 장뿐이면 좁은 화면에서도 반으로 자르지 않는다.
  const smCols = items.length === 1 ? "" : "sm:grid-cols-2";
  return (
    <ul className={`grid gap-x-[var(--gutter)] gap-y-10 ${smCols} lg:grid-cols-12`}>
      {items.map((it, i) => (
        <li key={`${it.label}-${i}`} className={`border-t-2 border-border pt-5 ${span}`}>
          <p className="text-xs font-bold text-muted">{it.label}</p>
          <p
            className={`mt-3 whitespace-pre-line break-keep ${
              size === "sm"
                ? "type-kr-heading"
                : valueFont === "archivo"
                  ? archivoMediumClass(it.value)
                  : valueHeadingClass(it.value)
            } ${STAT_VALUE_SIZE[size]}`}
          >
            {it.value}
          </p>
          {it.note && (
            <p className="mt-3 whitespace-pre-line break-keep text-s text-muted">
              <RichText text={it.note} />
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

/* --------------------------------------------------------- RowList ------- */

/**
 * Figma APPLICATION COMPONENTS › **Stacked Lists** › Stacked List / 1.
 *
 *   헤더(제목 + 리드 + 우측 컨트롤) → 헤어라인 → 행들
 *   행 = 좌: 리드(번호·날짜) + 제목/부제 2줄 · 우: 메타 + 액션
 *   행 사이 헤어라인. 모바일에서는 우측 메타·액션이 아래 줄로 떨어진다.
 */
export function RowList({
  title,
  lead,
  controls,
  children,
  className = "",
}: {
  title?: ReactNode;
  lead?: ReactNode;
  /** 헤더 우측 컨트롤 (검색·정렬 등) */
  controls?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const hasHeader = Boolean(title || lead || controls);
  return (
    <div className={className}>
      {hasHeader && (
        <div className="flex flex-col gap-4 pb-5 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <div className="max-w-2xl">
            {title && <h3 className="type-kr-heading text-h5-m sm:text-h5">{title}</h3>}
            {lead && <p className="mt-3 text-s text-muted">{lead}</p>}
          </div>
          {controls && <div className="flex shrink-0 flex-wrap gap-3">{controls}</div>}
        </div>
      )}
      <ul className="border-t border-border">{children}</ul>
    </div>
  );
}

export function Row({
  href,
  lead,
  title,
  sub,
  meta,
  action,
}: {
  href?: string;
  lead?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
}) {
  const inner = (
    // 좁은 화면에서는 좌측 블록 아래로 메타·액션이 내려간다 (Stacked List 모바일)
    <div className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:gap-8 sm:py-6">
      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-8">
        {lead && (
          <span className="shrink-0 text-xs tabular-nums text-muted sm:w-24">{lead}</span>
        )}
        <span className="min-w-0">
          <span className="type-kr-heading block break-keep text-h6-m sm:text-h6">{title}</span>
          {sub && <span className="mt-1 block break-keep text-s text-muted">{sub}</span>}
        </span>
      </div>
      {(meta || action) && (
        <div className="flex shrink-0 items-center justify-between gap-5 sm:justify-end">
          {meta && <span className="text-xs text-muted">{meta}</span>}
          {action && <span className="shrink-0">{action}</span>}
        </div>
      )}
    </div>
  );
  return (
    <li className="border-b border-border">
      {href ? (
        <Link href={href} className="group block transition-colors hover:bg-foreground/[0.04]">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </li>
  );
}

/* ------------------------------------------------------------- CTA ------- */

/**
 * 페이지 하단 옐로 배너의 고정 높이(내부 콘텐츠 영역).
 * 페이지마다 카피 길이가 달라도 배너 높이는 같아야 한다 — 이 값은 여기서만 정한다.
 */
export const CTA_BAND_MIN = "9rem";

/** Figma CTA / 1 — 좌: 헤딩 + 본문 / 우: 버튼 2개 */
export function CTABand({
  title,
  lead,
  actions,
  tone = "accent",
}: {
  title: ReactNode;
  lead?: ReactNode;
  actions: ReactNode;
  tone?: BandTone;
}) {
  return (
    <Band tone={tone} size="sm">
      {/*
        옐로 배너는 페이지마다 카피 길이가 달라도 높이가 같아야 한다.
        min-height 를 고정하고 내용을 수직 중앙에 둔다 (CTA_BAND_MIN 은 이 한 곳에서만 정한다).
      */}
      <div
        style={{ minHeight: CTA_BAND_MIN }}
        className="flex flex-col justify-center gap-8 lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="max-w-2xl">
          {/* 국문 제목은 어절 단위로 끊는다 — `break-keep` 없이는 "확인하 / 세요" 처럼 잘린다 */}
          <h2 className="type-kr-heading break-keep text-h3-m sm:text-h3">{title}</h2>
          {lead && <p className="mt-4 break-keep text-s">{lead}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap gap-3 lg:justify-end">{actions}</div>
      </div>
    </Band>
  );
}

/* ----------------------------------------------------------- Others ------ */

export function EmptyState({
  title,
  desc,
  action,
}: {
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  // Figma 시스템에는 점선 보더가 없다 — 위아래 헤어라인 사이의 빈 블록으로 둔다.
  return (
    <div className="border-y border-border px-6 py-16 text-center">
      <p className="type-kr-heading text-h6-m sm:text-h6">{title}</p>
      {desc && <p className="mx-auto mt-3 max-w-md break-keep text-s text-muted">{desc}</p>}
      {action && <div className="mt-8 flex justify-center">{action}</div>}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "good" | "warn" | "danger" | "inverse";
}) {
  const map = {
    neutral: "border-border text-muted",
    accent: "border-foreground bg-accent text-on-accent",
    good: "border-good/40 bg-good-soft text-good",
    warn: "border-border bg-warn-soft text-warn",
    danger: "border-danger/40 bg-danger-soft text-danger",
    inverse: "border-inverse-fg/40 text-inverse-fg",
  } as const;
  return (
    <span
      className={`inline-flex items-center border px-2 py-1 text-xs font-extrabold uppercase tracking-[0.08em] [font-family:Archivo,sans-serif] ${map[tone]}`}
    >
      {children}
    </span>
  );
}

export function Multiline({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => (
        <span key={i}>
          {i > 0 && <br />}
          {line}
        </span>
      ))}
    </>
  );
}

/* ==========================================================================
   Notion 「8/20 오픈 기준 정보구조」 헤딩 위계

   페이지 제목은 **H1 영문 슬로건**, 그 아래 **H3 국문 제목**이 온다.
   섹션 제목도 H3 이며 영문 키워드(FEATURES · STAGE & CAPACITY …)와
   국문(시설 개요 · 아레나 대관료 …)을 같은 크기로 쓴다.
   사진 전면 섹션의 공간명은 H2, 항목 제목은 H5 다.

   d2(96)는 홈 히어로·선언문 전용이다(가이드 §2.2) — 페이지 타이틀에는 쓰지 않는다.
   ========================================================================== */

/** 영문 대문자 키워드인지 — 그렇다면 Archivo, 아니면 국문 헤딩 서체를 쓴다 */
function isLatinHeading(text: ReactNode): boolean {
  return typeof text === "string" && /^[\x20-\x7E]+$/.test(text);
}

/** 영문 캡스면 Archivo, 국문이면 국문 헤딩 서체 — 카드 제목처럼 kit 밖에서도 쓴다 */
export function headingFontClass(text: ReactNode): string {
  return isLatinHeading(text) ? "type-display" : "type-kr-heading";
}

/**
 * 페이지 헤드 — H1 영문 슬로건 + H3 국문 제목 + 리드.
 * 탭이 있는 페이지에서는 탭마다 H1 이 바뀌므로 탭 패널 안에서 쓴다.
 */
export function PageHead({
  en,
  ko,
  lead,
  actions,
  as: As = "h1",
  wideLead = false,
}: {
  /** H1 — 영문 슬로건 (ABOUT SEOUL ARENA · ARENA RATES …) */
  en: string;
  /** H3 — 국문 제목 (시설 개요 · 아레나 대관료 …) */
  ko?: string;
  lead?: ReactNode;
  actions?: ReactNode;
  as?: "h1" | "h2";
  /**
   * 리드의 한 줄 길이 상한(`measure`)을 푼다 (2026-09-02).
   * 읽기 편한 줄 길이는 산문의 기본이지만, 시설 개요처럼 운영자가 쓴 소개 문단은
   * 상한 때문에 지면이 남는데도 줄이 일찍 꺾여 답답해 보인다는 요청이 있었다.
   */
  wideLead?: boolean;
}) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <As className="type-display text-h1-m sm:text-h1">{en}</As>
        {ko && (
          <h3 className="type-kr-heading mt-4 text-h3-m sm:text-h3">{ko}</h3>
        )}
        {lead && (
          <div
            className={`mt-4 break-keep text-m text-muted ${wideLead ? "" : "measure"}`}
          >
            {lead}
          </div>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
    </div>
  );
}

/** 섹션 헤드 — H3. 영문 키워드면 Archivo, 국문이면 국문 헤딩 서체가 자동으로 붙는다. */
export function SectionHead({
  title,
  lead,
  actions,
}: {
  title: string;
  lead?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <h3 className={`${headingFontClass(title)} text-h3-m sm:text-h3`}>{title}</h3>
        {lead && <div className="measure mt-3 break-keep text-m text-muted">{lead}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
    </div>
  );
}

/**
 * 섹션을 두 칼럼으로 — **좌 2col 제목(+보조 문장) / 우 4col 표·목록.**
 *
 * 규약 목차 + 본문, 마이페이지 메뉴 + 본문, FAQ 묶음 + 질문과 같은 `grid-site` 2/4
 * 분할이다. 제목이 표 위에 가로로 눕는 대신 왼쪽에 서면, 표가 화면 폭을 다 쓰지 않고
 * 읽기 좋은 폭으로 좁아진다 — 값이 라벨에서 멀리 떨어지지 않는다.
 *
 * 제목은 `SectionHead` 와 같은 H3 다. 2col(1440 에서 410px) 안에서 두 줄로 접히는
 * 것은 정상이다(ADDITIONAL CHARGES).
 */
export function SplitSection({
  title,
  aside,
  children,
  className = "",
}: {
  title: string;
  /** 제목 아래 보조 문장 — 표에 넣으면 신청 항목처럼 읽히는 기본 조건 등 */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid-site ${className}`}>
      <div className="lg:col-span-3">
        <h3 className={`${headingFontClass(title)} break-keep text-h3-m sm:text-h3`}>{title}</h3>
        {aside && <div className="mt-6">{aside}</div>}
      </div>
      <div className="min-w-0 lg:col-span-9">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------ 사진 전면 섹션 ---- */

/**
 * Figma `01 공개 화면 › 02 공간 안내` 의 **Header / 5** — 공간 소개 섹션.
 *
 *   전면 사진 위에 좌측 정렬 텍스트 블록이 수직 가운데에 놓인다.
 *   H2 공간명 → 24 → eyebrow(수용 규모, 14 Bold) → 24 → 설명(본문, 폭 3col)
 *
 * 사진이 없으면 `placeholder` 면으로 떨어지며 텍스트는 검정으로 뒤집힌다.
 */
export function PhotoHero({
  title,
  eyebrow,
  desc,
  image,
  minHeight = "900px",
}: {
  title: string;
  eyebrow?: string;
  desc?: string;
  image?: string | null;
  minHeight?: string;
}) {
  return (
    <section
      className={`relative isolate flex items-center ${image ? "text-n-white" : "bg-placeholder text-foreground"}`}
      style={{ minHeight: `min(${minHeight}, 100svh)` }}
    >
      {image && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" aria-hidden className="absolute inset-0 -z-10 h-full w-full object-cover" />
          {/*
            텍스트 가독을 위한 그늘. 좌측(텍스트가 앉는 쪽)만 짙게 깔고 우측은 사진을 살린다.
            아레나 사진처럼 바닥이 밝은 컷에서도 흰 본문이 읽혀야 하므로 좌측은 65%까지 준다.
          */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-gradient-to-r from-black/70 via-black/35 to-black/10"
          />
        </>
      )}
      {/*
        [개정 2026-09-03] 텍스트 블록을 지면 그리드에 올리고 **9/12(3/4)** 로 넓혔다.
        `max-w-[41.5rem]`(664px) 고정이라 1440 에서 대략 두 칼럼에서 끊겼고, 문장이
        중간에 잘려 다음 줄로 넘어가 읽는 리듬이 끊겼다. 사진 위 텍스트라 지면 전체를
        쓰지는 않는다 — 우측 1/4 는 사진이 숨 쉬는 자리로 남긴다.
      */}
      <div className="container-site py-20">
        <div className="grid-site">
          <div className="lg:col-span-9">
            <h2 className="type-kr-heading text-h3-m sm:text-h3">{title}</h2>
            {eyebrow && <p className="mt-6 text-s font-bold">{eyebrow}</p>}
            {desc && <Prose text={desc} className="mt-6 text-m leading-8" gap="mt-5" />}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ 특징 목록 --- */

export interface FeatureItem {
  /** H5 항목 제목 */
  title: string;
  /** 설명 — 줄바꿈은 배열 항목으로 나눈다 */
  lines: string[];
}

/**
 * FEATURES 목록 — H5 제목 + 설명. 번호를 붙이면 순번이 함께 나온다.
 * 항목 사이 헤어라인. 2컬럼으로 깔 수 있지만 순서가 있는 내용에는 쓰지 않는다.
 */
export function FeatureList({
  items,
  numbered = false,
  columns = 1,
}: {
  items: FeatureItem[];
  numbered?: boolean;
  columns?: 1 | 2;
}) {
  return (
    <ul
      className={`border-t border-border ${
        columns === 2 ? "lg:grid lg:grid-cols-2 lg:gap-x-[var(--gutter)]" : ""
      }`}
    >
      {items.map((it, i) => (
        <li
          key={it.title}
          className={`flex gap-6 border-b border-border py-7 sm:gap-8 ${
            columns === 2 && i === 1 ? "lg:border-t-0" : ""
          }`}
        >
          {numbered && (
            <span className="type-display w-10 shrink-0 text-h6-m tabular-nums text-muted sm:text-h6">
              {String(i + 1).padStart(2, "0")}
            </span>
          )}
          <div className="min-w-0">
            <h4 className="type-kr-heading break-keep text-h5-m sm:text-h5">{it.title}</h4>
            {it.lines.length > 0 && (
              <div className="measure mt-3 space-y-1">
                {it.lines.map((line) => (
                  <p key={line} className="break-keep text-s text-muted">
                    {line}
                  </p>
                ))}
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------- 대관 절차 ------ */

export interface ProcessStep {
  no: string;
  title: string;
  desc: string;
}

function StepArrow({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" className={`h-5 w-5 shrink-0 ${className}`}>
      <path d="M9.5 5.5 16 12l-6.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}

/**
 * 대관 절차 — **12칼럼 그리드 위에 3칼럼씩(4-up), 두 줄.** 박스 사이 거터에 화살표가 놓인다.
 * 순서가 있는 내용이므로 카드 그리드가 아니라 화살표로 이어진 흐름으로 읽힌다.
 * 좁은 화면에서는 한 줄에 하나(640 미만) / 둘(640~1023)씩 쌓이고 화살표는 사라진다.
 */
export function ProcessSteps({ steps }: { steps: ProcessStep[] }) {
  return (
    <ol className="grid gap-[var(--gutter)] sm:grid-cols-2 lg:grid-cols-12">
      {steps.map((s, i) => {
        // 줄 끝(4·8번째)과 마지막 박스에는 화살표를 두지 않는다
        const hasArrow = i % 4 !== 3 && i !== steps.length - 1;
        return (
          <li key={s.no} className="relative lg:col-span-3">
            <div className="h-full border border-border bg-panel p-6">
              <span className="type-display block text-h6-m tabular-nums sm:text-h6">{s.no}</span>
              <h4 className="type-kr-heading mt-3 break-keep text-h6-m sm:text-h6">{s.title}</h4>
              <p className="mt-3 break-keep text-s text-muted">
              <InlineLinks text={s.desc} />
            </p>
            </div>
            {hasArrow && (
              /* 화살표는 박스 사이 거터의 가운데에 뜬다 — 박스 폭을 줄여 자리를 만들지
                 않는다(박스가 컬럼에서 벗어난다) */
              <StepArrow className="absolute left-[calc(100%_+_var(--gutter)/2)] top-1/2 hidden -translate-x-1/2 -translate-y-1/2 text-muted lg:block" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------ 자료 목록 --- */

export function DownloadIcon({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center ${className}`}
    >
      {/* Figma 2608 › 01 공개 화면 › `download` 벡터 */}
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M11.996 15.7793C11.8866 15.7793 11.7825 15.7585 11.6835 15.717C11.5843 15.6757 11.4889 15.6095 11.3972 15.5185L7.55646 11.6778C7.38663 11.5033 7.30588 11.299 7.31421 11.065C7.32255 10.831 7.40838 10.6291 7.57171 10.4593C7.74971 10.2888 7.95646 10.2046 8.19196 10.2068C8.4273 10.2091 8.62996 10.2952 8.79996 10.4653L11.1482 12.8325V4.70225C11.1482 4.46225 11.2305 4.25933 11.3952 4.0935C11.5597 3.9275 11.7628 3.8445 12.0045 3.8445C12.246 3.8445 12.4475 3.9275 12.6092 4.0935C12.7709 4.25933 12.8517 4.46225 12.8517 4.70225V12.8325L15.225 10.4653C15.3916 10.2952 15.5884 10.2123 15.8152 10.2163C16.0422 10.2204 16.2441 10.3076 16.421 10.4777C16.5891 10.6481 16.6723 10.852 16.6705 11.0895C16.6685 11.327 16.5825 11.5314 16.4125 11.7027L12.6027 15.5185C12.5107 15.6095 12.4139 15.6757 12.3122 15.717C12.2107 15.7585 12.1053 15.7793 11.996 15.7793ZM5.55371 20.1495C5.09371 20.1495 4.69488 19.9806 4.35721 19.6428C4.01938 19.3051 3.85046 18.9062 3.85046 18.4462V15.7227C3.85046 15.4824 3.93271 15.2804 4.09721 15.1168C4.26171 14.9531 4.4648 14.8713 4.70646 14.8713C4.94813 14.8713 5.1498 14.9531 5.31146 15.1168C5.47296 15.2804 5.55371 15.4824 5.55371 15.7227V18.4462H18.4462V15.7227C18.4462 15.4824 18.5285 15.2804 18.693 15.1168C18.8575 14.9531 19.0604 14.8713 19.3017 14.8713C19.543 14.8713 19.7456 14.9531 19.9095 15.1168C20.0735 15.2804 20.1555 15.4824 20.1555 15.7227V18.4462C20.1555 18.9062 19.986 19.3051 19.647 19.6428C19.3081 19.9806 18.9079 20.1495 18.4462 20.1495H5.55371Z" />
      </svg>
    </span>
  );
}

export interface DocItem {
  title: string;
  desc?: string;
  /** [라벨, 값] — 형식·쪽수·용량 / 버전 / 갱신일 */
  meta?: [string, string][];
  href?: string;
  /** 파일이 아직 없을 때 버튼 대신 표시하는 안내 */
  pendingNote?: string;
}

/** 첨부파일 다운로드 모듈 — 자료명 / 설명 / 형식·버전·갱신일 / 버튼 순서를 고정한다. */
export function DocumentList({
  items,
  emptyNote = "다운로드할 대관자료가 없습니다.",
}: {
  items: DocItem[];
  /** 자료가 아직 없을 때 목록 자리에 대신 나오는 한 줄 */
  emptyNote?: string;
}) {
  if (items.length === 0) {
    return (
      <p className="border-t border-border pt-7 text-s text-muted">{emptyNote}</p>
    );
  }
  return (
    <ul className="border-t border-border">
      {/* 자료명은 겹칠 수 있다(같은 문서의 판본을 나란히 두는 경우) — 이름을 열쇠로 쓰면
          같은 이름끼리 한 줄로 뭉개진다. 목록 순서를 열쇠로 쓴다. */}
      {items.map((d, i) => (
        <li
          key={i}
          className="flex flex-col gap-5 border-b border-border py-7 lg:flex-row lg:items-start lg:justify-between lg:gap-12"
        >
          <div className="min-w-0">
            <h4 className="type-kr-heading break-keep text-h5-m sm:text-h5">{d.title}</h4>
            {d.desc && <p className="measure mt-3 break-keep text-s text-muted">{d.desc}</p>}
            {d.meta && d.meta.length > 0 && (
              <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2">
                {d.meta.map(([k, v]) => (
                  <div key={k} className="flex gap-2 text-xs">
                    <dt className="font-bold text-muted">{k}</dt>
                    <dd className="tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
          <div className="shrink-0">
            {d.href ? (
              <ButtonLink href={d.href} variant="secondary">
                다운로드
                <DownloadIcon />
              </ButtonLink>
            ) : (
              <p className="text-xs text-muted">{d.pendingNote ?? "준비 중입니다."}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
