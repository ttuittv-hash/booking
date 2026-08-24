import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
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
  SplitSection,
  type SpecGroup,
} from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "대관료 | 서울아레나",
};

/**
 * 라벨 열 폭 — `SpecTable`·`GroupedSpecTable` 의 라벨 열과 같은 값이다.
 * RATE · RATE INCLUDES · ADDITIONAL CHARGES 세 표의 값이 같은 세로선에서 시작한다.
 */
const SPEC_LABEL_WIDTH = "12rem";

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
  // 값 열은 좌측 정렬로 둔다 — 같은 화면의 RATE INCLUDES·ADDITIONAL CHARGES 가
  // 라벨 + 좌측 정렬 값이므로, 이 표만 우측 정렬이면 세로 기준선이 어긋난다.
  const cols = c.columns.map((r) => ({ key: r.key, title: r.name, align: "left" as const }));
  const detailCols = c.detailColumns.map((r) => ({
    key: r.key,
    title: r.name,
    align: "left" as const,
  }));

  const rows = c.rowLabels.map((label, i) => ({
    label,
    cells: c.columns.map((col) => col.values[i] ?? ""),
  }));

  return (
    <>
      {/* 머리글만 있는 밴드를 따로 두면 두 밴드의 세로 패딩이 더해져 지나치게 벌어진다 */}
      <Band tone="light" size="lg">
        <PageHead en={en} ko={ko} />
        <div className="mt-12">
          <SectionHead title="RATE" />
        </div>
        <div className="mt-10">
          {/*
            대관 기간은 열마다 같은 값이라 표 안에 행으로 넣으면 첫 열만 채워지고
            나머지 열이 빈칸으로 남는다. 표 밖 한 줄로 내린다.
          */}
          <ComparisonTable
            rowLabel="구분"
            labelWidth={SPEC_LABEL_WIDTH}
            columns={cols}
            rows={rows}
            footer={
              c.rentalPeriod ? (
                <p className="break-keep text-s text-muted">
                  <span className="font-bold text-foreground">대관 기간</span> {c.rentalPeriod}
                </p>
              ) : undefined
            }
          />
        </div>

        {c.detailLabels.length > 0 && (
          <details className="mt-10 border-t border-border/25 pt-5">
            <summary className="cursor-pointer text-s font-bold">Details</summary>
            <div className="mt-6">
              <ComparisonTable
                dense
                rowLabel="구분"
                labelWidth={SPEC_LABEL_WIDTH}
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

      {(c.includes.length > 0 || c.limits.length > 0) && (
        <Band tone="light">
          {/*
            기준 공연시간·이용시간은 항목별로 신청하는 옵션이 아니라 대관에 딸린
            기본 조건이다. 옵션표와 같은 표로 그리면 신청 항목처럼 읽히므로
            표를 쓰지 않고 제목 아래(좌측 칼럼) 문장으로 싣는다.
          */}
          <SplitSection
            title="RATE INCLUDES"
            aside={
              c.limits.length > 0 ? (
                <div className="space-y-2">
                  {c.limits.map((p, i) => (
                    <p key={`${p.label}-${i}`} className="break-keep text-s leading-7">
                      <span className="font-bold">{p.label}</span>
                      <span className="text-muted">: {p.value}</span>
                    </p>
                  ))}
                </div>
              ) : undefined
            }
          >
            {c.includes.length > 0 && (
              <SpecTable rows={c.includes.map((p) => [p.label, p.value] as [string, string])} />
            )}
          </SplitSection>
        </Band>
      )}

      <Band tone="white">
        {c.charges.length > 0 && (
          <SplitSection title="ADDITIONAL CHARGES">
            <GroupedSpecTable groups={chargeGroups(c.charges)} />
          </SplitSection>
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
  // 요금은 계약 조건과 직접 연결되므로 승인된 대관사 계정에게만 공개한다.
  const [currentUser, content] = await Promise.all([getCurrentUser(), getRatesContent()]);
  if (!currentUser) redirect("/login");
  if (isPendingApplicant(currentUser)) redirect("/pending");

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
