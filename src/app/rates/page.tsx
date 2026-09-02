import type { Metadata } from "next";
import { getCurrentUser, requireAccess } from "@/lib/auth";
import { getRatesContent } from "@/lib/db";
import type {
  ChargeBlock,
  RateColumn,
  RateIncludeGroup,
  VenueRateContent,
} from "@/lib/content/pageContent";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { QueryTabs } from "@/components/ui/QueryTabs";
import { VENUE_TABS, VENUE_TAB_PARAM } from "@/components/ui/nav-items";
import {
  Band,
  PageHead,
  Prose,
  SectionHead,
  StatCards,
  TitledCard,
} from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "대관료",
};

/* ============================================================================
   [2026-09-02 개편] 좌 3col 제목 | 우 9col 표 였던 `SplitSection` 구성을 버리고
   **원칼럼**으로 폈다. 제목이 왼쪽에 서 있으면 표가 화면 폭의 3/4 로 좁아지는데,
   추가 사용료처럼 열이 셋인 표는 그 폭에서 부연이 계속 접혔다.
   카드(패키지 · 포함 항목 · 이용 기준)만 여러 칼럼이고, 나머지는 한 칼럼이다.
   ========================================================================= */

/**
 * 기본 대관 패키지 카드 — 흰 배경 · 검정 아웃라인. 12칼럼에서 3칼럼씩(4-up).
 * 마지막 행(대관료)만 헤어라인 아래로 내려 큰 글씨로 둔다 — 카드가 답하는 질문이
 * "얼마인가" 하나이기 때문이다. 시안의 "PACKAGE RATE" 머리말은 두지 않는다.
 */
function RateCards({ rowLabels, columns }: { rowLabels: string[]; columns: RateColumn[] }) {
  const priceIndex = rowLabels.length - 1;
  return (
    <ul className="mt-10 grid gap-[var(--gutter)] sm:grid-cols-2 lg:grid-cols-12">
      {columns.map((col) => (
        <li key={col.key} className="lg:col-span-3">
          <article className="flex h-full min-w-0 flex-col border border-border bg-panel p-6">
            <p className="type-display break-keep text-h4-m sm:text-h4">{col.name}</p>
            {priceIndex > 0 && (
              <dl className="mt-6 flex-1 space-y-4">
                {rowLabels.slice(0, priceIndex).map((label, i) => (
                  <div key={`${label}-${i}`}>
                    <dt className="text-xs font-bold text-muted">{label}</dt>
                    <dd className="mt-1 break-keep text-s">{col.values[i] ?? ""}</dd>
                  </div>
                ))}
              </dl>
            )}
            <dl className={`border-t border-border pt-4 ${priceIndex > 0 ? "mt-6" : "mt-6 flex-1"}`}>
              <dt className="text-xs font-bold text-muted">{rowLabels[priceIndex]}</dt>
              <dd className="type-display mt-1 break-keep text-h5-m normal-case tabular-nums sm:text-h5">
                {col.values[priceIndex] ?? ""}
              </dd>
            </dl>
          </article>
        </li>
      ))}
    </ul>
  );
}

/**
 * 포함 항목 카드 — 카드 안은 헤어라인으로 나뉜 [항목 / 설명] 표다.
 * 두 열의 비율은 **1:1** 이라, 6칼럼 카드 안에서 각 열이 3칼럼 폭에 떨어진다.
 * 시안의 영문 소제목(AUDIENCE FACILITIES · FLEXIBLE USE SPACES …)은 두지 않는다 —
 * 카드 제목이 이미 그 묶음을 말하고 있어 한 카드에 제목이 두 겹으로 쌓였다.
 */
function IncludeCard({ group }: { group: RateIncludeGroup }) {
  return (
    <TitledCard title={group.title}>
      <dl className="border-t border-border">
        {group.rows.map((r, i) => (
          <div
            key={`${r.label}-${i}`}
            className="grid gap-1 border-b border-border py-4 last:border-b-0 sm:grid-cols-2 sm:gap-6"
          >
            <dt className="break-keep text-s font-bold">{r.label}</dt>
            <dd className="break-keep text-s text-muted">{r.value}</dd>
          </div>
        ))}
      </dl>
    </TitledCard>
  );
}

