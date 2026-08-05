"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnClass } from "@/components/ui/kit";
import { ERROR_NOTE, FIELD, HELP, OK_NOTE, PANEL, SECTION_TITLE } from "./adminUi";

export function AddAdminForm() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", email: "", password: "", name: "" });
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
      setSuccess(`${data.user.username} 계정이 생성되었습니다.`);
      setForm({ username: "", email: "", password: "", name: "" });
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={PANEL}>
      <h2 className={SECTION_TITLE}>운영자 계정 추가</h2>
      <p className={`mt-2 ${HELP}`}>
        이메일/임시 비밀번호를 직접 전달해 새 운영자를 등록하세요. (이메일 발송 기능은
        아직 없어 비밀번호를 안전한 채널로 별도 전달해야 합니다.)
      </p>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-4">
        <input
          type="text"
          placeholder="아이디 (영문 소문자/숫자, 4~20자)"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          className={FIELD}
        />
        <input
          type="email"
          placeholder="이메일"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className={FIELD}
        />
        <input
          type="text"
          placeholder="이름"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={FIELD}
        />
        <input
          type="text"
          placeholder="임시 비밀번호 (8자 이상)"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className={FIELD}
        />
      </div>

      <button
        type="button"
        disabled={submitting}
        onClick={submit}
        className={`mt-5 ${btnClass("primary", "md")}`}
      >
        {submitting ? "처리 중..." : "운영자 계정 생성"}
      </button>
      {error && <p className={`mt-3 ${ERROR_NOTE}`}>{error}</p>}
      {success && <p className={`mt-3 ${OK_NOTE}`}>{success}</p>}
    </div>
  );
}
