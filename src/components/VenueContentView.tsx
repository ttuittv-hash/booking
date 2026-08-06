import type { ReactNode } from "react";
import type { VenueAmenity, VenueContent } from "@/lib/content/types";
import { KeyMapGallery, StageFeatureTabs } from "@/components/KeyMapGallery";
import {
  ArrowRight,
  Band,
  ButtonLink,
  EmptyState,
  Label,
  Media,
  SpecTable,
} from "@/components/ui/kit";

/* ============================================================================
   Your Stage — 시설 소개 (/venue)
   섹션 앵커(#overview · #specs · #stage-features · #amenities)는 헤더/푸터 내비게이션이
   참조하므로 그대로 유지하고, 구분은 Band 톤 교대로만 만든다.
   light → white → dark → light → white → dark → light → accent
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

/** 섹션 헤드 — 좌: 라벨 + 국문 타이틀 / 우: 리드. 국문 타이틀은 type-kr-heading. */
function Head({
  title,
  lead,
  tone = "light",
}: {
  label?: string;
  title: string;
  lead?: ReactNode;
  tone?: "light" | "dark";
}) {
  // 아이브로(tagline)는 쓰지 않는다. tone 은 밴드가 토큰을 뒤집으므로 더 이상 필요 없다.
  void tone;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:gap-16">
      <div>
        <h2 className="type-kr-heading text-h3-m sm:text-h3">{title}</h2>
      </div>
      {lead && <div className="text-m text-muted lg:pt-14">{lead}</div>}
    </div>
  );
}

