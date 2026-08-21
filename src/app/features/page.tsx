import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { getFeaturesContent } from "@/lib/db";
import type { Pair, VenueFacilityContent } from "@/lib/content/pageContent";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { QueryTabs } from "@/components/ui/QueryTabs";
import { VENUE_TABS, VENUE_TAB_PARAM } from "@/components/ui/nav-items";
import {
  Band,
  FeatureList,
  LabeledList,
  PageHead,
  SectionHead,
  SpecTable,
} from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "시설 소개 | 서울아레나",
};

/** 개요 카드 4개 — 제목은 eyebrow, 내용은 H5 (Notion 지정) */
function OverviewCards({ items }: { items: Pair[] }) {
  return (
    <ul className="grid gap-x-[var(--gutter)] gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((c, i) => (
        <li key={`${c.label}-${i}`} className="border-t-2 border-border pt-5">
          <p className="text-xs font-bold text-muted">{c.label}</p>
          <p className="type-kr-heading mt-3 break-keep text-h5-m sm:text-h5">{c.value}</p>
        </li>
      ))}
    </ul>
  );
}

function VenuePanel({ en, ko, c }: { en: string; ko: string; c: VenueFacilityContent }) {
  return (
    <>
      <Band tone="light" size="lg">
        <PageHead en={en} ko={ko} />
        {c.overview.length > 0 && (
          <div className="mt-10">
            <OverviewCards items={c.overview} />
          </div>
        )}
      </Band>

      {c.capacity.length > 0 && (
        <Band tone="white">
          <SectionHead title="STAGE & CAPACITY" />
          <div className="mt-10 space-y-10">
            {c.capacity.map((cap, i) => (
              <div key={`${cap.stage}-${i}`}>
                {cap.stage && (
                  <h4 className="type-kr-heading text-h5-m sm:text-h5">{cap.stage}</h4>
                )}
                {(cap.seated || cap.standing) && (
                  <dl className="mt-5 flex flex-wrap gap-x-12 gap-y-3">
                    {cap.seated && (
                      <div>
                        <dt className="text-xs font-bold text-muted">SEATED</dt>
                        <dd className="type-display mt-1 text-h5-m tabular-nums sm:text-h5">
                          {cap.seated}
                        </dd>
                      </div>
                    )}
                    {cap.standing && (
                      <div>
                        <dt className="text-xs font-bold text-muted">STANDING</dt>
                        <dd className="type-display mt-1 text-h5-m tabular-nums sm:text-h5">
                          {cap.standing}
                        </dd>
                      </div>
                    )}
                  </dl>
                )}
                {cap.floors.length > 0 && (
                  <SpecTable
                    className="mt-8"
                    rows={cap.floors.map((f) => [f.label, f.value] as [string, string])}
                  />
                )}
              </div>
            ))}
          </div>
        </Band>
      )}

      {c.features.length > 0 && (
        <Band tone="dark">
          <SectionHead title="FEATURES" />
          <div className="mt-10">
            <FeatureList items={c.features} />
          </div>
        </Band>
      )}

      {c.facilities.length > 0 && (
        <Band tone="light">
          <SectionHead title="ADDITIONAL FACILITIES" />
          <div className="mt-10">
            <LabeledList
              items={c.facilities.map((f) => ({ label: f.label, desc: f.value || undefined }))}
            />
          </div>
        </Band>
      )}
    </>
  );
}

export default async function FeaturesPage() {
  // 시설 소개부터는 로그인한 대관사에게만 공개한다 (Notion 확정 정보구조).
  const [currentUser, content] = await Promise.all([getCurrentUser(), getFeaturesContent()]);
  if (!currentUser) redirect("/login");
  if (isPendingApplicant(currentUser)) redirect("/pending");

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/features" currentUser={currentUser} />

      <main className="flex flex-1 flex-col">
        <QueryTabs
          param={VENUE_TAB_PARAM}
          ariaLabel="공간 선택"
          items={VENUE_TABS.map((t) => ({
            value: t.value,
            label: t.label,
            panel:
              t.value === "arena" ? (
                <VenuePanel en="ARENA" ko="아레나" c={content.arena} />
              ) : (
                <VenuePanel en="LIVE HALL" ko="중형공연장" c={content.liveHall} />
              ),
          }))}
        />

      </main>

      <SiteFooter />
    </div>
  );
}
