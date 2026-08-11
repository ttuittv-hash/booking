"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { hashPasswordForTransport } from "@/lib/clientPassword";

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
    <div className="mt-6 rounded border border-red-200 bg-red-50 p-6">
      <ul className="space-y-1.5 text-[13px] text-red-700">
        <li>· 탈퇴 시 계정은 즉시 비활성화되어 로그인할 수 없습니다.</li>
        <li>· 기존 대관 신청·계약·정산 내역은 법적 보관 의무에 따라 삭제되지 않고 보존됩니다.</li>
        <li>· 같은 회사 소속 다른 담당자의 신청 내역 조회 권한에는 영향을 주지 않습니다.</li>
      </ul>

      <label className="mt-4 block">
        <span className="mb-1.5 block text-[12.5px] font-medium text-muted">비밀번호 확인</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full max-w-xs rounded-sm border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
        />
      </label>

      <label className="mt-3 flex cursor-pointer items-center gap-2 text-[13px]">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="accent-red-600"
        />
        위 내용을 확인했으며 탈퇴에 동의합니다.
      </label>

      <button
        type="button"
        disabled={busy || !password || !confirmed}
        onClick={withdraw}
        className="mt-4 rounded-sm bg-red-600 px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
      >
        {busy ? "처리 중..." : "탈퇴하기"}
      </button>
      {error && <p className="mt-3 text-[12.5px] text-red-600">{error}</p>}
    </div>
  );
}
