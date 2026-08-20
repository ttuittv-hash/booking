import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  listCompanies,
  listCompaniesPaged,
  listUsersPaged,
  normalizePage,
} from "@/lib/db";
import { Pagination } from "@/components/Pagination";
import { AddApplicantForm } from "@/components/admin/AddApplicantForm";
import { AdminNav } from "@/components/admin/AdminNav";
import { ApplicantApprovalTable } from "@/components/admin/ApplicantApprovalTable";
import { CompanyDirectory } from "@/components/admin/CompanyDirectory";
import { PAGE_LEAD, PAGE_TITLE, TAB_BAR, tabCls } from "@/components/admin/adminUi";

// 회원 관리 (기획서 A9·A10 운영자 시야).
//
// 탭을 셋으로 나눈다:
//   승인 대기  지금 처리해야 할 것. 기본으로 열린다.
//   처리 완료  이미 판단한 것 — 되짚어보는 용도.
//   회사별     회사 단위로 소속 담당자를 보고 대표를 바꾼다.
//
// 승인 대기도 페이지로 끊는다. 예전에는 전부 한 화면에 뿌렸는데 50건만 넘어도
// 스크롤이 끝없이 길어지고 어디까지 봤는지 알 수 없었다.
type Tab = "pending" | "decided" | "companies";

export default async function AdminApplicantsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string; q?: string; status?: string; company?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/apply");

  const params = await searchParams;
  const tab: Tab =
    params.tab === "decided" ? "decided" : params.tab === "companies" ? "companies" : "pending";
  const page = normalizePage(params.page);
  const keyword = (params.q ?? "").trim();
  const status = params.status ?? "";

  const businessRegistrationNumbers = Object.fromEntries(
    (await listCompanies()).map((c) => [c.id, c.businessRegistrationNumber]),
  );

  // 탭 라벨에 건수를 달아준다 — 열어보지 않아도 밀린 일이 있는지 보인다.
  const pendingCount = (await listUsersPaged({ role: "APPLICANT", approvalStatus: "PENDING" }, 1, 1))
    .total;

  const tabs: { key: Tab; label: string; badge?: number; href: string }[] = [
    { key: "pending", label: "승인 대기", badge: pendingCount, href: "/admin/applicants" },
    { key: "decided", label: "처리 완료", href: "/admin/applicants?tab=decided" },
    { key: "companies", label: "회사별 담당자", href: "/admin/applicants?tab=companies" },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin/applicants" user={user} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8 sm:py-10">
        <header className="pb-5">
          <h1 className={PAGE_TITLE}>회원 관리</h1>
          <p className={PAGE_LEAD}>
            신청자(대관사) 계정은 운영자 승인이 있어야 대관 패키지 안내와 견적 산출을 이용할 수
            있습니다. 회사를 처음 등록한 분이 대표 담당자가 되고, 이후 합류한 분은 소속 담당자가
            됩니다.
          </p>
        </header>

        <nav className={TAB_BAR} aria-label="회원 관리 탭">
          {tabs.map((t) => (
            <Link key={t.key} href={t.href} className={tabCls(t.key === tab)}>
              {t.label}
              {t.badge ? (
                <span className="ml-1.5 inline-block border border-accent bg-accent px-1.5 text-[10px] leading-4 text-on-accent tabular-nums">
                  {t.badge}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>

        {tab === "pending" ? (
          <PendingTab page={page} brns={businessRegistrationNumbers} />
        ) : tab === "decided" ? (
          <DecidedTab page={page} brns={businessRegistrationNumbers} />
        ) : (
          <CompaniesTab page={page} keyword={keyword} status={status} />
        )}
      </main>
    </div>
  );
}

async function PendingTab({ page, brns }: { page: number; brns: Record<string, string | null> }) {
  const { items, total, totalPages } = await listUsersPaged(
    { role: "APPLICANT", approvalStatus: "PENDING" },
    page,
  );
  return (
    <>
      <div className="mt-8">
        <ApplicantApprovalTable applicants={items} pending businessRegistrationNumbers={brns} />
      </div>
      <Pagination page={page} totalPages={totalPages} total={total} basePath="/admin/applicants" />
      <div className="mt-10">
        <AddApplicantForm />
      </div>
    </>
  );
}

async function DecidedTab({ page, brns }: { page: number; brns: Record<string, string | null> }) {
  const { items, total, totalPages } = await listUsersPaged(
    { role: "APPLICANT", excludeApprovalStatus: "PENDING" },
    page,
  );
  return (
    <>
      <div className="mt-8">
        <ApplicantApprovalTable
          applicants={items}
          pending={false}
          businessRegistrationNumbers={brns}
        />
      </div>
      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        basePath="/admin/applicants?tab=decided"
      />
    </>
  );
}

async function CompaniesTab({
  page,
  keyword,
  status,
}: {
  page: number;
  keyword: string;
  status: string;
}) {
  const { items, total, totalPages } = await listCompaniesPaged({ keyword, status }, page);
  return (
    <CompanyDirectory
      companies={items}
      total={total}
      page={page}
      totalPages={totalPages}
      keyword={keyword}
      status={status}
    />
  );
}
