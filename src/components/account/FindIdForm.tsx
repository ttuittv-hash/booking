"use client";

import Link from "next/link";
import { useState } from "react";
import { IdentityGate } from "@/components/account/IdentityGate";
import { btnClass } from "@/components/ui/kit";

export function FindIdForm() {
  const [result, setResult] = useState<{ found: boolean; masked?: string; message?: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  async function onVerified(v: { ticket: string }) {
    setError(null);
    const res = await fetch("/api/auth/find-id", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identityTicket: v.ticket }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "아이디를 찾지 못했습니다.");
      return;
    }
    setResult({ found: data.found, masked: data.maskedUsername, message: data.message });
  }

  if (result) {
    return (
      <div data-testid="find-id-result" className="mt-6 text-center">
        {result.found ? (
          <>
            <p className="text-s text-muted">입력하신 정보와 일치하는 아이디입니다.</p>
            <p data-testid="masked-username" className="mt-3 text-h5-m font-bold">
              {result.masked}
            </p>
            <p className="mt-2 text-xs text-muted">
              보안을 위해 일부만 표시합니다. 전체 아이디가 기억나지 않으면 고객센터로 문의해 주세요.
            </p>
          </>
        ) : (
          <p data-testid="find-id-empty" className="text-s">
            {result.message}
          </p>
        )}
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/login" className={btnClass("primary", "md")}>
            로그인
          </Link>
          <Link href="/reset-password" className={btnClass("secondary", "md")}>
            비밀번호 찾기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <IdentityGate purpose="FIND_ID" onVerified={onVerified} />
      {error ? (
        <p data-testid="find-id-error" className="mt-3 text-s text-danger">
          {error}
        </p>
      ) : null}
      <p className="mt-6 text-s text-muted">
        비밀번호를 잊으셨나요?{" "}
        <Link href="/reset-password" className="underline underline-offset-4">
          비밀번호 찾기
        </Link>
      </p>
    </div>
  );
}
