"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDialog } from "@/components/ui/Dialog";
import { btnClass } from "@/components/ui/kit";
import { useToast } from "@/components/ui/Toast";
import { displayEmail } from "@/lib/format";

type Member = {
  id: string;
  name: string;
  companyName: string | null;
  email: string;
  phone: string | null;
  companyRole: string | null;
  approvalStatus: string;
  withdrawnAt: string | null;
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

// [삭제 2026-09-04 팀 요청] 대표 담당자 배지 옆 ? 아이콘과 설명 레이어를 뺐다 —
// 가입 승인이 운영진 전담으로 바뀌어 "할 수 있는 일" 안내가 실제 권한과 어긋났다.
/*
  [개정 2026-09-04 팀 결정] 가입 승인·반려는 서울아레나 운영진만 한다.

  대표 담당자에게는 버튼을 두지 않는다 — 눌러도 API 가 막으므로 버튼만 남으면
  "승인이 안 된다"로 읽힌다. 상태(승인 대기)는 그대로 보여 진행 상황은 알 수 있다.
  대표에게 권한을 되돌릴 때는 이 값을 true 로 바꾸고 API 쪽(admin/applicants) 규칙도 함께 되살린다.
*/
const MASTER_CAN_APPROVE = false;

/*
  [개정 2026-09-04 팀 결정] 담당자 초대도 당분간 닫는다.

  1차 오픈에는 서울아레나가 모든 가입을 직접 확인한다 — 대표가 링크로 사람을 불러오는
  통로를 열어 두면 그 확인을 건너뛰게 된다. 화면에서 [담당자 초대] 영역을 감추고,
  이미 발송된 초대 링크는 그대로 살아 있다. 다시 열 때는 이 값을 true 로 바꾼다.
*/
const MASTER_CAN_INVITE = false;


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
  /** 이 행이 지금 보고 있는 본인인지 — 표에서 내 줄과 남의 줄이 구분돼야 한다. */
  isMe: boolean;
  /** 탈퇴한 사람. 목록에는 남기되(회사 이력) 승인·소속 해제·대표 이관 대상에서는 뺀다. */
  withdrawn: boolean;
  joined: boolean; // 가입 여부 — 상태 컬럼의 1차 값
  detailLabel: string; // 상태 컬럼의 부가 설명(정상/승인 대기/초대 발송 등)
  /** 계정이 있는 사람만 상세 화면이 있다. 초대 행(아직 계정 없음)은 갈 곳이 없다. */
  href?: string;
  actions: RowAction[];
};

