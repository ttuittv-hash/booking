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
  const [phone, setPhone] = useState("");
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
        body: JSON.stringify({ email, tier, phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "승급에 실패했습니다.");
        return;
      }
      setSuccess(`${data.user.name} (${data.user.email}) 계정을 운영자로 승급했습니다.`);
      setEmail("");
      setPhone("");
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
        비밀번호는 그대로 유지되며, 새 계정을 만드는 것이 아닙니다. 휴대폰 번호를 함께
        적으면 그 계정의 번호로 저장됩니다 — 운영자 앞으로 나가는 알림톡이 이 번호로 갑니다.
      </p>

      {/* 등급별 권한 차이를 눈에 보이는 화면 접근 기준으로 정리한다(2026-08-22,
          "각각의 권한이 달랐자나" 피드백 → "일반 관리자는 심사 못해" 정정 반영).
          일반관리자는 신청서를 열람은 하되 심사(승인/보류/거절)는 할 수 없다
          (src/lib/auth.ts 의 isProAdminOrAbove, /api/quotes/[id]/review 에서 강제). */}
      <div className={`mt-4 max-w-2xl ${INFO_NOTE}`}>
        <p className="font-bold">등급별로 실제로 무엇이 갈리나요</p>
        <ul className="mt-1.5 list-disc space-y-1 pl-4">
          <li>
            <b>일반관리자</b> — 신청 현황·회원 관리 등은 열람할 수 있지만, 심사(승인·보류·거절)는
            할 수 없습니다.
          </li>
          <li>
            <b>프로 관리자</b> — 일반관리자가 접근하는 화면에 더해 심사를 직접 진행할 수 있습니다.
          </li>
          <li>
            <b>마스터 관리자</b>만 ① 다른 운영자의 등급을 올리고 내릴 수 있고 ② 기능정의서(내부
            기획 문서) 화면에 들어갈 수 있습니다.
          </li>
        </ul>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="block">
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
        {/* [신규 2026-09-02] 운영자 앞으로 나가는 알림톡(신규 회사 등록 등)은 휴대폰
            번호로 발송된다. 신청자로 가입했던 계정은 번호가 있지만 시드로 만든 운영자
            계정에는 없어, 여기서 채워 넣을 수 있게 한다. 비워 두면 기존 번호를 그대로 둔다. */}
        <label className="block">
          <span className={FIELD_LABEL}>휴대폰 번호 (선택)</span>
          <input
            type="tel"
            autoComplete="off"
            placeholder="010-0000-0000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
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
