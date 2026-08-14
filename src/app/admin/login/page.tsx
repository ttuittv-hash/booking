"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { hashPasswordForTransport } from "@/lib/clientPassword";
import { ArrowRight, btnClass } from "@/components/ui/kit";
import { ERROR_NOTE, FIELD, FIELD_LABEL } from "@/components/admin/adminUi";

export default function AdminLoginPage() {
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
      if (data.user.role !== "ADMIN") {
        await fetch("/api/auth/logout", { method: "POST" });
        setError("운영자 계정이 아닙니다.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm border border-border-soft bg-panel p-6 sm:p-8">
        <span aria-hidden className="mb-6 block h-1 w-12 bg-accent" />
        <Link href="/" className="type-display text-h6-m leading-none">
          Seoul Arena
        </Link>
        <h1 className="type-kr-heading mt-6 text-h5-m sm:text-h5">운영자 로그인</h1>
        <p className="mt-3 text-s text-muted">서울아레나 운영자 계정으로 로그인하세요.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className={FIELD_LABEL}>아이디</span>
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
            <span className={FIELD_LABEL}>비밀번호</span>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={FIELD}
            />
          </label>

          {error && <p className={ERROR_NOTE}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className={`${btnClass("primary", "md")} w-full`}
          >
            {loading ? "처리 중..." : "로그인"}
            {!loading && <ArrowRight />}
          </button>
        </form>

        <p className="mt-8 border-t border-border/15 pt-5 text-center text-s text-muted">
          <Link href="/" className="transition-colors hover:text-foreground">
            ← 메인으로
          </Link>
        </p>
      </div>
    </div>
  );
}
