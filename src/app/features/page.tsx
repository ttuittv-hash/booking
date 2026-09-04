import type { Metadata } from "next";
import { getCurrentUser, requireAccess } from "@/lib/auth";
import { getFeaturesContent } from "@/lib/db";
import type {
  CapacityBlock,
  FacilityGroup,
  FeatureBlock,
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
  EYEBROW_CAPS,
  ButtonLink,
  CTABand,
  PLAIN_SURFACE_VARS,
  PageHead,
  RichText,
  SectionHead,
  StatCards,
  valueHeadingClass,
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
      // 줄바꿈 자리를 문장이 정한다 — 홈 배너와 같은 규격(H1 · 120%)이라 폭에 맡기면
      // 화면마다 다른 자리에서 접힌다
      title={
        <>
          무대가 펼쳐질 공간의
          <br />
          가능성을 확인하세요.
        </>
      }
      lead="자세한 시설 정보를 자료를 통해 확인하세요."
      actions={
        <ButtonLink href="/documents?venue=facility" variant="primary" size="lg">
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
    <article className="flex h-full min-w-0 flex-col justify-between rounded-surface bg-panel p-card-pad">
      {/*
        제목은 카드 위에, 수치는 카드 바닥에 붙는다 — 카드마다 내용 길이가 달라도
        같은 줄에 선 카드들의 아래 선이 맞는다.

        배치 이름은 카드의 **제목**이다. 중형공연장처럼 배치 구분이 없는 곳은 이름이 비어
        오는데, 그때는 머리 덩어리 자체가 빠져 수치가 카드 맨 위에서 시작한다.
      */}
      {(cap.stage || cap.desc) && (
        <div>
          {cap.stage && <h4 className="type-display break-keep text-h4">{cap.stage}</h4>}
          {cap.desc && (
            <p
              className={`whitespace-pre-line break-keep text-s text-muted ${cap.stage ? "mt-3" : ""}`}
            >
              <RichText text={cap.desc} />
            </p>
          )}
        </div>
      )}
      {rows.length > 0 && (
        <dl className={`space-y-6 ${cap.stage || cap.desc ? "pt-card-body" : ""}`}>
          {rows.map((r, i) => (
            <div key={`${r.label}-${i}`}>
              <dt className={EYEBROW_CAPS}>{r.label}</dt>
              <dd
                className={`${valueHeadingClass(r.value)} mt-2 break-keep text-h4 font-bold tabular-nums`}
              >
                {r.value}
              </dd>
              {r.note && <p className="mt-2 break-keep text-s text-muted">{r.note}</p>}
            </div>
          ))}
        </dl>
      )}
    </article>
  );
}

/**
 * 스펙 카드 — 검정 지면 위 **흰 배경 · 검정 아웃라인** 박스.
 * 한 장은 [라벨 / 큰 수치 / 설명] 세 줄이고, 지면 6칼럼에서 **언제나 2칼럼**이다.
 * 그래서 한 줄에 세 장이 서고(2:2:2), 카드의 좌우 선이 지면 격자에 그대로 떨어진다.
 * 스냅은 3 → 2 → 1.
 *
 * 장수가 모자란 줄은 **왼쪽부터 채우고 오른쪽을 비운다** — 두 장뿐이면 세 번째 자리가
 * 빈 채로 남는다. 남는 폭을 나눠 가지면 그 줄만 카드가 넓어져 위아래 줄과 어긋난다.
 *
 * [개정 2026-09-03] 내용이 길면 넓히던 규칙을 없앴다. 카드마다 폭이 달라지니
 * 격자가 모자이크처럼 흐트러져, 정작 비교해야 할 카드들이 같은 줄에 서지 못했다.
 * 폭은 고정하고 **값의 글자 크기를 한 단 낮춰**(H4 → H5) 긴 값도 카드 안에 들어오게 한다.
 */
