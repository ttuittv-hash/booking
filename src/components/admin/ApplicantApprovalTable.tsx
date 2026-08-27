"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDialog } from "@/components/ui/Dialog";
import type { AppUser } from "@/lib/pricing/types";
import { Badge, btnClass } from "@/components/ui/kit";
import { formatDate } from "@/lib/format";
import {
  LINK_BTN,
  NONE,
  TABLE,
  TABLE_CARD,
  TABLE_HEAD,
  TABLE_HEAD_DESC,
  TABLE_HEAD_TITLE,
  TABLE_SCROLL,
  TD,
  TD_EMPTY,
  TD_ID,
  TD_MUTED,
  TD_NUM,
  TH,
  TH_NUM,
  THEAD_ROW,
  TR_HOVER,
} from "./adminUi";

const STATUS_LABEL: Record<AppUser["approvalStatus"], string> = {
  PENDING: "일반인 (승인 대기)",
  APPROVED: "기본 (승인됨)",
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
  const dialog = useDialog();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function act(id: string, action: "approve" | "reject") {
    // 반려 사유는 MB-03 알림톡의 필수 변수다. 비워두면 신청자에게 빈 사유가 나간다.
    let reason = "";
    if (action === "reject") {
      const input = await dialog.prompt("반려 사유를 입력해주세요.\n신청자에게 그대로 안내됩니다.", {
        title: "가입 반려",
        okLabel: "반려",
        placeholder: "예: 사업자 정보가 확인되지 않습니다",
        multiline: true,
      });
      if (!input) return;
      reason = input;
    }
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/applicants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, reason }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => null);
        await dialog.alert(data?.error ?? "처리하지 못했습니다.");
      }
    } finally {
      setBusyId(null);
    }
  }

  // 기록째 삭제 — 반려된 사람이 다시 가입하려면 명의·휴대폰이 지워져야 한다(2026-08-27 팀 요청).
  // 승인된 계정도 지울 수 있지만 신청서·알림 이력이 함께 사라지므로 두 번 확인한다.
  async function remove(a: AppUser) {
    const first = await dialog.confirm(
      `${a.name}(${a.email}) 계정을 기록째 삭제합니다.\n\n` +
        "이 사람의 신청서·알림 이력·초대가 함께 지워지고, 회사에 남는 담당자가 없으면 회사 정보도 지워집니다.\n" +
        "삭제하면 같은 명의·휴대폰으로 처음부터 다시 가입할 수 있습니다.\n\n계속할까요?",
      { title: "계정 삭제", okLabel: "삭제" },
    );
    if (!first) return;
    if (a.approvalStatus === "APPROVED") {
      const typed = await dialog.prompt("승인된 계정입니다.\n정말 지우려면 담당자명을 그대로 입력하세요.", {
        title: "삭제 확인",
        okLabel: "삭제",
        placeholder: a.name,
      });
      if (typed !== a.name) return;
    }
    setBusyId(a.id);
    try {
      const res = await fetch(`/api/admin/users/${a.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        await dialog.alert(
          data?.deletedCompany
            ? "계정과 회사 정보를 삭제했습니다.\n같은 사업자번호로 다시 가입할 수 있습니다."
            : "계정을 삭제했습니다.",
        );
        router.refresh();
      } else {
        await dialog.alert(data?.error ?? "삭제하지 못했습니다.");
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className={TABLE_CARD}>
      <div className={TABLE_HEAD}>
        <div>
          <p className={TABLE_HEAD_TITLE}>
            {pending ? "승인 대기" : "처리 완료"} ({applicants.length})
          </p>
          <p className={TABLE_HEAD_DESC}>
            {pending
              ? "승인해야 대관 패키지 안내와 견적 산출을 이용할 수 있습니다."
              : "이미 승인하거나 거절한 신청자 계정입니다."}
          </p>
        </div>
      </div>

      <div className={TABLE_SCROLL}>
        <table className={`${TABLE} min-w-[720px]`}>
          <thead>
            <tr className={THEAD_ROW}>
              <th className={TH}>담당자명</th>
              <th className={TH}>회사명</th>
              <th className={TH_NUM}>사업자등록번호</th>
              <th className={TH}>이메일</th>
              <th className={TH_NUM}>가입일</th>
              <th className={TH}>상태</th>
              <th className={TH} />
            </tr>
          </thead>
          <tbody>
            {applicants.length === 0 ? (
              <tr>
                <td colSpan={7} className={TD_EMPTY}>
                  {pending ? "승인 대기 중인 신청이 없습니다." : "처리 내역이 없습니다."}
                </td>
              </tr>
            ) : (
              applicants.map((a) => (
                <tr key={a.id} className={TR_HOVER}>
                  <td className={TD_ID}>
                    <Link href={`/admin/applicants/${a.id}`} className={LINK_BTN}>
                      {a.name}
                    </Link>
                  </td>
                  <td className={TD_MUTED}>{a.companyName || NONE}</td>
                  <td className={`${TD_NUM} text-muted`}>
                    {(a.companyId && businessRegistrationNumbers[a.companyId]) || NONE}
                  </td>
                  <td className={TD_MUTED}>{a.email}</td>
                  <td className={`${TD_NUM} text-muted`}>
                    {formatDate(a.createdAt)}
                  </td>
                  <td className={TD}>
                    <Badge tone={STATUS_TONE[a.approvalStatus]}>{STATUS_LABEL[a.approvalStatus]}</Badge>
                  </td>
                  <td className={TD}>
                    <div className="flex justify-end gap-2">
                      {pending && (
                        <>
                          <button
                            type="button"
                            disabled={busyId === a.id}
                            onClick={() => act(a.id, "reject")}
                            className={btnClass("secondary", "sm")}
                          >
                            거절
                          </button>
                          <button
                            type="button"
                            disabled={busyId === a.id}
                            onClick={() => act(a.id, "approve")}
                            className={btnClass("primary", "sm")}
                          >
                            승인
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        disabled={busyId === a.id}
                        onClick={() => remove(a)}
                        data-testid={`delete-user-${a.id}`}
                        className={btnClass("secondary", "sm")}
                        title="계정을 기록째 삭제 — 같은 명의로 다시 가입할 수 있게 됩니다"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
