import { getCurrentUser } from "@/lib/auth";
import { getHomeContent } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";
import { Manifesto } from "@/components/home/Manifesto";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { ArrowRight, Band, ButtonLink, CTABand, Media, Multiline } from "@/components/ui/kit";

/* ============================================================================
   홈 — Notion 「콘텐츠 전문 · 홈」

     히어로 (디스플레이 H1 + 국문 리드 + 대관 신청)
     → 블랙 지면 선언문 (디스플레이 H1 + 리드 + 진술 4개)
     → 옐로 CTA
   ========================================================================= */

export default async function Home() {
  const [user, content] = await Promise.all([getCurrentUser(), getHomeContent()]);

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/" currentUser={user} />

      <main className="flex flex-1 flex-col">
        {/* ── 히어로 ─────────────────────────────────────────────────────── */}
        <Band tone="light" size="lg">
          <h1 className="type-display max-w-4xl animate-[fade-up_0.7s_ease_both] text-d2-m lg:text-d2">
            <Multiline text={content.heroTitle} />
          </h1>

          <p className="type-kr-heading mt-6 max-w-2xl animate-[fade-up_0.7s_ease_both] break-keep text-h5-m [animation-delay:120ms] sm:text-h5">
            <Multiline text={content.heroSubtitle} />
          </p>

          <div className="mt-8 flex animate-[fade-up_0.7s_ease_both] flex-col items-stretch gap-3 [animation-delay:200ms] sm:flex-row sm:items-center">
            <ButtonLink href={content.heroPrimaryHref} variant="primary">
              {content.heroPrimaryLabel}
              <ArrowRight />
            </ButtonLink>
            <ButtonLink href={content.heroSecondaryHref} variant="secondary">
              {content.heroSecondaryLabel}
            </ButtonLink>
          </div>

          <div className="mt-10">
            <Media src={content.heroImage} alt="서울아레나" ratio="21 / 9" />
          </div>
        </Band>

        {/* ── 브랜드 선언문 — 옐로 강조를 쓰기 위해 블랙 지면 위에 둔다 ──── */}
        <Band tone="dark" size="lg">
          <Manifesto
            title={content.narrativeTitle}
            lead={content.narrativeLead}
            statements={content.narrativeStatements}
          />
        </Band>

        {/* ── 전환 CTA ───────────────────────────────────────────────────── */}
        <CTABand
          title="당신의 무대를 지금 설계하세요."
          lead="대관 안내와 절차를 먼저 확인해 보세요."
          actions={
            <ButtonLink href="/guide" variant="primary">
              대관 안내
              <ArrowRight />
            </ButtonLink>
          }
        />
      </main>

      <SiteFooter />
    </div>
  );
}
