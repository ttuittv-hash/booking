"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminTier } from "@/lib/pricing/types";
import { btnClass } from "@/components/ui/kit";
import { FIELD, FIELD_LABEL, INFO_NOTE, PANEL, SECTION_TITLE } from "@/components/admin/adminUi";

const TIER_LABEL: Record<AdminTier, string> = {
  BASIC: "일반관리자",
  PRO: "프로 관리자",
  MASTER: "마스터 관리자",
};

const TIERS: AdminTier[] = ["BASIC", "PRO", "MASTER"];

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
    <div className={PANEL}>
      <h2 className={SECTION_TITLE}>기존 회원을 운영자로 승급</h2>
      <p className="mt-2 max-w-2xl text-s text-muted">
        이미 가입된 계정(신청자로 가입했던 계정 포함)을 이메일로 찾아 운영자로 전환합니다.
        비밀번호는 그대로 유지되며, 새 계정을 만드는 것이 아닙니다.
      </p>

      {/* 등급별 권한 차이를 눈에 보이는 화면 접근 기준으로 정리한다(2026-08-22,
          "각각의 권한이 달랐자나" 피드백에 대한 답 — 실제로는 마스터 관리자만
          구분되고, 일반관리자·프로 관리자는 현재 접근 가능 화면이 동일하다). */}
      <div className={`mt-4 max-w-2xl ${INFO_NOTE}`}>
        <p className="font-bold">등급별로 실제로 무엇이 갈리나요</p>
        <ul className="mt-1.5 list-disc space-y-1 pl-4">
          <li>
            <b>일반관리자 · 프로 관리자</b> — 신청 현황·회원 관리·패키지·요금표 등 운영 화면은
            둘 다 동일하게 접근합니다. 지금은 두 등급이 화면 접근상 구분되지 않습니다.
          </li>
          <li>
            <b>마스터 관리자</b>만 ① 다른 운영자의 등급을 올리고 내릴 수 있고 ② 기능정의서(내부
            기획 문서) 화면에 들어갈 수 있습니다.
          </li>
        </ul>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="block sm:col-span-2">
          <span className={FIELD_LABEL}>이미 가입된 이메일</span>
          <input
            type="email"
            autoComplete="off"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={FIELD}
          />
        </label>
        <label className="block">
          <span className={FIELD_LABEL}>부여할 등급</span>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as AdminTier)}
            className={FIELD}
          >
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {TIER_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="button"
        disabled={submitting || !email}
        onClick={submit}
        className={`${btnClass("primary", "md")} mt-5`}
      >
        {submitting ? "처리 중..." : "운영자로 승급"}
      </button>

      {error && <p className="mt-3 border-l-2 border-danger pl-4 text-s text-danger">{error}</p>}
      {success && <p className="mt-3 text-s text-foreground">{success}</p>}
    </div>
  );
}
