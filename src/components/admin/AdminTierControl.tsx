"use client";

import { useRouter } from "next/navigation";
import { useDialog } from "@/components/ui/Dialog";
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
 * 운영자 계정에 할 수 있는 두 가지 (2026-09-03).
 *
 *   권한 해제 — 계정은 남기고 신청자로 되돌린다. 백오피스 접근만 거둔다.
 *   삭제      — 계정과 그 사람에게 매인 기록을 지운다. 되돌릴 수 없다.
 *
 * 둘은 결과가 아주 달라 한 버튼에 담을 수 없다. 퇴사자 계정을 실제로 없애려면
 * 해제만으로는 부족했다("권한 해제 말고도 삭제가 필요합니다").
 *
 * [고침] 예전 [권한 해제] 는 계정 삭제 라우트(DELETE)를 불렀는데 그 라우트는 신청자만
 * 받아, 눌러도 「신청자 계정만 삭제할 수 있습니다」로 되돌아오는 버튼이었다.
 *
 * 자기 자신·마지막 마스터는 서버가 막는다.
 */
export function AdminDemoteButton({ userId, name }: { userId: string; name: string }) {
  const router = useRouter();
  const dialog = useDialog();
  const [busy, setBusy] = useState<null | "demote" | "delete">(null);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: "demote" | "delete") {
    const ok =
      kind === "demote"
        ? await dialog.confirm(
            `「${name}」 계정의 운영자 권한을 해제할까요?\n계정은 남고 신청자로 되돌립니다.`,
            { okLabel: "해제" },
          )
        : await dialog.confirm(
            `「${name}」 계정을 삭제할까요?\n계정과 이 계정에 매인 기록이 함께 지워지며 되돌릴 수 없습니다.`,
            { okLabel: "삭제", tone: "danger" },
          );
    if (!ok) return;
    setBusy(kind);
    setError(null);
    try {
      const res = await fetch(
        kind === "demote" ? `/api/admin/users/${userId}/demote` : `/api/admin/users/${userId}`,
        { method: kind === "demote" ? "POST" : "DELETE" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || (kind === "demote" ? "권한을 해제하지 못했습니다." : "삭제하지 못했습니다."));
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <span className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => run("demote")}
          disabled={busy !== null}
          className={REMOVE_BTN}
        >
          {busy === "demote" ? "처리 중…" : "권한 해제"}
        </button>
        <button
          type="button"
          onClick={() => run("delete")}
          disabled={busy !== null}
          className={`${REMOVE_BTN} text-danger`}
        >
          {busy === "delete" ? "삭제 중…" : "삭제"}
        </button>
      </span>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}
