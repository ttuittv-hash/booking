import type { Metadata } from "next";
import { getCurrentUser, requireAccess } from "@/lib/auth";
import { getRatesContent, getScreenTextContent } from "@/lib/db";
import { EMPTY_VENUE_RATE_CONTENT, rateSectionTitle } from "@/lib/content/pageContent";
import type {
  ChargeBlock,
  RateColumn,
  RateIncludeGroup,
  VenueRateContent,
} from "@/lib/content/pageContent";
import { SPECIAL_VENUE_ID } from "@/lib/pricing/types";
import { venueLabel } from "@/lib/content/venueLabels";
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
 *
 * 위계는 [요금제 이름은 라벨 / 수용 규모가 헤딩 / 구성은 값만 / 대관료 / 일 단위 추가].
 * 요금제 이름(RATE A)을 크게 두면 카드가 "A 라는 것"을 말하게 되는데, 신청자가
 * 카드를 고르는 기준은 이름이 아니라 **몇 명을 담느냐**다. 무대·객석 형태는 라벨을
 * 떼고 값만 남긴다 — 라벨이 붙으면 카드가 다시 표처럼 읽힌다.
 * 시안의 "PACKAGE RATE" 머리말은 두지 않는다.
 */
function RateCards({ rowLabels, columns }: { rowLabels: string[]; columns: RateColumn[] }) {
  const priceIndex = rowLabels.length - 1;
  // 중형공연장은 행이 「대관료」 하나뿐이라 수용 규모·구성 줄이 없다.
  const hasSpecRows = priceIndex > 0;
  return (
    <ul className="mt-10 grid gap-[var(--gutter)] sm:grid-cols-2 lg:grid-cols-12">
      {columns.map((col) => (
        <li key={col.key} className="lg:col-span-3">
          <article className="flex h-full min-w-0 flex-col border border-border bg-panel p-6">
            <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-muted [font-family:Archivo,sans-serif]">
              {col.name}
            </p>
            {hasSpecRows && (
              <>
                <p className="type-kr-heading mt-3 break-keep text-h4-m sm:text-h4">
                  {col.values[0] ?? ""}
                </p>
                <div className="mt-4 flex-1 space-y-1">
                  {col.values.slice(1, priceIndex).map((v, i) => (
                    <p key={`${v}-${i}`} className="break-keep text-s text-muted">
                      {v}
                    </p>
                  ))}
                </div>
              </>
            )}
            <dl className={`border-t border-border pt-4 ${hasSpecRows ? "mt-6" : "mt-6 flex-1"}`}>
              <dt className="text-xs font-bold text-muted">{rowLabels[priceIndex]}</dt>
              <dd className="type-display mt-1 break-keep text-h5-m normal-case tabular-nums sm:text-h5">
                {col.values[priceIndex] ?? ""}
              </dd>
            </dl>
            {col.extras && col.extras.length > 0 && (
              <dl className="mt-4 space-y-2 border-t border-border pt-4">
                {col.extras.map((e, i) => (
                  <div
                    key={`${e.label}-${i}`}
                    className="flex flex-wrap items-baseline justify-between gap-x-3"
                  >
                    <dt className="text-xs text-muted">{e.label}</dt>
                    <dd className="break-keep text-s font-bold tabular-nums">{e.value}</dd>
                  </div>
                ))}
              </dl>
            )}
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
          {/* 묶음 제목은 헤딩이다 — 작은 라벨로 두었더니 표가 한 덩어리로 흘러
              어디서 묶음이 갈리는지 읽히지 않았다. */}
          <h4
            className={`type-kr-heading border-b border-border pb-3 text-h5-m sm:text-h5 ${
              gi === 0 ? "" : "pt-12"
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
                  <dd className="break-keep text-s tabular-nums">
                    {r.cost}
                    {r.unit && <span className="mt-1 block text-xs text-muted">{r.unit}</span>}
                  </dd>
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
            title={rateSectionTitle(c, "packages")}
            // [삭제 2026-09-02] "금액은 부가세 별도" 는 뺐다 — 같은 화면 아래 유의사항에
            // 이미 있고, 대관 기간 바로 밑에 붙어 있어 기간 설명처럼 읽혔다.
            lead={c.rentalPeriod ? <span className="block">대관 기간 {c.rentalPeriod}</span> : undefined}
          />
          {/*
            [개정 2026-09-02] 접었다 펴는 [Details] 토글은 없앤다 — 토글 뒤에 있으면
            아무도 열지 않아 표가 반쪽으로 읽혔다. 셋업·공연 **변경** 대관료는 카드
            하단(`extras`)으로 올라와 늘 보이고, 전용/시설 사용료 내역은 견적서에서 본다.
            **데이터(`detailLabels`/`detailColumns`)는 지우지 않았다** — 요금 API
            (`/api/rates`) · 대관 신청 위저드 · 어드민 요금 관리가 같은 값을 쓴다.
          */}
          <RateCards rowLabels={c.rowLabels} columns={c.columns} />
        </div>
      </Band>

      {/* 섹션 2 — 기본 대관료 포함 항목 */}
      {c.includeGroups.length > 0 && (
        <Band tone="white">
          <SectionHead
            title={rateSectionTitle(c, "includes")}
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
          <SectionHead title={rateSectionTitle(c, "limits")} />
          <div className="mt-10">
            <StatCards items={c.limits} />
          </div>
        </Band>
      )}

      {/* 섹션 4 — 추가 사용료 */}
      {(c.charges.length > 0 || c.notes.length > 0) && (
        <Band tone="white">
          <SectionHead title={rateSectionTitle(c, "charges")} />
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
  const [currentUser, content, screenText] = await Promise.all([
    getCurrentUser(),
    getRatesContent(),
    getScreenTextContent(),
  ]);
  const specialLabel = venueLabel(SPECIAL_VENUE_ID, screenText.wizardStrings);

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/rates" currentUser={currentUser} />

      <main className="flex flex-1 flex-col">
        {/* [개정 2026-09-02] 세 번째 공간 탭을 아레나·중형 오른쪽에 붙인다. 이름은
            운영자가 문구 관리에서 바꾼 값을 쓴다 — 위저드·패키지 관리와 같은 말이어야
            한다. 아직 내용을 안 채웠으면 빈 표가 나오는 게 맞다(감추면 운영자가
            어디에 넣어야 하는지 알 수 없다). */}
        <QueryTabs
          param={VENUE_TAB_PARAM}
          ariaLabel="공간 선택"
          items={[
            ...VENUE_TABS.map((t) => ({
              value: t.value,
              label: t.label,
              panel:
                t.value === "arena" ? (
                  <RatePanel en="ARENA RATES" ko="아레나 대관료" c={content.arena} />
                ) : (
                  <RatePanel en="LIVE HALL RATES" ko="중형공연장 대관료" c={content.liveHall} />
                ),
            })),
            {
              value: "special",
              label: specialLabel,
              panel: (
                <RatePanel
                  en="PACKAGE RATES"
                  ko={`${specialLabel} 대관료`}
                  c={content.special ?? EMPTY_VENUE_RATE_CONTENT}
                />
              ),
            },
          ]}
        />

      </main>

      <SiteFooter />
    </div>
  );
}
