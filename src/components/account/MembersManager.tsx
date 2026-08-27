"use client";

import { useCallback, useEffect, useState } from "react";
import { useDialog } from "@/components/ui/Dialog";
import { btnClass } from "@/components/ui/kit";
import { useToast } from "@/components/ui/Toast";

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
type Invitation = {
  id: string;
  email: string;
  phone: string | null;
  inviteeName: string | null;
  inviteeTitle: string | null;
  status: string;
  expiresAt: string;
  acceptedUserId: string | null;
  acceptedUserApprovalStatus: string | null;
  acceptedUserName: string | null;
  companyName: string;
};

const APPROVAL_LABEL: Record<string, string> = {
  APPROVED: "정상",
  PENDING: "승인 대기",
  REJECTED: "비활성",
};

// [신규 2026-08-26] "마스터 계정표기 텍스트 옆에 ? 아이콘, 마우스오버하면 안내" 요청.
// 이 화면(/mypage/members)은 대표 담당자만 열 수 있으므로 MASTER 배지는 늘 보는 사람 본인이다.
export const MASTER_ROLE_TOOLTIP = "당신은 마스터 계정으로 소속담당자 승인/관리가 가능합니다.";

function MasterInfoIcon() {
  return (
    <span
      data-testid="master-role-info"
      title={MASTER_ROLE_TOOLTIP}
      aria-label={MASTER_ROLE_TOOLTIP}
      className="ml-1 inline-flex h-3.5 w-3.5 shrink-0 cursor-help items-center justify-center rounded-full border border-current text-[9px] leading-none"
    >
      ?
    </span>
  );
}

// [개정 2026-08-26] "같은 회사 소속 계정들이 한 리스트에, 상태값(가입/미가입)과
// 상태별 실행 버튼(가입승인/가입반려 등)이 보여야 한다" 요청으로 "담당자 목록"(이미
// 계정이 있는 사람)과 "담당자 초대"(아직 계정이 없는 사람)를 한 표로 합친다.
// 초대를 수락(ACCEPTED)한 사람은 users 테이블에 company_id가 이미 잡혀 있어
// listCompanyMembers에도 같이 뜬다 — 그대로 합치면 같은 사람이 두 줄로 중복되므로,
// 초대 쪽에서는 "아직 계정이 없는" PENDING/CANCELLED만 남기고 ACCEPTED는 뺀다
// (그 사람은 이미 members 쪽 행으로 나온다).
type RowAction = { key: string; label: string; variant: "primary" | "secondary" | "tertiary"; onClick: () => void };
type UnifiedRow = {
  key: string;
  name: string;
  email: string;
  phone: string | null;
  companyRole: string | null; // MASTER | STAFF | null(아직 계정 없음)
  joined: boolean; // 가입 여부 — 상태 컬럼의 1차 값
  detailLabel: string; // 상태 컬럼의 부가 설명(정상/승인 대기/초대 발송 등)
  actions: RowAction[];
};

