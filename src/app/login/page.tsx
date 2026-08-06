"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { ArrowRight, Band, PageHeading, btnClass } from "@/components/ui/kit";

/**
 * Figma "Sign Up and Log In Pages" — 좌측 브랜드 면 + 우측 좁은 폭 폼.
 * 브랜드 면은 `Band tone="dark"` 로 토큰을 국소 반전시킨다(다크모드 자동 대응).
 * 입력 필드는 `field-base` 유틸리티 하나로 통일한다.
 */

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
      {/* 2뎁스 — items 가 1개라 렌더되지 않는다 */}
      <Breadcrumb items={[{ label: "로그인" }]} />

      <main className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* 브랜드 면 — Band 가 톤별로 토큰을 뒤집으므로 색을 직접 지정하지 않는다 */}
        <Band tone="dark" size="lg" className="flex flex-col justify-center">
          <Link href="/" className="type-display text-h6 leading-none">
            Seoul Arena
          </Link>
          <span aria-hidden className="mt-16 block h-1 w-16 bg-accent" />
          <p className="type-display mt-6 text-h3-m sm:text-h2">
            Your stage
            <br />
            starts here
          </p>
          <p className="mt-6 max-w-sm text-s text-muted">
            대관 신청·견적 산출·계약 진행 상황을 한곳에서 관리하세요.
          </p>
        </Band>

        {/* 폼 면 */}
        <div className="flex items-center px-6 py-16 lg:px-16 lg:py-20">
          <div className="w-full max-w-sm">
            <PageHeading size="md" title="로그인" lead="대관 신청 계정으로 로그인하세요." />

            <form onSubmit={handleSubmit} noValidate className="mt-10 space-y-5">
              <label className="block">
                <span className="mb-2 block text-xs text-muted">아이디</span>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="field-base"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs text-muted">비밀번호</span>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="field-base"
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
