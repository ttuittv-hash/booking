"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MemberPolicy } from "@/lib/content/memberPolicy";

/**
 * 초대 가입 승인 스위치 (2026-09-04 팀 요청).
 *
 * 대표 담당자가 초대한 사람은 원래 가입하는 순간 바로 승인된다. 개관 전 당분간은
 * 서울아레나가 한 번 더 확인하고 싶다는 요청이 있어 여기서 켜고 끈다 — 배포 없이 바뀐다.
 * 켜 두면 초대로 들어온 사람도 이 화면의 '승인 대기' 목록에 올라온다.
 */
export function MemberPolicySwitch({ policy: initial }: { policy: MemberPolicy }) {
  const router = useRouter();
  const [on, setOn] = useState(initial.inviteNeedsAdminApproval);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !on;
    setSaving(true);
    setError(null);
    setOn(next);
    try {
      const res = await fetch("/api/admin/content/memberPolicy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: { inviteNeedsAdminApproval: next } }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setOn(!next);
        setError(data?.error ?? `저장에 실패했습니다. (오류 ${res.status})`);
        return;
      }
      router.refresh();
    } catch {
      setOn(!next);
      setError("저장하지 못했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 border border-border-soft p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-s font-bold">초대 담당자도 서울아레나가 승인</h2>
          <p className="mt-1 break-keep text-xs leading-6 text-muted">
            {on
              ? "켜짐 — 대표 담당자가 초대한 사람도 승인 대기 목록에 올라옵니다. 운영자가 승인해야 이용할 수 있습니다."
              : "꺼짐 — 대표 담당자가 초대한 사람은 가입하는 즉시 이용할 수 있습니다."}
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={saving}
          aria-pressed={on}
          className={`shrink-0 border px-4 py-2 text-s font-bold ${
            on ? "border-foreground bg-accent text-on-accent" : "border-border text-muted"
          } ${saving ? "opacity-50" : ""}`}
        >
          {saving ? "저장 중..." : on ? "켜짐" : "꺼짐"}
        </button>
      </div>
      {error && <p className="mt-2 text-s text-danger">{error}</p>}
    </div>
  );
}
