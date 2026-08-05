import Link from "next/link";
import type { ReactNode } from "react";

/* ============================================================================
   Seoul Arena — Business layer UI kit
   Figma "2607 서울아레나 웹사이트 Full" › WORKSPACE › Style Guide / Design
   시각 원칙
     · 섹션 구분은 여백이 아니라 풀블리드 컬러 밴드 교대로
     · 카드 박스 대신 헤어라인 리스트 로우 (편집 디자인)
     · 버튼은 1px 보더 · 투명 배경 · 샤프 코너
     · 옐로는 면·강조에만. 옐로 위 텍스트는 항상 검정 (대비 14:1)
   ========================================================================= */

/* -------------------------------------------------------------- Band ----- */

export type BandTone = "light" | "white" | "accent" | "dark";

const BAND_TONE: Record<BandTone, string> = {
  light: "bg-background text-foreground",
  white: "bg-surface text-foreground",
  accent: "bg-accent text-on-accent",
  dark: "bg-inverse-bg text-inverse-fg",
};

/** 풀블리드 컬러 밴드. 섹션의 기본 단위. */
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
  /** 상단 헤어라인 (같은 톤이 연속될 때만) */
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
      className={`${BAND_TONE[tone]} ${pad} ${divide ? "border-t border-border/15" : ""} ${className}`}
    >
      <div className="container-site">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------- Label ----- */