function SpecCardGrid({ cards }: { cards: SpecCard[] }) {
  return (
    <ul className="mt-head-block grid gap-gutter sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card, i) => (
        <li
          key={`${card.label}-${i}`}
          className="lg:col-span-1"
        >
          {/* 검정 밴드 안이라 토큰을 밝은 면으로 되돌린다 — 안 그러면 흰 배경에 흰 글자다 */}
          <article
            className="flex h-full min-w-0 flex-col justify-between rounded-surface bg-background p-card-pad text-foreground"
            style={PLAIN_SURFACE_VARS}
          >
            {/* 라벨과 값은 카드 위에 한 덩어리로, 설명은 카드 바닥에 붙는다 */}
            <div>
              {/* 라벨은 있을 때만 그린다 — 빈 문자열이면 줄과 여백까지 함께 빠진다
                  (부대시설 카드는 라벨 없이 시설명부터 시작한다) */}
              {card.label && <p className={EYEBROW_CAPS}>{card.label}</p>}
              {/* 값의 크기·굵기는 서울아레나 카드 제목과 같은 규격(H4 Bold)이다 —
                  사이트에서 「카드가 말하는 한 가지」는 어디서나 같은 무게로 선다. */}
              <p
                // 운영자가 넣은 줄바꿈을 지킨다 — 「1F: … / 3F: …」처럼 층마다 한 줄인 값이 있다
                className={`${valueHeadingClass(card.value)} whitespace-pre-line break-keep text-h4 font-bold tabular-nums ${card.label ? "mt-3" : ""}`}
              >
                {card.value}
              </p>
            </div>
            {card.desc && (
              <p className="whitespace-pre-line break-keep pt-card-body text-s text-muted">
                <RichText text={card.desc} />
              </p>
            )}
          </article>
        </li>
      ))}
    </ul>
  );
}

/**
 * FLOOR & SEATING — 층 이름은 **라벨**, 제원 숫자가 **헤딩**이다.
 *
 * `FeatureList`(제목 H5 + 설명 작은 글씨)를 그대로 쓰면 층 이름이 주인공이 되는데,
 * 이 섹션에서 읽어야 하는 것은 층 이름이 아니라 면적·좌석 수다. 위계를 뒤집는다.
 * `FeatureList` 는 `/seoularena` 가 함께 쓰므로 건드리지 않고 여기서 따로 그린다.
 *
 * 줄은 모두 국문 헤딩 서체로 둔다 — 한 블록 안에서 "49 × 79.9m"(영문)와
 * "수납식 객석 1,848석"(국문)이 다른 서체로 갈리면 목록이 흔들려 보인다.
 */
