import Link from "next/link";
import type { ReactNode } from "react";

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

const BTN_SIZE: Record<BtnSize, string> = {
  sm: "h-8 px-4 text-xs",
  md: "h-10 px-5 text-s",
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

export function ButtonLink({
  href,
  children,
  variant = "secondary",
  size = "md",
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
 */
export function Media({
  src,
  alt,
  ratio = "16 / 9",
  className = "",
}: {
  src?: string | null;
  alt: string;
  ratio?: string;
  className?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        style={{ aspectRatio: ratio }}
        className={`w-full object-cover ${className}`}
      />
    );
  }
  return (
    <div
      style={{ aspectRatio: ratio }}
      role="img"
      aria-label={alt}
      className={`flex w-full items-center justify-center bg-placeholder ${className}`}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        className="h-10 w-10 text-placeholder-mark"
      >
        <rect x="3" y="4" width="18" height="16" rx="1" fill="currentColor" />
        <circle cx="8.5" cy="9.5" r="1.6" className="fill-placeholder" />
        <path d="M3.5 17.5 9 12l4 4 3-2.5 4.5 4" stroke="var(--placeholder)" strokeWidth="1.6" />
      </svg>
    </div>
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
        {items.map((it) => (
          <article key={it.title} className="flex flex-col border border-border/25">
            <Media src={it.image} alt={it.title} ratio="16 / 10" />
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
      {items.map((it) => (
        <article key={it.title}>
          <Media src={it.image} alt={it.title} ratio="16 / 9" />
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
        {items.map((it) => (
          <article key={it.title} className="grid grid-cols-1 border border-border/25 sm:grid-cols-2">
            <Media src={it.image} alt={it.title} ratio="4 / 3" className="h-full" />
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
        <div className="sticky top-28">
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

/**
 * Figma Comparison / 1 — 수치·데이터 표의 표준.
 * 좌측 라벨 열 + 우측 값 열들. 라벨과 값이 같은 행에 붙어 읽힌다.
 * 단위는 열 헤더에 한 번만 쓰고 셀에서는 반복하지 않는다.
 */
export function ComparisonTable({
  rowLabel,
  columns,
  rows,
  footer,
  dense = false,
}: {
  /** 좌측 상단 라벨 열 제목 */
  rowLabel?: string;
  columns: { key: string; title: ReactNode; sub?: ReactNode }[];
  rows: { label: string; cells: ReactNode[] }[];
  footer?: ReactNode;
  dense?: boolean;
}) {
  const cellPad = dense ? "py-2.5" : "py-4";
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] border-collapse text-left">
        <thead>
          <tr className="border-b border-border/25">
            <th scope="col" className={`${cellPad} pr-6 align-bottom text-xs font-bold text-muted`}>
              {rowLabel}
            </th>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={`${cellPad} pl-6 align-bottom`}>
                <span className="type-kr-heading block text-h6-m sm:text-h6">{c.title}</span>
                {c.sub && <span className="mt-1 block text-xs font-normal text-muted">{c.sub}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-border/15">
              <th scope="row" className={`${cellPad} pr-6 text-s font-normal text-muted`}>
                {r.label}
              </th>
              {r.cells.map((cell, i) => (
                <td
                  key={columns[i]?.key ?? i}
                  className={`${cellPad} pl-6 text-s font-bold tabular-nums`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {footer && <div className="mt-6">{footer}</div>}
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
    <dl className={`border-t border-border/25 ${className}`}>
      {rows.map(([k, v]) => (
        <div
          key={k}
          className={`grid gap-1 border-b border-border/15 ${pad} sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:gap-6`}
        >
          <dt className="text-s text-muted">{k}</dt>
          <dd className="text-s font-bold">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/* --------------------------------------------------------- RowList ------- */

export function RowList({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <ul className={`border-t border-border/25 ${className}`}>{children}</ul>;
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
    <div className="flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:gap-8">
      {lead && <div className="w-full shrink-0 text-xs tabular-nums text-muted sm:w-32">{lead}</div>}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="type-kr-heading text-h6-m sm:text-h6">{title}</span>
          {sub && <span className="text-s text-muted">{sub}</span>}
        </div>
      </div>
      {meta && <div className="shrink-0 text-xs text-muted">{meta}</div>}
      {action && <div className="shrink-0">{action}</div>}
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
      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <h2 className="type-kr-heading text-h4-m sm:text-h4">{title}</h2>
          {lead && <p className="mt-4 text-s">{lead}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>
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
  return (
    <div className="border border-dashed border-border/30 px-6 py-14 text-center">
      <p className="type-kr-heading text-h6">{title}</p>
      {desc && <p className="mx-auto mt-3 max-w-md text-s text-muted">{desc}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
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
