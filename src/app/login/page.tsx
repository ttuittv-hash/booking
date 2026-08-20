"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthField, AuthShell } from "@/components/ui/AuthShell";
import { btnClass } from "@/components/ui/kit";
import { hashPasswordForTransport } from "@/lib/clientPassword";

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

        <button type="submit" disabled={loading} className={`${btnClass("primary", "md")} w-full`}>
          {loading ? "처리 중..." : "로그인"}
        </button>
          {/* 기획서 A13 — 로그인 화면에서 회원가입·아이디 찾기·비밀번호 찾기로 갈 수 있어야 한다 */}
          {/* 글자만 타깃이면 14px 이라 손가락으로 잘 안 눌린다 — 세로 여백으로 영역을 넓힌다. */}
          <p className="mt-4 flex items-center justify-center gap-1 text-xs text-muted">
            <Link href="/register" className="flex min-h-11 items-center px-2 hover:text-foreground">
              회원가입
            </Link>
            <span aria-hidden="true">|</span>
            <Link
              href="/find-id"
              data-testid="link-find-id"
              className="flex min-h-11 items-center px-2 hover:text-foreground"
            >
              아이디 찾기
            </Link>
            <span aria-hidden="true">|</span>
            <Link
              href="/reset-password"
              data-testid="link-reset-password"
              className="flex min-h-11 items-center px-2 hover:text-foreground"
            >
              비밀번호 찾기
            </Link>
          </p>
      </form>
    </AuthShell>
  );
}