function FloorList({ items }: { items: FeatureBlock[] }) {
  return (
    <ul className="border-t border-border">
      {items.map((it, i) => {
        /*
          줄이 둘 이상이면 **마지막 줄은 부연**이다 — 면적·좌석 수 같은 제원이 먼저 오고,
          "수납식 객석 156석 별도" 처럼 조건을 덧붙이는 문장이 끝에 붙는다. 부연까지
          헤딩으로 키우면 어느 숫자가 그 층의 제원인지 구분되지 않으므로 본문 크기로 둔다.
          줄이 하나뿐이면 그 줄이 제원이다.
        */
        const hasNote = it.lines.length > 1;
        const figures = hasNote ? it.lines.slice(0, -1) : it.lines;
        const note = hasNote ? it.lines[it.lines.length - 1] : "";
        return (
          <li key={`${it.title}-${i}`} className="border-b border-border py-7">
            <p className={EYEBROW_CAPS}>
              {it.title}
            </p>
            {figures.length > 0 && (
              <div className="mt-3 space-y-1">
                {figures.map((line) => (
                  <p key={line} className="type-kr-heading break-keep text-h5-m sm:text-h5">
                    {line}
                  </p>
                ))}
              </div>
            )}
            {note && (
              <p className="mt-2 whitespace-pre-line break-keep text-s text-muted">
                <RichText text={note} />
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * 부대시설을 스펙 카드로 편다 — **한 시설이 카드 한 장**이다.
 *
 * 카테고리 한 장에 시설 목록을 담아 두었더니 카드마다 줄 수가 제각각이라 격자가
 * 무너졌고, 정작 읽어야 하는 시설 이름이 목록 속 한 줄로 작아졌다.
 * 카드는 [시설명 / 부연] 이고, 위 스펙 카드와 같은 규격이다.
 *
 * 카테고리 이름(「부대시설」)은 카드에 넣지 않는다 — 섹션 제목이 이미
 * ADDITIONAL FACILITIES 라, 카드마다 같은 말을 한 번 더 얹는 꼴이었다.
 */
function facilityCards(groups: FacilityGroup[]): SpecCard[] {
  return groups.flatMap((g) => g.items.map((it) => ({ label: "", value: it.label, desc: it.value })));
}

function VenuePanel({
  en,
  ko,
  c,
  overviewSize,
}: {
  en: string;
  ko: string;
  c: VenueFacilityContent;
  /**
   * 개요 카드 값의 크기. **지금은 두 탭 다 md(32px / 모바일 24px)** 다 —
   * 운영 콘텐츠에서 개요가 `CONCERT · FESTIVAL · AWARDS …` 같은 긴 나열이 되면서
   * H3 로는 카드마다 여러 줄로 접혔다. 탭마다 달리 잡을 여지는 남겨 둔다.
   */
  overviewSize: "md" | "lg";
}) {
  const facilities = facilityCards(c.facilityGroups);
  const darkSections = [
    ...c.specGroups,
    ...(facilities.length > 0
      ? [{ title: "ADDITIONAL FACILITIES", cards: facilities }]
      : []),
  ];

  return (
    <>
      <Band tone="light" size="lg">
        <PageHead en={en} ko={ko} />
        {c.overview.length > 0 && (
          <div className="mt-10">
            {/* 개요 값만 Archivo Medium — 이 화면의 개요는 영문 나열이라 국문 헤딩보다
                Archivo 가 맞고, 800 은 너무 무거워 500 으로 쓴다 (2026-09-03) */}
            <StatCards items={c.overview} size={overviewSize} valueFont="archivo" />
          </div>
        )}
      </Band>

      {c.capacity.length > 0 && (
        <Band tone="white">
          <SectionHead title="CAPACITY & CONFIGURATION" />
          {/*
            수용인원 카드는 **지면을 4등분한 두 칸**(= 절반) 씩이다. 카드 안에 배치 이름과
            수치 두 줄이 들어가 스펙 카드보다 담는 것이 많고, 무대 배치 둘을 좌우로 나란히
            견주는 자리라 한 줄에 둘이 맞다. 중형공연장처럼 한 장뿐이어도 폭은 같다.
          */}
          <div className="mt-head-block grid gap-gutter lg:grid-cols-2">
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
            <FloorList items={c.features} />
          </div>
        </Band>
      )}

      <DocumentsCta />

      {/*
        검정 지면의 카드 섹션들은 **밴드 하나** 안에 이어 놓는다. 밴드를 나누면 지면이
        같아도 아래 패딩 + 위 패딩이 더해져 그 사이만 유난히 벌어진다.
        부대시설도 같은 규격의 카드라 여기에 이어 붙인다.
      */}
      {darkSections.length > 0 && (
        <Band tone="dark">
          {darkSections.map((g, i) => (
            <section key={`${g.title}-${i}`} className={i > 0 ? "mt-16 sm:mt-20" : ""}>
              <SectionHead title={g.title} />
              <SpecCardGrid cards={g.cards} />
            </section>
          ))}
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
                <VenuePanel en="ARENA" ko="아레나" c={content.arena} overviewSize="md" />
              ) : (
                <VenuePanel
                  en="LIVE HALL"
                  ko="중형공연장"
                  c={content.liveHall}
                  overviewSize="md"
                />
              ),
          }))}
        />

      </main>

      {/* 푸터 지면은 **맨 마지막 섹션과 같은 색**이다 — 이 페이지는 검정으로 끝난다 */}
      <SiteFooter tone="dark" />
    </div>
  );
}