/**
 * 추가 사용료 — 구분으로 묶고, 한 행은 [항목 / 금액 / 조건] 세 열이다.
 * 화면 4칼럼 기준 **1 : 1 : 2** — 조건 문장이 가장 길어 두 칸을 준다.
 * 시안에 있던 묶음 번호(01 · 02 …)는 두지 않는다.
 */
function ChargeTable({ rows }: { rows: ChargeBlock[] }) {
  const order: string[] = [];
  rows.forEach((r) => {
    if (!order.includes(r.group)) order.push(r.group);
  });
  return (
    <div className="mt-10">
      {order.map((group, gi) => (
        <section key={group}>
          <h4
            className={`border-b border-border pb-2 text-xs font-bold text-muted ${
              gi === 0 ? "" : "pt-10"
            }`}
          >
            {group}
          </h4>
          <dl>
            {rows
              .filter((r) => r.group === group)
              .map((r, i) => (
                <div
                  key={`${r.item}-${i}`}
                  className="grid gap-1 border-b border-border py-4 sm:grid-cols-4 sm:gap-6"
                >
                  <dt className="break-keep text-s font-bold">{r.item}</dt>
                  <dd className="break-keep text-s tabular-nums">{r.cost}</dd>
                  <dd className="break-keep text-s text-muted sm:col-span-2">{r.note}</dd>
                </div>
              ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

function RatePanel({ en, ko, c }: { en: string; ko: string; c: VenueRateContent }) {
  return (
    <>
      {/* 섹션 1 — 기본 대관 패키지 */}
      <Band tone="light" size="lg">
        <PageHead en={en} ko={ko} lead={<Prose text={c.intro} gap="mt-3" />} />
        <div className="mt-14">
          <SectionHead
            title="기본 대관 패키지"
            lead={c.rentalPeriod ? `대관 기간 ${c.rentalPeriod}` : undefined}
          />
          {/*
            Details 토글(셋업일·공연일 전용 사용료 · 시설 사용료 …)은 두지 않는다.
            카드가 답해야 하는 것은 "이 패키지가 얼마인가" 하나이고, 내역은 견적서에서
            본다. **데이터(`detailLabels`/`detailColumns`)는 지우지 않았다** — 요금 API
            (`/api/rates`) · 대관 신청 위저드 · 어드민 요금 관리가 같은 값을 읽는다.
          */}
          <RateCards rowLabels={c.rowLabels} columns={c.columns} />
        </div>
      </Band>

      {/* 섹션 2 — 기본 대관료 포함 항목 */}
      {c.includeGroups.length > 0 && (
        <Band tone="white">
          <SectionHead
            title="기본 대관료 포함 항목"
            lead={<Prose text={c.includesLead} gap="mt-3" />}
          />
          <div className="grid-site mt-10">
            {c.includeGroups.map((g, i) => (
              <IncludeCard key={`${g.title}-${i}`} group={g} />
            ))}
          </div>
        </Band>
      )}

      {/* 섹션 3 — 기본 이용 기준 */}
      {c.limits.length > 0 && (
        <Band tone="light">
          <SectionHead title="기본 이용 기준" />
          <div className="mt-10">
            <StatCards items={c.limits} />
          </div>
        </Band>
      )}

      {/* 섹션 4 — 추가 사용료 */}
      {(c.charges.length > 0 || c.notes.length > 0) && (
        <Band tone="white">
          <SectionHead title="추가 사용료" />
          {c.charges.length > 0 && <ChargeTable rows={c.charges} />}
          {c.notes.length > 0 && (
            <ul className="mt-8 space-y-2">
              {c.notes.map((t, i) => (
                <li key={`${t}-${i}`} className="break-keep text-xs leading-5 text-muted">
                  ※ {t}
                </li>
              ))}
            </ul>
          )}
        </Band>
      )}
    </>
  );
}

export default async function RatesPage() {
  // 기획서 A15 — 비로그인 차단, 로그인하면 승인 전에도 열람 가능.
  // 규칙은 accessPolicy.ts 한 곳에만 둔다(예전 게이트는 승인 대기까지 막아 매트릭스와 반대였다).
  await requireAccess("/rates");
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
