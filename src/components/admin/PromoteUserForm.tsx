"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminTier } from "@/lib/pricing/types";

export function PromoteUserForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState<AdminTier>("BASIC");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/users/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, tier }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "승급에 실패했습니다.");
        return;
      }
      setSuccess(`${data.user.name} (${data.user.email}) 계정을 운영자로 승급했습니다.`);
      setEmail("");
      setTier("BASIC");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded border border-border bg-panel/60 p-6">
      <h2 className="text-[15px] font-semibold">기존 회원을 운영자로 승급</h2>
      <p className="mt-1 text-[12.5px] text-muted">
        이미 가입된 계정(신청자로 가입했던 계정 포함)을 이메일로 찾아 운영자로 전환합니다.
        비밀번호는 그대로 유지되며, 새 계정을 만드는 게 아닙니다.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input
          type="email"
          placeholder="이미 가입된 이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent sm:col-span-2"
        />
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value as AdminTier)}
          className="rounded border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
        >
          <option value="BASIC">일반관리자</option>
          <option value="PRO">프로 관리자</option>
          <option value="MASTER">마스터 관리자</option>
        </select>
      </div>

      <button
        type="button"
        disabled={submitting || !email}
        onClick={submit}
        className="mt-4 rounded-sm bg-accent px-6 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {submitting ? "처리 중..." : "운영자로 승급"}
      </button>
      {error && <p className="mt-3 text-[13px] text-red-600">{error}</p>}
      {success && <p className="mt-3 text-[13px] text-good">{success}</p>}
    </div>
  );
}
