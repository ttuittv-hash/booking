import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { getVenueContent } from "@/lib/db";
import { sanitizeRichText } from "@/lib/sanitizeHtml";
import {
  COMPLEX_FEATURES,
  COMPLEX_FEATURES_LEAD,
  STAGE_FEATURES,
  VENUE_HEROES,
  WHY_LEAD,
} from "@/lib/content/venueFacts";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { QueryTabs } from "@/components/ui/QueryTabs";
import { CONTENT_TAB_PARAM } from "@/components/ui/nav-items";
import {
  ArrowRight,
  Band,
  ButtonLink,
  CTABand,
  FeatureList,
  PageHead,
  PhotoHero,
  SectionHead,
} from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "서울아레나 | 서울아레나",
};

/**
 * YOUR STAGE › 서울아레나 — 탭: 시설개요 / 시설 특징.
 *
 * 헤딩 위계는 Notion 구조를 따른다 — H1 영문 슬로건, H3 국문 제목, H5 항목.
 * 공간 소개 두 블록은 Figma `02 공간 안내 › Header / 5` 의 전면 사진 섹션이므로
 * 탭 바만 마진 안에 두고 패널은 풀블리드로 흐르게 한다.
 */

function AboutPanel({ introHtml }: { introHtml: string }) {
  return (
    <>
      <Band tone="light" size="lg">
        <PageHead
          en="ABOUT SEOUL ARENA"
          ko="시설 개요"
          lead={<div dangerouslySetInnerHTML={{ __html: introHtml }} />}
        />
      </Band>

      {VENUE_HEROES.map((v) => (
        <PhotoHero key={v.title} title={v.title} eyebrow={v.eyebrow} desc={v.desc} />
      ))}

      <Band tone="light">
        <SectionHead title="FEATURES" lead={COMPLEX_FEATURES_LEAD} />
        <div className="mt-12">
          <FeatureList items={COMPLEX_FEATURES} numbered />
        </div>
      </Band>
    </>
  );
}

function WhyPanel() {
  return (
    <>
      <Band tone="light" size="lg">
        <PageHead en="WHY SEOUL ARENA" ko="시설 특징" lead={WHY_LEAD} />
      </Band>

      <Band tone="dark">
        <SectionHead title="FEATURES" />
        <div className="mt-12">
          <FeatureList items={STAGE_FEATURES} />
        </div>
      </Band>
    </>
  );
}

export default async function SeoulArenaPage() {
  const [currentUser, venueContent] = await Promise.all([getCurrentUser(), getVenueContent()]);
  if (currentUser && isPendingApplicant(currentUser)) redirect("/pending");
  const introHtml = sanitizeRichText(venueContent.intro);

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/seoularena" currentUser={currentUser} />

      <main className="flex flex-1 flex-col">
        <QueryTabs
          param={CONTENT_TAB_PARAM}
          ariaLabel="서울아레나 소개"
          tablistClassName="container-site pt-10"
          items={[
            { value: "about", label: "시설개요", panel: <AboutPanel introHtml={introHtml} /> },
            { value: "features", label: "시설 특징", panel: <WhyPanel /> },
          ]}
        />

        <CTABand
          title="공연 규모와 일정이 정해지셨다면 시설 소개에서 제원을 확인하세요."
          actions={
            <>
              <ButtonLink href="/features" variant="primary">
                시설 소개 보기
                <ArrowRight />
              </ButtonLink>
              <ButtonLink href="/guide" variant="secondary">
                대관 안내
              </ButtonLink>
            </>
          }
        />
      </main>

      <SiteFooter />
    </div>
  );
}
