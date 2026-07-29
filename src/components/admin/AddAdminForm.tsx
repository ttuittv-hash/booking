"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddAdminForm() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "계정 생성에 실패했습니다.");
        return;
      }
      setSuccess(`${data.user.email} 계정이 생성되었습니다.`);
      setForm({ email: "", password: "", name: "" });
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-md border border-border bg-panel/60 p-6">
      <h2 className="text-[15px] font-semibold">운영자 계정 추가</h2>
      <p className="mt-1 text-[12.5px] text-muted">
        이메일/임시 비밀번호를 직접 전달해 새 운영자를 등록하세요. (이메일 발송 기능은
        아직 없어 비밀번호를 안전한 채널로 별도 전달해야 합니다.)
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input
          type="email"
          placeholder="이메일"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="rounded-md border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
        />
        <input
          type="text"
          placeholder="이름"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="rounded-md border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
        />
        <input
          type="text"
          placeholder="임시 비밀번호 (8자 이상)"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="rounded-md border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
        />
      </div>

      <button
        type="button"
        disabled={submitting}
        onClick={submit}
        className="mt-4 rounded bg-accent px-6 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {submitting ? "처리 중..." : "운영자 계정 생성"}
      </button>
      {error && <p className="mt-3 text-[13px] text-red-600">{error}</p>}
      {success && <p className="mt-3 text-[13px] text-good">{success}</p>}
    </div>
  );
}