export function MembersManager({ currentUserId }: { currentUserId: string }) {
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
  // 눌러도 화면이 그대로면 처리가 됐는지 알 수 없다 — 재발송·대표 이관처럼 목록 모양이
  // 크게 바뀌지 않는 동작일수록 한 줄 안내가 필요하다(2026-08-28).
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // 목록은 API 로 뒤늦게 채워진다 — 그 전에 "없습니다"를 보이면 잠깐 빈 것처럼 보인다(E2E 도 이걸 잘못 읽었다).
  const [loaded, setLoaded] = useState(false);

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
        setLoaded(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [load]);

  async function act(url: string, body: Record<string, unknown>) {
    setError(null);
    setNotice(null);
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
    // 탈퇴자는 목록에 남기되 손댈 수 없다 — 이미 회사를 떠난 사람을 승인하거나
    // 대표로 세우거나 소속 해제하는 건 말이 되지 않는다.
    if (m.companyRole !== "MASTER" && !m.withdrawnAt) {
      if (MASTER_CAN_APPROVE && m.approvalStatus === "PENDING") {
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
            onClick: () =>
              void act("/api/company/members", { action: "transfer", targetId: m.id }).then((data) => {
                if (!data) return;
                // 이관하면 본인은 소속 담당자가 되어 이 화면의 권한도 사라진다. 목록만
                // 새로 그리면 무엇이 일어났는지 알기 어려워 문장으로 알린다.
                setNotice(`대표 담당자를 ${m.name}님께 이관했습니다. 이제 회원님은 소속 담당자입니다.`);
              }),
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
      isMe: m.id === currentUserId,
      withdrawn: !!m.withdrawnAt,
      href: `/mypage/members/${m.id}`,
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
                    if (!data) return;
                    if (data.inviteUrl) setInviteUrl(data.inviteUrl);
                    // 재발송은 휴대폰 번호로 알림톡을 다시 보낸다(/api/company/invitations
                    // 의 MB-06) — 실제로 나가는 채널과 다르게 "이메일로"라고 알려 왔던
                    // 문구를 고친다(2026-09-03 피드백). 휴대폰이 없는 옛 초대만 이메일로 남는다.
                    setNotice(
                      iv.phone
                        ? `${iv.phone} 로 알림톡을 다시 발송했습니다.`
                        : `${iv.email} 로 초대를 다시 발송했습니다.`,
                    );
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
        // 초대 행은 아직 계정이 없거나 남의 초대다 — 본인일 수 없다.
        isMe: false,
        withdrawn: false,
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
      {notice ? (
        <p data-testid="members-notice" className="mb-4 border border-accent px-4 py-3 text-s">
          {notice}
        </p>
      ) : null}

      <section>
        <h2 className="text-s font-bold">담당자 목록</h2>
        <p className="mt-1 break-keep text-xs leading-6 text-muted">
          이름을 누르면 그 담당자의 신청 상세(첨부 서류 포함)를 볼 수 있습니다. 회사에서{" "}
          <b>가장 먼저 승인된 분</b>이 <b>대표 담당자</b>가 되고, 이후 합류한 분은{" "}
          <b>소속 담당자</b>가 됩니다. 가입 승인은 서울아레나 운영진이 처리하며, 대표 담당자는
          소속 해제 · 대표 이관을 할 수 있습니다. 아래 이메일로 초대는 보냈지만 아직 본인인증·비밀번호 설정을 마치지 않은
          분은 <b>미가입</b>으로 표시됩니다.
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
                <tr
                  key={row.key}
                  // 내 줄은 옅은 바탕으로 띄운다. 이름 옆 [나] 표시만 두면 표를 훑을 때
                  // 그냥 지나친다 — 대표 이관처럼 되돌리기 어려운 동작이 같은 표에 있어서,
                  // 어느 줄이 나인지 한눈에 잡혀야 한다.
                  //
                  // 강조를 왼쪽 세로선(border-l)으로 준 적이 있는데, 표는
                  // border-collapse: collapse(Tailwind preflight)라 tr 의 좌우 테두리가
                  // 같은 tr 의 border-b 와 겹쳐 행 높이가 들쭉날쭉해졌다. 바탕색만 쓴다.
                  className={`border-b border-border/40 ${row.isMe ? "bg-accent-soft/40" : ""}`}
                  data-testid={row.key}
                >
                  {/* 이름 칸은 운영자 회사 목록(CompanyDirectory)과 같은 짜임으로 맞춘다 —
                      flex items-center + 얇은 밑줄 + 한 줄짜리 칩. flex-wrap 과 두꺼운
                      밑줄(decoration-2 underline-offset-4)을 같이 쓰던 때는 칩이 아래로
                      내려가거나 글자가 떠 보여 줄마다 높이가 달랐다. */}
                  <td className="py-3">
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      {row.href ? (
                        <Link
                          href={row.href}
                          className="font-bold underline decoration-border-soft underline-offset-4 transition-colors hover:decoration-accent"
                        >
                          {row.name}
                        </Link>
                      ) : (
                        <span>{row.name}</span>
                      )}
                      {row.isMe ? (
                        <span
                          data-testid="me-marker"
                          className="border border-accent bg-accent px-1.5 text-[10px] leading-4 text-on-accent"
                        >
                          나
                        </span>
                      ) : null}
                    </span>
                  </td>
                  {/* 탈퇴 계정은 이메일이 "withdrawn+{uuid}+..." 로 보관된다 — 원래 주소만 보여 준다. */}
                  <td className="py-3 text-muted">{displayEmail(row.email)}</td>
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
                        {/* [삭제 2026-09-04 팀 요청] 대표 담당자 옆 물음표·설명 레이어를 뺀다 —
                            승인 주체가 운영진으로 바뀌어 설명이 실제 권한과 어긋났다. */}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="py-3">
                    {/* 탈퇴자는 승인 상태가 그대로 남아 "가입 (정상)" 으로 보였다.
                        이미 떠난 사람이므로 탈퇴를 먼저 알린다. */}
                    {row.withdrawn ? (
                      <span className="font-bold text-muted">탈퇴</span>
                    ) : (
                      <>
                        <span className={`font-bold ${row.joined ? "text-foreground" : "text-muted"}`}>
                          {row.joined ? "가입" : "미가입"}
                        </span>
                        <span className="ml-1.5 text-xs text-muted">({row.detailLabel})</span>
                      </>
                    )}
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
                  <td colSpan={6} className="py-6 text-center text-muted" data-testid="members-empty">
                    {loaded ? "소속 담당자가 없습니다." : "불러오는 중…"}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {MASTER_CAN_INVITE && (
      <section className="mt-12">
        <h2 className="text-s font-bold">담당자 초대</h2>
        <p className="mt-2 break-keep text-s leading-6 text-muted">
          초대 링크를 받은 분이 직접 본인인증을 하고 비밀번호를 설정합니다. 유효기간은 3일입니다.
        </p>
        {/* [신규 2026-09-02] 링크는 전달된다 — 초대받은 사람이 다른 사람에게 넘기면
            그 사람이 가입해 버렸다. 이제 셋이 다 맞아야 가입이 되므로, 대표가 값을
            정확히 적어야 한다는 걸 입력칸 위에서 알려 준다. */}
        <p className="mt-2 break-keep text-s leading-6 text-muted">
          아래 <b>이름 · 이메일 · 휴대폰 번호</b>가 본인인증·가입 정보와 모두 같아야 가입됩니다.
          이름은 본인인증에 쓰는 <b>실명</b>으로, 직함·약칭 없이 적어 주세요. 잘못 적었다면
          [재발송]으로 새 링크를 보내면 됩니다 — 이전 링크는 그 즉시 쓸 수 없습니다.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            data-testid="invite-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름 (실명)"
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
            placeholder="휴대폰 번호 (필수 — 본인인증 번호와 대조해 승인)"
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
          않으니 아래 링크를 직접 전달해 주세요.
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
              <b> 미가입</b> 행이 자동으로 정리되고, 가입 승인은 서울아레나 운영진이 처리합니다.
            </p>
          </div>
        ) : null}
      </section>
      )}
    </div>
  );
}
