"use client";

import Link from "next/link";
import { useMemberActions } from "./useMemberActions";
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
  // 승인·반려·삭제는 회사 상세의 담당자 목록과 같은 동작이다 — useMemberActions 하나를 쓴다.
  const { busyId, decide, remove } = useMemberActions();

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
                            onClick={() => decide(a.id, "reject")}
                            className={btnClass("secondary", "sm")}
                          >
                            거절
                          </button>
                          <button
                            type="button"
                            disabled={busyId === a.id}
                            onClick={() => decide(a.id, "approve")}
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
