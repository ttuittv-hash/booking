"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminTier } from "@/lib/pricing/types";
import { FIELD_SM, REMOVE_BTN } from "@/components/admin/adminUi";

const TIER_LABEL: Record<AdminTier, string> = {
  BASIC: "일반관리자",
  PRO: "프로 관리자",
  MASTER: "마스터 관리자",
};

const TIERS: AdminTier[] = ["BASIC", "PRO", "MASTER"];

/**
 * 등급 표기 — 배지는 상태를 구분하는 표식이지 색으로 서열을 매기는 자리가 아니다.
 * 최상위(MASTER)만 옐로 면 + 검정 텍스트로 눈에 띄게 하고, 나머지는 헤어라인 배지.
 * (옐로는 면·강조에만. 옐로 텍스트는 쓰지 않는다.)
 */
const TIER_BADGE: Record<AdminTier, string> = {
  BASIC: "border-border-soft text-muted",
  PRO: "border-foreground text-foreground",
  MASTER: "border-transparent bg-accent text-on-accent",
};

export function TierBadge({ tier }: { tier: AdminTier }) {
  return (
    <span
      className={`inline-flex items-center border px-2.5 py-1 text-xs font-bold ${TIER_BADGE[tier]}`}
    >
      {TIER_LABEL[tier]}
    </span>
  );
}

export function AdminTierControl({ userId, tier }: { userId: string; tier: AdminTier }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function changeTier(next: AdminTier) {
    if (next === tier) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/tier`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "등급 변경에 실패했습니다.");
        return;
      }
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <select
        value={tier}
        disabled={saving}
        onChange={(e) => changeTier(e.target.value as AdminTier)}
        aria-label="운영자 등급"
        className={`w-32 ${FIELD_SM}`}
      >
        {TIERS.map((t) => (
          <option key={t} value={t}>
            {TIER_LABEL[t]}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}

/**
 * 운영자 권한 해제 — 계정을 삭제하지 않고 신청자로 되돌린다.
 * 자기 자신과 마지막 마스터는 서버가 막는다.
 */
export function AdminDemoteButton({ userId, name }: { userId: string; name: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function demote() {
    if (!confirm(`「${name}」 계정의 운영자 권한을 해제할까요?\n계정은 남고 신청자로 되돌립니다.`)) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "권한을 해제하지 못했습니다.");
        return;
      }
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button type="button" onClick={demote} disabled={saving} className={REMOVE_BTN}>
        {saving ? "처리 중…" : "권한 해제"}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}
