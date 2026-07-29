"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AppUser } from "@/lib/pricing/types";

const STATUS_LABEL: Record<AppUser["approvalStatus"], string> = {
  PENDING: "승인 대기",
  APPROVED: "승인됨",
  REJECTED: "거절됨",
};

const STATUS_STYLE: Record<AppUser["approvalStatus"], string> = {
  PENDING: "bg-warn-soft text-warn",
  APPROVED: "bg-good-soft text-good",
  REJECTED: "bg-panel-strong text-muted",
};

export function ApplicantApprovalTable({
  applicants,
  pending,
}: {
  applicants: AppUser[];
  pending: boolean;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function act(id: string, action: "approve" | "reject") {
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/applicants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-3 overflow-hidden rounded border border-border">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-border bg-panel text-left text-[11.5px] font-medium text-muted">
            <th className="px-4 py-3">담당자명</th>
            <th className="px-4 py-3">회사명</th>
            <th className="px-4 py-3">이메일</th>
            <th className="px-4 py-3">가입일</th>
            <th className="px-4 py-3">상태</th>
            {pending && <th className="px-4 py-3" />}
          </tr>
        </thead>
        <tbody>
          {applicants.length === 0 ? (
            <tr>
              <td colSpan={pending ? 6 : 5} className="px-4 py-6 text-center text-muted">
                {pending ? "승인 대기 중인 신청이 없습니다." : "처리 내역이 없습니다."}
              </td>
            </tr>
          ) : (
            applicants.map((a) => (
              <tr key={a.id} className="border-b border-border/70">
                <td className="px-4 py-3 font-medium">{a.name}</td>
                <td className="px-4 py-3 text-muted">{a.companyName || "-"}</td>
                <td className="px-4 py-3 text-muted">{a.email}</td>
                <td className="px-4 py-3 text-muted">
                  {new Date(a.createdAt).toLocaleDateString("ko-KR")}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2.5 py-1 text-[11.5px] font-medium ${STATUS_STYLE[a.approvalStatus]}`}>
                    {STATUS_LABEL[a.approvalStatus]}
                  </span>
                </td>
                {pending && (
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={busyId === a.id}
                        onClick={() => act(a.id, "approve")}
                        className="rounded bg-accent px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
                      >
                        승인
                      </button>
                      <button
                        type="button"
                        disabled={busyId === a.id}
                        onClick={() => act(a.id, "reject")}
                        className="rounded border border-border px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:bg-panel disabled:opacity-50"
                      >
                        거절
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
