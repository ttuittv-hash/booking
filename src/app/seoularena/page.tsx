import type { Metadata } from "next";
import { getCurrentUser, requireAccess } from "@/lib/auth";
import { getSeoulArenaContent } from "@/lib/db";
import { sanitizeRichText } from "@/lib/sanitizeHtml";
import type { SeoulArenaContent } from "@/lib/content/pageContent";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { QueryTabs } from "@/components/ui/QueryTabs";
import { CONTENT_TAB_PARAM } from "@/components/ui/nav-items";
import {
  Band,
  FeatureList,
  PageHead,
  PhotoHero,
  RichText,
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
 * 문구·사진·항목은 모두 콘텐츠 관리에서 편집한다.
 */

function AboutPanel({ c, introHtml }: { c: SeoulArenaContent; introHtml: string }) {
  return (
    <>
      <Band tone="light" size="lg">
        <PageHead
          en="ABOUT SEOUL ARENA"
          ko="시설 개요"
          lead={<RichText html={introHtml} />}
        />
      </Band>

      {c.heroes.map((v, i) => (
        <PhotoHero
          key={`${v.title}-${i}`}
          title={v.title}
          eyebrow={v.eyebrow}
          desc={v.desc}
          image={v.image}
        />
      ))}

      {c.complexFeatures.length > 0 && (
        <Band tone="light">
          <SectionHead title="FEATURES" lead={c.complexFeaturesLead} />
          <div className="mt-10">
            <FeatureList items={c.complexFeatures.map((t) => ({ title: t, lines: [] }))} numbered />
          </div>
        </Band>
      )}
    </>
  );
}

function WhyPanel({ c, whyHtml }: { c: SeoulArenaContent; whyHtml: string }) {
  return (
    <>
      <Band tone="light" size="lg">
        <PageHead
          en="WHY SEOUL ARENA"
          ko="시설 특징"
          lead={<RichText html={whyHtml} />}
        />
      </Band>

      {c.stageFeatures.length > 0 && (
        <Band tone="dark">
          <SectionHead title="FEATURES" />
          <div className="mt-10">
            <FeatureList items={c.stageFeatures} />
          </div>
        </Band>
      )}
    </>
  );
}

export default async function SeoulArenaPage() {
  // 기획서 A15 접근권한 매트릭스 — 규칙은 accessPolicy.ts 한 곳에만 둔다
  await requireAccess("/seoularena");
  const [currentUser, content] = await Promise.all([getCurrentUser(), getSeoulArenaContent()]);

  const introHtml = sanitizeRichText(content.aboutLead);
  const whyHtml = sanitizeRichText(content.whyLead);

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/seoularena" currentUser={currentUser} />

      <main className="flex flex-1 flex-col">
        <QueryTabs
          param={CONTENT_TAB_PARAM}
          ariaLabel="서울아레나 소개"
          items={[
            { value: "about", label: "시설개요", panel: <AboutPanel c={content} introHtml={introHtml} /> },
            { value: "features", label: "시설 특징", panel: <WhyPanel c={content} whyHtml={whyHtml} /> },
          ]}
        />

      </main>

      <SiteFooter />
    </div>
  );
}
