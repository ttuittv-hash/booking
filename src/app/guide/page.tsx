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
  PageHead,
  ProcessSteps,
  Prose,
  SectionHead,
} from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "대관 안내 | 서울아레나",
};

/**
 * BOOK IT › 대관 안내 — 한 장짜리 화면이다.
 *
 * 탭(대관 안내 / 대관 절차)은 두지 않는다. 두 탭이 담던 것이 "안내 문단"과
 * "절차 8단계" 하나씩이어서, 탭을 누르게 만드는 대신 위아래로 이어 붙였다.
 * 요금 체계 설명(RATE STRUCTURE)은 금액을 소유한 대관료 화면과 내용이 겹쳐
 * 삭제하고, 그 자리에 대관 절차를 놓는다.
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
            ko="대관 안내"
            lead={<Prose text={content.intro} />}
          />
        </Band>

        <Band tone="white">
          <SectionHead title="HOW IT WORKS" lead="대관 절차" />
          <div className="mt-10">
            <ProcessSteps steps={content.process} />
          </div>
          <div className="mt-10">
            <ButtonLink href="/rates" variant="primary">
              대관료 보기
              <ArrowRight />
            </ButtonLink>
          </div>
        </Band>
      </main>

      <SiteFooter />
    </div>
  );
}
