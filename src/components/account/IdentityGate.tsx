"use client";

// 본인인증 버튼 — 가입·아이디 찾기·비밀번호 찾기 세 화면이 함께 쓴다(기획서 A4).
// 세 곳에 같은 코드를 복사해 두면 인증 정책이 갈라진다.

import { useEffect, useState } from "react";
import { btnClass } from "@/components/ui/kit";

export function IdentityGate({
  purpose,
  label = "휴대폰 본인인증",
  onVerified,
}: {
  purpose: "REGISTER" | "FIND_ID" | "RESET_PASSWORD";
  label?: string;
  onVerified: (v: { ticket: string; name: string; mobileNo: string }) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (!e.data || e.data.source !== "nice-auth") return;
      const p = e.data.payload || {};
      setLoading(false);
      if (!p.ok) {
        setError(p.message || "본인인증에 실패했습니다.");
        return;
      }
      setError(null);
      onVerified({ ticket: p.ticket, name: p.name, mobileNo: p.mobileNo });
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onVerified]);

  async function start() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/nice/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "본인인증을 시작하지 못했습니다.");
      if (data.stub && data.ticket) {
        setLoading(false);
        onVerified({ ticket: data.ticket, name: data.name ?? "", mobileNo: data.mobileNo ?? "" });
        return;
      }
      window.open(data.authUrl, "niceAuth", "width=480,height=812,menubar=no,status=no,toolbar=no");
    } catch (e) {
      setLoading(false);
      setError(e instanceof Error ? e.message : "본인인증을 시작하지 못했습니다.");
    }
  }

  return (
    <div data-testid="identity-gate">
      <div className="border border-border-soft bg-surface px-6 py-8 text-center">
        <p className="text-h6-m font-bold">휴대폰</p>
        <p className="mt-2 text-s text-muted">본인 명의로 등록된 휴대폰 번호를 이용하여 본인확인</p>
        <button
          type="button"
          data-testid="identity-start"
          disabled={loading}
          onClick={start}
          className={`${btnClass("primary", "md")} mt-6`}
        >
          {loading ? "인증창을 여는 중…" : label}
        </button>
      </div>
      {error ? (
        <p data-testid="identity-error" className="mt-3 text-s text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
