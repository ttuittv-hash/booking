"use client";

import { findAddon, findPackage } from "@/lib/pricing/rateTableUtils";
import type { RateTable } from "@/lib/pricing/types";
import { Label, SpecTable } from "@/components/ui/kit";

const MEDIA_TIER_LABEL: Record<string, string> = {
  BASIC: "기본",
  EXTENDED: "확장",
  FULL: "풀팩",
};

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

  const specRows: [string, string][] = [
    ["대관시간", pkg.rentalHours],
    ["세부 구성", pkg.dayBreakdown],
    ["주차 기본 제공", pkg.parkingPerDay],
    ["홍보 매체", pkg.mediaTier ? MEDIA_TIER_LABEL[pkg.mediaTier] : "미포함"],
    ["대기실", pkg.waitingRoomNote],
    ["부속공간", pkg.sideFacilities],
  ];
  if (pkg.outdoorPlazaIncluded) specRows.push(["야외광장", "야외광장 · 티켓박스 포함"]);

  return (
    <section>
      <Label className="text-muted">Step 03</Label>
      <h2 className="type-kr-heading mt-3 text-h4-m sm:text-h4">기본 포함사항</h2>
      <p className="mt-3 max-w-2xl text-s text-muted">
        {pkg.name}에 기본 포함된 구성입니다. 초과분만 4단계에서 추가 과금됩니다.
      </p>

      <SpecTable className="mt-7" rows={specRows} />

      <div className="mt-9 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b-2 border-foreground pb-3">
        <h3 className="type-kr-heading text-h6-m sm:text-h6">{pkg.name} 기본 포함 항목</h3>
        <p className="text-xs text-muted">
          화~일 1주 정찰제 대관료에 아래 항목이 모두 포함됩니다
        </p>
      </div>

      <dl>
        {pkg.includedItems.length === 0 ? (
          <div className="border-b border-border/25 py-4 text-s text-muted">
            별도 기본 포함 항목 없음
          </div>
        ) : (
          pkg.includedItems.map((item) => {
            const addon = findAddon(rateTable, item.addonId);
            return (
              <div
                key={item.addonId}
                className="flex items-baseline justify-between gap-6 border-b border-border/15 py-3.5"
              >
                <dt className="min-w-0 text-s">{addon?.name ?? item.addonId}</dt>
                <dd className="shrink-0 text-s font-bold tabular-nums">
                  {item.quantity.toLocaleString()}
                  {addon?.unitLabel.includes("일") ? "개" : ""} 포함
                </dd>
              </div>
            );
          })
        )}
      </dl>
    </section>
  );
}

function EmptyState() {
  return (
    <section>
      <Label className="text-muted">Step 03</Label>
      <h2 className="type-kr-heading mt-3 text-h4-m sm:text-h4">기본 포함사항</h2>
      <p className="mt-3 text-s text-muted">먼저 2단계에서 패키지를 선택하세요.</p>
    </section>
  );
}
