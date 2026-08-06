import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { getCurrentRateTable } from "@/lib/db";
import { num, won } from "@/lib/format";
import { findAddon, packagePrice, isAddonAvailable } from "@/lib/pricing/rateTableUtils";
import {
  ADDON_CATEGORY_LABEL,
  DEFAULT_VENUE_ID,
  MEDIA_TIER_LABEL,
  VENUES,
  type AddonCategory,
  type AddonItem,
  type PackageInclusion,
  type RentalPackage,
} from "@/lib/pricing/types";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import {
  ArrowRight,
  Band,
  type BandTone,
  ButtonLink,
  ComparisonTable,
  Note,
  PageHeading,
  SpecTable,
  btnClass,
} from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "대관 패키지 안내 | 서울아레나",
};

/** 카테고리 노출 순서 — 도메인 정의(AddonCategory) 순서를 그대로 따른다. */
const CATEGORY_ORDER = Object.keys(ADDON_CATEGORY_LABEL) as AddonCategory[];

/**
 * 이 페이지의 유일한 그리드. 모든 섹션이 같은 세로 기준선에서 시작한다.
 * 좌: 제목·설명 / 우: 데이터. 섹션마다 컬럼비나 여백을 바꾸지 않는다.
 */
const SPLIT =
  "grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:items-start lg:gap-16";

function addonRowLabel(addon: AddonItem, perRow: boolean): string {
  const unit =
    perRow && addon.pricingType !== "METERED"
      ? ` (${addon.unitLabel.replace(/^원\//, "")})`
      : "";
  return `${addon.name}${unit}${addon.note ? ` · ${addon.note}` : ""}`;
}

function addonRateCell(addon: AddonItem): string {
  return addon.pricingType === "METERED" ? "—" : num(addon.unitPrice);
}

/** "100대/일" → "100" (단위는 행 라벨에 한 번만 쓴다) */
function parkingCount(value: string): string {
  const stripped = value.replace("대/일", "").trim();
  return stripped || value;
}

function audienceRange(pkg: RentalPackage): string {
  const { min, max } = pkg.audienceTier;
  return min > 0 ? `${num(min)} ~ ${num(max)}` : `~ ${num(max)}`;
}

/** 패키지 규모 흐름의 4번째 단계: 이 패키지에서 무엇을 더 얹을 수 있는지 */
function optionRows(pkg: RentalPackage, addons: AddonItem[]): [string, string][] {
  const includedIds = new Set(pkg.includedItems.map((i) => i.addonId));
  const available = addons.filter((a) => isAddonAvailable(a, pkg));
  const overage = available.filter((a) => includedIds.has(a.id));
  const conditional = available.filter(
    (a) => !includedIds.has(a.id) && a.availability.mode !== "ALWAYS",
  );
  const common = available.filter((a) => !includedIds.has(a.id) && a.availability.mode === "ALWAYS");

  const rows: [string, string][] = [];
  if (overage.length > 0) {
    rows.push(["기본 포함분 초과 추가", overage.map((a) => a.name).join(" · ")]);
  }
  if (conditional.length > 0) {
    rows.push(["이 패키지에서만 추가", conditional.map((a) => a.name).join(" · ")]);
  }
  rows.push([
    "공통 부대항목",
    `${common.length}개 항목 — 아래 부대항목 표에서 단가를 확인하세요.`,
  ]);
  return rows;
}

interface IncludedRow {
  item: PackageInclusion;
  addon: AddonItem | undefined;
}

/** 기본 포함 항목을 카테고리로 묶는다 — 카테고리는 하나도 빼지 않는다. */
function includedGroups(
  pkg: RentalPackage,
  lookup: (id: string) => AddonItem | undefined,
): { title: string; rows: IncludedRow[] }[] {
  const all: IncludedRow[] = pkg.includedItems.map((item) => ({
    item,
    addon: lookup(item.addonId),
  }));
  const groups = CATEGORY_ORDER.map((category) => ({
    title: ADDON_CATEGORY_LABEL[category],
    rows: all.filter((r) => r.addon?.category === category),
  })).filter((g) => g.rows.length > 0);
  const ungrouped = all.filter((r) => !r.addon);
  if (ungrouped.length > 0) groups.push({ title: "기타", rows: ungrouped });
  return groups;
}

function includedRateUnit(rows: IncludedRow[]): string {
  const units = new Set(rows.map((r) => r.addon?.unitLabel).filter(Boolean) as string[]);
  return units.size === 1 ? [...units][0] : "원";
}

function allRows(groups: { rows: IncludedRow[] }[]): IncludedRow[] {
  return groups.flatMap((g) => g.rows);
}

