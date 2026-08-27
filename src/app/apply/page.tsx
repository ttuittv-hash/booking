import type { Metadata } from "next";
import { requireAccessedUser } from "@/lib/auth";
import {
  findCompanyById,
  getCurrentRateTable,
  getRatesContent,
  getScreenTextContent,
  listDateBlocks,
  listWeekDemand,
} from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { Band, PageHead, Prose } from "@/components/ui/kit";
import { WizardShell } from "@/components/wizard/WizardShell";
import { WizardTextProvider } from "@/lib/content/wizardText";

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
  // 기획서 A15 접근권한 매트릭스 — 규칙은 accessPolicy.ts 한 곳에만 둔다
  const currentUser = await requireAccessedUser("/apply");

  const [{ new: startFreshParam }, rateTable, weekDemand, dateBlocks, company, screenText, ratesContent] =
    await Promise.all([
      searchParams,
      getCurrentRateTable(),
      listWeekDemand(),
      listDateBlocks(),
      currentUser.companyId ? findCompanyById(currentUser.companyId) : Promise.resolve(undefined),
      getScreenTextContent(),
      getRatesContent(),
    ]);

  // [화면 뼈대 2026-08-19, STEP 3-1 "신청자 정보"] 대관신청사명·사업자등록번호는
  // 회원정보에서 자동 입력하고(2026-08-22부터 읽기 전용), 담당자·담당자연락처는
  // 자동 입력 후에도 계속 수정을 허용한다.
  // 회사명은 companies.name 을 우선한다 — users.company_name 은 가입 시점에 한 번
  // 써넣는 별도 컬럼이라 (예: 시드/스크립트로 만든 계정 등) 실제 회사 정보와 어긋날
  // 수 있고, 마이페이지 "나의 정보"(ProfileForm)도 companies.name 을 보여준다 —
  // 두 화면이 서로 다른 값을 보여주면 안 된다("기업정보가 있는데도 위저드에서는
  // - 로 나옴", 2026-08-22).
  const applicantPrefill = {
    companyName: company?.name ?? currentUser.companyName ?? "",
    businessRegistrationNumber: company?.businessRegistrationNumber ?? "",
    representativeName: company?.representativeName ?? "",
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

        <WizardTextProvider overrides={screenText.wizardStrings}>
          <WizardShell
            rateTable={rateTable}
            currentUser={currentUser}
            weekDemand={weekDemand}
            dateBlocks={dateBlocks}
            startFresh={!!startFreshParam}
            applicantPrefill={applicantPrefill}
            liveHallRateContent={ratesContent.liveHall}
            wizardStepText={screenText.wizardSteps}
          />
        </WizardTextProvider>
      </main>

      <SiteFooter />
    </div>
  );
}
