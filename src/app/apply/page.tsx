import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import {
  findCompanyById,
  getCurrentRateTable,
  getScreenTextContent,
  listDateBlocks,
  listWeekDemand,
} from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { Band, PageHead, Prose } from "@/components/ui/kit";
import { WizardShell } from "@/components/wizard/WizardShell";

export const metadata: Metadata = {
  title: "대관 신청 | 서울아레나",
};

/**
 * 대관 신청 — 누르면 바로 위저드다.
 *
 * 접수 개시일(9/1) 전에는 안내 화면을 보여 줬지만, 정본(partner.dev.seoularena.net/apply)
 * 기준으로 위저드를 그대로 노출한다. 개시 게이트는 두지 않는다.
 */
export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  if (isPendingApplicant(currentUser)) redirect("/pending");

  const [{ new: startFreshParam }, rateTable, weekDemand, dateBlocks, company, screenText] =
    await Promise.all([
      searchParams,
      getCurrentRateTable(),
      listWeekDemand(),
      listDateBlocks(),
      currentUser.companyId ? findCompanyById(currentUser.companyId) : Promise.resolve(undefined),
      getScreenTextContent(),
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

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="sm">
          <PageHead
            as="h2"
            en="APPLY"
            ko="대관 신청"
            lead={<Prose text={screenText.applyLead} />}
          />
        </Band>

        <WizardShell
          rateTable={rateTable}
          currentUser={currentUser}
          weekDemand={weekDemand}
          dateBlocks={dateBlocks}
          startFresh={!!startFreshParam}
          applicantPrefill={applicantPrefill}
        />
      </main>

      <SiteFooter />
    </div>
  );
}
