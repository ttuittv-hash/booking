"use client";

import { findAddon, findPackage } from "@/lib/pricing/rateTableUtils";
import type { RateTable } from "@/lib/pricing/types";

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

  return (
    <section className="rounded-2xl border border-border bg-background p-7">
      <h2 className="text-[19px] font-semibold">3. 기본 포함사항</h2>
      <p className="mt-1.5 text-[13.5px] text-muted">
        {pkg.name}에 기본 포함된 구성입니다. 초과분만 4단계에서 추가
        과금됩니다.
      </p>

      <div className="mt-6 flex items-center justify-between border-b border-border pb-3">
        <span className="text-[14px] font-semibold">{pkg.name} 기본 구성</span>
        <span className="text-[12.5px] text-muted">
          홍보 매체 등급:{" "}
          <span className="font-medium text-accent">
            {pkg.mediaTier ? MEDIA_TIER_LABEL[pkg.mediaTier] : "미정"}
          </span>
        </span>
      </div>

      <ul className="mt-1 divide-y divide-dashed divide-border/80">
        {pkg.includedItems.length === 0 ? (
          <li className="py-4 text-[13px] text-muted">
            별도 기본 포함 항목 없음
          </li>
        ) : (
          pkg.includedItems.map((item) => {
            const addon = findAddon(rateTable, item.addonId);
            return (
              <li
                key={item.addonId}
                className="flex items-center justify-between py-3 text-[13.5px]"
              >
                <span>{addon?.name ?? item.addonId}</span>
                <span className="font-semibold text-good">
                  {item.quantity.toLocaleString()}
                  {addon?.unitLabel.includes("일") ? "개" : ""} 포함
                </span>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}

function EmptyState() {
  return (
    <section className="rounded-2xl border border-border bg-background p-7">
      <p className="text-[13.5px] text-muted">
        먼저 1단계에서 패키지를 선택하세요.
      </p>
    </section>
  );
}
