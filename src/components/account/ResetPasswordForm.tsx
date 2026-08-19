"use client";

import Link from "next/link";
import { useState } from "react";
import { IdentityGate } from "@/components/account/IdentityGate";
import { btnClass } from "@/components/ui/kit";
import { hashPasswordForTransport } from "@/lib/clientPassword";

// 3단계: 아이디 입력 → 본인인증 → 새 비밀번호 입력
export function ResetPasswordForm() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [username, setUsername] = useState("");
  const [ticket, setTicket] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    if (password !== confirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          identityTicket: ticket,
          passwordHash: await hashPasswordForTransport(password),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "비밀번호를 변경하지 못했습니다.");
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "비밀번호를 변경하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6" data-testid="reset-password" data-step={step}>
      <ol className="flex gap-3 text-xs text-muted">
        {["아이디 입력", "휴대폰 본인인증", "새 비밀번호 입력"].map((l, i) => (
          <li key={l} className={step > i ? "font-bold text-foreground" : ""}>
            {i + 1}. {l}
          </li>
        ))}
      </ol>

      {error ? (
        <p data-testid="reset-error" className="mt-4 border border-danger/40 px-4 py-3 text-s text-danger">
          {error}
        </p>
      ) : null}

      {step === 1 ? (
        <div className="mt-6">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold">아이디</span>
            <input
              data-testid="reset-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-border-soft bg-background px-3 py-2 text-s"
            />
          </label>
          <button
            type="button"
            data-testid="reset-next"
            disabled={!username.trim()}
            onClick={() => setStep(2)}
            className={`${btnClass("primary", "md")} mt-6 w-full`}
          >
            다음
          </button>
        </div>
      ) : step === 2 ? (
        <div className="mt-6">
          <IdentityGate
            purpose="RESET_PASSWORD"
            onVerified={(v) => {
              setTicket(v.ticket);
              setStep(3);
            }}
          />
        </div>
      ) : step === 3 ? (
        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold">새 비밀번호</span>
            <input
              data-testid="reset-password-new"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-border-soft bg-background px-3 py-2 text-s"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold">새 비밀번호 확인</span>
            <input
              data-testid="reset-password-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full border border-border-soft bg-background px-3 py-2 text-s"
            />
          </label>
          <p className="text-xs text-muted">8~20자 영문 대소문자·숫자·특수문자 조합</p>
          <button
            type="button"
            data-testid="reset-submit"
            disabled={loading}
            onClick={submit}
            className={`${btnClass("primary", "md")} w-full`}
          >
            {loading ? "변경 중…" : "비밀번호 변경"}
          </button>
        </div>
      ) : (
        <div className="mt-8 text-center" data-testid="reset-done">
          <p className="text-h6-m font-bold">비밀번호가 변경되었습니다</p>
          <p className="mt-2 text-s text-muted">
            보안을 위해 기존 로그인 세션은 모두 종료되었습니다. 새 비밀번호로 다시 로그인해 주세요.
          </p>
          <Link href="/login" className={`${btnClass("primary", "md")} mt-8`}>
            로그인
          </Link>
        </div>
      )}
    </div>
  );
}
