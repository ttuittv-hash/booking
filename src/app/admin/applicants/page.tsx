import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listCompanies, listUsers } from "@/lib/db";
import { AddApplicantForm } from "@/components/admin/AddApplicantForm";
import { AdminNav } from "@/components/admin/AdminNav";
import { ApplicantApprovalTable } from "@/components/admin/ApplicantApprovalTable";
import { PAGE_LEAD, PAGE_TITLE } from "@/components/admin/adminUi";

export default async function AdminApplicantsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/apply");

  const pending = listUsers({ role: "APPLICANT", approvalStatus: "PENDING" });
  const decided = listUsers({ role: "APPLICANT" }).filter((a) => a.approvalStatus !== "PENDING");
  const businessRegistrationNumbers = Object.fromEntries(
    listCompanies().map((c) => [c.id, c.businessRegistrationNumber]),
  );

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin/applicants" />

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
      </main>
    </div>
  );
}
