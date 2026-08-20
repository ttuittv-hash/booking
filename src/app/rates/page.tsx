import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { won } from "@/lib/format";
import {
  ARENA_ADDITIONAL_CHARGES,
  ARENA_LIMITS,
  ARENA_RATES,
  ARENA_RATE_INCLUDES,
  ARENA_RATE_NOTES,
  ARENA_RENTAL_PERIOD,
  LIVE_HALL_ADDITIONAL_CHARGES,
  LIVE_HALL_LIMITS,
  LIVE_HALL_RATES,
  LIVE_HALL_RATE_INCLUDES,
  LIVE_HALL_RATE_NOTES,
  type ChargeRow,
} from "@/lib/content/rateFacts";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { QueryTabs } from "@/components/ui/QueryTabs";
import { VENUE_TABS, VENUE_TAB_PARAM } from "@/components/ui/nav-items";
import {
  ArrowRight,
  Band,
  ButtonLink,
  CTABand,
  ComparisonTable,
  PageHead,
  SectionHead,
  SpecTable,
  type CompareGroup,
} from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "대관료 | 서울아레나",
};

/** ADDITIONAL CHARGES — 구분으로 묶고 금액은 마지막 열에 우측 정렬 */
function chargeGroups(rows: ChargeRow[]): CompareGroup[] {
  const order: string[] = [];
  rows.forEach((r) => {
    if (!order.includes(r.group)) order.push(r.group);
  });
  return order.map((g) => ({
    title: g,
    rows: rows
      .filter((r) => r.group === g)
      .map((r) => ({ label: r.item, note: r.note, cells: [r.cost] })),
  }));
}

function Notes({ items }: { items: string[] }) {
  return (
    <ul className="measure mt-10 space-y-2">
      {items.map((t) => (
        <li key={t} className="break-keep text-xs leading-5 text-muted">
          ※ {t}
        </li>
      ))}
    </ul>
  );
}

function ArenaPanel() {
  const cols = ARENA_RATES.map((r) => ({ key: r.key, title: r.name }));
  return (
    <>
      <Band tone="light" size="lg">
        <PageHead en="ARENA RATES" ko="아레나 대관료" />
      </Band>

      <Band tone="white">
        <SectionHead title="ARENA RATE" />
        <div className="mt-12">
          <ComparisonTable
            rowLabel="구분"
            columns={cols}
            rows={[
              { label: "최대 수용인원", cells: ARENA_RATES.map((r) => r.capacity) },
              { label: "권장 무대 형태", cells: ARENA_RATES.map((r) => r.stageType) },
              { label: "권장 객석 형태", cells: ARENA_RATES.map((r) => r.seatingType) },
              {
                label: "대관 기간",
                cells: ARENA_RATES.map((_, i) => (i === 0 ? ARENA_RENTAL_PERIOD : "")),
              },
              { label: "대관료", cells: ARENA_RATES.map((r) => won(r.total)) },
            ]}
          />
        </div>

        <details className="mt-10 border-t border-border/25 pt-5">
          <summary className="cursor-pointer text-s font-bold">Details</summary>
          <div className="mt-6">
            <ComparisonTable
              dense
              rowLabel="구분"
              columns={cols}
              rows={[
                {
                  label: "셋업일 전용 사용료",
                  note: "기본 대관료 / 일당",
                  cells: ARENA_RATES.map((r) => r.setupExclusive),
                },
                {
                  label: "공연일 전용 사용료",
                  note: "기본 대관료 / 일당",
                  cells: ARENA_RATES.map((r) => r.showExclusive),
                },
                { label: "시설 사용료", cells: ARENA_RATES.map((r) => r.facility) },
                { label: "셋업 변경 대관료", cells: ARENA_RATES.map((r) => r.setupChange) },
                { label: "공연 변경 대관료", cells: ARENA_RATES.map((r) => r.showChange) },
              ]}
            />
          </div>
        </details>
      </Band>

      <Band tone="light">
        <SectionHead title="RATE INCLUDES" />
        <SpecTable className="mt-12" rows={ARENA_RATE_INCLUDES} />
      </Band>

      <Band tone="white">
        <SectionHead title="ADDITIONAL CHARGES" />
        <div className="mt-12">
          <ComparisonTable
            dense
            rowLabel="항목"
            columns={[{ key: "cost", title: "비용" }]}
            groups={chargeGroups(ARENA_ADDITIONAL_CHARGES)}
          />
        </div>
        <SpecTable className="mt-14" dense rows={ARENA_LIMITS} />
        <Notes items={ARENA_RATE_NOTES} />
      </Band>
    </>
  );
}

function LiveHallPanel() {
  const cols = LIVE_HALL_RATES.map((r) => ({ key: r.key, title: r.name }));
  return (
    <>
      <Band tone="light" size="lg">
        <PageHead en="LIVE HALL RATES" ko="중형공연장 대관료" />
      </Band>

      <Band tone="white">
        <SectionHead title="LIVE HALL RATE" />
        <div className="mt-12">
          <ComparisonTable
            rowLabel="구분"
            columns={cols}
            rows={[{ label: "대관료", cells: LIVE_HALL_RATES.map((r) => r.total) }]}
          />
        </div>

        <details className="mt-10 border-t border-border/25 pt-5">
          <summary className="cursor-pointer text-s font-bold">Details</summary>
          <div className="mt-6">
            <ComparisonTable
              dense
              rowLabel="구분"
              columns={cols}
              rows={[
                {
                  label: "전용 사용료 / 일당",
                  note: "기본 대관료",
                  cells: LIVE_HALL_RATES.map((r) => r.exclusive),
                },
                {
                  label: "시설 사용료 / 일당",
                  note: "옵션 대관료",
                  cells: LIVE_HALL_RATES.map((r) => r.facility),
                },
              ]}
            />
          </div>
        </details>
      </Band>

      <Band tone="light">
        <SectionHead title="RATE INCLUDES" />
        <SpecTable className="mt-12" rows={LIVE_HALL_RATE_INCLUDES} />
      </Band>

      <Band tone="white">
        <SectionHead title="ADDITIONAL CHARGES" />
        <div className="mt-12">
          <ComparisonTable
            dense
            rowLabel="항목"
            columns={[{ key: "cost", title: "비용" }]}
            groups={chargeGroups(LIVE_HALL_ADDITIONAL_CHARGES)}
          />
        </div>
        <SpecTable className="mt-14" dense rows={LIVE_HALL_LIMITS} />
        <Notes items={LIVE_HALL_RATE_NOTES} />
      </Band>
    </>
  );
}

export default async function RatesPage() {
  // 요금은 계약 조건과 직접 연결되므로 승인된 대관사 계정에게만 공개한다.
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  if (isPendingApplicant(currentUser)) redirect("/pending");

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/rates" currentUser={currentUser} />

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
          title="입력하신 조건으로 예상 대관료를 확인하실 수 있습니다."
          actions={
            <>
              <ButtonLink href="/apply" variant="primary">
                대관 신청
                <ArrowRight />
              </ButtonLink>
              <ButtonLink href="/rules" variant="secondary">
                대관 규약
              </ButtonLink>
            </>
          }
        />
      </main>

      <SiteFooter />
    </div>
  );
}
