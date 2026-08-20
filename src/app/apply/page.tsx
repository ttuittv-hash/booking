import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { getCurrentRateTable, listDateBlocks, listWeekDemand } from "@/lib/db";
import { APPLY_OPEN_LABEL, isApplyOpen } from "@/lib/release";
import { RENTAL_PROCESS } from "@/lib/content/processFacts";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import {
  ArrowRight,
  Band,
  ButtonLink,
  CTABand,
  PageHead,
  ProcessSteps,
  SectionHead,
} from "@/components/ui/kit";
import { WizardShell } from "@/components/wizard/WizardShell";

export const metadata: Metadata = {
  title: "대관 신청 | 서울아레나",
};

/**
 * 대관 신청은 두 상태를 갖는다. 라우트는 같고 화면만 바뀐다.
 *   접수 개시 전 — 안내 화면
 *   9/1 이후    — 신청 위저드 (콘텐츠는 기존 빌드 그대로)
 */
export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  if (isPendingApplicant(currentUser)) redirect("/pending");

  if (!isApplyOpen()) {
    return (
      <div className="flex flex-1 flex-col">
        <PublicHeader active="/apply" currentUser={currentUser} />
        <main className="flex flex-1 flex-col">
          <Band tone="light" size="lg">
            <PageHead
              en="APPLY"
              ko="대관 신청"
              lead={`대관 신청 접수는 ${APPLY_OPEN_LABEL}에 시작합니다. 접수 개시 전 가입 신청 및 승인 절차를 완료하시면 더욱 원활하게 신청하실 수 있습니다.`}
              actions={
                <ButtonLink href="/guide?tab=process" variant="primary">
                  대관 절차 보기
                  <ArrowRight />
                </ButtonLink>
              }
            />
          </Band>

          <Band tone="white">
            <SectionHead title="HOW IT WORKS" />
            <div className="mt-12">
              <ProcessSteps steps={RENTAL_PROCESS} />
            </div>
          </Band>

          <CTABand
            title="접수 전에 대관료와 규약을 확인해 두세요."
            actions={
              <>
                <ButtonLink href="/rates" variant="primary">
                  대관료 보기
                  <ArrowRight />
                </ButtonLink>
                <ButtonLink href="/rules" variant="secondary">
                  대관 규약
                </ButtonLink>
              </>
            }
          />
        </main>
        <SiteFooter />
      </div>
    );
  }

  const [{ new: startFreshParam }, rateTable, weekDemand, dateBlocks] = await Promise.all([
    searchParams,
    getCurrentRateTable(),
    listWeekDemand(),
    listDateBlocks(),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/apply" currentUser={currentUser} />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="sm">
          <PageHead
            as="h2"
            en="APPLY"
            ko="대관 신청"
            lead="주차와 규모를 입력하면 예상 대관료를 바로 확인하고, 그대로 신청서까지 제출할 수 있습니다."
          />
        </Band>

        <WizardShell
          rateTable={rateTable}
          currentUser={currentUser}
          weekDemand={weekDemand}
          dateBlocks={dateBlocks}
          startFresh={!!startFreshParam}
        />
      </main>

      <SiteFooter />
    </div>
  );
}
