import Link from "next/link";
import type { ReactNode } from "react";

/**
 * 인증 화면 셸 — Figma 규격이 로그인과 회원가입에서 서로 다르다.
 *
 * variant="card"  Application Components › Sign Up and Log In Pages › Login / 3
 *   로고 가운데 · 1px 보더 카드 안에 폼 · 가운데 정렬 헤딩 · 전폭 버튼 ·
 *   카드 아래 "계정이 없으신가요? 회원가입" · 카드 밖 하단 카피라이트. 탭 없음.
 *
 * variant="tabs"  Wireframe › Sign up / 1
 *   로고 좌상단 · 상단 탭(회원가입 | 로그인) · 카드 없이 단일 컬럼.
 *
 * variant="plain"
 *   탭·카드 없이 가운데 좁은 단일 컬럼. 섹션이 여러 개인 긴 폼(회원가입)에 쓴다.
 */
export function AuthShell({
  variant = "tabs",
  active,
  title,
  lead,
  width = "sm",
  footer,
  children,
}: {
  variant?: "tabs" | "card" | "plain";
  active: "login" | "register";
  title: string;
  lead?: string;
  /** 회원가입 위저드는 2열 폼이라 더 넓게 쓴다 */
  width?: "sm" | "md" | "lg";
  footer?: ReactNode;
  children: ReactNode;
}) {
  const maxW = width === "lg" ? "max-w-4xl" : width === "md" ? "max-w-xl" : "max-w-md";

  if (variant === "card") {
    return (
      <div className="flex min-h-screen flex-1 flex-col bg-background">
        <div className="container-site flex h-16 items-center justify-center lg:h-[72px]">
          <Link
            href="/"
            className="type-display flex h-full items-center text-h5-m leading-none sm:text-h5"
          >
            Seoul Arena
          </Link>
        </div>

        <main className="container-site flex flex-1 items-center justify-center py-12 sm:py-16">
          <div className={`w-full ${maxW}`}>
            {/* 카드 아웃라인은 검정 실선 — 사이트의 다른 카드와 같은 규칙이다 (2026-09-03) */}
            <div className="rounded-surface border border-border p-8 sm:p-10">
              <h1 className="type-kr-heading text-center text-h3-m sm:text-h3">{title}</h1>
              {lead && <p className="mt-4 text-center text-s text-muted">{lead}</p>}
              <div className="mt-8">{children}</div>
              {footer && <div className="mt-6 text-center text-s text-muted">{footer}</div>}
            </div>
          </div>
        </main>

        <div className="container-site py-8 text-center text-xs text-muted">
          © {new Date().getFullYear()} Seoul Arena
        </div>
      </div>
    );
  }

  if (variant === "plain") {
    return (
      <div className="flex min-h-screen flex-1 flex-col bg-background">
        <div className="container-site flex h-16 items-center lg:h-[72px]">
          <Link
            href="/"
            className="type-display flex h-full items-center text-h6-m leading-none sm:text-h5"
          >
            Seoul Arena
          </Link>
        </div>

        <main className="container-site flex flex-1 justify-center py-12 sm:py-16">
          <div className={`w-full ${maxW}`}>
            <h1 className="type-kr-heading text-center text-h3-m sm:text-h3">{title}</h1>
            {lead && <p className="mt-4 text-center text-s text-muted">{lead}</p>}
            <div className="mt-12">{children}</div>
            {footer && <div className="mt-8 text-center text-s text-muted">{footer}</div>}
          </div>
        </main>

        <div className="container-site py-8 text-center text-xs text-muted">
          © {new Date().getFullYear()} Seoul Arena
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "register" as const, label: "회원가입", href: "/register" },
    { key: "login" as const, label: "로그인", href: "/login" },
  ];

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <div className="container-site flex h-16 items-center lg:h-[72px]">
        <Link href="/" className="type-display text-h6-m leading-none sm:text-h5">
          Seoul Arena
        </Link>
      </div>

      <main className="container-site flex flex-1 items-start justify-center py-12 sm:py-20">
        <div className={`w-full ${width === "lg" ? "max-w-4xl" : width === "md" ? "max-w-xl" : "max-w-sm"}`}>
          <div role="tablist" className="flex justify-center gap-10">
            {tabs.map((t) => (
              <Link
                key={t.key}
                href={t.href}
                role="tab"
                aria-selected={active === t.key}
                className={`flex h-10 items-center border-b-2 text-s font-bold transition-colors ${
                  active === t.key
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </div>

          <h1 className="type-kr-heading mt-10 text-center text-h3-m sm:text-h3">{title}</h1>
          {lead && <p className="mt-4 text-center text-s text-muted">{lead}</p>}

          <div className="mt-10">{children}</div>
        </div>
      </main>

      <div className="container-site py-8 text-center text-xs text-muted">
        © {new Date().getFullYear()} Seoul Arena
      </div>
    </div>
  );
}

/** 라벨 위 · 전폭 입력. 필수는 * 표시. action 은 라벨 우측 링크 자리 */
export function AuthField({
  label,
  required,
  hint,
  action,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-s font-bold">
          {label}
          {required && (
            <span aria-hidden className="text-danger">
              *
            </span>
          )}
        </span>
        {action}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