export function MembersManager() {
  const toast = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const dialog = useDialog();
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
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

  const memberRows: UnifiedRow[] = members.map((m) => {
    const actions: RowAction[] = [];
    if (m.companyRole !== "MASTER") {
      if (m.approvalStatus === "PENDING") {
        actions.push(
          {
            key: "approve",
            label: "가입승인",
            variant: "primary",
            onClick: () => void act("/api/admin/applicants", { id: m.id, action: "approve" }),
          },
          {
            key: "reject",
            label: "가입반려",
            variant: "secondary",
            onClick: () => {
              // MB-03 의 필수 변수라 사유 없이 반려할 수 없다.
              void (async () => {
                const reason = await dialog.prompt("반려 사유를 입력해주세요.\n신청자에게 그대로 안내됩니다.", {
                  title: "가입 반려",
                  okLabel: "반려",
                  placeholder: "예: 사업자 정보가 확인되지 않습니다",
                  multiline: true,
                });
                if (!reason) return;
                await act("/api/admin/applicants", { id: m.id, action: "reject", reason });
              })();
            },
          },
        );
      } else if (m.approvalStatus === "APPROVED") {
        actions.push(
          {
            key: "transfer",
            label: "대표 이관",
            variant: "secondary",
            onClick: () => void act("/api/company/members", { action: "transfer", targetId: m.id }),
          },
          {
            key: "remove",
            label: "소속 해제",
            variant: "tertiary",
            onClick: () => void act("/api/company/members", { action: "remove", targetId: m.id }),
          },
        );
      }
    }
    return {
      key: `member-${m.id}`,
      name: m.name,
      email: m.email,
      phone: m.phone,
      companyRole: m.companyRole,
      joined: true,
      detailLabel: APPROVAL_LABEL[m.approvalStatus] ?? m.approvalStatus,
      actions,
    };
  });

  // 초대를 수락(ACCEPTED)한 사람은 이미 users 테이블에 계정이 있어 위 members 쪽
  // 행으로 나온다 — 여기서 또 넣으면 같은 사람이 두 줄로 중복되므로 뺀다.
  const inviteRows: UnifiedRow[] = invitations
    .filter((iv) => iv.status !== "ACCEPTED")
    .map((iv) => {
      const actions: RowAction[] =
        iv.status === "PENDING"
          ? [
              {
                key: "resend",
                label: "재발송",
                variant: "secondary",
                onClick: () =>
                  void act("/api/company/invitations", { action: "resend", id: iv.id }).then((data) => {
                    if (data?.inviteUrl) setInviteUrl(data.inviteUrl);
                  }),
              },
              {
                key: "cancel",
                label: "초대 취소",
                variant: "tertiary",
                onClick: () => void act("/api/company/invitations", { action: "cancel", id: iv.id }),
              },
            ]
          : [];
      return {
        key: `invite-${iv.id}`,
        name: iv.inviteeName ?? "—",
        email: iv.email,
        phone: iv.phone,
        companyRole: null,
        joined: false,
        detailLabel: iv.status === "PENDING" ? "초대 발송" : "초대 취소됨",
        actions,
      };
    });

  const unifiedRows = [...memberRows, ...inviteRows];

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
          됩니다. 대표 담당자만 초대 · 합류 승인 · 소속 해제 · 대표 이관을 할 수 있습니다. 아래
          이메일로 초대는 보냈지만 아직 본인인증·비밀번호 설정을 마치지 않은 분은 <b>미가입</b>으로
          표시됩니다.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-s" data-testid="members-table">
            <thead>
              <tr className="border-b border-border text-xs text-muted">
                <th className="py-2 text-left">이름</th>
                <th className="py-2 text-left">이메일</th>
                <th className="py-2 text-left">휴대폰</th>
                <th className="py-2 text-left">권한</th>
                <th className="py-2 text-left">상태</th>
                <th className="py-2 text-left">조치</th>
              </tr>
            </thead>
            <tbody>
              {unifiedRows.map((row) => (
                <tr key={row.key} className="border-b border-border/40" data-testid={row.key}>
                  <td className="py-3">{row.name}</td>
                  <td className="py-3 text-muted">{row.email}</td>
                  <td className="py-3 text-muted">{row.phone ?? "—"}</td>
                  <td className="py-3">
                    {row.companyRole ? (
                      <span className="inline-flex items-center">
                        <span
                          className={`inline-block border px-2 py-0.5 text-xs ${
                            row.companyRole === "MASTER"
                              ? "border-accent text-accent"
                              : "border-border-soft text-muted"
                          }`}
                        >
                          {row.companyRole === "MASTER" ? "대표 담당자" : "소속 담당자"}
                        </span>
                        {row.companyRole === "MASTER" ? <MasterInfoIcon /> : null}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="py-3">
                    <span className={`font-bold ${row.joined ? "text-foreground" : "text-muted"}`}>
                      {row.joined ? "가입" : "미가입"}
                    </span>
                    <span className="ml-1.5 text-xs text-muted">({row.detailLabel})</span>
                  </td>
                  <td className="py-3">
                    {row.actions.length === 0 ? (
                      <span className="text-muted">—</span>
                    ) : (
                      <span className="flex flex-wrap gap-2">
                        {row.actions.map((a) => (
                          <button
                            key={a.key}
                            type="button"
                            data-testid={`${row.key}-${a.key}`}
                            disabled={busy}
                            onClick={a.onClick}
                            className={btnClass(a.variant, "sm")}
                          >
                            {a.label}
                          </button>
                        ))}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {unifiedRows.length === 0 ? (
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
            data-testid="invite-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름"
            className="field-base min-w-40 flex-1"
          />
          <input
            data-testid="invite-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="소속 (선택)"
            className="field-base min-w-40 flex-1"
          />
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
            disabled={busy}
            onClick={async () => {
              // 버튼을 잠그지 않는다 — 눌러도 반응이 없으면 고장으로 보인다(반복 신고 패턴).
              if (!name.trim()) {
                toast.error("초대할 담당자의 이름을 입력해 주세요.");
                return;
              }
              if (!email.trim()) {
                toast.error("초대할 담당자의 이메일을 입력해 주세요.");
                return;
              }
              const data = await act("/api/company/invitations", {
                email,
                phone: phone || undefined,
                name,
                title: title || undefined,
              });
              if (data?.inviteUrl) {
                setInviteUrl(data.inviteUrl);
                setName("");
                setTitle("");
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
            <p className="font-bold">초대가 발송되었습니다</p>
            <p className="mt-2 break-all font-mono text-xs">{inviteUrl}</p>
            {/* [개정 2026-08-27] 링크는 회원가입 페이지다 — 초대받은 사람은 전용 화면이
                아니라 일반 가입을 그대로 밟는다. 회사는 사업자등록번호로 찾아 붙고, 승인은
                아래 담당자 목록에서 한다. */}
            <p className="mt-2 text-xs text-muted">
              휴대폰 번호를 입력했다면 알림톡으로도 이미 발송됐습니다. 도착하지 않으면 이 회원가입
              링크를 직접 전달해 주세요. 초대한 분이 <b>같은 이메일</b>로 가입하면 아래 목록의
              <b> 미가입</b> 행이 자동으로 정리되고, 가입 승인은 대표 담당자가 처리합니다.
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
