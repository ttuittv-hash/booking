import Link from "next/link";
import type { ReactNode } from "react";
import { Reveal } from "@/components/ui/Reveal";

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
  const pad =
    size === "lg"
      ? "py-20 sm:py-28 lg:py-32"
      : size === "sm"
        ? "py-10 sm:py-14"
        : "py-16 sm:py-20 lg:py-24";
  return (
    <section
      id={id}
      style={BAND_VARS[tone]}
      className={`${BAND_TONE[tone]} ${pad} ${divide ? "border-t border-border/15" : ""} ${className}`}
    >
      <div className="container-site">{children}</div>
    </section>
  );
}

/** 푸터 컬럼 제목 등 구조 라벨. 헤딩 위 아이브로로는 쓰지 않는다. */
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
/* Figma Style Guide › UI Elements › Buttons — 모노크롬 3종 */

type BtnVariant = "primary" | "secondary" | "tertiary";
type BtnSize = "sm" | "md" | "lg";

const BTN_VARIANT: Record<BtnVariant, string> = {
  primary:
    "border-transparent bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:bg-[var(--btn-primary-bg-hover)]",
  secondary:
    "border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-background",
  tertiary: "border-transparent bg-transparent text-foreground hover:underline underline-offset-4",
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
      ? "type-kr-heading text-h2-m sm:text-h2"
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

/* ------------------------------------------------------ Layout 1 --------- */

export interface CardItem {
  title: string;
  desc?: string;
  image?: string | null;
  href?: string;
  linkLabel?: string;
  meta?: string;
}

/** Figma Layout / 1 — 센터 헤더 + 카드 그리드 (이미지 위 / 텍스트 아래, 보더 있음) */
export function LayoutCards({
  title,
  lead,
  items,
  columns = 2,
}: {
  title?: ReactNode;
  lead?: ReactNode;
  items: CardItem[];
  columns?: 2 | 3;
}) {
  return (
    <div>
      {title && <CenterHeading title={title} lead={lead} />}
      <div
        className={`mt-14 grid gap-6 ${columns === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}
      >
        {items.map((it, i) => (
          <article key={it.title} className="flex flex-col border border-border/25">
            <Media src={it.image} alt={it.title} ratio="16 / 10" revealDelay={i * 70} />
            <div className="flex flex-1 flex-col p-6">
              <h3 className="type-kr-heading text-h5-m sm:text-h5">{it.title}</h3>
              {it.meta && <p className="mt-2 text-s text-muted">{it.meta}</p>}
              {it.desc && <p className="mt-4 flex-1 text-s text-muted">{it.desc}</p>}
              {it.href && (
                <div className="mt-6">
                  <ButtonLink href={it.href} variant="secondary" size="sm">
                    {it.linkLabel ?? "자세히 보기"}
                  </ButtonLink>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------ Layout 2 --------- */

/** Figma Layout / 2 — 보더 없는 특징 그리드 (이미지 위 / 헤딩 / 본문 / 버튼) */
export function LayoutFeatures({ items, columns = 2 }: { items: CardItem[]; columns?: 2 | 3 }) {
  return (
    <div className={`grid gap-10 ${columns === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
      {items.map((it, i) => (
        <article key={it.title}>
          <Media src={it.image} alt={it.title} ratio="16 / 9" revealDelay={i * 70} />
          <h3 className="type-kr-heading mt-6 text-h5-m sm:text-h5">{it.title}</h3>
          {it.desc && <p className="mt-4 text-s text-muted">{it.desc}</p>}
          {it.href && (
            <div className="mt-5">
              <ButtonLink href={it.href} variant="tertiary" size="sm" className="px-0">
                {it.linkLabel ?? "자세히 보기"}
                <ArrowRight />
              </ButtonLink>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

/* ------------------------------------------------------ Layout 3 --------- */

/** Figma Layout / 3 — 센터 헤더 + 가로형 카드 (좌 이미지 / 우 텍스트) */
export function LayoutHorizCards({
  title,
  lead,
  items,
}: {
  title?: ReactNode;
  lead?: ReactNode;
  items: CardItem[];
}) {
  return (
    <div>
      {title && <CenterHeading title={title} lead={lead} />}
      <div className="mt-14 grid gap-6 md:grid-cols-2">
        {items.map((it, i) => (
          <article key={it.title} className="grid grid-cols-1 border border-border/25 sm:grid-cols-2">
            <Media src={it.image} alt={it.title} ratio="4 / 3" className="h-full" revealDelay={i * 70} />
            <div className="flex flex-col justify-center p-6">
              <h3 className="type-kr-heading text-h6-m sm:text-h6">{it.title}</h3>
              {it.desc && <p className="mt-3 text-s text-muted">{it.desc}</p>}
              {it.href && (
                <div className="mt-5">
                  <ButtonLink href={it.href} variant="secondary" size="sm">
                    {it.linkLabel ?? "자세히 보기"}
                  </ButtonLink>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------ Layout 4 --------- */

/** Figma Layout / 4 — 좌측 헤딩 블록 + 하단 텍스트 컬럼 */
export function LayoutColumns({
  title,
  lead,
  items,
  columns = 3,
}: {
  title: ReactNode;
  lead?: ReactNode;
  items: { title: string; desc?: string }[];
  columns?: 2 | 3 | 4;
}) {
  const cols =
    columns === 4 ? "md:grid-cols-4" : columns === 2 ? "md:grid-cols-2" : "md:grid-cols-3";
  return (
    <div>
      <div className="max-w-3xl">
        <h2 className="type-kr-heading text-h3-m sm:text-h3">{title}</h2>
        {lead && <p className="mt-6 text-m text-muted">{lead}</p>}
      </div>
      <div className={`mt-14 grid gap-10 ${cols}`}>
        {items.map((it) => (
          <div key={it.title}>
            <h3 className="type-kr-heading text-h6-m sm:text-h6">{it.title}</h3>
            {it.desc && <p className="mt-3 text-s text-muted">{it.desc}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------ Layout 5 --------- */

/** Figma Layout / 5 — 텍스트 컬럼만 */
export function LayoutTextColumns({
  items,
  columns = 4,
}: {
  items: { title: string; desc?: string }[];
  columns?: 2 | 3 | 4;
}) {
  const cols =
    columns === 4 ? "md:grid-cols-4" : columns === 2 ? "md:grid-cols-2" : "md:grid-cols-3";
  return (
    <div className={`grid gap-10 ${cols}`}>
      {items.map((it) => (
        <div key={it.title}>
          <h3 className="type-kr-heading text-h6-m sm:text-h6">{it.title}</h3>
          {it.desc && <p className="mt-3 text-s text-muted">{it.desc}</p>}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------ Layout 6 --------- */

/** Figma Layout / 6 — 센터 헤더 + 좌우 교차 블록 (텍스트 | 이미지) */
export function LayoutAlternating({
  title,
  lead,
  items,
}: {
  title?: ReactNode;
  lead?: ReactNode;
  items: CardItem[];
}) {
  return (
    <div>
      {title && <CenterHeading title={title} lead={lead} />}
      <div className="mt-14 space-y-6">
        {items.map((it, i) => (
          <article
            key={it.title}
            className="grid grid-cols-1 border border-border/25 lg:grid-cols-2"
          >
            <div
              className={`flex flex-col justify-center p-8 lg:p-12 ${i % 2 === 1 ? "lg:order-2" : ""}`}
            >
              <h3 className="type-kr-heading text-h4-m sm:text-h4">{it.title}</h3>
              {it.desc && <p className="mt-5 max-w-xl text-s text-muted">{it.desc}</p>}
              {it.href && (
                <div className="mt-7">
                  <ButtonLink href={it.href} variant="secondary">
                    {it.linkLabel ?? "자세히 보기"}
                  </ButtonLink>
                </div>
              )}
            </div>
            <Media
              src={it.image}
              alt={it.title}
              ratio="4 / 3"
              className={`h-full ${i % 2 === 1 ? "lg:order-1" : ""}`}
            />
          </article>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------ Layout 7 --------- */

/** Figma Layout / 7 — 좌측 스티키 이미지 + 우측 스크롤 텍스트(번호) */
export function LayoutSticky({ items }: { items: CardItem[] }) {
  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
      <div className="hidden lg:block">
        <div className="sticky top-[calc(var(--header-h)+5rem)]">
          <Media src={items[0]?.image} alt={items[0]?.title ?? ""} ratio="3 / 4" />
        </div>
      </div>
      <div className="space-y-16">
        {items.map((it, i) => (
          <article key={it.title}>
            <span className="type-display text-h5 tabular-nums text-muted">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="type-kr-heading mt-3 text-h4-m sm:text-h4">{it.title}</h3>
            {it.desc && <p className="mt-5 text-s text-muted">{it.desc}</p>}
            <div className="mt-6 lg:hidden">
              <Media src={it.image} alt={it.title} ratio="16 / 10" />
            </div>
            {it.href && (
              <div className="mt-6">
                <ButtonLink href={it.href} variant="secondary" size="sm">
                  {it.linkLabel ?? "자세히 보기"}
                </ButtonLink>
              </div>
            )}
          </article>
        ))}
      </div>
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
}: {
  /** 좌측 상단 라벨 열 제목 */
  rowLabel?: string;
  columns: CompareColumn[];
  rows?: CompareRow[];
  /** 카테고리별 소제목 행이 들어간 단일 표 */
  groups?: CompareGroup[];
  footer?: ReactNode;
  dense?: boolean;
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
          <col style={{ width: `${labelPct}%` }} />
          {columns.map((c) => (
            <col key={c.key} style={{ width: `${colPct}%` }} />
          ))}
        </colgroup>
        <thead>
          <tr className="border-b border-border/25">
            <th scope="col" className={`${cellPad} pr-4 align-bottom text-xs font-bold text-muted`}>
              {rowLabel}
            </th>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={`${cellPad} pl-4 align-bottom ${align(c)}`}>
                <span className="type-kr-heading block break-keep text-h6-m sm:text-h6">
                  {c.title}
                </span>
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
                  className={`border-b border-border/25 pb-2 text-left text-xs font-bold uppercase tracking-[0.08em] text-muted ${
                    gi === 0 ? "pt-5" : "pt-9"
                  }`}
                >
                  {group.title}
                </th>
              </tr>
            )}
            {group.rows.map((r, ri) => (
              <tr key={ri} className="border-b border-border/15">
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
                    className={`${cellPad} pl-4 align-top text-s font-bold tabular-nums ${
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
 * 선택 컨트롤의 단일 언어 — Figma Multi-step Forms 선택 칩.
 * **선택 = 검정 채움.** 옐로 하이라이트도, 좌측 컬러 바도, "선택됨" 배지도 쓰지 않는다.
 */
export function choiceClass(selected: boolean, disabled = false) {
  return [
    "block w-full border px-5 py-5 text-left outline-none transition-colors",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
    disabled
      ? "cursor-not-allowed border-border-soft opacity-45"
      : selected
        ? "cursor-pointer border-foreground bg-inverse-bg text-inverse-fg"
        : "cursor-pointer border-border-soft hover:border-foreground",
  ].join(" ");
}

/** 선택된 칩 안에서 text-muted·border 가 지면에 맞게 뒤집히도록 */
export const CHOICE_SELECTED_VARS: React.CSSProperties = {
  ["--muted" as string]: "var(--inverse-muted)",
  ["--border" as string]: "var(--inverse-fg)",
};

/** 보조 고지문 — 색면·좌측 바를 쓰지 않고 헤어라인 위 작은 글씨로만 */
export function Note({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`border-t border-border/25 pt-3 text-xs leading-5 text-muted ${className}`}>
      {children}
    </p>
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
    <dl className={`border-t border-border/25 ${className}`}>
      {/* 같은 라벨이 반복되는 표가 있다(RATE INCLUDES 의 "공간" 두 행) — 인덱스를 키에 섞는다 */}
      {rows.map(([k, v], i) => (
        <div
          key={`${k}-${i}`}
          className={`grid gap-1 border-b border-border/15 ${pad} sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:gap-6`}
        >
          <dt className="text-s text-muted">{k}</dt>
          <dd className="text-s font-bold">{v}</dd>
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
  return (
    <div className={`border-t border-border/25 ${className}`}>
      {groups.map((g, gi) => (
        <section key={`${g.title}-${gi}`}>
          <h4
            className={`border-b border-border/25 pb-2 text-xs font-bold text-muted ${
              gi === 0 ? "pt-4" : "pt-8"
            }`}
          >
            {g.title}
          </h4>
          <dl>
            {g.rows.map((r, i) => (
              <div
                key={`${r.label}-${i}`}
                className={`grid gap-1 border-b border-border/15 ${pad} sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:gap-6`}
              >
                <dt className="text-s text-muted">{r.label}</dt>
                <dd className="text-s font-bold">
                  {r.value}
                  {r.note && (
                    <span className="mt-1 block text-xs font-normal text-muted">{r.note}</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
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
      <ul className="border-t border-border/25">{children}</ul>
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
    <li className="border-b border-border/15">
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
          <h2 className="type-kr-heading text-h4-m sm:text-h4">{title}</h2>
          {lead && <p className="mt-4 text-s">{lead}</p>}
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
    <div className="border-y border-border/25 px-6 py-16 text-center">
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
    neutral: "border-border/30 text-muted",
    accent: "border-foreground bg-accent text-on-accent",
    good: "border-good/40 bg-good-soft text-good",
    warn: "border-border/30 bg-warn-soft text-warn",
    danger: "border-danger/40 bg-danger-soft text-danger",
    inverse: "border-inverse-fg/40 text-inverse-fg",
  } as const;
  return (
    <span
      className={`inline-flex items-center border px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] [font-family:Archivo,sans-serif] ${map[tone]}`}
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

   디자인 가이드 §3 의 "페이지 타이틀 = Display/D2 96" 규칙과 충돌하는데,
   이 구조에서는 **Notion 을 우선**한다.
   ========================================================================== */

/** 영문 대문자 키워드인지 — 그렇다면 Archivo, 아니면 국문 헤딩 서체를 쓴다 */
function isLatinHeading(text: ReactNode): boolean {
  return typeof text === "string" && /^[\x20-\x7E]+$/.test(text);
}

function headingFontClass(text: ReactNode): string {
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
}: {
  /** H1 — 영문 슬로건 (ABOUT SEOUL ARENA · ARENA RATES …) */
  en: string;
  /** H3 — 국문 제목 (시설 개요 · 아레나 대관료 …) */
  ko?: string;
  lead?: ReactNode;
  actions?: ReactNode;
  as?: "h1" | "h2";
}) {
  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <As className="type-display text-h1-m sm:text-h1">{en}</As>
        {ko && (
          <h3 className="type-kr-heading mt-6 text-h3-m sm:text-h3">{ko}</h3>
        )}
        {lead && <div className="measure mt-6 break-keep text-m text-muted">{lead}</div>}
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
        {lead && <div className="measure mt-5 break-keep text-m text-muted">{lead}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
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
      <div className="container-site py-20">
        <h2 className="type-kr-heading text-h2-m sm:text-h2">{title}</h2>
        {eyebrow && <p className="mt-6 text-s font-bold">{eyebrow}</p>}
        {desc && (
          <p className="mt-6 max-w-[41.5rem] break-keep text-r leading-7">{desc}</p>
        )}
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
      className={`border-t border-border/25 ${
        columns === 2 ? "lg:grid lg:grid-cols-2 lg:gap-x-[var(--gutter)]" : ""
      }`}
    >
      {items.map((it, i) => (
        <li
          key={it.title}
          className={`flex gap-6 border-b border-border/15 py-7 sm:gap-8 ${
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

/**
 * 라벨 + 설명 한 줄 목록 (ADDITIONAL FACILITIES 처럼 "명칭 + 부연" 나열).
 * 값이 없는 항목도 그대로 둔다 — 수량이 미확정이면 그 사실이 정보다.
 */
export function LabeledList({ items }: { items: { label: string; desc?: string }[] }) {
  return (
    <dl className="border-t border-border/25">
      {items.map((it, i) => (
        <div
          key={`${it.label}-${i}`}
          className="grid gap-1 border-b border-border/15 py-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:gap-8"
        >
          <dt className="text-s font-bold">{it.label}</dt>
          {it.desc && <dd className="break-keep text-s text-muted">{it.desc}</dd>}
        </div>
      ))}
    </dl>
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
 * 대관 절차 — **한 줄에 4박스씩 두 줄**, 박스 사이에 화살표.
 * 순서가 있는 내용이므로 카드 그리드가 아니라 화살표로 이어진 흐름으로 그린다.
 * 좁은 화면에서는 한 줄에 하나씩 쌓이고 화살표는 아래를 향한다.
 */
export function ProcessSteps({ steps }: { steps: ProcessStep[] }) {
  const rows: ProcessStep[][] = [];
  for (let i = 0; i < steps.length; i += 4) rows.push(steps.slice(i, i + 4));

  return (
    <ol className="space-y-[var(--gutter)]">
      {rows.map((row, ri) => (
        <li key={ri}>
          <ul className="grid gap-3 sm:grid-cols-2 lg:flex lg:items-stretch lg:gap-0">
            {row.map((s, i) => (
              <li key={s.no} className="flex items-stretch lg:min-w-0 lg:flex-1">
                <div className="min-w-0 flex-1 border border-border/25 bg-panel p-6">
                  <span className="type-display block text-h6-m tabular-nums sm:text-h6">
                    {s.no}
                  </span>
                  <h4 className="type-kr-heading mt-3 break-keep text-h6-m sm:text-h6">{s.title}</h4>
                  <p className="mt-3 break-keep text-s text-muted">{s.desc}</p>
                </div>
                {i < row.length - 1 && (
                  <StepArrow className="mx-2 hidden self-center text-muted lg:block" />
                )}
              </li>
            ))}
          </ul>
        </li>
      ))}
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
export function DocumentList({ items }: { items: DocItem[] }) {
  return (
    <ul className="border-t border-border/25">
      {items.map((d) => (
        <li
          key={d.title}
          className="flex flex-col gap-5 border-b border-border/15 py-7 lg:flex-row lg:items-start lg:justify-between lg:gap-12"
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
