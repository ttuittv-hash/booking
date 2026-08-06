import type { VenueAmenity, VenueContent } from "@/lib/content/types";
import { KeyMapGallery, StageFeatureTabs } from "@/components/KeyMapGallery";
import {
  ArrowRight,
  Band,
  ButtonLink,
  CTABand,
  ComparisonTable,
  EmptyState,
  LayoutCards,
  LayoutColumns,
  LayoutHorizCards,
  LayoutTextColumns,
  Media,
  Note,
  PageHeading,
  Row,
  RowList,
  SpecTable,
} from "@/components/ui/kit";

/* ============================================================================
   Your Stage — 4개 페이지
     /venue                  시설 개요
     /venue/specs            시설 제원
     /venue/stage-features   무대 특장
     /venue/amenities        부대시설

   Your Stage 는 카테고리 라벨이므로 각 페이지의 타이틀은 그 페이지 이름이다.
   페이지마다 형제 페이지로 가는 내비를 같은 위치에 두어 4개가 한 묶음으로 읽히게 한다.
   본문은 Figma Wireframe 의 레이아웃 모듈만 조합하고, 이미지 슬롯은 전부 Media 로 둔다.
   ========================================================================= */

/** 관리자 리치텍스트 공통 서식. 링크는 옐로 대신 굵은 밑줄. */
const RICH_TEXT_CLS =
  "[&_a]:font-bold [&_a]:text-foreground [&_a]:underline [&_li]:mt-1 [&_p]:my-3 [&_p]:first:mt-0 [&_p]:last:mb-0 [&_strong]:font-bold [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-5";

export const VENUE_PAGES = [
  { href: "/venue", label: "시설 개요" },
  { href: "/venue/specs", label: "시설 제원" },
  { href: "/venue/stage-features", label: "무대 특장" },
  { href: "/venue/amenities", label: "부대시설" },
] as const;

const no2 = (i: number) => String(i + 1).padStart(2, "0");

