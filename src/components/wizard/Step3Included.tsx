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
import { ComparisonTable, SpecTable } from "@/components/ui/kit";
import { StepHeading } from "./StepHeading";

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

  const conditionRows: { label: string; cells: [string] }[] = [
    { label: "대관시간", cells: [pkg.rentalHours] },
    { label: "세부 구성", cells: [pkg.dayBreakdown] },
    { label: "관계자 주차", cells: [pkg.parkingPerDay] },
    { label: "대기실", cells: [pkg.waitingRoomNote] },
    { label: "부속공간", cells: [pkg.sideFacilities] },
    { label: "야외광장 · 티켓박스", cells: [pkg.outdoorPlazaIncluded ? "제공" : "—"] },
  ];

  // 수량 기준 포함분이 있는 항목만 초과 단가 표로 보여준다.
  // 요금 시트 기준 아레나 패키지에는 이 항목이 없으므로 보통은 비어 있다.
  const all: IncludedRow[] = pkg.includedItems.map((item) => ({
    item,
    addon: findAddon(rateTable, item.addonId),
  }));
  const groups = CATEGORY_ORDER.map((category) => ({
    title: ADDON_CATEGORY_LABEL[category],
    rows: all.filter((r) => r.addon?.category === category),
  })).filter((g) => g.rows.length > 0);

  return (
    <section>
      <StepHeading
        title={<>선택하신 패키지에 포함된 것을 확인해 주세요</>}
        lead={
          <>
            아래 항목은 대관료에 포함되어 있어 별도로 신청하지 않으셔도 됩니다. 여기에 없는 항목은
            다음 단계인 추가 옵션에서 신청하실 수 있고, 추가 요금이 발생합니다.
          </>
        }
      />

      <SpecTable className="mt-7" dense rows={pkg.rateIncludes} />

      <h3 className="type-kr-heading mt-10 text-h6-m sm:text-h6">운영 조건</h3>
      <div className="mt-5">
        <ComparisonTable
          dense
          rowLabel="항목"
          columns={[{ key: "value", title: "기본 제공", align: "left" }]}
          rows={conditionRows}
        />
      </div>

      {groups.length > 0 && (
        <>
          <h3 className="type-kr-heading mt-10 text-h6-m sm:text-h6">수량 기준 포함분</h3>
          <p className="measure mt-2 text-s text-muted">
            아래 수량까지는 대관료에 포함됩니다. 초과 단가는 포함 수량을 넘겼을 때만 적용됩니다.
          </p>
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
        </>
      )}

      <p className="measure mt-8 break-keep text-s text-muted">
        포함 항목은 대관 규약과 계약서에 따라 적용됩니다. 기준 이용시간은 09:00부터 22:00까지이며
        12:00~13:00과 18:00~19:00은 이용 제한시간입니다.
      </p>
    </section>
  );
}

function EmptyState() {
  return (
    <section>
      <StepHeading
        title={<>기본 포함사항</>}
        lead={<>먼저 규모·패키지 선택 단계에서 패키지를 고르세요.</>}
      />
    </section>
  );
}
