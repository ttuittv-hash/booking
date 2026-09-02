import type { Metadata } from "next";
import { getCurrentUser, requireAccess } from "@/lib/auth";
import { getFeaturesContent } from "@/lib/db";
import type {
  CapacityBlock,
  FacilityGroup,
  SpecCard,
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
  PLAIN_SURFACE_VARS,
  PageHead,
  SectionHead,
  StatCards,
  TitledCard,
} from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "시설 제원",
};

/**
 * 자료로 넘기는 노랑 CTA. 수치(개요 · 수용인원 · 층별 구성)를 다 보고 나서
 * 더 깊이 들어가려는 지점 — FLOOR & SEATING 바로 아래에 둔다.
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

/**
 * 무대 배치별 수용인원 카드.
 *
 * [2026-09-02] 좌우 두 칼럼(SEATED | STANDING)으로 나눠 놓았더니 카드가 넓어질수록
 * 두 수치가 멀어져 한눈에 비교되지 않았다. **한 칼럼으로 쌓고 수치를 H1 까지 키운다** —
 * 카드가 말하는 것이 수치 하나뿐이라는 것이 분명해진다.
 * 층별 표(Details)는 카드에서 뺐다. 층별 구성은 아래 FLOOR & SEATING 이 맡는다.
 */
function CapacityCard({ cap }: { cap: CapacityBlock }) {
  // SEATED/STANDING 이 있으면 그 두 줄, 없으면 층별 내역이 그대로 카드의 줄이 된다
  // (중형공연장 FIXED SEATS 카드).
  const rows: { label: string; value: string; note?: string }[] =
    cap.seated || cap.standing
      ? [
          ...(cap.seated ? [{ label: "SEATED", value: cap.seated }] : []),
          ...(cap.standing ? [{ label: "STANDING", value: cap.standing }] : []),
        ]
      : cap.floors.map((f) => ({ label: f.label, value: f.value, note: f.note }));

  return (
    <TitledCard title={cap.stage}>
      {cap.desc && <p className="break-keep text-s text-muted">{cap.desc}</p>}
      {rows.length > 0 && (
        <dl className={`space-y-7 ${cap.desc ? "mt-7" : ""}`}>
          {rows.map((r, i) => (
            <div key={`${r.label}-${i}`}>
              <dt className="text-xs font-bold text-muted">{r.label}</dt>
              <dd className="type-display mt-2 break-keep text-h1-m normal-case tabular-nums sm:text-h1">
                {r.value}
              </dd>
              {r.note && <p className="mt-2 break-keep text-s text-muted">{r.note}</p>}
            </div>
          ))}
        </dl>
      )}
    </TitledCard>
  );
}

/**
 * 스펙 카드 4-up — 검정 지면 위 **흰 배경 · 검정 아웃라인** 박스.
 * 한 장은 [라벨 / 큰 수치 / 설명] 세 줄이고, 12칼럼에서 3칼럼씩 떨어진다.
 * 스냅은 4 → 2 → 1 이다.
 */
function SpecCardGrid({ cards }: { cards: SpecCard[] }) {
  return (
    <ul className="mt-10 grid gap-[var(--gutter)] sm:grid-cols-2 lg:grid-cols-12">
      {cards.map((card, i) => (
        <li key={`${card.label}-${i}`} className="lg:col-span-3">
          {/* 검정 밴드 안이라 토큰을 밝은 면으로 되돌린다 — 안 그러면 흰 배경에 흰 글자다 */}
          <article
            className="flex h-full min-w-0 flex-col border border-border bg-background p-6 text-foreground"
            style={PLAIN_SURFACE_VARS}
          >
            <p className="text-xs font-bold text-muted">{card.label}</p>
            {/* `type-display` 은 대문자로 바꾼다 — 수치는 끈다. 단위는 대소문자로 뜻이
                갈린다(180t 톤 ↔ 180T 테슬라, 4.8m 미터 ↔ 4.8M 메가). */}
            <p className="type-display mt-3 break-keep text-h4-m normal-case tabular-nums sm:text-h4">
              {card.value}
            </p>
            <p className="mt-3 break-keep text-s text-muted">{card.desc}</p>
          </article>
        </li>
      ))}
    </ul>
  );
}

/** 부대시설 카테고리 카드 — [시설명 → 부연] 목록 */
function FacilityCard({ group }: { group: FacilityGroup }) {
  return (
    <TitledCard title={group.title}>
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
    </TitledCard>
  );
}

function VenuePanel({ en, ko, c }: { en: string; ko: string; c: VenueFacilityContent }) {
  return (
    <>
      <Band tone="light" size="lg">
        <PageHead en={en} ko={ko} />
        {c.overview.length > 0 && (
          <div className="mt-10">
            <StatCards items={c.overview} />
          </div>
        )}
      </Band>

      {c.capacity.length > 0 && (
        <Band tone="white">
          <SectionHead title="CAPACITY & CONFIGURATION" />
          <div className="grid-site mt-10">
            {c.capacity.map((cap, i) => (
              <CapacityCard key={`${cap.stage}-${i}`} cap={cap} />
            ))}
          </div>
        </Band>
      )}

      {/* 층별 구성 — 배치가 달라도 층의 물리 제원은 같으므로 한 축으로 모은다 */}
      {c.features.length > 0 && (
        <Band tone="light">
          <SectionHead title="FLOOR & SEATING" />
          <div className="mt-10">
            <FeatureList items={c.features} />
          </div>
        </Band>
      )}

      <DocumentsCta />

      {/*
        스펙 카드 섹션들은 **밴드 하나** 안에 이어 놓는다. 밴드를 나누면 검정 지면이
        같아도 아래 패딩 + 위 패딩이 더해져 두 섹션 사이만 유난히 벌어진다.
      */}
      {c.specGroups.length > 0 && (
        <Band tone="dark">
          {c.specGroups.map((g, i) => (
            <section key={`${g.title}-${i}`} className={i > 0 ? "mt-16 sm:mt-20" : ""}>
              <SectionHead title={g.title} />
              <SpecCardGrid cards={g.cards} />
            </section>
          ))}
        </Band>
      )}

      {c.facilityGroups.length > 0 && (
        <Band tone="light">
          <SectionHead title="ADDITIONAL FACILITIES" />
          <div className="grid-site mt-10">
            {c.facilityGroups.map((g, i) => (
              <FacilityCard key={`${g.title}-${i}`} group={g} />
            ))}
          </div>
        </Band>
      )}
    </>
  );
}

export default async function FeaturesPage() {
  // 기획서 A15 접근권한 매트릭스 — 규칙은 accessPolicy.ts 한 곳에만 둔다
  await requireAccess("/features");
  // 시설 제원부터는 로그인한 대관사에게만 공개한다 (Notion 확정 정보구조).
  const [currentUser, content] = await Promise.all([getCurrentUser(), getFeaturesContent()]);

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
