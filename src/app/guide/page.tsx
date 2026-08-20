import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { RENTAL_PROCESS } from "@/lib/content/processFacts";
import { getGuideContent } from "@/lib/db";
import { sanitizeRichText } from "@/lib/sanitizeHtml";
import { RATE_STRUCTURE } from "@/lib/content/rateFacts";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { QueryTabs } from "@/components/ui/QueryTabs";
import { CONTENT_TAB_PARAM } from "@/components/ui/nav-items";
import {
  ArrowRight,
  Band,
  ButtonLink,
  CTABand,
  PageHead,
  ProcessSteps,
  SectionHead,
} from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "대관 안내 | 서울아레나",
};

function HowToBookPanel({ introHtml }: { introHtml: string }) {
  return (
    <>
      <Band tone="light" size="lg">
        <PageHead
          en="HOW TO BOOK"
          ko="대관 안내"
          lead={<div dangerouslySetInnerHTML={{ __html: introHtml }} />}
        />
      </Band>

      <Band tone="white">
        <SectionHead title="RATE STRUCTURE" lead="요금 체계는 공간에 따라 다릅니다." />
        <dl className="mt-14 border-t border-border/25">
          {RATE_STRUCTURE.map((r) => (
            <div
              key={r.venue}
              className="grid gap-3 border-b border-border/15 py-7 lg:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] lg:gap-[var(--gutter)]"
            >
              <dt className="type-kr-heading text-h5-m sm:text-h5">{r.venue}</dt>
              <dd className="measure break-keep text-s text-muted">{r.desc}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-12">
          <ButtonLink href="/rates" variant="primary">
            대관료 보기
            <ArrowRight />
          </ButtonLink>
        </div>
      </Band>
    </>
  );
}

function HowItWorksPanel() {
  return (
    <>
      <Band tone="light" size="lg">
        <PageHead en="HOW IT WORKS" ko="대관 절차" />
      </Band>

      <Band tone="white">
        <ProcessSteps steps={RENTAL_PROCESS} />
      </Band>
    </>
  );
}

export default async function GuidePage() {
  const [currentUser, guideContent] = await Promise.all([getCurrentUser(), getGuideContent()]);
  if (!currentUser) redirect("/login");
  if (isPendingApplicant(currentUser)) redirect("/pending");
  const introHtml = sanitizeRichText(guideContent.intro);

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/guide" currentUser={currentUser} />

      <main className="flex flex-1 flex-col">
        <QueryTabs
          param={CONTENT_TAB_PARAM}
          ariaLabel="대관 안내"
          tablistClassName="container-site pt-10"
          items={[
            { value: "book", label: "대관 안내", panel: <HowToBookPanel introHtml={introHtml} /> },
            { value: "process", label: "대관 절차", panel: <HowItWorksPanel /> },
          ]}
        />

        <CTABand
          title="준비가 되셨다면 대관 신청으로 이동하세요."
          actions={
            <>
              <ButtonLink href="/apply" variant="primary">
                대관 신청
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
