"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminTier } from "@/lib/pricing/types";

const TIER_LABEL: Record<AdminTier, string> = {
  BASIC: "일반관리자",
  PRO: "프로 관리자",
  MASTER: "마스터 관리자",
};

const TIER_BADGE_CLASS: Record<AdminTier, string> = {
  BASIC: "bg-panel text-muted",
  PRO: "bg-accent-soft text-accent",
  MASTER: "bg-accent text-white",
};

export function TierBadge({ tier }: { tier: AdminTier }) {
  return (
    <span className={`rounded-sm px-2.5 py-1 text-[11.5px] font-semibold ${TIER_BADGE_CLASS[tier]}`}>
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
    <div className="flex items-center justify-end gap-2">
      <select
        value={tier}
        disabled={saving}
        onChange={(e) => changeTier(e.target.value as AdminTier)}
        className="rounded border border-border bg-background px-2 py-1.5 text-[12.5px] outline-none focus:border-accent disabled:opacity-50"
      >
        <option value="BASIC">일반관리자</option>
        <option value="PRO">프로 관리자</option>
        <option value="MASTER">마스터 관리자</option>
      </select>
      {error && <span className="text-[11.5px] text-red-600">{error}</span>}
    </div>
  );
}
