"use client";

import Link from "next/link";
import { useState } from "react";
import { IdentityGate } from "@/components/account/IdentityGate";
import { btnClass } from "@/components/ui/kit";
import { useToast } from "@/components/ui/Toast";
import { checkPassword, checkUsername, firstFailure, PASSWORD_HINT, USERNAME_HINT, sanitizePasswordInput, sanitizeUsernameInput } from "@/lib/validation";
import { hashPasswordForTransport } from "@/lib/clientPassword";
import { PasswordMatchHint } from "@/components/ui/PasswordMatchHint";

export function InviteAcceptForm({
  token,
  inviteeName,
  companyName: invitationCompanyName,
}: {
  token: string;
  /** 초대장에 지정된 이름 — 있으면 이름 입력을 이 값으로 잠근다(2026-08-26). */
  inviteeName?: string | null;
  companyName?: string | null;
}) {
  const toast = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(token ? 1 : 0 as 1);
  const [ticket, setTicket] = useState("");
  const [name, setName] = useState(inviteeName ?? "");
  const nameLocked = !!inviteeName?.trim();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <p data-testid="invite-invalid" className="mt-8 text-center text-s">
        초대 링크가 올바르지 않습니다. 대표 담당자에게 재발송을 요청해 주세요.
      </p>
    );
  }

  async function submit() {
    setError(null);
    const invalid = firstFailure(
      name.trim() ? null : { ok: false, message: "이름을 입력해주세요." },
      checkUsername(username),
      checkPassword(password),
      password === confirm ? null : { ok: false, message: "비밀번호가 일치하지 않습니다." },
    );
    if (invalid) {
      toast.error(invalid);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/company/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name: name.trim(),
          username,
          identityTicket: ticket,
          passwordHash: await hashPasswordForTransport(password),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "초대를 수락하지 못했습니다.");
      setCompanyName(data.companyName ?? null);
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "초대를 수락하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6" data-testid="invite-accept" data-step={step}>
      {error ? (
        <p data-testid="invite-error" className="mb-4 border border-danger/40 px-4 py-3 text-s text-danger">
          {error}
        </p>
      ) : null}

      {step === 1 ? (
        <IdentityGate
          purpose="REGISTER"
          onVerified={(v) => {
            setTicket(v.ticket);
            setStep(2);
          }}
        />
      ) : step === 2 ? (
        <div className="space-y-4">
          {invitationCompanyName && (
            <p className="text-xs text-muted">
              <span className="font-bold text-foreground">{invitationCompanyName}</span>의 초대로 가입합니다.
            </p>
          )}
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold">이름</span>
            <input
              data-testid="invite-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              readOnly={nameLocked}
              placeholder="담당자 이름"
              className={`w-full border border-border-soft px-3 py-2 text-s ${
                nameLocked ? "bg-panel/60 text-muted" : "bg-background"
              }`}
            />
            {nameLocked && (
              <p className="mt-1 text-xs text-muted">초대장에 지정된 이름입니다. 다르다면 초대를 보낸 담당자에게 문의해 주세요.</p>
            )}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold">아이디 ({USERNAME_HINT})</span>
            <input
              data-testid="invite-username"
              value={username}
              onChange={(e) => setUsername(sanitizeUsernameInput(e.target.value))}
              className="w-full border border-border-soft bg-background px-3 py-2 text-s"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block break-keep text-xs font-bold">비밀번호 ({PASSWORD_HINT})</span>
            <input
              data-testid="invite-password"
              name="new-password"
              autoComplete="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(sanitizePasswordInput(e.target.value))}
              className="w-full border border-border-soft bg-background px-3 py-2 text-s"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold">비밀번호 확인</span>
            <input
              data-testid="invite-password-confirm"
              name="confirm-password"
              autoComplete="new-password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(sanitizePasswordInput(e.target.value))}
              className="w-full border border-border-soft bg-background px-3 py-2 text-s"
            />
            <PasswordMatchHint password={password} confirm={confirm} />
          </label>
          <button
            type="button"
            data-testid="invite-submit"
            disabled={loading || !name.trim() || !username || !password}
            onClick={submit}
            className={`${btnClass("primary", "md")} w-full`}
          >
            {loading ? "처리 중…" : "가입 완료"}
          </button>
        </div>
      ) : (
        <div className="text-center" data-testid="invite-done">
          <p className="text-h6-m font-bold">합류가 완료되었습니다</p>
          <p className="mt-2 text-s text-muted">
            {companyName ? `${companyName} 소속 담당자로 등록되었습니다.` : "소속 담당자로 등록되었습니다."}
          </p>
          <Link href="/apply" className={`${btnClass("primary", "md")} mt-8`}>
            대관 신청하기
          </Link>
        </div>
      )}
    </div>
  );
}
