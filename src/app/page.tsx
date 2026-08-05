import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getHomeContent } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import {
  ArrowRight,
  Band,
  ButtonLink,
  Label,
  Media,
  Multiline,
  btnClass,
} from "@/components/ui/kit";

export default async function Home() {
  const user = await getCurrentUser();
  const {
    heroImage,
    heroEyebrow,
    heroTitle,
    heroSubDisplay,
    heroSubtitle,
    heroPrimaryLabel,
    heroPrimaryHref,
    heroSecondaryLabel,
    heroSecondaryHref,
    narrativeLabel,
    narrativeTitle,
    narrativeLead,
    narrativeStatements,
    narrativeClosing,
    processLabel,
    processTitle,
    processSteps,
  } = getHomeContent();

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/" currentUser={user} />

      <main className="flex flex-1 flex-col">
        {/* ── 히어로 ────────────────────────────────────────────────────────
            Expressive 그라디언트는 브랜드 가이드 2.4 Key visual 기준상
            "한 캠페인 안에서는 하나의 컨셉"이므로 사이트 전체에서 진입부 1회만. */}
        <section className="grain relative overflow-hidden bg-expressive">
          <span className="grain-layer" />
          <div className="container-site relative pt-20 pb-16 sm:pt-28 sm:pb-24 lg:pt-32 lg:pb-28">
            <div className="flex animate-[fade-up_0.7s_ease_both] items-center gap-3">
              <span className="h-px w-10 bg-foreground" />
              <Label className="text-foreground">{heroEyebrow}</Label>
            </div>

            <h1 className="type-display mt-8 max-w-4xl animate-[fade-up_0.7s_ease_both] text-d2-m [animation-delay:80ms] sm:text-h1 lg:text-d2">
              <Multiline text={heroTitle} />
            </h1>

            <p className="type-label mt-6 max-w-2xl animate-[fade-up_0.7s_ease_both] text-s text-muted-strong [animation-delay:140ms]">
              {heroSubDisplay}
            </p>

            <p className="type-kr-heading mt-10 max-w-2xl animate-[fade-up_0.7s_ease_both] text-h4-m [animation-delay:200ms] sm:text-h4">
              <Multiline text={heroSubtitle} />
            </p>

            <div className="mt-12 flex animate-[fade-up_0.7s_ease_both] flex-col items-stretch gap-3 [animation-delay:260ms] sm:flex-row sm:items-center sm:gap-4">
              <ButtonLink href={heroPrimaryHref} variant="primary" size="lg">
                {heroPrimaryLabel}
                <ArrowRight />
              </ButtonLink>
              <ButtonLink href={heroSecondaryHref} variant="outline" size="lg">
                {heroSecondaryLabel}
              </ButtonLink>
            </div>
          </div>

          {heroImage && (
            <div className="container-site relative pb-20">
              <Media src={heroImage} alt="서울아레나" ratio="21 / 9" />
            </div>
          )}
        </section>

        {/* ── 브랜드 내러티브 ──────────────────────────────────────────────
            카카오 브랜드 가이드라인 3.4 브랜드 선언문 BUSINESS › HOST IT.
            기존 MISSION / VISION / STRATEGY(MVC) 구조를 대체한다. */}
        <Band tone="dark" size="lg">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-20">
            <div>
              <Label className="text-inverse-muted">{narrativeLabel}</Label>
              <h2 className="type-kr-heading mt-5 text-h2-m sm:text-h2">
                <Multiline text={narrativeTitle} />
              </h2>
            </div>
            <p className="text-l text-inverse-fg/85 lg:pt-16">{narrativeLead}</p>
          </div>

          <ul className="mt-16 border-t border-inverse-fg/25">
            {narrativeStatements.map((s, i) => (
              <li key={s.title} className="border-b border-inverse-fg/25">
                <Link
                  href={s.href}
                  className="group grid gap-4 py-8 transition-colors hover:bg-inverse-fg/[0.06] sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:items-start sm:gap-8 sm:px-2"
                >
                  <span className="type-display text-h5 tabular-nums text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <h3 className="type-kr-heading text-h5-m sm:text-h5">{s.title}</h3>
                    <p className="mt-3 max-w-2xl text-m text-inverse-fg/80">{s.desc}</p>
                  </div>
                  <span className="type-label inline-flex shrink-0 items-center gap-2 text-xs text-inverse-muted transition-colors group-hover:text-accent sm:pt-2">
                    {s.linkLabel}
                    <ArrowRight className="transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <p className="type-display mt-16 text-h4-m text-accent sm:text-h3">{narrativeClosing}</p>
        </Band>

        {/* ── 신청 절차 ───────────────────────────────────────────────────── */}
        <Band tone="light">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:gap-16">
            <div>
              <Label className="mb-4 text-muted">{processLabel}</Label>
              <h2 className="type-kr-heading text-h3-m sm:text-h3">{processTitle}</h2>
            </div>
            <p className="text-m text-muted lg:pt-14">
              예상 관객 규모를 입력하면 적합한 패키지가 추천되고, 추가 옵션을 반영한 예상 대관료를
              바로 확인할 수 있습니다. 신청서 제출부터 심사 결과 안내까지 한곳에서 진행됩니다.
            </p>
          </div>

          <ol className="mt-14 border-t border-border/25">
            {processSteps.map((s) => (
              <li
                key={s.no}
                className="grid gap-2 border-b border-border/25 py-7 sm:grid-cols-[4rem_minmax(0,20rem)_minmax(0,1fr)] sm:items-baseline sm:gap-8"
              >
                <span className="type-display text-h5 tabular-nums text-muted">{s.no}</span>
                <h3 className="type-kr-heading text-h6-m sm:text-h6">{s.title}</h3>
                <p className="text-s text-muted">{s.desc}</p>
              </li>
            ))}
          </ol>

          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href="/guide#process" variant="outline">
              대관 절차 자세히
            </ButtonLink>
            <ButtonLink href="/packages" variant="outline">
              대관 패키지 보기
            </ButtonLink>
          </div>
        </Band>

        {/* ── 전환 CTA (옐로 밴드 · 옐로 위 텍스트는 항상 검정) ───────────── */}
        <Band tone="accent" size="md">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Label>Host It</Label>
              <h2 className="type-kr-heading mt-4 text-h3-m sm:text-h3">
                당신의 무대를 지금 설계하세요.
              </h2>
              <p className="mt-4 max-w-xl text-m">
                대관 규모와 일정을 입력하면 예상 대관료를 즉시 확인할 수 있습니다.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Link href="/apply" className={btnClass("outline", "lg")}>
                대관 신청하기
                <ArrowRight />
              </Link>
              <Link href="/faq" className={btnClass("ghost", "lg")}>
                대관 문의
              </Link>
            </div>
          </div>
        </Band>
      </main>

      <SiteFooter />
    </div>
  );
}
