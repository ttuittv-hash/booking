"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
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
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-[15px] font-semibold tracking-tight">
          SEOUL ARENA
        </Link>
        <h1 className="mt-6 text-[22px] font-semibold">로그인</h1>
        <p className="mt-1.5 text-[13.5px] text-muted">
          대관 신청 계정으로 로그인하세요.
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-medium text-muted">이메일</span>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-sm border border-border bg-panel px-3.5 py-2.5 text-[14px] outline-none focus:border-accent"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-medium text-muted">비밀번호</span>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-sm border border-border bg-panel px-3.5 py-2.5 text-[14px] outline-none focus:border-accent"
            />
          </label>

          {error && <p className="text-[13px] text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-sm bg-accent px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? "처리 중..." : "로그인"}
          </button>
        </form>

        <p className="mt-6 text-center text-[13px] text-muted">
          신청자 계정이 없으신가요?{" "}
          <Link href="/register" className="font-medium text-accent hover:underline">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
