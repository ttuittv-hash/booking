import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { getGuidePageContent } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import {
  ArrowRight,
  Band,
  ButtonLink,
  CTABand,
  PageHead,
  ProcessSteps,
  Prose,
} from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "대관 절차 | 서울아레나",
};

/**
 * BOOK IT › 대관 절차 — 한 장짜리 화면이다.
 *
 * 탭(대관 안내 / 대관 절차)은 두지 않는다. 두 탭이 담던 것이 "안내 문단"과
 * "절차 8단계" 하나씩이어서, 탭을 누르게 만드는 대신 위아래로 이어 붙였다.
 * 요금 체계 설명(RATE STRUCTURE)은 금액을 소유한 대관료 화면과 내용이 겹쳐
 * 삭제하고, 그 자리에 대관 절차를 놓는다.
 *
 * 절차 위에 `HOW IT WORKS / 대관 절차` 머리글을 다시 두지 않는다 — 페이지 제목이
 * 이미 「대관 절차」라 같은 말이 두 번 나온다. 화면은 제목 + 안내 문단 → 절차
 * 8단계 → 옐로 CTA 세 덩어리다.
 */
export default async function GuidePage() {
  const [currentUser, content] = await Promise.all([getCurrentUser(), getGuidePageContent()]);
  if (!currentUser) redirect("/login");
  if (isPendingApplicant(currentUser)) redirect("/pending");

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/guide" currentUser={currentUser} />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="lg">
          <PageHead
            en="HOW TO BOOK"
            ko="대관 절차"
            lead={<Prose text={content.intro} />}
          />
        </Band>

        <Band tone="white">
          <ProcessSteps steps={content.process} />
        </Band>

        {/* 페이지 말미는 옐로 CTA 하나로 닫는다 — 홈과 같은 `CTABand` 규격(높이 고정) */}
        <CTABand
          title="당신의 무대를 신청하세요."
          lead="현재 진행 중인 대관 공고와 접수 일정을 확인해 보세요."
          actions={
            <ButtonLink href="/notices" variant="primary">
              대관공고 확인
              <ArrowRight />
            </ButtonLink>
          }
        />
      </main>

      <SiteFooter />
    </div>
  );
}
