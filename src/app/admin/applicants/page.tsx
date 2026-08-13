import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listCompanies, listUsers, listUsersPaged, normalizePage } from "@/lib/db";
import { Pagination } from "@/components/Pagination";
import { AddApplicantForm } from "@/components/admin/AddApplicantForm";
import { AdminNav } from "@/components/admin/AdminNav";
import { ApplicantApprovalTable } from "@/components/admin/ApplicantApprovalTable";

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

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <h1 className="text-[22px] font-semibold">회원 관리</h1>
        <p className="mt-2 max-w-2xl text-[13.5px] leading-6 text-muted">
          일반인은 자유 가입할 수 없으며, 신청자(대관사) 계정은 운영자 승인이 있어야 대관
          패키지 안내와 견적 산출을 이용할 수 있습니다. 담당자명을 클릭하면 상세 정보와 신청
          내역을 확인할 수 있습니다.
        </p>

        <h2 className="mt-8 text-[14px] font-semibold">승인 대기 ({pending.length})</h2>
        <ApplicantApprovalTable applicants={pending} pending businessRegistrationNumbers={businessRegistrationNumbers} />

        <h2 className="mt-10 text-[14px] font-semibold">처리 완료</h2>
        <ApplicantApprovalTable applicants={decided} pending={false} businessRegistrationNumbers={businessRegistrationNumbers} />

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
