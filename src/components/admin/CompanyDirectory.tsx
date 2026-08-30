"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { num } from "@/lib/format";
import {
  FIELD,
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

const STATUS_LABEL: Record<string, string> = {
  PENDING: "심사 중",
  APPROVED: "승인 완료",
  REJECTED: "미승인",
  SUSPENDED: "휴·폐업",
};
export function CompanyDirectory({
  companies,
  total,
  page,
  totalPages,
  keyword,
  status,
}: {
  companies: Company[];
  total: number;
  page: number;
  totalPages: number;
  keyword: string;
  status: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(keyword);

  const search = useCallback(
    (nextQ: string, nextStatus: string) => {
      const sp = new URLSearchParams({ tab: "companies" });
      if (nextQ.trim()) sp.set("q", nextQ.trim());
      if (nextStatus) sp.set("status", nextStatus);
      router.push(`/admin/applicants?${sp.toString()}`);
    },
    [router],
  );

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
            className={FIELD}
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

      <div className={`${TABLE_CARD} mt-5`}>
        <div className={TABLE_HEAD}>
          <div>
            <p className={TABLE_HEAD_TITLE}>회사 목록 ({num(total)})</p>
            <p className={TABLE_HEAD_DESC}>
              회사를 누르면 상세 페이지로 이동합니다 — 담당자 목록과 대표 지정이 거기 있습니다.
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
                {/* 담당자 개개인의 승인 상태가 아니라 회사(사업자) 자체의 상태다 —
                    이름 옆 [대기 N] 칩과 헷갈린다는 지적이 있어 머리글에 "회사"를 붙였다. */}
                <th className="px-4 py-2.5 text-left">회사 상태</th>
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
                companies.map((c) => <CompanyRow key={c.id} company={c} />)
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

/**
 * 회사 한 줄 — 누르면 상세 페이지로 간다.
 * 예전에는 행 안에서 아코디언으로 담당자를 펼쳤는데, 접었다 폈다 하며 비교하기
 * 어렵고 특정 회사를 링크로 공유할 수도 없었다.
 */
function CompanyRow({ company }: { company: Company }) {
  const router = useRouter();
  return (
    <tr
      onClick={() => router.push(`/admin/companies/${company.id}`)}
      className="cursor-pointer border-b border-border/15 transition-colors hover:bg-foreground/[0.03]"
    >
      <td className="px-4 py-3">
        <span className="flex items-center gap-2">
          <Link
            href={`/admin/companies/${company.id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-bold underline decoration-border-soft underline-offset-4 transition-colors hover:decoration-accent"
          >
            {company.name}
          </Link>
          {company.pendingCount > 0 ? (
            <span className="border border-accent bg-accent px-1.5 text-[10px] leading-4 text-on-accent tabular-nums">
              대기 {num(company.pendingCount)}
            </span>
          ) : null}
        </span>
      </td>
      <td className="px-4 py-3 text-muted tabular-nums">
        {company.businessRegistrationNumber ?? "—"}
      </td>
      <td className="px-4 py-3">{company.masterName ?? <span className="text-muted">미지정</span>}</td>
      <td className="px-4 py-3 text-right tabular-nums">{num(company.memberCount)}</td>
      <td className="px-4 py-3 text-muted">{STATUS_LABEL[company.status] ?? company.status}</td>
    </tr>
  );
}
