import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { findCompanyById, listCompanyMembers } from "@/lib/db";
import { AdminNav } from "@/components/admin/AdminNav";
import { CompanyMembersPanel } from "@/components/admin/CompanyMembersPanel";
import { Badge } from "@/components/ui/kit";
import { LINK_BTN } from "@/components/admin/adminUi";

// 회사 상세 — 회사별 담당자 탭에서 회사를 누르면 온다.
// 예전에는 목록 안에서 아코디언으로 펼쳤는데, 행마다 접었다 폈다 하며 비교하기도
// 어렵고 링크로 공유할 수도 없었다. 회사 하나 = 페이지 하나로 바꿨다.

const STATUS_LABEL: Record<string, string> = {
  PENDING: "심사 중",
  APPROVED: "승인 완료",
  REJECTED: "미승인",
  SUSPENDED: "휴·폐업",
};
const STATUS_TONE: Record<string, "warn" | "good" | "neutral"> = {
  PENDING: "warn",
  APPROVED: "good",
  REJECTED: "neutral",
  SUSPENDED: "neutral",
};
const NONE = <span className="text-muted">—</span>;

export default async function AdminCompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await getCurrentUser();
  if (!admin) redirect("/admin/login");
  if (admin.role !== "ADMIN") redirect("/apply");

  const { id } = await params;
  const company = await findCompanyById(id);
  if (!company) notFound();

  const members = await listCompanyMembers(id);

  const profile: [string, ReactNode][] = [
    ["사업자등록번호", company.businessRegistrationNumber ?? NONE],
    ["대표자 성명", company.representativeName ?? NONE],
    ["대표번호", company.companyPhone ?? NONE],
    ["대표팩스", company.companyFax ?? NONE],
    ["법인등록번호", company.corporateNumber ?? NONE],
    [
      "회사주소",
      company.address ? `${company.postalCode ? `(${company.postalCode}) ` : ""}${company.address}` : NONE,
    ],
  ];

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin/applicants" user={admin} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8 sm:py-10">
        <Link href="/admin/applicants?tab=companies" className={LINK_BTN}>
          ← 회사별 담당자
        </Link>

        <header className="mt-5 border-b border-border/20 pb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="type-kr-heading text-h5-m sm:text-h5">{company.name}</h1>
              <p className="mt-2 text-s text-muted">
                담당자 {members.length}명
                {company.masterUserId ? "" : " · 대표 담당자 미지정"}
              </p>
            </div>
            <Badge tone={STATUS_TONE[company.status] ?? "neutral"}>
              {STATUS_LABEL[company.status] ?? company.status}
            </Badge>
          </div>
        </header>

        <dl className="mt-6 grid grid-cols-1 border-t border-border-soft bg-panel sm:grid-cols-2">
          {profile.map(([k, v]) => (
            <div key={k} className="border-b border-border-soft px-4 py-3">
              <dt className="text-xs text-muted">{k}</dt>
              <dd className="mt-1 break-keep text-s">{v}</dd>
            </div>
          ))}
        </dl>

        <h2 className="type-kr-heading mt-10 text-h6-m sm:text-h6">담당자</h2>
        <p className="mt-1 text-xs text-muted">
          대표 담당자는 소속 담당자의 합류 신청을 승인하고 초대를 보낼 수 있습니다.
        </p>
        <div className="mt-4">
          <CompanyMembersPanel
            companyId={company.id}
            members={members.map((m) => ({
              id: m.id,
              name: m.name,
              username: m.username ?? "",
              email: m.email,
              companyRole: m.companyRole,
              approvalStatus: m.approvalStatus,
              withdrawnAt: m.withdrawnAt,
            }))}
          />
        </div>
      </main>
    </div>
  );
}
