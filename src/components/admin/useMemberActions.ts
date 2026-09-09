"use client";

// 회원 승인·반려·삭제 (2026-08-29).
//
// 회원 관리 표(승인 대기·처리 완료)와 회사 상세의 담당자 목록이 같은 동작을 쓴다.
// 예전에는 표에만 있어서, 회사별 담당자로 들어가면 보기만 하고 처리하려면 탭을 되돌아
// 나가야 했다. 확인 절차(특히 승인된 계정을 지울 때 이름을 받아치게 하는 것)를 두 벌로
// 두면 한쪽만 고쳐지므로 여기 하나로 모은다.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDialog } from "@/components/ui/Dialog";

export interface MemberActionTarget {
  id: string;
  name: string;
  email: string;
  approvalStatus: string;
}

export function useMemberActions(options?: {
  /** 삭제로 회사까지 사라졌을 때 갈 곳. 회사 상세처럼 그 자리에 머물 수 없는 화면이 쓴다. */
  onCompanyDeleted?: () => void;
}) {
  const router = useRouter();
  const dialog = useDialog();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function decide(
    id: string,
    action: "approve" | "reject",
    /** 승인이 곧 대표 지정이 되는 경우, 그 사실을 먼저 확인받기 위한 값. */
    master?: { willBecomeMaster: boolean; name: string; companyName: string | null },
  ) {
    // 대표는 회사의 첫 승인 때 자동으로 정해진다(ensureCompanyMaster). 표에서 무심코
    // 누른 승인이 대표까지 정해 버리는 일이 있어, 그 경우에는 한 번 되묻는다.
    if (action === "approve" && master?.willBecomeMaster) {
      const ok = await dialog.confirm(
        `${master.name}님은 ${master.companyName || "이 회사"}의 첫 승인 대상입니다.\n` +
          "승인하면 이 분이 대표 담당자로 지정됩니다.\n" +
          "대표 담당자는 소속 담당자를 초대하고 합류 신청을 승인·반려할 수 있습니다.\n\n" +
          "대표 담당자로 지정하며 승인할까요?",
        { title: "대표 담당자 지정", okLabel: "승인" },
      );
      if (!ok) return;
    } else if (action === "approve") {
      // 대표 지정이 아닌 일반 승인도 클릭 한 번으로 바로 처리됐다 — 오클릭 방지를 위해 확인을 넣는다.
      const ok = await dialog.confirm(`${master?.name ?? "이 신청자"}님을 승인할까요?`, {
        title: "가입 승인",
        okLabel: "승인",
      });
      if (!ok) return;
    }

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
  async function remove(target: MemberActionTarget) {
    const first = await dialog.confirm(
      `${target.name}(${target.email}) 계정을 기록째 삭제합니다.\n\n` +
        "이 사람의 신청서·알림 이력·초대가 함께 지워지고, 회사에 남는 담당자가 없으면 회사 정보도 지워집니다.\n" +
        "삭제하면 같은 명의·휴대폰으로 처음부터 다시 가입할 수 있습니다.\n\n계속할까요?",
      { title: "계정 삭제", okLabel: "삭제" },
    );
    if (!first) return;
    if (target.approvalStatus === "APPROVED") {
      const typed = await dialog.prompt("승인된 계정입니다.\n정말 지우려면 담당자명을 그대로 입력하세요.", {
        title: "삭제 확인",
        okLabel: "삭제",
        placeholder: target.name,
      });
      if (typed !== target.name) return;
    }
    setBusyId(target.id);
    try {
      const res = await fetch(`/api/admin/users/${target.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        await dialog.alert(
          data?.deletedCompany
            ? "계정과 회사 정보를 삭제했습니다.\n같은 사업자번호로 다시 가입할 수 있습니다."
            : "계정을 삭제했습니다.",
        );
        // 회사가 통째로 사라졌으면 회사 상세에 머물 수 없다 — 새로고침하면 404 다.
        if (data?.deletedCompany && options?.onCompanyDeleted) options.onCompanyDeleted();
        else router.refresh();
      } else {
        await dialog.alert(data?.error ?? "삭제하지 못했습니다.");
      }
    } finally {
      setBusyId(null);
    }
  }

  return { busyId, decide, remove };
}
