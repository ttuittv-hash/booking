import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { getCurrentRateTable } from "@/lib/db";
import { won } from "@/lib/format";
import { findAddon, packagePrice, isAddonAvailable } from "@/lib/pricing/rateTableUtils";
import {
  ADDON_CATEGORY_LABEL,
  MEDIA_TIER_LABEL,
  type AddonCategory,
  type AddonItem,
  type RentalPackage,
} from "@/lib/pricing/types";
import { PublicHeader } from "@/components/PublicHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SiteFooter } from "@/components/ui/SiteFooter";
import {
  ArrowRight,
  Band,
  type BandTone,
  ButtonLink,
  Label,
  SectionHead,
  SpecTable,
  btnClass,
} from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "대관 패키지 안내 | 서울아레나",
};

/** 부대항목 표에 쓰는 단가 표기 — "₩3,000,000 / 일" 형태로 정규화 */
function priceLabel(addon: AddonItem): string {
  if (addon.pricingType === "METERED") return "실사용 정산";
  if (addon.pricingType === "REVENUE_PERCENT") return `매출 ${addon.unitPrice}%`;
  return `${won(addon.unitPrice)} ${addon.unitLabel.replace(/^원\//, "/ ")}`;
}

/** 카테고리 노출 순서 — 도메인 정의(AddonCategory) 순서를 그대로 따른다. */
const CATEGORY_ORDER = Object.keys(ADDON_CATEGORY_LABEL) as AddonCategory[];

/** 패키지 규모 흐름의 4번째 단계: 이 패키지에서 무엇을 더 얹을 수 있는지 */
function optionRows(
  pkg: RentalPackage,
  addons: AddonItem[],
): { label: string; value: string }[] {
  const includedIds = new Set(pkg.includedItems.map((i) => i.addonId));
  const available = addons.filter((a) => isAddonAvailable(a, pkg));
  const overage = available.filter((a) => includedIds.has(a.id));
  const conditional = available.filter(
    (a) => !includedIds.has(a.id) && a.availability.mode !== "ALWAYS",
  );
  const common = available.filter((a) => !includedIds.has(a.id) && a.availability.mode === "ALWAYS");

  const rows: { label: string; value: string }[] = [];
  if (overage.length > 0) {
    rows.push({
      label: "기본 포함분 초과 추가",
      value: overage.map((a) => a.name).join(" · "),
    });
  }
  if (conditional.length > 0) {
    rows.push({
      label: "이 패키지에서만 추가",
      value: conditional.map((a) => a.name).join(" · "),
    });
  }
  rows.push({
    label: "공통 부대항목",
    value: `${common.length}개 항목 — 아래 부대항목 표에서 단가를 확인하세요.`,
  });
  return rows;
}

