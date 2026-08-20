import type { Metadata } from "next";
import { getCurrentUser, requireAccess } from "@/lib/auth";
import { getRatesContent } from "@/lib/db";
import type { ChargeBlock, VenueRateContent } from "@/lib/content/pageContent";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { QueryTabs } from "@/components/ui/QueryTabs";
import { VENUE_TABS, VENUE_TAB_PARAM } from "@/components/ui/nav-items";
import {
  Band,
  ComparisonTable,
  GroupedSpecTable,
  PageHead,
  SectionHead,
  SpecTable,
  type SpecGroup,
} from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "대관료 | 서울아레나",
};

/**
 * ADDITIONAL CHARGES — 구분으로 묶는다. 열 배치는 RATE INCLUDES 와 같은
 * 라벨(12rem) + 값 이라, 두 표의 값 열이 같은 세로선에서 시작한다.
 */
function chargeGroups(rows: ChargeBlock[]): SpecGroup[] {
  const order: string[] = [];
  rows.forEach((r) => {
    if (!order.includes(r.group)) order.push(r.group);
  });
  return order.map((g) => ({
    title: g,
    rows: rows
      .filter((r) => r.group === g)
      .map((r) => ({ label: r.item, value: r.cost, note: r.note || undefined })),
  }));
}

function RatePanel({ en, ko, c }: { en: string; ko: string; c: VenueRateContent }) {
  const cols = c.columns.map((r) => ({ key: r.key, title: r.name }));
  const detailCols = c.detailColumns.map((r) => ({ key: r.key, title: r.name }));

  const rows = c.rowLabels.map((label, i) => ({
    label,
    cells: c.columns.map((col) => col.values[i] ?? ""),
  }));
  if (c.rentalPeriod) {
    // 대관 기간은 열마다 같은 값이므로 첫 열에만 적고 나머지는 비운다
    rows.splice(rows.length - 1, 0, {
      label: "대관 기간",
      cells: c.columns.map((_, i) => (i === 0 ? c.rentalPeriod : "")),
    });
  }

  return (
    <>
      <Band tone="light" size="lg">
        <PageHead en={en} ko={ko} />
      </Band>

      <Band tone="white">
        <SectionHead title="RATE" />
        <div className="mt-12">
          <ComparisonTable rowLabel="구분" columns={cols} rows={rows} />
        </div>

        {c.detailLabels.length > 0 && (
          <details className="mt-10 border-t border-border/25 pt-5">
            <summary className="cursor-pointer text-s font-bold">Details</summary>
            <div className="mt-6">
              <ComparisonTable
                dense
                rowLabel="구분"
                columns={detailCols}
                rows={c.detailLabels.map((label, i) => ({
                  label,
                  cells: c.detailColumns.map((col) => col.values[i] ?? ""),
                }))}
              />
            </div>
          </details>
        )}
      </Band>

      {c.includes.length > 0 && (
        <Band tone="light">
          <SectionHead title="RATE INCLUDES" />
          <SpecTable
            className="mt-12"
            rows={c.includes.map((p) => [p.label, p.value] as [string, string])}
          />
        </Band>
      )}

      <Band tone="white">
        {c.charges.length > 0 && (
          <>
            <SectionHead title="ADDITIONAL CHARGES" />
            <GroupedSpecTable className="mt-12" groups={chargeGroups(c.charges)} />
          </>
        )}

        {c.limits.length > 0 && (
          <SpecTable
            className="mt-14"
            dense
            rows={c.limits.map((p) => [p.label, p.value] as [string, string])}
          />
        )}

        {c.notes.length > 0 && (
          <ul className="measure mt-10 space-y-2">
            {c.notes.map((t, i) => (
              <li key={`${t}-${i}`} className="break-keep text-xs leading-5 text-muted">
                ※ {t}
              </li>
            ))}
          </ul>
        )}
      </Band>
    </>
  );
}

export default async function RatesPage() {
  // 기획서 A15 접근권한 매트릭스 — 규칙은 accessPolicy.ts 한 곳에만 둔다
  await requireAccess("/rates");
  // 요금은 계약 조건과 직접 연결되므로 승인된 대관사 계정에게만 공개한다.
  const [currentUser, content] = await Promise.all([getCurrentUser(), getRatesContent()]);

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/rates" currentUser={currentUser} />

      <main className="flex flex-1 flex-col">
        <QueryTabs
          param={VENUE_TAB_PARAM}
          ariaLabel="공간 선택"
          items={VENUE_TABS.map((t) => ({
            value: t.value,
            label: t.label,
            panel:
              t.value === "arena" ? (
                <RatePanel en="ARENA RATES" ko="아레나 대관료" c={content.arena} />
              ) : (
                <RatePanel en="LIVE HALL RATES" ko="중형공연장 대관료" c={content.liveHall} />
              ),
          }))}
        />

      </main>

      <SiteFooter />
    </div>
  );
}
