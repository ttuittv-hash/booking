import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { findCompanyById, getCurrentRateTable, listDateBlocks, listWeekDemand } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";
import { WizardShell } from "@/components/wizard/WizardShell";

export const metadata: Metadata = {
  title: "대관 견적·신청 | 서울아레나",
};

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  if (isPendingApplicant(currentUser)) redirect("/pending");

  const [{ new: startFreshParam }, rateTable, weekDemand, dateBlocks, company] = await Promise.all([
    searchParams,
    getCurrentRateTable(),
    listWeekDemand(),
    listDateBlocks(),
    currentUser.companyId ? findCompanyById(currentUser.companyId) : Promise.resolve(undefined),
  ]);

  // [화면 뼈대 2026-08-19, STEP 3-1 "신청자 정보"] 대관신청사명·사업자등록번호·담당자·
  // 담당자연락처는 회원정보에서 자동 입력하고 수정은 계속 허용한다.
  const applicantPrefill = {
    companyName: currentUser.companyName ?? "",
    businessRegistrationNumber: company?.businessRegistrationNumber ?? "",
    contactName: currentUser.name,
    contactPhone: currentUser.phone ?? "",
  };

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/apply" currentUser={currentUser} />
      <WizardShell
        rateTable={rateTable}
        currentUser={currentUser}
        weekDemand={weekDemand}
        dateBlocks={dateBlocks}
        startFresh={!!startFreshParam}
        applicantPrefill={applicantPrefill}
      />
    </div>
  );
}
