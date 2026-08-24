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
  ArrowRight,
  Band,
  ButtonLink,
  CTABand,
  FeatureList,
  LabeledList,
  PageHead,
  SectionHead,
  SpecTable,
  SplitSection,
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
          <div className="mt-10 space-y-10">
            {c.capacity.map((cap, i) => {
              const hasSeats = Boolean(cap.seated || cap.standing);
              /*
                두 칼럼 — 좌: 무대 이름 + 수용인원 / 우: 층별 표.
                표는 **수용인원(SEATED · STANDING)과 같은 행**에서 시작한다. 그리드 행을
                직접 지정해 맞춘다(위 여백을 계산해 맞추면 무대 이름이 두 줄이 될 때 어긋난다).
              */
              const tableRow = hasSeats && cap.stage ? "lg:row-start-2" : "lg:row-start-1";
              return (
                <div key={`${cap.stage}-${i}`} className="grid-site gap-y-5">
                  {cap.stage && (
                    <h4 className="type-kr-heading break-keep text-h5-m sm:text-h5 lg:col-span-2 lg:col-start-1 lg:row-start-1">
                      {cap.stage}
                    </h4>
                  )}
                  {hasSeats && (
                    <dl
                      className={`flex flex-wrap gap-x-12 gap-y-3 lg:col-span-2 lg:col-start-1 ${
                        cap.stage ? "lg:row-start-2" : "lg:row-start-1"
                      }`}
                    >
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
                    <div className={`min-w-0 lg:col-span-4 lg:col-start-3 ${tableRow}`}>
                      <SpecTable
                        rows={cap.floors.map((f) => [f.label, f.value] as [string, string])}
                      />
                    </div>
                  )}
                </div>
              );
            })}
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

      {c.facilities.length > 0 && (
        <Band tone="light">
          <SplitSection title="ADDITIONAL FACILITIES">
            <LabeledList
              items={c.facilities.map((f) => ({ label: f.label, desc: f.value || undefined }))}
            />
          </SplitSection>
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
