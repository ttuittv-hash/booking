import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listCompanies, listUsers, listUsersPaged, normalizePage } from "@/lib/db";
import { Pagination } from "@/components/Pagination";
import { AddApplicantForm } from "@/components/admin/AddApplicantForm";
import { AdminNav } from "@/components/admin/AdminNav";
import { ApplicantApprovalTable } from "@/components/admin/ApplicantApprovalTable";
import { PAGE_LEAD, PAGE_TITLE } from "@/components/admin/adminUi";

export default async function AdminApplicantsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/apply");

  const { page: pageParam } = await searchParams;
  const page = normalizePage(pageParam);
  // 승인 대기는 처리해야 할 목록이라 전부 보여주고, 이미 처리된 목록만 페이지 단위로 끊는다.
  const pending = await listUsers({ role: "APPLICANT", approvalStatus: "PENDING" });
  const {
    items: decided,
    total: decidedTotal,
    totalPages: decidedTotalPages,
  } = await listUsersPaged({ role: "APPLICANT", excludeApprovalStatus: "PENDING" }, page);
  const businessRegistrationNumbers = Object.fromEntries(
    (await listCompanies()).map((c) => [c.id, c.businessRegistrationNumber]),
  );

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin/applicants" user={user} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8 sm:py-10">
        <header className="border-b border-border/20 pb-6">
          <h1 className={PAGE_TITLE}>회원 관리</h1>
          <p className={PAGE_LEAD}>
            일반인은 자유 가입할 수 없으며, 신청자(대관사) 계정은 운영자 승인이 있어야 대관
            패키지 안내와 견적 산출을 이용할 수 있습니다. 담당자명을 클릭하면 상세 정보와 신청
            내역을 확인할 수 있습니다.
          </p>
        </header>

        <div className="mt-8">
          <ApplicantApprovalTable
            applicants={pending}
            pending
            businessRegistrationNumbers={businessRegistrationNumbers}
          />
        </div>

        <div className="mt-8">
          <ApplicantApprovalTable
            applicants={decided}
            pending={false}
            businessRegistrationNumbers={businessRegistrationNumbers}
          />
        </div>

        <div className="mt-10">
          <AddApplicantForm />
        </div>
        <Pagination
          page={page}
          totalPages={decidedTotalPages}
          total={decidedTotal}
          basePath="/admin/applicants"
        />
      </main>
    </div>
  );
}
