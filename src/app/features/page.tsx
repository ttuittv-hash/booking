import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import {
  ARENA_CAPACITY,
  ARENA_FACILITIES,
  ARENA_OVERVIEW,
  LIVE_HALL_CAPACITY,
  LIVE_HALL_FACILITIES,
  LIVE_HALL_OVERVIEW,
  STAGE_FEATURES,
  type OverviewCard,
} from "@/lib/content/venueFacts";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { QueryTabs } from "@/components/ui/QueryTabs";
import { VENUE_TABS, VENUE_TAB_PARAM } from "@/components/ui/nav-items";
import {
  ArrowRight,
  Band,
  ButtonLink,
  CTABand,
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
function OverviewCards({ items }: { items: OverviewCard[] }) {
  return (
    <ul className="grid gap-x-[var(--gutter)] gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((c) => (
        <li key={c.label} className="border-t-2 border-border pt-5">
          <p className="text-xs font-bold text-muted">{c.label}</p>
          <p className="type-kr-heading mt-3 break-keep text-h5-m sm:text-h5">{c.value}</p>
        </li>
      ))}
    </ul>
  );
}

function ArenaPanel() {
  return (
    <>
      <Band tone="light" size="lg">
        <PageHead en="ARENA" ko="아레나" />
        <div className="mt-14">
          <OverviewCards items={ARENA_OVERVIEW} />
        </div>
      </Band>

      <Band tone="white">
        <SectionHead title="STAGE & CAPACITY" />
        <div className="mt-14 space-y-16">
          {ARENA_CAPACITY.map((c) => (
            <div key={c.stage}>
              <h4 className="type-kr-heading text-h5-m sm:text-h5">{c.stage}</h4>
              <dl className="mt-5 flex flex-wrap gap-x-12 gap-y-3">
                <div>
                  <dt className="text-xs font-bold text-muted">SEATED</dt>
                  <dd className="type-display mt-1 text-h5-m tabular-nums sm:text-h5">{c.seated}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-muted">STANDING</dt>
                  <dd className="type-display mt-1 text-h5-m tabular-nums sm:text-h5">
                    {c.standing}
                  </dd>
                </div>
              </dl>
              <SpecTable className="mt-8" rows={c.floors} />
            </div>
          ))}
        </div>
      </Band>

      <Band tone="dark">
        <SectionHead title="FEATURES" />
        <div className="mt-12">
          <FeatureList items={STAGE_FEATURES} />
        </div>
      </Band>

      <Band tone="light">
        <SectionHead title="ADDITIONAL FACILITIES" />
        <div className="mt-12">
          <LabeledList items={ARENA_FACILITIES} />
        </div>
      </Band>
    </>
  );
}

function LiveHallPanel() {
  return (
    <>
      <Band tone="light" size="lg">
        <PageHead en="LIVE HALL" ko="중형공연장" />
        <div className="mt-14">
          <OverviewCards items={LIVE_HALL_OVERVIEW} />
        </div>
      </Band>

      <Band tone="white">
        <SectionHead title="STAGE & CAPACITY" />
        <div className="mt-14">
          <h4 className="type-kr-heading text-h5-m sm:text-h5">객석</h4>
          <SpecTable className="mt-5" rows={LIVE_HALL_CAPACITY} />
        </div>
      </Band>

      <Band tone="light">
        <SectionHead title="ADDITIONAL FACILITIES" />
        <div className="mt-12">
          <LabeledList items={LIVE_HALL_FACILITIES} />
        </div>
      </Band>
    </>
  );
}

export default async function FeaturesPage() {
  // 시설 소개부터는 로그인한 대관사에게만 공개한다 (Notion 확정 정보구조).
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  if (isPendingApplicant(currentUser)) redirect("/pending");

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/features" currentUser={currentUser} />

      <main className="flex flex-1 flex-col">
        <QueryTabs
          param={VENUE_TAB_PARAM}
          ariaLabel="공간 선택"
          tablistClassName="container-site pt-10"
          items={VENUE_TABS.map((t) => ({
            value: t.value,
            label: t.label,
            panel: t.value === "arena" ? <ArenaPanel /> : <LiveHallPanel />,
          }))}
        />

        <CTABand
          title="요금 체계와 포함 범위는 대관료에서 확인하세요."
          actions={
            <>
              <ButtonLink href="/rates" variant="primary">
                대관료 보기
                <ArrowRight />
              </ButtonLink>
              <ButtonLink href="/documents" variant="secondary">
                대관 자료
              </ButtonLink>
            </>
          }
        />
      </main>

      <SiteFooter />
    </div>
  );
}
