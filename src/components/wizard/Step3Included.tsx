"use client";

import { num, won } from "@/lib/format";
import { findAddon, findPackage } from "@/lib/pricing/rateTableUtils";
import {
  ADDON_CATEGORY_LABEL,
  type AddonCategory,
  type AddonItem,
  type PackageInclusion,
  type RateTable,
} from "@/lib/pricing/types";
import { ComparisonTable } from "@/components/ui/kit";
import { StepHeading } from "./StepHeading";

const MEDIA_TIER_LABEL: Record<string, string> = {
  BASIC: "기본",
  EXTENDED: "확장",
  FULL: "풀팩",
};

const CATEGORY_ORDER = Object.keys(ADDON_CATEGORY_LABEL) as AddonCategory[];

interface IncludedRow {
  item: PackageInclusion;
  addon: AddonItem | undefined;
}

export function Step3Included({
  rateTable,
  packageId,
}: {
  rateTable: RateTable;
  packageId: number | null;
}) {
  const pkg = findPackage(rateTable, packageId);

  if (!pkg) {
    return <EmptyState />;
  }

  // 운영 조건 — 포함은 ✓, 해당 없음은 —
  const conditionRows: { label: string; cells: [string] }[] = [
    { label: "대관시간", cells: [pkg.rentalHours] },
    { label: "세부 구성", cells: [pkg.dayBreakdown] },
    { label: "주차", cells: [pkg.parkingPerDay] },
    { label: "홍보 매체", cells: [pkg.mediaTier ? MEDIA_TIER_LABEL[pkg.mediaTier] : "—"] },
    { label: "대기실", cells: [pkg.waitingRoomNote] },
    { label: "부속공간", cells: [pkg.sideFacilities] },
    { label: "야외광장 · 티켓박스", cells: [pkg.outdoorPlazaIncluded ? "✓" : "—"] },
  ];

  // 기본 포함 항목 — 카테고리로 묶고 묶음마다 소제목을 준다
  const all: IncludedRow[] = pkg.includedItems.map((item) => ({
    item,
    addon: findAddon(rateTable, item.addonId),
  }));
  const groups = CATEGORY_ORDER.map((category) => ({
    title: ADDON_CATEGORY_LABEL[category],
    rows: all.filter((r) => r.addon?.category === category),
  })).filter((g) => g.rows.length > 0);
  const ungrouped = all.filter((r) => !r.addon);
  if (ungrouped.length > 0) groups.push({ title: "기타", rows: ungrouped });

  return (
    <section>
      <StepHeading
        title={<>기본 포함사항</>}
        lead={<>{pkg.name}에 기본 포함된 구성입니다. 초과분만 4단계에서 추가 과금됩니다.</>}
      />

      <div className="mt-7">
        <ComparisonTable
          dense
          rowLabel="운영 조건"
          columns={[{ key: "value", title: "기본 제공", align: "left" }]}
          rows={conditionRows}
        />
      </div>

      <h3 className="type-kr-heading mt-10 text-h6-m sm:text-h6">
        {pkg.name} 기본 포함 항목
      </h3>
      <p className="mt-2 text-s text-muted">
        화~일 1주 정찰제 대관료에 아래 수량이 포함됩니다. 초과 단가는 포함 수량을 넘겼을 때만
        적용됩니다.
      </p>

      {groups.length === 0 ? (
        <p className="mt-5 border-t border-border/25 py-4 text-s text-muted">
          별도 기본 포함 항목 없음
        </p>
      ) : (
        // 카테고리마다 표를 만들면 열 폭이 제각각이 된다 — 한 표에 소제목 행으로 묶는다.
        <div className="mt-5">
          <ComparisonTable
            dense
            rowLabel="항목"
            columns={[
              { key: "qty", title: "수량" },
              { key: "rate", title: "초과 단가" },
            ]}
            groups={groups.map((group) => ({
              title: group.title,
              rows: group.rows.map(({ item, addon }) => ({
                label: addon?.name ?? item.addonId,
                cells: [
                  num(item.quantity),
                  addon && addon.unitPrice > 0 ? won(addon.unitPrice) : "—",
                ],
              })),
            }))}
          />
        </div>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <section>
      <StepHeading
        title={<>기본 포함사항</>}
        lead={<>먼저 2단계에서 패키지를 선택하세요.</>}
      />
    </section>
  );
}
