"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { ArrowRight, Label, btnClass } from "@/components/ui/kit";

/**
 * Figma "Sign Up and Log In Pages" — 좌측 브랜드 면(Iconic 그라디언트) + 우측 좁은 폭 폼.
 * 입력 필드 공통 스타일: 샤프 코너 · border-soft 1px · surface 배경 ·
 * 포커스 시 보더 foreground + 옐로 2px 아웃라인.
 * (kit.tsx 는 파운데이션이라 손대지 않으므로 폼 토큰은 각 폼 화면에 상수로 둔다)
 */
const FIELD =
  "w-full border border-border-soft bg-surface px-3.5 py-2.5 text-s text-foreground transition-colors placeholder:text-muted focus:border-foreground focus:outline-2 focus:outline-accent";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "로그인에 실패했습니다.");
        return;
      }
      router.push(data.user.role === "ADMIN" ? "/admin" : "/apply");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <Breadcrumb items={[{ label: "로그인" }]} />

      <main className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* 브랜드 면 — 옐로 텍스트는 블랙 배경 위에서만 허용 */}
        <aside className="relative flex flex-col justify-between overflow-hidden bg-inverse-bg px-6 py-14 text-inverse-fg lg:px-16 lg:py-20">
          <Link href="/" className="type-display text-h6 leading-none">
            Seoul Arena
          </Link>
          <div className="mt-16">
            <span aria-hidden className="mb-6 block h-1 w-16 bg-accent" />
            <Label className="text-accent">Host It</Label>
            <p className="type-display mt-6 text-h3-m sm:text-h2">
              Your stage
              <br />
              starts here
            </p>
            <p className="mt-6 max-w-sm text-s text-inverse-fg/80">
              대관 신청·견적 산출·계약 진행 상황을 한곳에서 관리하세요.
            </p>
          </div>
        </aside>

        {/* 폼 면 */}
        <div className="flex items-center px-6 py-16 lg:px-16 lg:py-20">
          <div className="w-full max-w-sm">
            <Label className="text-muted">Log In</Label>
            <h1 className="type-kr-heading mt-4 text-h3-m sm:text-h3">로그인</h1>
            <p className="mt-4 text-s text-muted">대관 신청 계정으로 로그인하세요.</p>

            <form onSubmit={handleSubmit} noValidate className="mt-10 space-y-5">
              <label className="block">
                <span className="mb-2 block text-xs text-muted">아이디</span>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className={FIELD}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs text-muted">비밀번호</span>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={FIELD}
                />
              </label>

              {error && (
                <p className="border-l-2 border-danger bg-danger-soft px-3 py-2 text-s text-danger">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`${btnClass("primary", "lg")} w-full`}
              >
                {loading ? "처리 중..." : "로그인"}
                {!loading && <ArrowRight />}
              </button>
            </form>

            <p className="mt-8 border-t border-border/15 pt-6 text-s text-muted">
              신청자 계정이 없으신가요?{" "}
              <Link
                href="/register"
                className="font-bold text-foreground underline decoration-accent decoration-2 underline-offset-4"
              >
                회원가입
              </Link>
            </p>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
