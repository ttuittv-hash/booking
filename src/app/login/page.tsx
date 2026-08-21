"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { hashPasswordForTransport } from "@/lib/clientPassword";

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
      // 비밀번호 평문 대신 SHA-256 해시를 전송한다. 구(SQLite) 시절 계정은 서버가
      // 428을 돌려주며, 이때만 평문을 함께 재전송해 검증 후 새 방식으로 자동 전환된다.
      const passwordHash = await hashPasswordForTransport(form.password);
      let res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.username, passwordHash }),
      });
      if (res.status === 428) {
        res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: form.username, passwordHash, password: form.password }),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "로그인에 실패했습니다.");
        return;
      }
      // 운영자도 로그인 직후 바로 관리 페이지로 보내지 않고 홈으로 보낸다 — 관리
      // 페이지는 헤더의 "운영자 백오피스" 링크로 따로 들어가게 한다(2026-08-21).
      router.push(data.user.role === "ADMIN" ? "/" : "/apply");
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
            <span className="mb-1.5 block text-[12.5px] font-medium text-muted">아이디</span>
            <input
              type="text"
              required
              autoComplete="username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
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

        {/* 기획서 A13 — 로그인 화면에서 아이디·비밀번호 찾기로 갈 수 있어야 한다.
            디자인 개편 때 빠졌던 것을 복원(E2E A13-1·A13-2 가 잡았다). */}
        <p className="mt-4 flex items-center justify-center gap-3 text-[12.5px] text-muted">
          <Link href="/find-id" data-testid="link-find-id" className="hover:text-foreground hover:underline">
            아이디 찾기
          </Link>
          <span aria-hidden className="text-border">|</span>
          <Link
            href="/reset-password"
            data-testid="link-reset-password"
            className="hover:text-foreground hover:underline"
          >
            비밀번호 찾기
          </Link>
        </p>
        <p className="mt-4 text-center text-[13px] text-muted">
          신청자 계정이 없으신가요?{" "}
          <Link href="/register" className="font-medium text-accent hover:underline">
            회원가입
          </Link>
        </p>
        <p className="mt-2 text-center text-[12.5px] text-muted">
          운영자이신가요?{" "}
          <Link href="/admin/login" className="font-medium text-accent hover:underline">
            운영자 로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
