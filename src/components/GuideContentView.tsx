import Link from "next/link";
import type { GuideContent } from "@/lib/content/types";

const RICH_TEXT_CLS =
  "[&_a]:text-accent [&_a]:underline [&_li]:mt-1 [&_p]:my-2 [&_p]:first:mt-0 [&_p]:last:mb-0 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-5";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border py-14 first-of-type:border-t-0 first-of-type:pt-0">
      <h2 className="text-[22px] font-semibold tracking-tight">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function GuideContentView({ content, disableLinks }: { content: GuideContent; disableLinks?: boolean }) {
  const { intro, steps, notices, packageIntro, packageBullets, rulesIntro } = content;

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-16 sm:px-8">
      <div id="overview" className="scroll-mt-24">
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-accent">STAGE</p>
        <h1 className="mt-3 text-[30px] font-semibold tracking-tight sm:text-[36px]">대관 안내</h1>
        <div className={`mt-6 max-w-3xl text-[15px] leading-8 text-muted ${RICH_TEXT_CLS}`} dangerouslySetInnerHTML={{ __html: intro }} />
      </div>

      <Section id="process" title="대관 절차">
        <div className="space-y-3">
          {steps.map((s) => (
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
            {notices.map((n) => (
              <li key={n} className="flex gap-1.5">
                <span className="text-accent">·</span>
                {n}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section id="rates" title="대관 패키지 구성">
        <div className={`text-[13.5px] leading-7 text-muted ${RICH_TEXT_CLS}`} dangerouslySetInnerHTML={{ __html: packageIntro }} />
        <ul className="mt-4 space-y-1.5 text-[13px] text-muted">
          {packageBullets.map((b) => (
            <li key={b} className="flex gap-1.5">
              <span className="text-accent">·</span>
              {b}
            </li>
          ))}
        </ul>
        {disableLinks ? (
          <span className="mt-5 inline-flex items-center gap-1 rounded bg-accent px-6 py-3 text-[14px] font-semibold text-white opacity-70">
            패키지 구성 확인하기
            <span aria-hidden>›</span>
          </span>
        ) : (
          <Link
            href="/packages"
            className="mt-5 inline-flex items-center gap-1 rounded bg-accent px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            패키지 구성 확인하기
            <span aria-hidden>›</span>
          </Link>
        )}
      </Section>

      <Section id="rules" title="대관 규약">
        <div className={`text-[13.5px] leading-7 text-muted ${RICH_TEXT_CLS}`} dangerouslySetInnerHTML={{ __html: rulesIntro }} />
        <div className="mt-4 flex items-center justify-between border border-dashed border-border px-4 py-3 text-[12.5px] text-muted">
          <span>서울아레나 대관규약 전문</span>
          <span className="rounded bg-panel-strong px-2 py-1 text-[11px] font-medium">자료 준비 중</span>
        </div>
      </Section>
    </div>
  );
}
