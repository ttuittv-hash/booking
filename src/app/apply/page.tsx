import type { Metadata } from "next";
import { requireAccessedUser } from "@/lib/auth";
import {
  findCompanyById,
  getCurrentRateTable,
  getRatesContent,
  getScreenTextContent,
  listApprovedQuoteBlocks,
  listDateBlocks,
  listWeekDemand,
} from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { Band, ButtonLink, PageHead, Prose } from "@/components/ui/kit";
import { NAV_ACTION_HIDDEN, NOTICE_LINK } from "@/components/ui/nav-items";
import { WizardShell } from "@/components/wizard/WizardShell";
import { WizardTextProvider } from "@/lib/content/wizardText";

export const metadata: Metadata = {
  title: "대관 신청",
};

/**
 * 대관 신청 — 누르면 바로 위저드다.
 *
 * 접수 개시일(9/1) 전에는 안내 화면을 보여 줬지만, 정본(partner.dev.seoularena.net/apply)
 * 기준으로 위저드를 그대로 노출한다. 개시 게이트는 두지 않는다.
 *
 * [추가 2026-09-03] 다만 BOOK IT 이 「오픈 예정」 안내 모드일 때는 상단바 버튼이
 * 레이어로 대체돼 실제 링크를 감추지만, 그 상태에서도 /apply 주소를 직접 치면
 * 승인 완료 계정 누구나 위저드로 들어갈 수 있었다("주소 알면 뚫린다" 신고).
 * 상단바와 같은 조건(운영자만 통과)으로 여기서도 막는다.
 */
export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; operator?: string }>;
}) {
  // 기획서 A15 접근권한 매트릭스 — 규칙은 accessPolicy.ts 한 곳에만 둔다
  const currentUser = await requireAccessedUser("/apply");

  /*
    1차 오픈 게이트 (2026-09-04 개정).

    메뉴를 통째로 감췄거나(NAV_ACTION_HIDDEN) 화면 문구 > BOOK IT 「오픈 예정」 안내가
    켜져 있으면 신청 화면을 열지 않는다.

    [개정] 예전에는 운영자를 예외로 두고, 막힌 사람은 말없이 홈으로 되돌렸다. 그런데
    운영자 계정으로는 그대로 들어가져 "1차 오픈인데 신청서가 열린다"는 지적이 나왔고,
    일반 사용자도 왜 홈으로 튕겼는지 알 수 없었다. 이제 **모두에게** 오픈 예정 안내를
    보여준다. 운영자는 그 화면의 '운영자 확인용' 링크로 흐름을 열어볼 수 있다.
  */
  const { new: startFreshParam, operator } = await searchParams;
  const gateText = NAV_ACTION_HIDDEN ? null : (await getScreenTextContent()).bookItNotice;
  const gated = NAV_ACTION_HIDDEN || !!gateText?.enabled;
  const operatorPass = currentUser.role === "ADMIN" && operator === "1";
  if (gated && !operatorPass) {
    return (
      <div className="flex flex-1 flex-col">
        <PublicHeader active="/apply" currentUser={currentUser} />
        <main className="flex flex-1 flex-col">
          <Band tone="light" size="sm">
            <PageHead
              as="h2"
              en="APPLY"
              ko={gateText?.title || "오픈 예정"}
              lead={
                <Prose
                  text={gateText?.body || "대관 신청은 준비 중입니다.\n접수 시작 일정은 공지사항으로 안내드립니다."}
                />
              }
            />
            <div className="mt-lead-action flex flex-wrap gap-inline">
              <ButtonLink href={NOTICE_LINK.href} variant="primary">
                {NOTICE_LINK.label} 보기
              </ButtonLink>
              <ButtonLink href="/" variant="secondary">
                홈으로
              </ButtonLink>
            </div>
            {currentUser.role === "ADMIN" && (
              /* 운영자는 오픈 전에도 흐름을 확인해야 한다 — 다만 기본은 다른 사람과 같은 화면이다. */
              <p className="mt-6 text-xs text-muted">
                <a href="/apply?operator=1" className="underline underline-offset-4">
                  운영자 확인용으로 신청서 열기 →
                </a>
              </p>
            )}
          </Band>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const [
    rateTable,
    weekDemand,
    adminBlocks,
    approvedBlocks,
    company,
    screenText,
    ratesContent,
  ] =
    await Promise.all([
      getCurrentRateTable(),
      listWeekDemand(),
      listDateBlocks(),
      // 승인된 신청서가 잡은 날짜도 대관 불가로 본다 — 대관사가 확정된 날을
      // 다른 회사가 계속 신청할 수 있으면 안 된다(2026-09-02).
      listApprovedQuoteBlocks(),
      currentUser.companyId ? findCompanyById(currentUser.companyId) : Promise.resolve(undefined),
      getScreenTextContent(),
      getRatesContent(),
    ]);

  const dateBlocks = [...adminBlocks, ...approvedBlocks];

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
