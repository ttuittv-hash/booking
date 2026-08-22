"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnClass } from "@/components/ui/kit";
import { hashPasswordForTransport } from "@/lib/clientPassword";
import { useToast } from "@/components/ui/Toast";

export function WithdrawForm() {
  const router = useRouter();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function withdraw() {
    if (!password) {
      toast.error("비밀번호를 입력해 주세요.");
      return;
    }
    if (!confirmed) {
      toast.error("탈퇴 유의사항 확인에 동의해 주세요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // 비밀번호 평문 대신 SHA-256 해시를 전송한다. 구(SQLite) 시절 계정은 서버가
      // 428을 돌려주며, 이때만 평문을 함께 재전송해 검증한다.
      const passwordHash = await hashPasswordForTransport(password);
      let res = await fetch("/api/users/me/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passwordHash }),
      });
      if (res.status === 428) {
        res = await fetch("/api/users/me/withdraw", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ passwordHash, password }),
        });
      }
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
      <h2 className="type-kr-heading text-h6-m text-danger sm:text-h6">탈퇴 전 확인하세요</h2>
      <ul className="mt-4 space-y-2 text-s leading-6 text-danger">
        <li>· 탈퇴 시 계정은 즉시 비활성화되어 로그인할 수 없습니다.</li>
        <li>· 기존 대관 신청·계약·정산 내역은 법적 보관 의무에 따라 삭제되지 않고 보존됩니다.</li>
        <li>· 같은 회사 소속 다른 담당자의 신청 내역 조회 권한에는 영향을 주지 않습니다.</li>
      </ul>

      <label className="mt-6 block">
        <span className="mb-2 block text-xs text-muted-strong">비밀번호 확인</span>
        <input
          type="password"
              autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="field-base max-w-xs"
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

      <button type="button" disabled={busy} onClick={withdraw} className={`${btnClass("secondary", "md")} mt-6`}>
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
