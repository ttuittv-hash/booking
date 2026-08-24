"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnClass } from "@/components/ui/kit";
import { FIELD, FIELD_LABEL, INFO_NOTE, PANEL, SECTION_TITLE } from "@/components/admin/adminUi";

// 마스터 관리자 권한 이관 — 나 자신을 제외한 전체 운영자가 이관 후보다. 이미
// 마스터인 계정을 골라도 동작한다(그 경우 이관 결과는 "나만 프로로 내려가고
// 마스터는 그 계정 하나로 유지"가 된다). 승격·강등 두 단계를 화면에서 따로
// 누르게 하는 대신 한 번에 처리한다(2026-08-24, "마스터 관리자가 권한을
// 이관하는것도 추가해").
export function MasterTransferForm({
  candidates,
}: {
  candidates: { id: string; name: string; email: string }[];
}) {
  const router = useRouter();
  const [targetId, setTargetId] = useState(candidates[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (candidates.length === 0) return null;

  async function transfer() {
    const target = candidates.find((c) => c.id === targetId);
    if (!target) return;
    if (
      !confirm(
        `마스터 관리자 권한을 「${target.name}」(${target.email})에게 이관합니다.\n` +
          "이관 즉시 그 계정이 마스터 관리자가 되고, 내 계정은 프로 관리자로 내려갑니다.\n계속할까요?",
      )
    ) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${targetId}/transfer-master`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "이관에 실패했습니다.");
        return;
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={PANEL}>
      <h2 className={SECTION_TITLE}>마스터 권한 이관</h2>
      <p className="mt-2 max-w-2xl text-s text-muted">
        마스터 관리자 권한을 다른 운영자 계정으로 넘깁니다. 대상 계정이 마스터가 되는 동시에
        내 계정은 프로 관리자로 내려가며, 되돌리려면 새 마스터가 다시 나를 마스터로 올려줘야
        합니다.
      </p>

      <div className={`mt-4 max-w-2xl ${INFO_NOTE}`}>
        승격과 강등을 하나로 묶어 처리하므로, 이관 도중 마스터가 둘이거나 아무도 없는 상태는
        생기지 않습니다.
      </div>

      <div className="mt-4 max-w-sm">
        <label className="block">
          <span className={FIELD_LABEL}>이관 대상</span>
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            disabled={submitting}
            className={FIELD}
          >
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.email})
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="button"
        disabled={submitting || !targetId}
        onClick={transfer}
        className={`${btnClass("danger", "md")} mt-5`}
      >
        {submitting ? "이관 중..." : "마스터 권한 이관"}
      </button>

      {error && <p className="mt-3 border-l-2 border-danger pl-4 text-s text-danger">{error}</p>}
    </div>
  );
}
