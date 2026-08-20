import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { getGuidePageContent } from "@/lib/db";
import type { GuidePageContent } from "@/lib/content/pageContent";
import { sanitizeRichText } from "@/lib/sanitizeHtml";
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

function HowToBookPanel({ c, introHtml }: { c: GuidePageContent; introHtml: string }) {
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
          {c.rateStructure.map((r) => (
            <div
              key={r.label}
              className="grid gap-3 border-b border-border/15 py-7 lg:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] lg:gap-[var(--gutter)]"
            >
              <dt className="type-kr-heading text-h5-m sm:text-h5">{r.label}</dt>
              <dd className="measure break-keep text-s text-muted">{r.value}</dd>
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

function HowItWorksPanel({ c }: { c: GuidePageContent }) {
  // 머리글만 있는 밴드를 따로 두면 제목과 절차 사이가 지나치게 벌어진다 — 한 밴드에 담는다.
  return (
    <Band tone="light" size="lg">
      <PageHead en="HOW IT WORKS" ko="대관 절차" />
      <div className="mt-16 sm:mt-20">
        <ProcessSteps steps={c.process} />
      </div>
    </Band>
  );
}

export default async function GuidePage() {
  const [currentUser, content] = await Promise.all([getCurrentUser(), getGuidePageContent()]);
  if (!currentUser) redirect("/login");
  if (isPendingApplicant(currentUser)) redirect("/pending");
  const introHtml = sanitizeRichText(content.intro);

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/guide" currentUser={currentUser} />

      <main className="flex flex-1 flex-col">
        <QueryTabs
          param={CONTENT_TAB_PARAM}
          ariaLabel="대관 안내"
          tablistClassName="container-site pt-10"
          items={[
            { value: "book", label: "대관 안내", panel: <HowToBookPanel c={content} introHtml={introHtml} /> },
            { value: "process", label: "대관 절차", panel: <HowItWorksPanel c={content} /> },
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
