"use client";

// 회원 상세(/admin/applicants/[id])에서 바로 대표 담당자를 지정한다.
// 같은 동작을 /admin/companies/[id]의 CompanyMembersPanel도 제공하지만, 운영자가 회원을
// 찾는 진입점은 대개 "회원 관리"라 그 화면에서 바로 처리할 수 있어야 한다는 요청으로 추가.
// 실제 승격 로직·안전장치(승인 완료 상태 확인 등)는 /api/admin/companies가 그대로 맡는다.

import { useState } from "react";
import { useDialog } from "@/components/ui/Dialog";
import { useRouter } from "next/navigation";
import { LINK_BTN } from "@/components/admin/adminUi";

export function SetCompanyMasterButton({
  companyId,
  targetId,
  targetName,
}: {
  companyId: string;
  targetId: string;
  targetName: string;
}) {
  const router = useRouter();
  const dialog = useDialog();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setMaster() {
    if (!(await dialog.confirm(`${targetName}님을 대표 담당자로 지정합니다.\n기존 대표는 소속 담당자가 됩니다.`, { okLabel: "지정" }))) {
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setMaster", companyId, targetId }),
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

  return (
    <div className="mt-1 flex flex-col items-start gap-1.5">
      <button type="button" disabled={busy} onClick={setMaster} className={LINK_BTN}>
        대표 담당자로 지정
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
