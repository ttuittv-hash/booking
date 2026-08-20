"use client";

// 회사 상세의 담당자 목록 — 대표/소속 구분, 회원 상세 이동, 대표 담당자 지정.
// 회사별 담당자 탭의 아코디언에서 쓰던 것을 상세 페이지로 옮겨 온 것이다.

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LINK_BTN } from "@/components/admin/adminUi";

export interface CompanyMember {
  id: string;
  name: string;
  username: string;
  email: string;
  companyRole: string | null;
  approvalStatus: string;
}

const APPROVAL_LABEL: Record<string, string> = {
  PENDING: "승인 대기",
  APPROVED: "정상",
  REJECTED: "비활성",
};

export function CompanyMembersPanel({
  companyId,
  members,
}: {
  companyId: string;
  members: CompanyMember[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setMaster(m: CompanyMember) {
    if (!window.confirm(`${m.name}님을 대표 담당자로 지정합니다. 기존 대표는 소속 담당자가 됩니다.`)) {
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setMaster", companyId, targetId: m.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "변경하지 못했습니다.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "변경하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  if (members.length === 0) {
    return <p className="py-6 text-center text-s text-muted">소속 담당자가 없습니다.</p>;
  }

  return (
    <div>
      {error ? (
        <p className="mb-3 border-l-2 border-danger bg-danger-soft px-3 py-2 text-s text-danger">{error}</p>
      ) : null}
      <ul className="space-y-2">
        {members.map((m) => {
          const isMaster = m.companyRole === "MASTER";
          return (
            <li
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-3 border border-border-soft px-4 py-3"
            >
              <span className="flex flex-wrap items-center gap-2 text-s">
                <span
                  className={`border px-2 py-0.5 text-xs ${
                    isMaster ? "border-accent text-accent" : "border-border-soft text-muted"
                  }`}
                >
                  {isMaster ? "대표 담당자" : "소속 담당자"}
                </span>
                {/* 이름을 누르면 회원 상세로 간다 — 진위확인 배지와 신청 내역이 거기 있다. */}
                <Link
                  href={`/admin/applicants/${m.id}`}
                  className="font-bold underline decoration-border-soft underline-offset-4 transition-colors hover:decoration-accent"
                >
                  {m.name}
                </Link>
                <span className="text-muted">{m.username}</span>
                <span className="text-muted">{m.email}</span>
                <span className="text-xs text-muted">{APPROVAL_LABEL[m.approvalStatus] ?? m.approvalStatus}</span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <Link href={`/admin/applicants/${m.id}`} className={LINK_BTN}>
                  상세
                </Link>
                {!isMaster && m.approvalStatus === "APPROVED" ? (
                  <button type="button" disabled={busy} onClick={() => setMaster(m)} className={LINK_BTN}>
                    대표로 지정
                  </button>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