function RichLead({ html }: { html: string }) {
  return <div className={RICH_TEXT_CLS} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** 형제 페이지 내비 — 4개 페이지 모두 같은 자리에 같은 형태로 둔다. */
function SiblingNav({ current }: { current: string }) {
  const others = VENUE_PAGES.filter((p) => p.href !== current);
  return (
    <Band tone="white">
      <h2 className="type-display text-h6-m sm:text-h6">Your Stage</h2>
      <nav aria-label="공연장 소개 페이지" className="mt-8">
        <RowList>
          {others.map((p) => (
            <Row
              key={p.href}
              href={p.href}
              lead={no2(VENUE_PAGES.findIndex((x) => x.href === p.href))}
              title={p.label}
              action={<ArrowRight />}
            />
          ))}
        </RowList>
      </nav>
    </Band>
  );
}

/** 4개 페이지 공통 말미 — 형제 내비 + 전환 CTA */
function VenueFooterSections({ current }: { current: string }) {
  return (
    <>
      <SiblingNav current={current} />
      <CTABand
        title="이 무대에서 공연을 준비하세요."
        lead="대관 규모와 일정을 입력하면 예상 대관료를 즉시 확인할 수 있습니다."
        actions={
          <>
            <ButtonLink href="/apply" variant="primary" size="lg">
              대관 신청하기
              <ArrowRight />
            </ButtonLink>
            <ButtonLink href="/packages" variant="secondary" size="lg">
              대관 패키지 보기
            </ButtonLink>
          </>
        }
      />
    </>
  );
}

/* --------------------------------------------------------- 시설 개요 ------ */

export function VenueOverviewView({ content }: { content: VenueContent }) {
  const { intro, overviewIntro, halls, features, keyMaps } = content;

  return (
    <>
      <Band tone="light" size="lg">
        <PageHeading title="시설 개요" lead={<RichLead html={overviewIntro} />} />
        <div
          className={`mt-8 max-w-3xl text-m text-muted ${RICH_TEXT_CLS}`}
          dangerouslySetInnerHTML={{ __html: intro }}
        />
      </Band>

      <Band tone="white">
        <LayoutCards
          columns={3}
          items={halls.map((h) => ({
            title: h.title,
            meta: [h.no, h.titleEn, h.stat].filter(Boolean).join(" · "),
            desc: h.desc,
            image: h.image,
          }))}
        />
      </Band>

      {features.length > 0 && (
        <Band tone="dark">
          <LayoutColumns
            title="시설 구성의 강점"
            lead="공연 규모와 목적이 달라도 하나의 단지 안에서 해결하세요."
            columns={3}
            items={features.map((f, i) => ({ title: no2(i), desc: f }))}
          />
        </Band>
      )}

      <Band tone="light">
        <PageHeading
          as="h2"
          size="md"
          title="층별 키맵"
          lead="층별 좌석 배치와 관객·스태프 동선을 확인하세요."
        />
        <div className="mt-12">
          <KeyMapGallery keyMaps={keyMaps} />
        </div>
      </Band>

      <VenueFooterSections current="/venue" />
    </>
  );
}

/* --------------------------------------------------------- 시설 제원 ------ */

export function VenueSpecsView({ content }: { content: VenueContent }) {
  const { specsIntro, specs, providedFacilities } = content;

  /* 공연장을 열로 세우고 같은 항목은 한 행에 묶는다 (Comparison / 1).
     한쪽에만 있는 항목은 반대쪽을 "—" 로 채운다. */
  const specLabels: string[] = [];
  specs.forEach((s) =>
    s.rows.forEach(([label]) => {
      if (!specLabels.includes(label)) specLabels.push(label);
    }),
  );
  const specColumns = specs.map((s, i) => ({
    key: `${s.name}-${i}`,
    title: s.name,
    align: "left" as const,
  }));
  const specRows = specLabels.map((label) => ({
    label,
    cells: specs.map((s) => s.rows.find(([k]) => k === label)?.[1] || "—"),
  }));

  return (
    <>
      <Band tone="light" size="lg">
        <PageHeading title="시설 제원" lead={<RichLead html={specsIntro} />} />
      </Band>

      {specs.length > 0 && (
        <Band tone="white">
          <div
            className={`grid gap-6 ${specs.length > 2 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
          >
            {specs.map((s, i) => (
              <Media
                key={`${s.name}-${i}`}
                src={s.image}
                alt={s.name}
                ratio="16 / 9"
                revealDelay={i * 70}
              />
            ))}
          </div>
          <div className="mt-12">
            <ComparisonTable rowLabel="구분" columns={specColumns} rows={specRows} />
          </div>
        </Band>
      )}

      {providedFacilities.length > 0 && (
        <Band tone="light">
          <PageHeading
            as="h2"
            size="md"
            title="주요 제공 시설"
            lead="대관료에 포함되어 제공되는 시설입니다."
          />
          <div className="mt-12">
            <LayoutTextColumns columns={4} items={providedFacilities.map((f) => ({ title: f }))} />
          </div>
        </Band>
      )}

      <Band tone="white">
        <EmptyState
          title="기술자료 준비 중"
          desc="아레나·중형공연장 무대 장비 및 인프라 리스트를 담은 Technical Package는 정본 확정 후 제공합니다."
          action={
            <ButtonLink href="/faq" variant="secondary" size="sm">
              기술자료 문의
            </ButtonLink>
          }
        />
      </Band>

      <VenueFooterSections current="/venue/specs" />
    </>
  );
}

/* --------------------------------------------------------- 무대 특장 ------ */

export function VenueStageFeaturesView({ content }: { content: VenueContent }) {
  const { specHighlights } = content;

  return (
    <>
      <Band tone="light" size="lg">
        <PageHeading
          title="무대 특장"
          lead="아티스트·관객·제작진 각각의 관점에서 무대가 무엇을 가능하게 하는지 확인하세요."
        />
      </Band>

      {specHighlights.length > 0 ? (
        <Band tone="dark">
          <StageFeatureTabs highlights={specHighlights} />
        </Band>
      ) : (
        <Band tone="white">
          <EmptyState
            title="무대 특장 자료 준비 중"
            desc="무대 특장 항목은 정본 확정 후 제공합니다."
            action={
              <ButtonLink href="/venue/specs" variant="secondary" size="sm">
                시설 제원 보기
              </ButtonLink>
            }
          />
        </Band>
      )}

      <VenueFooterSections current="/venue/stage-features" />
    </>
  );
}

/* --------------------------------------------------------- 부대시설 ------- */

/** 부대시설 한 묶음 — 대표 시설은 가로형 카드(Layout / 3), 나머지는 라벨/값 제원 표 */
function AmenityGroup({ title, items }: { title: string; items: VenueAmenity[] }) {
  const featured = items.filter((f) => f.featured);
  const rest = items.filter((f) => !f.featured);
  return (
    <div>
      <h3 className="type-kr-heading text-h5-m sm:text-h5">{title}</h3>

      {featured.length > 0 && (
        <LayoutHorizCards
          items={featured.map((f) => ({
            title: f.name,
            desc: f.desc || undefined,
            image: f.image,
          }))}
        />
      )}

      {rest.length > 0 && (
        <SpecTable className="mt-10" rows={rest.map((f) => [f.name, f.desc] as [string, string])} />
      )}
    </div>
  );
}

export function VenueAmenitiesView({ content }: { content: VenueContent }) {
  const { arenaAmenities, mediumHallAmenities, amenityGallery } = content;

  return (
    <>
      <Band tone="light" size="lg">
        <PageHeading
          title="부대시설"
          lead="공연 준비부터 관객 응대까지, 운영에 필요한 공간을 함께 제공합니다."
        />
      </Band>

      {amenityGallery.length > 0 && (
        <Band tone="white">
          <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3">
            {amenityGallery.map((g, i) => (
              <li key={`${g.url}-${i}`}>
                <Media
                  src={g.url}
                  alt={g.label || "부대시설"}
                  ratio="4 / 3"
                  revealDelay={i * 70}
                />
                {g.label && <p className="mt-3 text-s text-muted">{g.label}</p>}
              </li>
            ))}
          </ul>
        </Band>
      )}

      <Band tone="light">
        <div className="space-y-20">
          <AmenityGroup title="아레나 부대시설" items={arenaAmenities} />
          <AmenityGroup title="중형공연장 부대시설" items={mediumHallAmenities} />
        </div>
        <Note className="mt-12 max-w-3xl">
          시설별 제공 범위는 공연 규모 및 계약 조건에 따라 달라질 수 있습니다.
        </Note>
      </Band>

      <VenueFooterSections current="/venue/amenities" />
    </>
  );
}
