"use client";

import { useCallback, useEffect, useState } from "react";
import { btnClass } from "@/components/ui/kit";

type Member = {
  id: string;
  name: string;
  companyName: string | null;
  email: string;
  phone: string | null;
  companyRole: string | null;
  approvalStatus: string;
  createdAt: string;
};
type Invitation = { id: string; email: string; phone: string | null; status: string; expiresAt: string };

const APPROVAL_LABEL: Record<string, string> = {
  APPROVED: "정상",
  PENDING: "승인 대기",
  REJECTED: "비활성",
};

export function MembersManager() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [m, i] = await Promise.all([
      fetch("/api/company/members").then((r) => r.json()),
      fetch("/api/company/invitations").then((r) => r.json()),
    ]);
    return { members: m.members ?? [], invitations: i.invitations ?? [] };
  }, []);

  const refresh = useCallback(async () => {
    const data = await load();
    setMembers(data.members);
    setInvitations(data.invitations);
  }, [load]);

  // 최초 1회 로드. setState 는 effect 본문이 아니라 promise 콜백에서 부른다.
  useEffect(() => {
    let alive = true;
    load()
      .then((data) => {
        if (!alive) return;
        setMembers(data.members);
        setInvitations(data.invitations);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [load]);

  async function act(url: string, body: Record<string, unknown>) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "처리하지 못했습니다.");
      await refresh();
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리하지 못했습니다.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8" data-testid="members-manager">
      {error ? (
        <p data-testid="members-error" className="mb-4 border border-danger/40 px-4 py-3 text-s text-danger">
          {error}
        </p>
      ) : null}

      <section>
        <h2 className="text-s font-bold">담당자 목록</h2>
        <p className="mt-1 break-keep text-xs leading-6 text-muted">
          회사를 처음 등록한 분이 <b>대표 담당자</b>가 되고, 이후 합류한 분은 <b>소속 담당자</b>가
          됩니다. 대표 담당자만 초대 · 합류 승인 · 소속 해제 · 대표 이관을 할 수 있습니다.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-s" data-testid="members-table">
            <thead>
              <tr className="border-b border-border text-xs text-muted">
                <th className="py-2 text-left">기업명</th>
                <th className="py-2 text-left">이름</th>
                <th className="py-2 text-left">이메일</th>
                <th className="py-2 text-left">권한</th>
                <th className="py-2 text-left">상태</th>
                <th className="py-2 text-left">조치</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-border/40" data-testid={`member-${m.id}`}>
                  <td className="py-3 text-muted">{m.companyName || "—"}</td>
                  <td className="py-3">{m.name}</td>
                  <td className="py-3 text-muted">{m.email}</td>
                  <td className="py-3">
                    <span
                      className={`inline-block border px-2 py-0.5 text-xs ${
                        m.companyRole === "MASTER"
                          ? "border-accent text-accent"
                          : "border-border-soft text-muted"
                      }`}
                    >
                      {m.companyRole === "MASTER" ? "대표 담당자" : "소속 담당자"}
                    </span>
                  </td>
                  <td className="py-3">{APPROVAL_LABEL[m.approvalStatus] ?? m.approvalStatus}</td>
                  <td className="py-3">
                    {m.companyRole === "MASTER" ? (
                      <span className="text-muted">—</span>
                    ) : (
                      <span className="flex flex-wrap gap-2">
                        {m.approvalStatus === "PENDING" ? (
                          <>
                            <button
                              type="button"
                              data-testid="approve-member"
                              disabled={busy}
                              onClick={() => act("/api/admin/applicants", { id: m.id, action: "approve" })}
                              className={btnClass("primary", "sm")}
                            >
                              승인
                            </button>
                            <button
                              type="button"
                              data-testid="reject-member"
                              disabled={busy}
                              onClick={() => {
                                // MB-03 의 필수 변수라 사유 없이 반려할 수 없다.
                                const reason = window.prompt("반려 사유를 입력해주세요. 신청자에게 그대로 안내됩니다.");
                                if (!reason?.trim()) return;
                                void act("/api/admin/applicants", { id: m.id, action: "reject", reason: reason.trim() });
                              }}
                              className={btnClass("secondary", "sm")}
                            >
                              거절
                            </button>
                          </>
                        ) : null}
                        {m.approvalStatus === "APPROVED" ? (
                          <>
                            <button
                              type="button"
                              data-testid="transfer-master"
                              disabled={busy}
                              onClick={() => act("/api/company/members", { action: "transfer", targetId: m.id })}
                              className={btnClass("secondary", "sm")}
                            >
                              대표 이관
                            </button>
                            <button
                              type="button"
                              data-testid="remove-member"
                              disabled={busy}
                              onClick={() => act("/api/company/members", { action: "remove", targetId: m.id })}
                              className={btnClass("tertiary", "sm")}
                            >
                              소속 해제
                            </button>
                          </>
                        ) : null}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-muted">
                    소속 담당자가 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-s font-bold">담당자 초대</h2>
        <p className="mt-2 text-s text-muted">
          초대 링크를 받은 분이 직접 본인인증을 하고 비밀번호를 설정합니다. 유효기간은 7일입니다.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            data-testid="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="초대할 담당자 이메일"
            className="field-base min-w-64 flex-1"
          />
          <input
            data-testid="invite-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="휴대폰 번호 (선택 — 알림톡 발송용)"
            className="field-base min-w-48 flex-1"
          />
          <button
            type="button"
            data-testid="invite-send"
            disabled={busy || !email}
            onClick={async () => {
              const data = await act("/api/company/invitations", { email, phone: phone || undefined });
              if (data?.inviteUrl) {
                setInviteUrl(data.inviteUrl);
                setEmail("");
                setPhone("");
              }
            }}
            className={btnClass("primary", "md")}
          >
            초대 링크 발급
          </button>
        </div>
        <p className="mt-1.5 text-xs text-muted">
          휴대폰 번호를 입력하면 알림톡으로 초대 링크가 자동 발송됩니다. 비워두면 알림톡이 나가지
          않으니 아래 링크를 직접 전달해 주세요(이메일 발송은 아직 연결 전입니다).
        </p>

        {inviteUrl ? (
          <div data-testid="invite-url" className="mt-4 border border-accent px-4 py-3 text-s">
            <p className="font-bold">초대 링크가 발급되었습니다</p>
            <p className="mt-2 break-all font-mono text-xs">{inviteUrl}</p>
            <p className="mt-2 text-xs text-muted">
              휴대폰 번호를 입력했다면 알림톡으로도 이미 발송됐습니다. 도착하지 않으면 이 링크를
              직접 전달해 주세요.
            </p>
          </div>
        ) : null}

        <table className="mt-6 w-full text-s" data-testid="invitations-table">
          <thead>
            <tr className="border-b border-border text-xs text-muted">
              <th className="py-2 text-left">이메일</th>
              <th className="py-2 text-left">휴대폰</th>
              <th className="py-2 text-left">상태</th>
              <th className="py-2 text-left">만료</th>
              <th className="py-2 text-left">조치</th>
            </tr>
          </thead>
          <tbody>
            {invitations.map((iv) => (
              <tr key={iv.id} className="border-b border-border/40">
                <td className="py-3">{iv.email}</td>
                <td className="py-3 text-muted">{iv.phone ?? "—"}</td>
                <td className="py-3">{iv.status}</td>
                <td className="py-3 text-muted">{iv.expiresAt.slice(0, 10)}</td>
                <td className="py-3">
                  {iv.status === "PENDING" ? (
                    <button
                      type="button"
                      data-testid="cancel-invite"
                      disabled={busy}
                      onClick={() => act("/api/company/invitations", { action: "cancel", id: iv.id })}
                      className={btnClass("tertiary", "sm")}
                    >
                      취소
                    </button>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
            {invitations.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-muted">
                  발급한 초대가 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
