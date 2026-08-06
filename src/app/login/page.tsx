"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthField, AuthShell } from "@/components/ui/AuthShell";
import { btnClass } from "@/components/ui/kit";

/**
 * Figma Application Components › Sign Up and Log In Pages › Login / 3
 *   로고 가운데 · 보더 카드 안에 폼 · 전폭 버튼 · 카드 하단 회원가입 안내
 * "Log in with Google" 은 제외. 비밀번호 찾기도 해당 기능이 없어 넣지 않았다.
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
    <AuthShell
      variant="card"
      active="login"
      title="로그인"
      lead="대관 신청 계정으로 로그인하세요."
      footer={
        <>
          신청자 계정이 없으신가요?{" "}
          <Link
            href="/register"
            className="font-bold text-foreground underline decoration-accent decoration-2 underline-offset-4"
          >
            회원가입
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <AuthField label="아이디" required>
          <input
            type="text"
            required
            autoComplete="username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="field-base"
          />
        </AuthField>

        <AuthField label="비밀번호" required>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="field-base"
          />
        </AuthField>

        {error && (
          <p className="border-l-2 border-danger bg-danger-soft px-3 py-2 text-s text-danger">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className={`${btnClass("primary", "lg")} w-full`}>
          {loading ? "처리 중..." : "로그인"}
        </button>
      </form>
    </AuthShell>
  );
}
