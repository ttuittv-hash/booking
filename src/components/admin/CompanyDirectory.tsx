"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FIELD,
  FIELD_SM,
  LINK_BTN,
  QUIET_BTN,
  TABLE,
  TABLE_CARD,
  TABLE_HEAD,
  TABLE_HEAD_DESC,
  TABLE_HEAD_TITLE,
  TABLE_SCROLL,
} from "@/components/admin/adminUi";
import { Pagination } from "@/components/Pagination";

type Company = {
  id: string;
  name: string;
  businessRegistrationNumber: string | null;
  representativeName: string | null;
  status: string;
  masterUserId: string | null;
  masterName: string | null;
  memberCount: number;
  pendingCount: number;
  createdAt: string;
};

type Member = {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string | null;
  companyRole: string | null;
  approvalStatus: string;
  createdAt: string;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "심사 중",
  APPROVED: "승인 완료",
  REJECTED: "미승인",
  SUSPENDED: "휴·폐업",
};
const APPROVAL_LABEL: Record<string, string> = {
  PENDING: "승인 대기",
  APPROVED: "정상",
  REJECTED: "비활성",
};

export function CompanyDirectory({
  companies,
  total,
  page,
  totalPages,
  keyword,
  status,
  openId,
}: {
  companies: Company[];
  total: number;
  page: number;
  totalPages: number;
  keyword: string;
  status: string;
  openId: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(keyword);
  const [expanded, setExpanded] = useState<string | null>(openId || null);
  const [members, setMembers] = useState<Record<string, Member[]>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(
    (nextQ: string, nextStatus: string) => {
      const sp = new URLSearchParams({ tab: "companies" });
      if (nextQ.trim()) sp.set("q", nextQ.trim());
      if (nextStatus) sp.set("status", nextStatus);
      router.push(`/admin/applicants?${sp.toString()}`);
    },
    [router],
  );

  async function toggle(id: string) {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    if (members[id]) return;
    const res = await fetch(`/api/admin/companies/members?companyId=${id}`);
    const data = await res.json();
    setMembers((prev) => ({ ...prev, [id]: data.members ?? [] }));
  }

  async function setMaster(companyId: string, targetId: string, name: string) {
    if (!window.confirm(`${name}님을 대표 담당자로 지정합니다. 기존 대표는 소속 담당자가 됩니다.`)) {
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setMaster", companyId, targetId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "변경하지 못했습니다.");
      const refreshed = await fetch(`/api/admin/companies/members?companyId=${companyId}`);
      const md = await refreshed.json();
      setMembers((prev) => ({ ...prev, [companyId]: md.members ?? [] }));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "변경하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8">
      {/* 검색 · 필터 */}
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-56 flex-1">
          <span className="mb-1.5 block text-xs text-muted">회사명 · 사업자등록번호</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") search(q, status);
            }}
            placeholder="예: 서울아레나 또는 101-81-16510"
            className={FIELD}
          />
        </label>
        <label>
          <span className="mb-1.5 block text-xs text-muted">회사 상태</span>
          <select
            value={status}
            onChange={(e) => search(q, e.target.value)}
            className={FIELD_SM}
          >
            <option value="">전체</option>
            <option value="PENDING">심사 중</option>
            <option value="APPROVED">승인 완료</option>
            <option value="REJECTED">미승인</option>
            <option value="SUSPENDED">휴·폐업</option>
          </select>
        </label>
        <button type="button" onClick={() => search(q, status)} className={LINK_BTN}>
          검색
        </button>
        {keyword || status ? (
          <button type="button" onClick={() => search("", "")} className={QUIET_BTN}>
            초기화
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-4 border border-danger/40 px-4 py-3 text-s text-danger">{error}</p>
      ) : null}

      <div className={`${TABLE_CARD} mt-5`}>
        <div className={TABLE_HEAD}>
          <div>
            <p className={TABLE_HEAD_TITLE}>회사 목록 ({total})</p>
            <p className={TABLE_HEAD_DESC}>
              회사를 누르면 소속 담당자가 펼쳐집니다. 대표 담당자가 맨 위에 표시됩니다.
            </p>
          </div>
        </div>

        <div className={TABLE_SCROLL}>
          <table className={TABLE}>
            <thead>
              <tr className="border-b border-border/20 text-xs text-muted">
                <th className="px-4 py-2.5 text-left">회사명</th>
                <th className="px-4 py-2.5 text-left">사업자등록번호</th>
                <th className="px-4 py-2.5 text-left">대표 담당자</th>
                <th className="px-4 py-2.5 text-right">소속</th>
                <th className="px-4 py-2.5 text-left">상태</th>
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-s text-muted">
                    조건에 맞는 회사가 없습니다.
                  </td>
                </tr>
              ) : (
                companies.map((c) => (
                  <FragmentRow
                    key={c.id}
                    company={c}
                    expanded={expanded === c.id}
                    members={members[c.id]}
                    busy={busy}
                    onToggle={() => toggle(c.id)}
                    onSetMaster={(m) => setMaster(c.id, m.id, m.name)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        basePath={`/admin/applicants?tab=companies${keyword ? `&q=${encodeURIComponent(keyword)}` : ""}${status ? `&status=${status}` : ""}`}
      />
    </div>
  );
}

function FragmentRow({
  company,
  expanded,
  members,
  busy,
  onToggle,
  onSetMaster,
}: {
  company: Company;
  expanded: boolean;
  members?: Member[];
  busy: boolean;
  onToggle: () => void;
  onSetMaster: (m: Member) => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer border-b border-border/15 transition-colors hover:bg-foreground/[0.03]"
      >
        <td className="px-4 py-3">
          <span className="flex items-center gap-2">
            <span aria-hidden className="text-xs text-muted">
              {expanded ? "▾" : "▸"}
            </span>
            <span className="font-bold">{company.name}</span>
            {company.pendingCount > 0 ? (
              <span className="border border-accent bg-accent px-1.5 text-xs leading-4 text-on-accent tabular-nums">
                대기 {company.pendingCount}
              </span>
            ) : null}
          </span>
        </td>
        <td className="px-4 py-3 text-muted tabular-nums">
          {company.businessRegistrationNumber ?? "—"}
        </td>
        <td className="px-4 py-3">{company.masterName ?? <span className="text-muted">미지정</span>}</td>
        <td className="px-4 py-3 text-right tabular-nums">{company.memberCount}</td>
        <td className="px-4 py-3 text-muted">{STATUS_LABEL[company.status] ?? company.status}</td>
      </tr>

      {expanded ? (
        <tr className="border-b border-border/20 bg-background">
          <td colSpan={5} className="px-4 py-4">
            {!members ? (
              <p className="py-4 text-center text-xs text-muted">불러오는 중…</p>
            ) : members.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted">소속 담당자가 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {members.map((m) => {
                  const isMaster = m.companyRole === "MASTER";
                  return (
                    <li
                      key={m.id}
                      className="flex flex-wrap items-center justify-between gap-3 border border-border-soft px-4 py-3"
                    >
                      <span className="flex flex-wrap items-center gap-2 text-s">
                        <span
                          className={`border px-2 py-0.5 text-xs ${
                            isMaster ? "border-accent text-accent" : "border-border-soft text-muted"
                          }`}
                        >
                          {isMaster ? "대표 담당자" : "소속 담당자"}
                        </span>
                        {/* 이름을 누르면 회원 상세로 간다 — 진위확인 배지와 신청 내역이 거기 있다. */}
                        <Link
                          href={`/admin/applicants/${m.id}`}
                          className="font-bold underline decoration-border-soft underline-offset-4 transition-colors hover:decoration-accent"
                        >
                          {m.name}
                        </Link>
                        <span className="text-muted">{m.username}</span>
                        <span className="text-muted">{m.email}</span>
                        <span className="text-xs text-muted">
                          {APPROVAL_LABEL[m.approvalStatus] ?? m.approvalStatus}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        <Link href={`/admin/applicants/${m.id}`} className={LINK_BTN}>
                          상세
                        </Link>
                        {!isMaster && m.approvalStatus === "APPROVED" ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onSetMaster(m)}
                            className={LINK_BTN}
                          >
                            대표로 지정
                          </button>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </td>
        </tr>
      ) : null}
    </>
  );
}