/** 섹션 라벨 — Archivo Extrabold 소형 대문자 */
export function Label({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={`type-label text-xs ${className}`}>{children}</p>;
}

/* -------------------------------------------------------- SectionHead ---- */

/**
 * 2컬럼 스플릿 — 좌: 섹션 라벨(Archivo 800) / 우: 본문
 * Figma Design 페이지의 Header/1-1 · Header/2-1 패턴
 */
export function SectionHead({
  label,
  title,
  lead,
  aside,
  tone = "light",
  className = "",
}: {
  label?: string;
  title: ReactNode;
  lead?: ReactNode;
  aside?: ReactNode;
  tone?: BandTone;
  className?: string;
}) {
  const mutedCls = tone === "dark" ? "text-inverse-muted" : "text-muted";
  return (
    <div className={`grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:gap-16 ${className}`}>
      <div>
        {label && <Label className={`mb-4 ${mutedCls}`}>{label}</Label>}
        <h2 className="type-display text-h3-m sm:text-h3 lg:text-h2">{title}</h2>
      </div>
      {(lead || aside) && (
        <div className="lg:pt-14">
          {lead && <div className={`text-m ${mutedCls}`}>{lead}</div>}
          {aside}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ Button ----- */

type BtnVariant = "primary" | "outline" | "inverse" | "ghost";
type BtnSize = "sm" | "md" | "lg";

const BTN_VARIANT: Record<BtnVariant, string> = {
  // 옐로 면 + 검정 텍스트 (대비 약 14:1)
  primary:
    "border-foreground bg-accent text-on-accent hover:bg-foreground hover:text-inverse-fg",
  outline:
    "border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-inverse-fg",
  inverse:
    "border-inverse-fg bg-transparent text-inverse-fg hover:bg-accent hover:border-accent hover:text-on-accent",
  ghost: "border-transparent bg-transparent text-foreground hover:border-foreground",
};

const BTN_SIZE: Record<BtnSize, string> = {
  sm: "h-8 px-4 text-xs",
  md: "h-10 px-6 text-s",
  lg: "h-12 px-8 text-r",
};

export function btnClass(variant: BtnVariant = "outline", size: BtnSize = "md") {
  return [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap border font-bold",
    "transition-colors duration-150 focus-visible:outline focus-visible:outline-2",
    "focus-visible:outline-offset-2 focus-visible:outline-foreground",
    "disabled:cursor-not-allowed disabled:opacity-40",
    BTN_VARIANT[variant],
    BTN_SIZE[size],
  ].join(" ");
}

export function ButtonLink({
  href,
  children,
  variant = "outline",
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

/* --------------------------------------------------------- Arrow icon ---- */

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

/** 옐로 밴드에서 쓰는 원형 화살표 */
export function ArrowCircle({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current ${className}`}
    >
      <ArrowRight />
    </span>
  );
}

/* ----------------------------------------------------------- ListRow ----- */

/**
 * 헤어라인 리스트 로우 — Figma Design 페이지의 Card(1312×154) / List 패턴.
 * 공지·FAQ·패키지·신청 내역·백오피스 목록에 공통 적용.
 */
export function RowList({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <ul className={`border-t border-border/25 ${className}`}>{children}</ul>;
}

export function Row({
  href,
  lead,
  title,
  sub,
  meta,
  action,
  tone = "light",
}: {
  href?: string;
  /** 좌측 고정폭 슬롯 (날짜·번호·상태) */
  lead?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  tone?: BandTone;
}) {
  const mutedCls = tone === "dark" ? "text-inverse-muted" : "text-muted";
  const inner = (
    <div className="flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:gap-8">
      {lead && (
        <div className={`w-full shrink-0 text-xs tabular-nums sm:w-32 ${mutedCls}`}>{lead}</div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="type-kr-heading text-h6-m sm:text-h6">{title}</span>
          {sub && <span className={`text-s ${mutedCls}`}>{sub}</span>}
        </div>
      </div>
      {meta && <div className={`shrink-0 text-xs ${mutedCls}`}>{meta}</div>}
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
  return (
    <li className="border-b border-border/25">
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

/* ------------------------------------------------------ SpecTable -------- */

/** 제원 표 — 라벨/값 2열, 헤어라인 구분 */
export function SpecTable({
  rows,
  className = "",
}: {
  rows: [string, string][];
  className?: string;
}) {
  return (
    <dl className={`border-t border-border/25 ${className}`}>
      {rows.map(([k, v]) => (
        <div
          key={k}
          className="grid gap-1 border-b border-border/25 py-4 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)] sm:gap-6"
        >
          <dt className="text-s font-bold">{k}</dt>
          <dd className="text-s text-muted">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ---------------------------------------------------- MediaPlaceholder --- */

/**
 * "이미지 준비 중" 슬롯. Iconic 그라디언트(Black·Yellow·White 절제된 전환)로
 * 빈 화면을 브랜드 자산으로 전환한다. 실제 이미지가 들어오면 그대로 대체.
 */
export function Media({
  src,
  alt,
  ratio = "16 / 9",
  variant = "dark",
  label = "이미지 준비 중",
  className = "",
}: {
  src?: string | null;
  alt: string;
  ratio?: string;
  variant?: "dark" | "light";
  label?: string;
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
      aria-label={`${alt} — ${label}`}
      className={`grain relative flex w-full items-end overflow-hidden ${
        variant === "dark" ? "bg-iconic" : "bg-iconic-light"
      } ${className}`}
    >
      <span className="grain-layer" />
      <span
        className={`type-label relative p-4 text-xs ${
          variant === "dark" ? "text-inverse-muted" : "text-muted"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

/* -------------------------------------------------------- EmptyState ----- */

/** 준비 중 콘텐츠(대관규약 전문·Technical Package·FAQ 등) 공통 처리 */
export function EmptyState({
  title,
  desc,
  action,
  tone = "light",
}: {
  title: string;
  desc?: string;
  action?: ReactNode;
  tone?: BandTone;
}) {
  const mutedCls = tone === "dark" ? "text-inverse-muted" : "text-muted";
  return (
    <div className="border border-dashed border-border/30 px-6 py-14 text-center">
      <div className="mx-auto mb-5 h-8 w-8 bg-accent" aria-hidden />
      <p className="type-kr-heading text-h6">{title}</p>
      {desc && <p className={`mx-auto mt-3 max-w-md text-s ${mutedCls}`}>{desc}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------- Badge ----- */

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
      className={`type-label inline-flex items-center border px-2 py-1 text-[10px] ${map[tone]}`}
    >
      {children}
    </span>
  );
}

/* ---------------------------------------------------------- Multiline ---- */

/** seed 콘텐츠의 \n 개행을 유지해 렌더 */
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