/** 부대시설 한 묶음 — 대표 시설은 이미지 + 텍스트, 나머지는 제원 표(헤어라인) */
function AmenityGroup({
  title,
  items,
}: {
  title: string;
  items: VenueAmenity[];
}) {
  const featured = items.filter((f) => f.featured);
  const rest = items.filter((f) => !f.featured);
  return (
    <div>
      <h3 className="type-kr-heading text-h5-m sm:text-h5">{title}</h3>

      {featured.length > 0 && (
        <ul className="mt-8 grid gap-10 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
          {featured.map((f) => (
            <li key={f.name}>
              <Media src={f.image} alt={f.name} ratio="4 / 3" />
              <h4 className="type-kr-heading mt-4 text-h6-m sm:text-h6">{f.name}</h4>
              {f.desc && <p className="mt-2 text-s text-muted">{f.desc}</p>}
            </li>
          ))}
        </ul>
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

  return (
    <>
      {/* ── 페이지 타이틀 ─────────────────────────────────────────────────── */}
      <Band tone="light" size="lg">
        <Label className="mb-6 text-muted">Your Stage</Label>
        <h1 className="type-display text-d2-m sm:text-h1 lg:text-d2">Your Stage</h1>
        <p className="type-kr-heading mt-8 max-w-3xl text-h4-m sm:text-h4">
          K-POP 전문 아레나에서 당신의 무대를 설계하세요.
        </p>
        <div
          className={`mt-8 max-w-3xl text-m text-muted ${RICH_TEXT_CLS}`}
          dangerouslySetInnerHTML={{ __html: intro }}
        />

        <nav aria-label="시설 소개 섹션" className="mt-14 border-t border-border/25">
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {SECTION_NAV.map((s, i) => (
              <li key={s.href} className="border-b border-border/25">
                <a
                  href={s.href}
                  className="group flex items-center justify-between gap-4 py-5 pr-4 transition-colors hover:text-muted"
                >
                  <span className="flex items-baseline gap-3">
                    <span className="type-display text-xs tabular-nums text-muted">{no2(i)}</span>
                    <span className="type-kr-heading text-h6-m sm:text-h6">{s.label}</span>
                  </span>
                  <ArrowRight className="transition-transform group-hover:translate-x-1" />
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </Band>

      {/* ── 시설 개요 ─────────────────────────────────────────────────────── */}
      <Band id="overview" tone="white" className="scroll-mt-20">
        <Head
          title="시설 개요"
          lead={
            <div className={RICH_TEXT_CLS} dangerouslySetInnerHTML={{ __html: overviewIntro }} />
          }
        />

        <div className="mt-16 grid gap-12 sm:grid-cols-3 sm:gap-8">
          {halls.map((h) => (
            <div key={h.title}>
              <Media src={h.image} alt={h.title} ratio="4 / 3" />
              <div className="mt-5 flex items-center gap-3">
                {h.no && (
                  <span className="type-display inline-flex h-6 items-center justify-center bg-accent px-2 text-xs tabular-nums text-on-accent">
                    {h.no}
                  </span>
                )}
                <span className="type-label text-xs text-muted">{h.titleEn}</span>
              </div>
              <h3 className="type-kr-heading mt-3 text-h5-m sm:text-h5">{h.title}</h3>
              <p className="mt-3 text-s font-bold">{h.stat}</p>
              <p className="mt-3 text-s text-muted">{h.desc}</p>
            </div>
          ))}
        </div>
      </Band>

      {/* ── 시설 구성의 강점 (옐로 번호는 블랙 밴드에서만) ─────────────────── */}
      {features.length > 0 && (
        <Band tone="dark">
          <Head
            tone="dark"
            title="시설 구성의 강점"
            lead="공연 규모와 목적이 달라도 하나의 단지 안에서 해결하세요."
          />
          <ol className="mt-14 border-t border-inverse-fg/25">
            {features.map((f, i) => (
              <li
                key={f}
                className="grid gap-2 border-b border-inverse-fg/25 py-7 sm:grid-cols-[4rem_minmax(0,1fr)] sm:items-baseline sm:gap-8"
              >
                <span className="type-display text-h5 tabular-nums text-accent">{no2(i)}</span>
                <p className="text-m text-inverse-fg/85">{f}</p>
              </li>
            ))}
          </ol>
        </Band>
      )}

      {/* ── 층별 키맵 ─────────────────────────────────────────────────────── */}
      <Band tone="light">
        <Head
          title="층별 키맵"
          lead="층별 좌석 배치와 관객·스태프 동선을 확인하세요."
        />
        <div className="mt-12">
          <KeyMapGallery keyMaps={keyMaps} />
        </div>
      </Band>

      {/* ── 시설 제원 ─────────────────────────────────────────────────────── */}
      <Band id="specs" tone="white" className="scroll-mt-20">
        <Head
          title="아레나 / 중형공연장 시설 제원"
          lead={<div className={RICH_TEXT_CLS} dangerouslySetInnerHTML={{ __html: specsIntro }} />}
        />

        <div className="mt-16 grid gap-14 lg:grid-cols-2 lg:gap-16">
          {specs.map((s) => (
            <div key={s.name}>
              <Media src={s.image} alt={s.name} ratio="16 / 9" />
              <h3 className="type-kr-heading mt-5 text-h5-m sm:text-h5">{s.name}</h3>
              <SpecTable className="mt-6" rows={s.rows} />
            </div>
          ))}
        </div>

        <div className="mt-16">
          <h3 className="type-kr-heading text-h5-m sm:text-h5">주요 제공 시설</h3>
          <ul className="mt-6 grid border-t border-border/25 sm:grid-cols-2 lg:grid-cols-3">
            {providedFacilities.map((f, i) => (
              <li key={f} className="flex items-baseline gap-3 border-b border-border/25 py-4">
                <span className="type-display text-xs tabular-nums text-muted">{no2(i)}</span>
                <span className="text-s">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-14">
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

      {/* ── 무대 특장 (ARTIST / AUDIENCE / PRODUCER 탭) ───────────────────── */}
      {specHighlights.length > 0 && (
        <Band id="stage-features" tone="dark" className="scroll-mt-20">
          <Head
            tone="dark"
            title="무대 특장"
            lead="아티스트·관객·제작진 각각의 관점에서 무대가 무엇을 가능하게 하는지 확인하세요."
          />
          <div className="mt-14">
            <StageFeatureTabs highlights={specHighlights} />
          </div>
        </Band>
      )}

      {/* ── 부대 시설 ─────────────────────────────────────────────────────── */}
      <Band id="amenities" tone="light" className="scroll-mt-20">
        <Head
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

        <div className="mt-16 space-y-16">
          <AmenityGroup title="아레나 부대시설" items={arenaAmenities} />
          <AmenityGroup title="중형공연장 부대시설" items={mediumHallAmenities} />
        </div>

        <p className="mt-12 text-s text-muted">
          ※ 시설별 제공 범위는 공연 규모 및 계약 조건에 따라 달라질 수 있습니다.
        </p>
      </Band>

      {/* ── 전환 CTA (옐로 면 위 텍스트는 항상 검정) ───────────────────────── */}
      <Band tone="accent" size="md">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Label>Host It</Label>
            <h2 className="type-kr-heading mt-4 text-h3-m sm:text-h3">
              이 무대에서 공연을 준비하세요.
            </h2>
            <p className="mt-4 max-w-xl text-m">
              대관 규모와 일정을 입력하면 예상 대관료를 즉시 확인할 수 있습니다.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <ButtonLink href="/apply" variant="secondary" size="lg">
              대관 신청하기
              <ArrowRight />
            </ButtonLink>
            <ButtonLink href="/packages" variant="tertiary" size="lg">
              대관 패키지 보기
            </ButtonLink>
          </div>
        </div>
      </Band>
    </>
  );
}
