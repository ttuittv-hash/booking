"use client";

// 회사 상세의 담당자 목록 — 대표/소속 구분, 회원 상세 이동, 대표 담당자 지정,
// 그리고 승인·반려·삭제(2026-08-29 추가).
// 회사별 담당자 탭의 아코디언에서 쓰던 것을 상세 페이지로 옮겨 온 것이다.
//
// 예전에는 여기서 보기만 되고 처리하려면 회원 관리 표로 되돌아 나가야 했다. 승인 대기가
// 있는 회사를 열어 놓고 정작 승인은 다른 화면에서 해야 하는 게 어색해서, 표와 같은
// 동작(useMemberActions)을 그대로 붙였다.

import Link from "next/link";
import { useDialog } from "@/components/ui/Dialog";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LINK_BTN } from "@/components/admin/adminUi";
import { btnClass } from "@/components/ui/kit";
import { displayEmail } from "@/lib/format";
import { useMemberActions } from "./useMemberActions";

export interface CompanyMember {
  id: string;
  name: string;
  username: string;
  email: string;
  companyRole: string | null;
  approvalStatus: string;
  /** 탈퇴 시각. 있으면 목록에는 남기되 [탈퇴] 로 표시하고 손대지 않는다. */
  withdrawnAt: string | null;
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
  const dialog = useDialog();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 마지막 담당자를 지우면 회사도 함께 사라진다 — 이 페이지에 머물면 404 라 목록으로 보낸다.
  const { busyId, decide, remove } = useMemberActions({
    onCompanyDeleted: () => router.push("/admin/applicants?tab=companies"),
  });

  async function setMaster(m: CompanyMember) {
    if (!(await dialog.confirm(`${m.name}님을 대표 담당자로 지정합니다.\n기존 대표는 소속 담당자가 됩니다.`, { okLabel: "지정" }))) {
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
              className="flex flex-wrap items-center justify-between gap-3 rounded-btn border border-border-soft px-4 py-3"
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
                  className="font-bold underline decoration-border-soft underline-offset-4 transition-colors hover:decoration-foreground"
                >
                  {m.name}
                </Link>
                <span className="text-muted">{m.username}</span>
                <span className="text-muted">{displayEmail(m.email)}</span>
                <span className="text-xs text-muted">
                  {/* 탈퇴자는 승인 상태가 그대로 남아 "정상" 으로 보였다. */}
                  {m.withdrawnAt ? "탈퇴" : (APPROVAL_LABEL[m.approvalStatus] ?? m.approvalStatus)}
                </span>
              </span>
              <span className="flex shrink-0 flex-wrap items-center gap-2">
                <Link href={`/admin/applicants/${m.id}`} className={LINK_BTN}>
                  상세
                </Link>
                {m.withdrawnAt ? null : !isMaster && m.approvalStatus === "APPROVED" ? (
                  <button type="button" disabled={busy} onClick={() => setMaster(m)} className={LINK_BTN}>
                    대표로 지정
                  </button>
                ) : null}
                {/* 회원 관리 표와 같은 규칙 — 승인 대기인 사람에게만 승인·반려가 뜬다. */}
                {!m.withdrawnAt && m.approvalStatus === "PENDING" ? (
                  <>
                    <button
                      type="button"
                      disabled={busyId === m.id}
                      onClick={() => decide(m.id, "reject")}
                      className={btnClass("secondary", "sm")}
                    >
                      거절
                    </button>
                    <button
                      type="button"
                      disabled={busyId === m.id}
                      onClick={() => decide(m.id, "approve")}
                      className={btnClass("primary", "sm")}
                    >
                      승인
                    </button>
                  </>
                ) : null}
                {m.withdrawnAt ? null : (
                <button
                  type="button"
                  disabled={busyId === m.id}
                  onClick={() => remove(m)}
                  data-testid={`delete-user-${m.id}`}
                  className={btnClass("secondary", "sm")}
                  title="계정을 기록째 삭제 — 같은 명의로 다시 가입할 수 있게 됩니다"
                >
                  삭제
                </button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
