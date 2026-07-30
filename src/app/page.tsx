import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getHomeContent } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";

export default async function Home() {
  const user = await getCurrentUser();
  const {
    heroImage,
    heroEyebrow,
    heroTitle,
    heroSubtitle,
    heroPrimaryLabel,
    heroPrimaryHref,
    heroSecondaryLabel,
    heroSecondaryHref,
    missionLabel,
    mission,
    visionLabel,
    vision,
    featuresLabel,
    featuresTitle,
    features,
    processLabel,
    processTitle,
    processSteps,
  } = getHomeContent();

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/" currentUser={user} />

      <main className="flex flex-1 flex-col">
        {/* 슬롯 1: 카피 + 버튼 + 이미지 */}
        <section className="px-6 pt-20 pb-16 text-center sm:pt-28 sm:pb-20">
          <div className="flex animate-[fade-up_0.7s_ease_both] items-center justify-center gap-3">
            <span className="h-px w-8 bg-accent" />
            <span className="text-[13px] font-semibold uppercase tracking-[0.12em] text-accent">{heroEyebrow}</span>
            <span className="h-px w-8 bg-accent" />
          </div>

          <h1 className="mx-auto mt-7 max-w-2xl animate-[fade-up_0.7s_ease_both] text-4xl font-semibold tracking-tight text-foreground [animation-delay:80ms] sm:text-5xl">
            {heroTitle.split("\n").map((line, i) => (
              <span key={i}>
                {i > 0 && <br />}
                {line}
              </span>
            ))}
          </h1>

          <p className="mx-auto mt-7 max-w-2xl animate-[fade-up_0.7s_ease_both] text-[15px] leading-8 text-muted [animation-delay:160ms] sm:max-w-4xl sm:text-[17px]">
            {heroSubtitle.split("\n").map((line, i) => (
              <span key={i}>
                {i > 0 && <br />}
                {line}
              </span>
            ))}
          </p>

          <div
            className="mt-10 flex animate-[fade-up_0.7s_ease_both] flex-col items-center justify-center gap-4 [animation-delay:240ms] sm:flex-row sm:gap-7"
          >
            <Link
              href={heroPrimaryHref}
              className="whitespace-nowrap rounded-sm bg-accent px-9 py-3.5 text-[15px] font-semibold uppercase tracking-[0.06em] text-white shadow-[0_8px_24px_-8px_rgba(0,113,227,0.55)] transition-colors hover:bg-accent-hover"
            >
              {heroPrimaryLabel}
            </Link>
            <Link
              href={heroSecondaryHref}
              className="group inline-flex items-center gap-1.5 whitespace-nowrap text-[14px] font-semibold uppercase tracking-[0.06em] text-foreground transition-colors hover:text-accent"
            >
              {heroSecondaryLabel}
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                fill="none"
                className="h-3 w-3 shrink-0 transition-transform group-hover:translate-x-1"
              >
                <path
                  d="M5.5 3L10.5 8L5.5 13"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>

          {heroImage && (
            <div className="mx-auto mt-16 max-w-5xl animate-[fade-up_0.7s_ease_both] [animation-delay:320ms]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroImage}
                alt="서울아레나"
                className="aspect-video w-full rounded-lg border border-border object-cover shadow-[0_24px_48px_-24px_rgba(0,0,0,0.25)]"
              />
            </div>
          )}
        </section>

        {/* 미션 / 비전 */}
        <section className="border-t border-border/70 px-6 py-16 sm:py-20">
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-14 lg:grid-cols-[1fr_1px_1fr]">
            <div className="group">
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-accent">{missionLabel}</p>
              <p className="mt-5 text-[17px] font-semibold leading-8 text-foreground transition-colors group-hover:text-accent">
                {mission.split("\n").map((line, i) => (
                  <span key={i}>
                    {i > 0 && <br />}
                    {line}
                  </span>
                ))}
              </p>
            </div>
            <div className="hidden bg-border/70 lg:block" aria-hidden />
            <div className="group">
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-accent">{visionLabel}</p>
              <p className="mt-5 text-[17px] font-semibold leading-8 text-foreground transition-colors group-hover:text-accent">
                {vision.split("\n").map((line, i) => (
                  <span key={i}>
                    {i > 0 && <br />}
                    {line}
                  </span>
                ))}
              </p>
            </div>
          </div>
        </section>

        {/* 슬롯 2: 특징 버튼 */}
        <section className="border-t border-border/70 px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-accent">{featuresLabel}</p>
            <h2 className="mt-2 text-[22px] font-semibold tracking-tight sm:text-[26px]">{featuresTitle}</h2>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 sm:gap-x-12">
              {features.map((f) => (
                <Link
                  key={f.title}
                  href={f.href}
                  className="group flex items-start justify-between gap-4 border-b border-border/70 py-6 text-left"
                >
                  <div className="flex items-start gap-4">
                    {f.image && (
                      <div className="mt-0.5 h-14 w-20 shrink-0 overflow-hidden rounded-sm border border-border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={f.image} alt={f.title} className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div>
                      <div className="text-[15px] font-semibold text-foreground transition-colors group-hover:text-accent">
                        {f.title}
                      </div>
                      <p className="mt-1.5 max-w-sm text-[13px] leading-6 text-muted">{f.desc}</p>
                    </div>
                  </div>
                  <svg
                    aria-hidden
                    viewBox="0 0 16 16"
                    fill="none"
                    className="mt-1.5 h-3 w-3 shrink-0 text-muted transition-all group-hover:translate-x-1 group-hover:text-accent"
                  >
                    <path
                      d="M5.5 3L10.5 8L5.5 13"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* 슬롯 3: 신청 절차 */}
        <section className="border-t border-border/70 px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-accent">
              {processLabel}
            </p>
            <h2 className="mt-2 text-[22px] font-semibold tracking-tight sm:text-[26px]">
              {processTitle}
            </h2>

            <div className="mt-10 grid grid-cols-1 gap-4 text-left sm:grid-cols-3">
              {processSteps.map((s) => (
                <div
                  key={s.no}
                  className="group rounded border border-border bg-background p-5 transition-all hover:-translate-y-1 hover:border-accent hover:shadow-[0_16px_32px_-20px_rgba(0,0,0,0.25)]"
                >
                  <div className="text-[22px] font-semibold tabular-nums text-border transition-colors group-hover:text-accent">
                    {s.no}
                  </div>
                  <div className="mt-2 text-[15px] font-semibold">{s.title}</div>
                  <p className="mt-1.5 text-[13px] leading-6 text-muted">{s.desc}</p>
                </div>
              ))}
              <Link
                href={heroPrimaryHref}
                className="group flex flex-col items-start justify-center rounded border border-accent bg-accent-soft p-5 transition-all hover:-translate-y-1 hover:shadow-[0_16px_32px_-20px_rgba(0,0,0,0.25)]"
              >
                <span className="text-[15px] font-semibold text-accent">대관 신청하기</span>
                <span className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-accent">
                  지금 바로 신청서를 작성해 보세요
                  <svg
                    aria-hidden
                    viewBox="0 0 16 16"
                    fill="none"
                    className="h-3 w-3 shrink-0 transition-transform group-hover:translate-x-1"
                  >
                    <path
                      d="M5.5 3L10.5 8L5.5 13"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/70 px-6 py-8 text-center text-[12px] text-muted">
        © 서울아레나. 모든 금액은 부가세 별도이며, 표시 금액은 확정 전
        예상치입니다.
      </footer>
    </div>
  );
}