export default async function PackagesPage() {
  // 요금·기본 포함 수량은 계약 조건에 해당하므로 로그인한 신청자에게만 공개한다.
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  if (isPendingApplicant(currentUser)) redirect("/pending");

  const rateTable = getCurrentRateTable();
  const packages = [...rateTable.packages].sort((a, b) => a.audienceTier.min - b.audienceTier.min);
  const addonsByCategory = CATEGORY_ORDER.map((category) => ({
    category,
    items: rateTable.addons.filter((a) => a.category === category),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/guide" currentUser={currentUser} />
      <Breadcrumb items={[{ label: "Book It", href: "/guide" }, { label: "대관 패키지" }]} />

      <main className="flex flex-1 flex-col">
        {/* ── 페이지 타이틀 ────────────────────────────────────────────────── */}
        <Band tone="light" size="lg">
          <Label className="mb-6 text-muted">Book It</Label>
          <h1 className="type-display text-d2-m sm:text-h1 lg:text-d2">Book It</h1>
          <p className="type-kr-heading mt-6 text-h4-m sm:text-h4">대관 패키지</p>
          <p className="mt-8 max-w-3xl text-m text-muted">
            객석 규모에 맞는 패키지를 고르면 기본 대관료와 기본 포함 항목이 정해집니다. 필요한
            부대항목만 더해 예상 대관료를 신청 화면에서 바로 확인하세요.
          </p>
        </Band>

        {/* ── 규모별 진입 — 어느 규모에서 어느 패키지인지 먼저 보여준다 ────── */}
        <Band tone="dark">
          <SectionHead
            tone="dark"
            label="Scale"
            title="규모로 고르세요"
            lead="예상 관객 규모가 패키지를 결정합니다. 기본 대관료는 화~일 1주 기준 정찰제이며 VAT는 별도입니다."
          />

          <ol className="mt-14 border-t border-inverse-fg/25">
            {packages.map((pkg) => (
              <li key={pkg.id} className="border-b border-inverse-fg/25">
                <Link
                  href={`#package-${pkg.id}`}
                  className="group grid gap-3 py-7 transition-colors hover:bg-inverse-fg/[0.06] sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto] sm:items-baseline sm:gap-8 sm:px-2"
                >
                  <span className="type-display text-h5 tabular-nums text-accent">
                    {pkg.audienceTier.label}
                  </span>
                  <span className="min-w-0">
                    <span className="type-kr-heading block text-h6-m sm:text-h6">{pkg.name}</span>
                    <span className="mt-2 block text-s text-inverse-fg/80">{pkg.tagline}</span>
                  </span>
                  <span className="type-display shrink-0 text-h6 tabular-nums sm:text-h5">
                    {won(packagePrice(rateTable, pkg))}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </Band>

        {/* ── 패키지별 시나리오: 규모 → 기본 대관료 → 기본 포함 → 선택 추가 ── */}
        {packages.map((pkg, i) => {
          const tone: BandTone = i % 2 === 0 ? "white" : "light";
          return (
            <Band key={pkg.id} tone={tone} id={`package-${pkg.id}`} className="scroll-mt-24">
              {/* 1) 규모 · 2) 기본 대관료 */}
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:gap-16">
                <div>
                  <Label className="mb-4 text-muted">
                    Package {String(pkg.id).padStart(2, "0")}
                  </Label>
                  <h2 className="type-display text-h3-m sm:text-h3 lg:text-h2">
                    {pkg.audienceTier.label}
                  </h2>
                  <p className="type-kr-heading mt-4 text-h5-m sm:text-h5">{pkg.name}</p>
                </div>
                <div className="lg:pt-6">
                  <p className="text-m text-muted">{pkg.tagline}</p>
                  <div className="mt-8 border-t border-border/25 pt-6">
                    <Label className="text-muted">기본 대관료</Label>
                    <p className="type-display mt-3 text-h3-m tabular-nums sm:text-h2">
                      {won(packagePrice(rateTable, pkg))}
                    </p>
                    <p className="mt-3 text-s text-muted">
                      {pkg.includedWeeks}주 (화~일) 기준 · VAT 별도 · {pkg.dayBreakdown}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3) 기본 포함 */}
              <div className="mt-14 grid gap-10 lg:grid-cols-2 lg:gap-16">
                <div>
                  <Label className="text-muted">기본 포함 — 운영 조건</Label>
                  <SpecTable
                    className="mt-5"
                    rows={[
                      ["세부 구성", pkg.dayBreakdown],
                      ["대관시간", pkg.rentalHours],
                      ["주차", pkg.parkingPerDay],
                      ["대기실", pkg.waitingRoomNote],
                      ["부속공간", pkg.sideFacilities],
                      [
                        "야외광장",
                        pkg.outdoorPlazaIncluded ? "야외광장 + 티켓박스 포함" : "미포함",
                      ],
                      [
                        "홍보 디지털 매체",
                        pkg.mediaTier ? MEDIA_TIER_LABEL[pkg.mediaTier] : "미포함",
                      ],
                    ]}
                  />
                </div>
                <div>
                  <Label className="text-muted">기본 포함 — 항목</Label>
                  {pkg.includedItems.length === 0 ? (
                    <p className="mt-5 border-t border-border/25 py-4 text-s text-muted">
                      별도 기본 포함 항목 없음
                    </p>
                  ) : (
                    <dl className="mt-5 border-t border-border/25">
                      {pkg.includedItems.map((item) => {
                        const addon = findAddon(rateTable, item.addonId);
                        return (
                          <div
                            key={item.addonId}
                            className="flex items-baseline justify-between gap-6 border-b border-border/25 py-4"
                          >
                            <dt className="text-s font-bold">{addon?.name ?? item.addonId}</dt>
                            <dd className="type-display shrink-0 text-r tabular-nums">
                              {item.quantity}
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                  )}
                </div>
              </div>

              {/* 4) 선택 추가 */}
              <div className="mt-14">
                <Label className="text-muted">선택 추가</Label>
                <dl className="mt-5 border-t border-border/25">
                  {optionRows(pkg, rateTable.addons).map((row) => (
                    <div
                      key={row.label}
                      className="grid gap-1 border-b border-border/25 py-4 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:gap-6"
                    >
                      <dt className="text-s font-bold">{row.label}</dt>
                      <dd className="text-s text-muted">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Band>
          );
        })}

        {/* ── 부대항목 — 9개 카테고리 전체 단가 ────────────────────────────── */}
        <Band tone="white" id="addons" className="scroll-mt-24">
          <SectionHead
            label="Add-ons"
            title="부대항목"
            lead={`공간·프로덕션·홍보 등 ${addonsByCategory.length}개 카테고리 ${rateTable.addons.length}개 항목을 필요한 만큼 선택합니다. 기본 포함분을 넘는 수량만 과금됩니다.`}
          />

          <div className="mt-14 space-y-12">
            {addonsByCategory.map(({ category, items }) => (
              <div key={category}>
                <div className="flex items-baseline justify-between gap-4 pb-4">
                  <h3 className="type-kr-heading text-h6-m sm:text-h6">
                    {ADDON_CATEGORY_LABEL[category]}
                  </h3>
                  <span className="type-display text-r tabular-nums text-muted">
                    {items.length}
                  </span>
                </div>
                <SpecTable
                  rows={items.map(
                    (a) =>
                      [
                        a.name,
                        a.note ? `${priceLabel(a)} · ${a.note}` : priceLabel(a),
                      ] as [string, string],
                  )}
                />
              </div>
            ))}
          </div>

          <p className="mt-10 max-w-3xl text-s text-muted">
            유틸리티(전기·상하수도·냉난방)는 실사용량 기준으로 사후 정산하므로 예상 견적에는
            포함되지 않습니다.
          </p>
        </Band>

        {/* ── 전환 CTA (옐로 면 위 텍스트는 항상 검정) ─────────────────────── */}
        <Band tone="accent" size="md">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Label>Host It</Label>
              <h2 className="type-kr-heading mt-4 text-h3-m sm:text-h3">
                규모와 일정을 넣으면 예상 대관료가 나옵니다.
              </h2>
              <p className="mt-4 max-w-xl text-m">
                준비·공연 일수 조정, 청소비, 홍보 매체까지 신청 화면에서 실시간으로 반영됩니다.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Link href="/apply?new=1" className={btnClass("outline", "lg")}>
                대관 신청 시작하기
                <ArrowRight />
              </Link>
              <ButtonLink href="/guide#rates" variant="ghost" size="lg">
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
