import type { VenueContent } from "@/lib/content/types";
import { KeyMapGallery } from "@/components/KeyMapGallery";

const RICH_TEXT_CLS =
  "[&_a]:text-accent [&_a]:underline [&_li]:mt-1 [&_p]:my-2 [&_p]:first:mt-0 [&_p]:last:mb-0 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-5";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border py-14 first-of-type:border-t-0 first-of-type:pt-10">
      <h2 className="text-[22px] font-semibold tracking-tight">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function ImagePlaceholder({ src, alt }: { src: string | null; alt: string }) {
  if (src) {
    return (
      <div className="aspect-video overflow-hidden rounded-sm border border-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div className="flex aspect-video items-center justify-center rounded-sm border border-dashed border-border bg-panel/60">
      <span className="text-[11.5px] text-muted">이미지 준비 중</span>
    </div>
  );
}

export function VenueContentView({ content }: { content: VenueContent }) {
  const {
    intro,
    overviewIntro,
    halls,
    features,
    specsIntro,
    specs,
    providedFacilities,
    arenaAmenities,
    mediumHallAmenities,
    keyMaps,
  } = content;

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-16 sm:px-8">
      <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-accent">THE VENUE</p>
      <h1 className="mt-3 text-[30px] font-semibold tracking-tight sm:text-[36px]">서울아레나 소개</h1>
      <div className={`mt-6 max-w-3xl text-[15px] leading-8 text-muted ${RICH_TEXT_CLS}`} dangerouslySetInnerHTML={{ __html: intro }} />

      <Section id="overview" title="시설 개요">
        <div className={`text-[13.5px] leading-7 text-muted ${RICH_TEXT_CLS}`} dangerouslySetInnerHTML={{ __html: overviewIntro }} />
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {halls.map((h) => (
            <div key={h.title}>
              <ImagePlaceholder src={null} alt={h.title} />
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-[11px] font-semibold text-border">{h.no}</span>
                <span className="text-[13.5px] font-semibold">{h.title}</span>
                <span className="text-[11px] text-muted">{h.titleEn}</span>
              </div>
              <div className="mt-1 text-[12.5px] font-semibold text-accent">{h.stat}</div>
              <p className="mt-2 text-[12.5px] leading-6 text-muted">{h.desc}</p>
            </div>
          ))}
        </div>
        <ul className="mt-8 grid grid-cols-1 divide-y divide-border/60 border-t border-border/60 sm:grid-cols-2 sm:gap-x-8 sm:divide-y-0 sm:border-t-0">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-3 py-3 text-[13.5px] text-foreground sm:border-b sm:border-border/60">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                <svg viewBox="0 0 20 20" fill="none" className="h-3 w-3">
                  <path d="M4 10.5L8 14.5L16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              {f}
            </li>
          ))}
        </ul>

        <KeyMapGallery keyMaps={keyMaps} />
      </Section>

      <Section id="specs" title="아레나 / 중형공연장 시설 제원">
        <div className={`text-[13.5px] leading-7 text-muted ${RICH_TEXT_CLS}`} dangerouslySetInnerHTML={{ __html: specsIntro }} />
        <div className="mt-6 grid grid-cols-1 gap-10 sm:grid-cols-2">
          {specs.map((s) => (
            <div key={s.name}>
              <ImagePlaceholder src={null} alt={s.name} />
              <div className="mt-3 text-[14px] font-semibold text-accent">{s.name}</div>
              <dl className="mt-3 divide-y divide-border/60">
                {s.rows.map(([k, v]) => (
                  <div key={k} className="flex flex-col gap-0.5 py-2.5 text-[13px] sm:flex-row sm:gap-4">
                    <dt className="shrink-0 text-muted sm:w-24">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <div className="text-[13px] font-semibold">주요 제공 시설</div>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12.5px] text-muted sm:grid-cols-3">
            {providedFacilities.map((f) => (
              <li key={f} className="flex gap-1.5">
                <span className="text-accent">·</span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 flex items-center justify-between border border-dashed border-border px-4 py-3 text-[12.5px] text-muted">
          <span>기술자료 (아레나·중형공연장 무대 장비/인프라 리스트)</span>
          <span className="rounded bg-panel-strong px-2 py-1 text-[11px] font-medium">자료 준비 중</span>
        </div>
      </Section>

      <Section id="amenities" title="부대 시설">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          <div>
            <div className="text-[13.5px] font-semibold text-accent">아레나 부대시설</div>
            <ul className="mt-3 divide-y divide-border/50">
              {arenaAmenities.map((f) => (
                <li key={f.name} className="py-2.5 text-[12.5px]">
                  <div className="font-semibold">{f.name}</div>
                  {f.desc && <div className="mt-0.5 text-muted">{f.desc}</div>}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-[13.5px] font-semibold text-accent">중형공연장 부대시설</div>
            <ul className="mt-3 divide-y divide-border/50">
              {mediumHallAmenities.map((f) => (
                <li key={f.name} className="py-2.5 text-[12.5px]">
                  <div className="font-semibold">{f.name}</div>
                  {f.desc && <div className="mt-0.5 text-muted">{f.desc}</div>}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-4 text-[12px] text-muted">※ 시설별 제공 범위는 공연 규모 및 계약 조건에 따라 달라질 수 있습니다.</p>
      </Section>
    </div>
  );
}
