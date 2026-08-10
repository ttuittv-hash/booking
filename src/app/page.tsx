import { getCurrentUser } from "@/lib/auth";
import { getHomeContent } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";
import { Manifesto } from "@/components/home/Manifesto";
import { SiteFooter } from "@/components/ui/SiteFooter";
import {
  ArrowRight,
  Band,
  ButtonLink,
  CTABand,
  LayoutTextColumns,
  Media,
  Multiline,
} from "@/components/ui/kit";

export default async function Home() {
  const user = await getCurrentUser();
  const {
    heroImage,
    heroTitle,
    heroSubtitle,
    heroPrimaryLabel,
    heroPrimaryHref,
    heroSecondaryLabel,
    heroSecondaryHref,
    narrativeTitle,
    narrativeLead,
    narrativeStatements,
    processTitle,
    processSteps,
  } = getHomeContent();

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/" currentUser={user} />

      <main className="flex flex-1 flex-col">
        {/* ── 히어로 ─────────────────────────────────────────────────────── */}
        <Band tone="light" size="lg">
          <h1 className="type-display max-w-4xl animate-[fade-up_0.7s_ease_both] text-d2-m sm:text-h1 lg:text-d2">
            <Multiline text={heroTitle} />
          </h1>

          <p className="type-kr-heading mt-10 max-w-2xl animate-[fade-up_0.7s_ease_both] text-h4-m [animation-delay:120ms] sm:text-h4">
            <Multiline text={heroSubtitle} />
          </p>

          <div className="mt-12 flex animate-[fade-up_0.7s_ease_both] flex-col items-stretch gap-3 [animation-delay:200ms] sm:flex-row sm:items-center">
            <ButtonLink href={heroPrimaryHref} variant="primary">
              {heroPrimaryLabel}
              <ArrowRight />
            </ButtonLink>
            <ButtonLink href={heroSecondaryHref} variant="secondary">
              {heroSecondaryLabel}
            </ButtonLink>
          </div>

          <div className="mt-16">
            <Media src={heroImage} alt="서울아레나" ratio="21 / 9" />
          </div>
        </Band>

        {/* ── 브랜드 선언문 ───────────────────────────────────────────────
            옐로 강조를 쓰기 위해 반드시 블랙 지면 위에 둔다. */}
        <Band tone="dark" size="lg">
          <Manifesto
            title={narrativeTitle}
            lead={narrativeLead}
            statements={narrativeStatements}
          />
        </Band>

        {/* ── 신청 절차 (Figma Layout / 4) ───────────────────────────────── */}
        <Band tone="light">
          <div className="max-w-3xl">
            <h2 className="type-kr-heading text-h3-m sm:text-h3">{processTitle}</h2>
            <p className="mt-6 text-m text-muted">
              예상 관객 규모를 입력하면 적합한 패키지가 추천되고, 추가 옵션을 반영한 예상 대관료를
              바로 확인할 수 있습니다. 신청서 제출부터 심사 결과 안내까지 한곳에서 진행됩니다.
            </p>
          </div>

          <div className="mt-14">
            <LayoutTextColumns
              columns={3}
              items={processSteps.map((s) => ({
                title: `${s.no}. ${s.title}`,
                desc: s.desc,
              }))}
            />
          </div>

          <div className="mt-12 flex flex-wrap gap-3">
            <ButtonLink href="/guide" variant="primary">
              대관 안내
            </ButtonLink>
            <ButtonLink href="/packages" variant="secondary">
              대관 패키지
            </ButtonLink>
          </div>
        </Band>

        {/* ── 전환 CTA (Figma CTA / 1) ───────────────────────────────────── */}
        <CTABand
          title="당신의 무대를 지금 설계하세요."
          lead="대관 규모와 일정을 입력하면 예상 대관료를 즉시 확인할 수 있습니다."
          actions={
            <>
              <ButtonLink href="/apply?new=1" variant="primary">
                대관 신청하기
                <ArrowRight />
              </ButtonLink>
              <ButtonLink href="/faq" variant="secondary">
                FAQ
              </ButtonLink>
            </>
          }
        />
      </main>

      <SiteFooter />
    </div>
  );
}
