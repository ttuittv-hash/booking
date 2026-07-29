"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddApplicantForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    name: "",
    phone: "",
    companyName: "",
    businessRegistrationNumber: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/applicants/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "계정 생성에 실패했습니다.");
        return;
      }
      setSuccess(`${data.user.username} 계정이 승인 완료 상태로 생성되었습니다.`);
      setForm({ username: "", email: "", password: "", name: "", phone: "", companyName: "", businessRegistrationNumber: "" });
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded border border-border bg-panel/60 p-6">
      <h2 className="text-[15px] font-semibold">회원 추가 (테스트/직원 계정)</h2>
      <p className="mt-1 text-[12.5px] text-muted">
        운영자가 직접 신청자(대관사) 계정을 생성합니다. 별도 승인 절차 없이 즉시 승인 완료 상태로
        만들어지며, 비밀번호는 안전한 채널로 직접 전달해야 합니다.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          type="text"
          placeholder="아이디 (영문 소문자/숫자, 4~20자)"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          className="rounded border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
        />
        <input
          type="email"
          placeholder="이메일"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="rounded border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
        />
        <input
          type="text"
          placeholder="담당자명"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="rounded border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
        />
        <input
          type="text"
          placeholder="임시 비밀번호 (8자 이상)"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="rounded border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
        />
        <input
          type="tel"
          placeholder="휴대폰 번호 (선택)"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="rounded border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
        />
        <input
          type="text"
          placeholder="회사/기획사명 (선택, 비워두면 소속 없음)"
          value={form.companyName}
          onChange={(e) => setForm({ ...form, companyName: e.target.value })}
          className="rounded border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
        />
        <input
          type="text"
          placeholder="사업자등록번호 (회사명 입력 시, 선택)"
          value={form.businessRegistrationNumber}
          onChange={(e) => setForm({ ...form, businessRegistrationNumber: e.target.value })}
          className="rounded border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
        />
      </div>

      <button
        type="button"
        disabled={submitting}
        onClick={submit}
        className="mt-4 rounded-sm bg-accent px-6 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {submitting ? "처리 중..." : "회원 계정 생성"}
      </button>
      {error && <p className="mt-3 text-[13px] text-red-600">{error}</p>}
      {success && <p className="mt-3 text-[13px] text-good">{success}</p>}
    </div>
  );
}
