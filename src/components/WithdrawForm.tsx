"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Label } from "@/components/ui/kit";

/** 입력 필드 — 샤프 코너 · border-soft 1px · surface 배경 · 포커스 옐로 아웃라인 */
const FIELD =
  "w-full max-w-xs border border-border-soft bg-surface px-3.5 py-2.5 text-s text-foreground transition-colors placeholder:text-muted focus:border-foreground focus:outline-2 focus:outline-accent";

/**
 * 파괴적 동작 버튼 — kit btnClass("outline","md") 와 같은 골격(1px 보더·샤프 코너·투명 배경)에
 * danger 색만 적용. btnClass 결과에 색을 덧붙이면 같은 속성의 유틸리티가 충돌하므로 별도로 조립한다.
 */
const DANGER_BTN = [
  "inline-flex items-center justify-center gap-2 whitespace-nowrap border font-bold",
  "transition-colors duration-150 focus-visible:outline focus-visible:outline-2",
  "focus-visible:outline-offset-2 focus-visible:outline-danger",
  "disabled:cursor-not-allowed disabled:opacity-40",
  "border-danger bg-transparent text-danger hover:bg-danger hover:text-surface",
  "h-10 px-6 text-s",
].join(" ");

export function WithdrawForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function withdraw() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/users/me/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "탈퇴 처리에 실패했습니다.");
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-l-2 border-danger bg-danger-soft p-6">
      <Label className="text-danger">Before You Leave</Label>
      <ul className="mt-4 space-y-2 text-s leading-6 text-danger">
        <li>· 탈퇴 시 계정은 즉시 비활성화되어 로그인할 수 없습니다.</li>
        <li>· 기존 대관 신청·계약·정산 내역은 법적 보관 의무에 따라 삭제되지 않고 보존됩니다.</li>
        <li>· 같은 회사 소속 다른 담당자의 신청 내역 조회 권한에는 영향을 주지 않습니다.</li>
      </ul>

      <label className="mt-6 block">
        <span className="mb-2 block text-xs text-muted-strong">비밀번호 확인</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={FIELD}
        />
      </label>

      <label className="mt-4 flex cursor-pointer items-start gap-2 text-s text-muted-strong">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 accent-danger"
        />
        위 내용을 확인했으며 탈퇴에 동의합니다.
      </label>

      <button type="button" disabled={busy || !password || !confirmed} onClick={withdraw} className={`mt-6 ${DANGER_BTN}`}>
        {busy ? "처리 중..." : "탈퇴하기"}
      </button>
      {error && (
        <p className="mt-4 border-l-2 border-danger bg-surface px-3 py-2 text-s text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
