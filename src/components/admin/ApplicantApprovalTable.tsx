"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AppUser } from "@/lib/pricing/types";
import { Badge, btnClass } from "@/components/ui/kit";
import { TABLE, TABLE_WRAP, TD, TH, THEAD_ROW, TR } from "./adminUi";

const STATUS_LABEL: Record<AppUser["approvalStatus"], string> = {
  PENDING: "승인 대기",
  APPROVED: "승인됨",
  REJECTED: "거절됨",
};

/** 상태 색은 kit 의 Badge tone 만 쓴다 (임의 색 금지) */
const STATUS_TONE: Record<AppUser["approvalStatus"], "warn" | "good" | "neutral"> = {
  PENDING: "warn",
  APPROVED: "good",
  REJECTED: "neutral",
};

export function ApplicantApprovalTable({
  applicants,
  pending,
  businessRegistrationNumbers = {},
}: {
  applicants: AppUser[];
  pending: boolean;
  businessRegistrationNumbers?: Record<string, string | null>;
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
    <div className={`mt-3 ${TABLE_WRAP}`}>
      <table className={TABLE}>
        <thead>
          <tr className={THEAD_ROW}>
            <th className={TH}>담당자명</th>
            <th className={TH}>회사명</th>
            <th className={TH}>사업자등록번호</th>
            <th className={TH}>이메일</th>
            <th className={TH}>가입일</th>
            <th className={TH}>상태</th>
            {pending && <th className={TH} />}
          </tr>
        </thead>
        <tbody>
          {applicants.length === 0 ? (
            <tr>
              <td colSpan={pending ? 7 : 6} className="px-3 py-8 text-center text-s text-muted">
                {pending ? "승인 대기 중인 신청이 없습니다." : "처리 내역이 없습니다."}
              </td>
            </tr>
          ) : (
            applicants.map((a) => (
              <tr key={a.id} className={`${TR} transition-colors hover:bg-foreground/[0.03]`}>
                <td className={TD}>
                  <Link
                    href={`/admin/applicants/${a.id}`}
                    className="font-bold underline decoration-accent decoration-2 underline-offset-4 transition-colors hover:text-muted-strong"
                  >
                    {a.name}
                  </Link>
                </td>
                <td className={`${TD} text-muted`}>{a.companyName || "-"}</td>
                <td className={`${TD} tabular-nums text-muted`}>
                  {(a.companyId && businessRegistrationNumbers[a.companyId]) || "-"}
                </td>
                <td className={`${TD} text-muted`}>{a.email}</td>
                <td className={`${TD} tabular-nums text-muted`}>
                  {new Date(a.createdAt).toLocaleDateString("ko-KR")}
                </td>
                <td className={TD}>
                  <Badge tone={STATUS_TONE[a.approvalStatus]}>{STATUS_LABEL[a.approvalStatus]}</Badge>
                </td>
                {pending && (
                  <td className={TD}>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={busyId === a.id}
                        onClick={() => act(a.id, "approve")}
                        className={btnClass("primary", "sm")}
                      >
                        승인
                      </button>
                      <button
                        type="button"
                        disabled={busyId === a.id}
                        onClick={() => act(a.id, "reject")}
                        className={btnClass("outline", "sm")}
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
