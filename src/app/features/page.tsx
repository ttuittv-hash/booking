import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { getFeaturesContent } from "@/lib/db";
import type { ReactNode } from "react";
import type {
  CapacityBlock,
  FacilityGroup,
  Pair,
  VenueFacilityContent,
} from "@/lib/content/pageContent";
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
  INVERSE_SURFACE_VARS,
  PageHead,
  SectionHead,
  SpecTable,
} from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "시설 소개 | 서울아레나",
};

/**
 * 개요 카드 — 제목은 eyebrow, 내용은 H5 (Notion 지정).
 *
 * **12칼럼 그리드 위에 3칼럼씩(4-up).** 항목이 4개라 한 줄에 딱 들어가고, 카드 경계가
 * 모두 컬럼 경계에 떨어진다. 항목 수가 3개면 4col 씩(3-up), 2개면 6col 씩(2-up) 이다.
 */
function OverviewCards({ items }: { items: Pair[] }) {
  return (
    <ul className="grid gap-x-[var(--gutter)] gap-y-10 sm:grid-cols-2 lg:grid-cols-12">
      {items.map((c, i) => (
        <li key={`${c.label}-${i}`} className="border-t-2 border-border pt-5 lg:col-span-3">
          <p className="text-xs font-bold text-muted">{c.label}</p>
          <p className="type-kr-heading mt-3 break-keep text-h5-m sm:text-h5">{c.value}</p>
        </li>
      ))}
    </ul>
  );
}

/**
 * 자료로 넘기는 노랑 CTA. 아레나 탭은 STAGE & CAPACITY 바로 아래(수치를 보고
 * 더 깊이 보려는 지점), 중형공연장 탭은 페이지 끝에 둔다.
 */
function DocumentsCta() {
  return (
    <CTABand
      title="무대가 펼쳐질 공간의 가능성을 확인하세요."
      lead="자세한 시설 정보를 자료를 통해 확인하세요."
      actions={
        <ButtonLink href="/documents?venue=facility" variant="primary">
          대관 자료
          <ArrowRight />
        </ButtonLink>
      }
    />
  );
}

/** 카드 껍데기 — 검정 머리(제목) + 흰 본문. 시설 소개의 카드는 모두 이 모양이다 */
function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="flex h-full min-w-0 flex-col border border-border/25 bg-panel lg:col-span-6">
      {title && (
        <header
          className="bg-inverse-bg px-6 py-5 text-inverse-fg"
          style={INVERSE_SURFACE_VARS}
        >
          <h4 className="type-kr-heading break-keep text-h5-m sm:text-h5">{title}</h4>
        </header>
      )}
      <div className="flex-1 p-6">{children}</div>
    </article>
  );
}

/** 무대 배치별 수용인원 카드. 층별 표는 배치가 둘 이상일 때 Details 로 접는다 */
function CapacityCard({ cap, collapsed }: { cap: CapacityBlock; collapsed: boolean }) {
  const table =
    cap.floors.length > 0 ? (
      <SpecTable dense rows={cap.floors.map((f) => [f.label, f.value] as [string, string])} />
    ) : null;
  return (
    <Card title={cap.stage}>
      {(cap.seated || cap.standing) && (
        <dl className="flex flex-wrap gap-x-10 gap-y-4">
          {cap.seated && (
            <div>
              <dt className="text-xs font-bold text-muted">SEATED</dt>
              <dd className="type-display mt-1 text-h5-m tabular-nums sm:text-h5">{cap.seated}</dd>
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
      {table &&
        (collapsed ? (
          <details className="mt-6 border-t border-border/25 pt-4">
            <summary className="cursor-pointer text-s font-bold">Details</summary>
            <div className="mt-4">{table}</div>
          </details>
        ) : (
          <div className="mt-6">{table}</div>
        ))}
    </Card>
  );
}

/** 부대시설 카테고리 카드 — [시설명 → 부연] 목록 */
function FacilityCard({ group }: { group: FacilityGroup }) {
  return (
    <Card title={group.title}>
      <dl className="space-y-4">
        {group.items.map((it, i) => (
          <div key={`${it.label}-${i}`}>
            <dt className="text-s font-bold">{it.label}</dt>
            {it.value && (
              <dd className="mt-1 flex gap-2 break-keep text-s text-muted">
                <span aria-hidden>·</span>
                <span>{it.value}</span>
              </dd>
            )}
          </div>
        ))}
      </dl>
    </Card>
  );
}

function VenuePanel({
  en,
  ko,
  c,
  ctaAfter,
}: {
  en: string;
  ko: string;
  c: VenueFacilityContent;
  /** CTA 밴드를 어디에 놓을지 — 수치 바로 뒤 또는 페이지 끝 */
  ctaAfter: "capacity" | "end";
}) {
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
          {/*
            무대 배치마다 카드 한 장(6col × 2). 카드는 [검정 머리 + 흰 본문] —
            부대시설 카드와 같은 언어다(Figma 2608 「additional facilities」).
            배치가 둘 이상이면 층별 표를 Details 안에 접어 둔다 — 두 카드가 표까지 펼쳐져
            있으면 정작 비교해야 하는 수용인원이 아래로 밀린다. 배치가 하나면 펼쳐 둔다.
          */}
          <div className="grid-site mt-10">
            {c.capacity.map((cap, i) => (
              <CapacityCard key={`${cap.stage}-${i}`} cap={cap} collapsed={c.capacity.length > 1} />
            ))}
          </div>
        </Band>
      )}

      {ctaAfter === "capacity" && <DocumentsCta />}

      {c.features.length > 0 && (
        <Band tone="dark">
          <SectionHead title="FEATURES" />
          <div className="mt-10">
            <FeatureList items={c.features} />
          </div>
        </Band>
      )}

      {c.facilityGroups.length > 0 && (
        <Band tone="light">
          <SectionHead title="ADDITIONAL FACILITIES" />
          {/* 카테고리 카드 6col × 2 — 20줄 넘는 표 하나로는 무엇이 어디 있는지 읽히지 않는다 */}
          <div className="grid-site mt-10">
            {c.facilityGroups.map((g, i) => (
              <FacilityCard key={`${g.title}-${i}`} group={g} />
            ))}
          </div>
        </Band>
      )}

      {ctaAfter === "end" && <DocumentsCta />}
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
                <VenuePanel en="ARENA" ko="아레나" c={content.arena} ctaAfter="capacity" />
              ) : (
                <VenuePanel en="LIVE HALL" ko="중형공연장" c={content.liveHall} ctaAfter="end" />
              ),
          }))}
        />

      </main>

      <SiteFooter />
    </div>
  );
}
