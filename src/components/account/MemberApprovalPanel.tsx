"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { btnClass } from "@/components/ui/kit";
import { useDialog } from "@/components/ui/Dialog";

/*
  합류 신청 상세 — 대표 담당자가 한 사람의 신청 내용을 보고 승인/반려하는 화면(2026-08-28).

  목록에서는 이름·이메일만 보고 눌러야 했다. 여기서는 첨부 서류까지 열어 보고 판단한다
  ("회원가입 승인요청이 들어왔을때, 대표 담당자가 첨부한 재직증명서도 확인을 할 수
  있어야할것같아요").
*/

const APPROVAL_LABEL: Record<string, string> = {
  APPROVED: "승인 완료",
  PENDING: "승인 대기",
  REJECTED: "미승인",
};

export interface MemberDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  companyRole: string | null;
  approvalStatus: string;
  createdAt: string;
  employmentCertUrl: string | null;
  employmentCertName: string | null;
  businessCertUrl: string | null;
  businessCertName: string | null;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border/25 py-3.5 sm:flex-row sm:items-center sm:gap-4">
      <span className="w-40 shrink-0 text-xs text-muted">{label}</span>
      <span className="min-w-0 break-all text-s">{children}</span>
    </div>
  );
}

/** 첨부 서류 한 줄 — 없으면 "미첨부"라고 분명히 적는다(판단 근거가 없다는 뜻이므로). */
function CertRow({ label, url, name }: { label: string; url: string | null; name: string | null }) {
  return (
    <Row label={label}>
      {url ? (
        <a
          href={`${url}${name ? `?name=${encodeURIComponent(name)}` : ""}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-foreground underline decoration-accent decoration-2 underline-offset-4"
        >
          {name || "첨부파일"} 열기
        </a>
      ) : (
        <span className="text-muted">미첨부</span>
      )}
    </Row>
  );
}

export function MemberApprovalPanel({
  member,
  isSelf,
}: {
  member: MemberDetail;
  isSelf: boolean;
}) {
  const router = useRouter();
  const dialog = useDialog();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function act(action: "approve" | "reject") {
    let reason = "";
    if (action === "reject") {
      // MB-03 의 필수 변수라 사유 없이 반려할 수 없다.
      const input = await dialog.prompt("반려 사유를 입력해주세요.\n신청자에게 그대로 안내됩니다.", {
        title: "가입 반려",
        okLabel: "반려",
        placeholder: "예: 사업자 정보가 확인되지 않습니다",
        multiline: true,
      });
      if (!input) return;
      reason = input;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/applicants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: member.id, action, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "처리하지 못했습니다.");
        return;
      }
      setDone(action === "approve" ? "승인 처리했습니다." : "반려 처리했습니다.");
      router.refresh();
    } catch {
      setError("처리하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  const pending = member.approvalStatus === "PENDING";

  return (
    <div className="mt-4" data-testid="member-approval-panel">
      {error ? (
        <p className="mb-4 border border-danger/40 px-4 py-3 text-s text-danger">{error}</p>
      ) : null}
      {done ? (
        <p data-testid="member-action-done" className="mb-4 border border-accent px-4 py-3 text-s">
          {done}
        </p>
      ) : null}

      <div className="border-t border-border/25">
        <Row label="이름">{member.name}</Row>
        <Row label="이메일">{member.email}</Row>
        <Row label="휴대폰">{member.phone ?? "—"}</Row>
        <Row label="회사 내 권한">
          {member.companyRole === "MASTER" ? "대표 담당자" : "소속 담당자"}
        </Row>
        <Row label="상태">{APPROVAL_LABEL[member.approvalStatus] ?? member.approvalStatus}</Row>
        <CertRow
          label="재직증명서"
          url={member.employmentCertUrl}
          name={member.employmentCertName}
        />
        <CertRow
          label="사업자등록증(본인 첨부)"
          url={member.businessCertUrl}
          name={member.businessCertName}
        />
      </div>

      {isSelf ? (
        <p className="mt-5 text-xs text-muted">본인 계정은 여기서 처리할 수 없습니다.</p>
      ) : pending ? (
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="member-approve"
            disabled={busy}
            onClick={() => void act("approve")}
            className={btnClass("primary", "md")}
          >
            가입승인
          </button>
          <button
            type="button"
            data-testid="member-reject"
            disabled={busy}
            onClick={() => void act("reject")}
            className={btnClass("secondary", "md")}
          >
            가입반려
          </button>
        </div>
      ) : (
        <p className="mt-5 text-xs text-muted">
          이미 처리된 신청입니다. 승인 취소·소속 해제는 담당자 관리 목록에서 할 수 있습니다.
        </p>
      )}
    </div>
  );
}