export default async function PackagesPage() {
  // 요금·기본 포함 수량은 계약 조건에 해당하므로 로그인한 신청자에게만 공개한다.
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  if (isPendingApplicant(currentUser)) redirect("/pending");

  const rateTable = getCurrentRateTable();
  const packages = [...rateTable.packages].sort((a, b) => a.audienceTier.min - b.audienceTier.min);
  const lookupAddon = (id: string) => findAddon(rateTable, id);
  const addonsByCategory = CATEGORY_ORDER.map((category) => ({
    category,
    items: rateTable.addons.filter((a) => a.category === category),
  })).filter((g) => g.items.length > 0);
  // 공간마다 패키지 구성이 다르므로 비교표도 공간 단위로 나눈다.
  const packagesByVenue = VENUES.map((venue) => ({
    venue,
    items: packages.filter((p) => (p.venueId ?? DEFAULT_VENUE_ID) === venue.id),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/packages" currentUser={currentUser} />

      <main className="flex flex-1 flex-col">
        {/* ── 페이지 타이틀 ────────────────────────────────────────────────── */}
        <Band tone="light" size="lg">
          <PageHeading
            title="대관 패키지"
            lead="객석 규모에 맞는 패키지를 고르면 기본 대관료와 기본 포함 항목이 정해집니다. 필요한 부대항목만 더해 예상 대관료를 신청 화면에서 바로 확인하세요."
          />
        </Band>

        {/* ── 패키지 비교 — 패키지를 열로, 조건을 행으로 ───────────────────── */}
        <Band tone="dark">
          <PageHeading
            as="h2"
            title="패키지 비교"
            lead="기본 대관료는 화~일 1주 기준 정찰제이며 VAT는 별도입니다. 패키지명을 누르면 상세 구성으로 이동합니다."
          />

          <div className="mt-14 space-y-12">
            {packagesByVenue.map(({ venue, items }) => (
              <div key={venue.id}>
                <h3 className="type-kr-heading mb-4 text-h6-m sm:text-h6">{venue.name}</h3>
                <ComparisonTable
                  rowLabel="구분"
                  columns={items.map((pkg) => ({
                    key: String(pkg.id),
                    align: "left" as const,
                    title: (
                      <Link
                        href={`#package-${pkg.id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {pkg.name}
                      </Link>
                    ),
                  }))}
                  rows={[
                    {
                      label: "관객 규모 (명)",
                      cells: items.map((pkg) => audienceRange(pkg)),
                    },
                    {
                      label: "기본 대관료 (원 · VAT 별도)",
                      cells: items.map((pkg) => num(packagePrice(rateTable, pkg))),
                    },
                    {
                      label: "홍보 디지털 매체",
                      cells: items.map((pkg) =>
                        pkg.mediaTier ? MEDIA_TIER_LABEL[pkg.mediaTier] : "—",
                      ),
                    },
                    {
                      label: "주차 (대/일)",
                      cells: items.map((pkg) => parkingCount(pkg.parkingPerDay)),
                    },
                    {
                      label: "대기실",
                      cells: items.map((pkg) => pkg.waitingRoomNote),
                    },
                    {
                      label: "세부 구성",
                      cells: items.map((pkg) => pkg.dayBreakdown),
                    },
                    {
                      label: "대관시간",
                      cells: items.map((pkg) => pkg.rentalHours),
                    },
                    {
                      label: "부속공간",
                      cells: items.map((pkg) => pkg.sideFacilities),
                    },
                    {
                      label: "야외광장 · 티켓박스",
                      cells: items.map((pkg) => (pkg.outdoorPlazaIncluded ? "✓" : "—")),
                    },
                    {
                      label: "기본 포함 항목 (개)",
                      cells: items.map((pkg) => num(pkg.includedItems.length)),
                    },
                  ]}
                />
              </div>
            ))}
          </div>
        </Band>

        {/* ── 패키지별 상세: 기본 대관료 → 기본 포함 항목 → 선택 추가 ─────── */}
        {packages.map((pkg, i) => {
          const tone: BandTone = i % 2 === 0 ? "white" : "light";
          const groups = includedGroups(pkg, lookupAddon);
          return (
            <Band key={pkg.id} tone={tone} id={`package-${pkg.id}`} className="scroll-mt-24">
              {/*
                레이아웃 규칙: 이 페이지의 모든 섹션은 같은 2컬럼 그리드(SPLIT)를 쓰고
                두 컬럼은 항상 같은 높이에서 시작한다. 섹션마다 pt 를 다르게 주지 않는다.
              */}
              <div className={SPLIT}>
                <div>
                  <h2 className="type-kr-heading text-h3-m sm:text-h3">{pkg.name}</h2>
                  <p className="type-display mt-4 text-h6-m tabular-nums sm:text-h6">
                    {pkg.audienceTier.label}
                  </p>
                  <p className="mt-5 max-w-md text-m text-muted">{pkg.tagline}</p>
                </div>
                <div className="border-t-2 border-foreground pt-6">
                  <p className="text-xs font-bold text-muted">기본 대관료</p>
                  <p className="type-display mt-3 text-h3-m tabular-nums sm:text-h3">
                    {won(packagePrice(rateTable, pkg))}
                  </p>
                  <p className="mt-3 text-s text-muted">
                    {pkg.includedWeeks}주 (화~일) 기준 · VAT 별도 · {pkg.dayBreakdown}
                  </p>
                </div>
              </div>

              {/* 기본 포함 항목 — 카테고리는 표를 쪼개지 말고 소제목 행으로 (열 폭 통일) */}
              <div className={`mt-16 ${SPLIT}`}>
                <div>
                  <h3 className="type-kr-heading text-h5-m sm:text-h5">기본 포함 항목</h3>
                  <p className="mt-4 max-w-md text-s text-muted">
                    아래 수량까지는 정찰제 대관료에 포함됩니다. 초과 단가는 포함 수량을 넘겼을 때만
                    적용됩니다. 운영 조건(주차·대기실·매체 등)은 위 패키지 비교표에서 확인하세요.
                  </p>
                </div>
                <div>
                  {groups.length === 0 ? (
                    <p className="border-t border-border/25 py-4 text-s text-muted">
                      별도 기본 포함 항목 없음
                    </p>
                  ) : (
                    <ComparisonTable
                      dense
                      rowLabel="항목"
                      columns={[
                        { key: "qty", title: "수량" },
                        { key: "rate", title: "초과 단가", sub: includedRateUnit(allRows(groups)) },
                      ]}
                      groups={groups.map((group) => ({
                        title: group.title,
                        rows: group.rows.map(({ item, addon }) => ({
                          label: addon?.name ?? item.addonId,
                          cells: [
                            num(item.quantity),
                            addon && addon.unitPrice > 0 ? num(addon.unitPrice) : "—",
                          ],
                        })),
                      }))}
                    />
                  )}
                </div>
              </div>

              {/* 선택 추가 */}
              <div className={`mt-16 ${SPLIT}`}>
                <div>
                  <h3 className="type-kr-heading text-h5-m sm:text-h5">선택 추가</h3>
                  <p className="mt-4 max-w-md text-s text-muted">
                    기본 포함분을 넘는 수량과 이 패키지에서만 고를 수 있는 항목입니다.
                  </p>
                </div>
                <SpecTable dense rows={optionRows(pkg, rateTable.addons)} />
              </div>
            </Band>
          );
        })}

        {/* ── 부대항목 — 카테고리 전체 단가 ────────────────────────────────── */}
        <Band tone="white" id="addons" className="scroll-mt-24">
          {/* 이 섹션도 같은 SPLIT 그리드를 쓴다 — 페이지 전체가 한 기준선 위에 놓인다. */}
          <div className={SPLIT}>
            <div>
              <h2 className="type-kr-heading text-h2-m sm:text-h2">부대항목</h2>
              <p className="mt-6 max-w-md text-m text-muted">
                공간·프로덕션·홍보 등 {addonsByCategory.length}개 카테고리{" "}
                {rateTable.addons.length}개 항목을 필요한 만큼 선택합니다. 기본 포함분을 넘는
                수량만 과금됩니다.
              </p>
              <Note className="mt-8 max-w-md">
                유틸리티(전기·상하수도·냉난방)는 실사용량 기준으로 사후 정산하므로 예상 견적에는
                포함되지 않습니다. 단가가 “—” 인 항목은 실사용 정산 대상입니다.
              </Note>
            </div>

            {/* 카테고리별로 표를 쪼개면 열 폭이 제각각이 된다 — 한 표에 소제목 행으로 묶는다. */}
            <ComparisonTable
              dense
              rowLabel="항목"
              columns={[{ key: "rate", title: "단가", sub: "원 · VAT 별도" }]}
              groups={addonsByCategory.map(({ category, items }) => ({
                title: `${ADDON_CATEGORY_LABEL[category]} (${items.length})`,
                // 한 표 안에 단위가 여러 개 섞이므로 단위는 항상 항목명 옆에 적는다.
                rows: items.map((addon) => ({
                  label: addonRowLabel(addon, true),
                  cells: [addonRateCell(addon)],
                })),
              }))}
            />
          </div>
        </Band>

        {/* ── 전환 CTA (옐로 면 위 텍스트는 항상 검정) ─────────────────────── */}
        <Band tone="accent" size="md">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="type-kr-heading text-h3-m sm:text-h3">
                규모와 일정을 넣으면 예상 대관료가 나옵니다.
              </h2>
              <p className="mt-4 max-w-xl text-m">
                준비·공연 일수 조정, 청소비, 홍보 매체까지 신청 화면에서 실시간으로 반영됩니다.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Link href="/apply?new=1" className={btnClass("secondary", "lg")}>
                대관 신청 시작하기
                <ArrowRight />
              </Link>
              <ButtonLink href="/guide#rates" variant="tertiary" size="lg">
                대관 안내로
              </ButtonLink>
            </div>
          </div>
        </Band>
      </main>

      <SiteFooter />
    </div>
  );
}
