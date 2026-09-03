"use client";

// 반려된 계정의 [재심사 요청] (2026-09-02).
//
// 반려된 사람은 지금까지 갈 곳이 없었다 — 사유를 다시 볼 수도, 고쳐서 다시 봐 달라고
// 할 수도, 탈퇴할 수도 없어 운영자가 기록을 직접 지워 줘야 했다.
// 정보를 먼저 고치고 누르는 흐름이라 안내 문구에 그 순서를 적어 둔다.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDialog } from "@/components/ui/Dialog";
import { btnClass } from "@/components/ui/kit";

export function ReapplyButton() {
  const router = useRouter();
  const dialog = useDialog();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reapply() {
    const ok = await dialog.confirm(
      "회원정보를 수정한 뒤 요청하시는 것이 좋습니다.\n반려 사유가 그대로면 다시 반려될 수 있습니다.\n\n재심사를 요청할까요?",
      { title: "재심사 요청", okLabel: "요청" },
    );
    if (!ok) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/users/me/reapply", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "요청하지 못했습니다.");
      // 승인 대기 화면으로 바뀐다 — 서버가 상태를 다시 읽게 한다.
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "요청하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  // 반려 안내 카드 안에서 다른 버튼들과 나란히 서므로 전폭으로 둔다 (2026-09-03)
  return (
    <span className="flex w-full flex-col gap-2">
      <button
        type="button"
        data-testid="reapply"
        disabled={busy}
        onClick={() => void reapply()}
        className={`${btnClass("primary", "md")} w-full`}
      >
        {busy ? "요청 중…" : "재심사 요청"}
      </button>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </span>
  );
}
