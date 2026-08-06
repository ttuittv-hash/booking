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
  PageHeading,
  Row,
  RowList,
  SpecTable,
} from "@/components/ui/kit";

/* ============================================================================
   Your Stage — 시설 소개 (/venue)
   섹션 앵커(#overview · #specs · #stage-features · #amenities)는 헤더/푸터 내비게이션이
   참조하므로 그대로 유지하고, 구분은 Band 톤 교대로만 만든다.
   light → white → dark → light → white → dark → light → accent

   본문은 Figma Wireframe 의 레이아웃 모듈만 조합한다.
   아이브로(Tagline)는 쓰지 않고, 이미지 슬롯은 전부 Media 로 둔다.
   ========================================================================= */

/** 관리자 리치텍스트(dangerouslySetInnerHTML) 공통 서식.
 *  링크는 옐로 대신 굵은 밑줄로 — 옐로는 밝은 배경 위 텍스트로 쓰지 않는다. */
const RICH_TEXT_CLS =
  "[&_a]:font-bold [&_a]:text-foreground [&_a]:underline [&_li]:mt-1 [&_p]:my-3 [&_p]:first:mt-0 [&_p]:last:mb-0 [&_strong]:font-bold [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-5";

const SECTION_NAV = [
  { href: "#overview", label: "시설 개요" },
  { href: "#specs", label: "시설 제원" },
  { href: "#stage-features", label: "무대 특장" },
  { href: "#amenities", label: "부대시설" },
] as const;

const no2 = (i: number) => String(i + 1).padStart(2, "0");

/** 리치텍스트 리드 — PageHeading 의 lead 는 div 로 감싸이므로 블록 태그가 안전하다. */
function RichLead({ html }: { html: string }) {
  return <div className={RICH_TEXT_CLS} dangerouslySetInnerHTML={{ __html: html }} />;
}

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

export function VenueContentView({ content }: { content: VenueContent }) {
  const {
    intro,
    overviewIntro,
    halls,
    features,
    specsIntro,
    specs,
    specHighlights,
    providedFacilities,
    arenaAmenities,
    mediumHallAmenities,
    amenityGallery,
    keyMaps,
  } = content;

  /* 시설 제원 — 공연장을 열로 세우고 같은 항목은 한 행에 묶는다 (Comparison / 1).
     한쪽에만 있는 항목은 반대쪽을 "—" 로 채운다. */
  const specLabels: string[] = [];
  specs.forEach((s) =>
    s.rows.forEach(([label]) => {
      if (!specLabels.includes(label)) specLabels.push(label);
    }),
  );
  const specColumns = specs.map((s, i) => ({ key: `${s.name}-${i}`, title: s.name }));
  const specRows = specLabels.map((label) => ({
    label,
    cells: specs.map((s) => s.rows.find(([k]) => k === label)?.[1] || "—"),
  }));

  return (
    <>
      {/* ── 페이지 타이틀 ─────────────────────────────────────────────────── */}
      <Band tone="light" size="lg">
        <h1 className="type-display text-d2-m sm:text-h1 lg:text-d2">Your Stage</h1>
        <p className="type-kr-heading mt-8 max-w-3xl text-h4-m sm:text-h4">
          K-POP 전문 아레나에서 당신의 무대를 설계하세요.
        </p>
        <div
          className={`mt-8 max-w-3xl text-m text-muted ${RICH_TEXT_CLS}`}
          dangerouslySetInnerHTML={{ __html: intro }}
        />

        <nav aria-label="시설 소개 섹션" className="mt-14">
          <RowList>
            {SECTION_NAV.map((s, i) => (
              <Row
                key={s.href}
                href={s.href}
                lead={no2(i)}
                title={s.label}
                action={<ArrowRight />}
              />
            ))}
          </RowList>
        </nav>
      </Band>

      {/* ── 시설 개요 (Figma Layout / 1) ──────────────────────────────────── */}
      <Band id="overview" tone="white" className="scroll-mt-20">
        <PageHeading
          as="h2"
          size="md"
          title="시설 개요"
          lead={<RichLead html={overviewIntro} />}
        />
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

      {/* ── 시설 구성의 강점 (Figma Layout / 4) ───────────────────────────── */}
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

      {/* ── 층별 키맵 ─────────────────────────────────────────────────────── */}
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

      {/* ── 시설 제원 (Figma Comparison / 1) ──────────────────────────────── */}
      <Band id="specs" tone="white" className="scroll-mt-20">
        <PageHeading
          as="h2"
          size="md"
          title="아레나 / 중형공연장 시설 제원"
          lead={<RichLead html={specsIntro} />}
        />

        {specs.length > 0 && (
          <>
            <div
              className={`mt-14 grid gap-6 ${specs.length > 2 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
            >
              {specs.map((s, i) => (
                <Media key={`${s.name}-${i}`} src={s.image} alt={s.name} ratio="16 / 9" />
              ))}
            </div>
            <div className="mt-12">
              <ComparisonTable rowLabel="구분" columns={specColumns} rows={specRows} />
            </div>
          </>
        )}

        {providedFacilities.length > 0 && (
          <div className="mt-16">
            <h3 className="type-kr-heading text-h5-m sm:text-h5">주요 제공 시설</h3>
            <div className="mt-10">
              <LayoutTextColumns
                columns={4}
                items={providedFacilities.map((f) => ({ title: f }))}
              />
            </div>
          </div>
        )}

        <div className="mt-16">
          <EmptyState
            title="기술자료 준비 중"
            desc="아레나·중형공연장 무대 장비 및 인프라 리스트를 담은 Technical Package는 정본 확정 후 제공합니다."
            action={
              <ButtonLink href="/faq" variant="secondary" size="sm">
                기술자료 문의
              </ButtonLink>
            }
          />
        </div>
      </Band>

      {/* ── 무대 특장 (ARTIST / AUDIENCE / PRODUCER 탭 + Layout / 2) ──────── */}
      {specHighlights.length > 0 && (
        <Band id="stage-features" tone="dark" className="scroll-mt-20">
          <PageHeading
            as="h2"
            size="md"
            title="무대 특장"
            lead="아티스트·관객·제작진 각각의 관점에서 무대가 무엇을 가능하게 하는지 확인하세요."
          />
          <div className="mt-14">
            <StageFeatureTabs highlights={specHighlights} />
          </div>
        </Band>
      )}

      {/* ── 부대 시설 (Figma Layout / 3 + 제원 표) ────────────────────────── */}
      <Band id="amenities" tone="light" className="scroll-mt-20">
        <PageHeading
          as="h2"
          size="md"
          title="부대 시설"
          lead="공연 준비부터 관객 응대까지, 운영에 필요한 공간을 함께 제공합니다."
        />

        {amenityGallery.length > 0 && (
          <ul className="mt-14 grid grid-cols-2 gap-6 sm:grid-cols-3">
            {amenityGallery.map((g, i) => (
              <li key={`${g.url}-${i}`}>
                <Media src={g.url} alt={g.label || "부대시설"} ratio="4 / 3" />
                {g.label && <p className="mt-3 text-s text-muted">{g.label}</p>}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-16 space-y-20">
          <AmenityGroup title="아레나 부대시설" items={arenaAmenities} />
          <AmenityGroup title="중형공연장 부대시설" items={mediumHallAmenities} />
        </div>

        <p className="mt-12 text-s text-muted">
          ※ 시설별 제공 범위는 공연 규모 및 계약 조건에 따라 달라질 수 있습니다.
        </p>
      </Band>

      {/* ── 전환 CTA (Figma CTA / 1) ──────────────────────────────────────── */}
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
