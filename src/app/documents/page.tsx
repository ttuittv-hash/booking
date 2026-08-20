import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import {
  ARENA_DOCUMENTS,
  DOCUMENTS_LEAD,
  LIVE_HALL_DOCUMENTS,
} from "@/lib/content/documentFacts";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { QueryTabs } from "@/components/ui/QueryTabs";
import { VENUE_TABS, VENUE_TAB_PARAM } from "@/components/ui/nav-items";
import {
  ArrowRight,
  Band,
  ButtonLink,
  CTABand,
  DocumentList,
  PageHead,
} from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "대관 자료 | 서울아레나",
};

export default async function DocumentsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  if (isPendingApplicant(currentUser)) redirect("/pending");

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/documents" currentUser={currentUser} />

      <main className="flex flex-1 flex-col">
        <QueryTabs
          param={VENUE_TAB_PARAM}
          ariaLabel="공간 선택"
          tablistClassName="container-site pt-10"
          items={VENUE_TABS.map((t) => ({
            value: t.value,
            label: t.label,
            panel:
              t.value === "arena" ? (
                <Band tone="light" size="lg">
                  <PageHead en="ARENA DOCUMENTS" ko="아레나 대관 자료" lead={DOCUMENTS_LEAD} />
                  <div className="mt-14">
                    <DocumentList items={ARENA_DOCUMENTS} />
                  </div>
                </Band>
              ) : (
                <Band tone="light" size="lg">
                  <PageHead
                    en="LIVE HALL DOCUMENTS"
                    ko="중형공연장 대관 자료"
                    lead={DOCUMENTS_LEAD}
                  />
                  <div className="mt-14">
                    <DocumentList items={LIVE_HALL_DOCUMENTS} />
                  </div>
                </Band>
              ),
          }))}
        />

        <CTABand
          title="필요한 자료가 목록에 없나요?"
          lead="1:1 문의로 요청해 주시면 담당자가 확인해 회신합니다."
          actions={
            <>
              <ButtonLink href="/mypage/inquiries" variant="primary">
                1:1 문의하기
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
