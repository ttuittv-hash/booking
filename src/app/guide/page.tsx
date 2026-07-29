import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { getGuideContent } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";

export const metadata: Metadata = {
  title: "대관 안내 | 서울아레나",
};

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border py-14 first-of-type:border-t-0 first-of-type:pt-0">
      <h2 className="text-[22px] font-semibold tracking-tight">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default async function GuidePage() {
  const currentUser = await getCurrentUser();
  if (currentUser && isPendingApplicant(currentUser)) redirect("/pending");

  const {
    intro,
    steps: STEPS,
    notices: NOTICES,
    packageIntro,
    packageBullets,
    rulesIntro,
  } = getGuideContent();

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/guide" currentUser={currentUser} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-16 sm:px-8">
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-accent">
          STAGE
        </p>
        <h1 className="mt-3 text-[30px] font-semibold tracking-tight sm:text-[36px]">
          대관 안내
        </h1>
        <p className="mt-6 max-w-3xl text-[15px] leading-8 text-muted">{intro}</p>

        <Section id="process" title="대관 절차">
          <div className="space-y-3">
            {STEPS.map((s) => (
              <div key={s.no} className="flex gap-4 border border-border bg-panel/60 p-5">
                <div className="w-10 shrink-0 text-[15px] font-semibold text-accent">{s.no}</div>
                <div>
                  <div className="text-[13.5px] font-semibold">{s.title}</div>
                  <p className="mt-1.5 text-[12.5px] leading-6 text-muted">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 border-l-2 border-border bg-panel/60 px-4 py-3.5">
            <div className="text-[12.5px] font-medium">유의사항</div>
            <ul className="mt-2 space-y-1 text-[12px] leading-5 text-muted">
              {NOTICES.map((n) => (
                <li key={n} className="flex gap-1.5">
                  <span className="text-accent">·</span>
                  {n}
                </li>
              ))}
            </ul>
          </div>
        </Section>

        <Section id="rates" title="대관 패키지 구성">
          <p className="text-[13.5px] leading-7 text-muted">{packageIntro}</p>
          <ul className="mt-4 space-y-1.5 text-[13px] text-muted">
            {packageBullets.map((b) => (
              <li key={b} className="flex gap-1.5">
                <span className="text-accent">·</span>
                {b}
              </li>
            ))}
          </ul>
          <Link
            href="/apply"
            className="mt-5 inline-flex items-center gap-1 rounded bg-accent px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            패키지 구성 확인하기
            <span aria-hidden>›</span>
          </Link>
        </Section>

        <Section id="rules" title="대관 규약">
          <p className="text-[13.5px] leading-7 text-muted">{rulesIntro}</p>
          <div className="mt-4 flex items-center justify-between border border-dashed border-border px-4 py-3 text-[12.5px] text-muted">
            <span>서울아레나 대관규약 전문</span>
            <span className="rounded bg-panel-strong px-2 py-1 text-[11px] font-medium">
              자료 준비 중
            </span>
          </div>
        </Section>

      </main>
    </div>
  );
}
