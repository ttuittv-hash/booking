"use client";

import { won } from "@/lib/format";
import { PACKAGES, recommendPackage } from "@/lib/pricing/seed";

export function Step1Package({
  packageId,
  expectedAudience,
  onSelectPackage,
  onChangeAudience,
}: {
  packageId: number | null;
  expectedAudience: number;
  onSelectPackage: (id: number) => void;
  onChangeAudience: (value: number) => void;
}) {
  const recommended = recommendPackage(expectedAudience);

  return (
    <section className="rounded-2xl border border-border bg-background p-7">
      <h2 className="text-[19px] font-semibold">1. 규모 / 패키지 선택</h2>
      <p className="mt-1.5 text-[13.5px] text-muted">
        예상 관객 규모를 입력하면 패키지가 추천됩니다. 패키지는 정찰제
        고정가입니다.
      </p>

      <div className="mt-6 max-w-xs">
        <label className="mb-1.5 block text-[12.5px] font-medium text-muted">
          예상 관객 규모 (명)
        </label>
        <input
          type="number"
          min={0}
          step={500}
          value={expectedAudience}
          onChange={(e) => onChangeAudience(Math.max(0, Number(e.target.value) || 0))}
          className="w-full rounded-xl border border-border bg-panel px-4 py-2.5 text-[15px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PACKAGES.map((pkg) => {
          const isSelected = packageId === pkg.id;
          const isRecommended = recommended === pkg.id;
          return (
            <button
              key={pkg.id}
              type="button"
              onClick={() => onSelectPackage(pkg.id)}
              className={[
                "relative rounded-2xl border p-5 text-left transition-all",
                isSelected
                  ? "border-accent bg-accent-soft shadow-[0_0_0_3px_rgba(0,113,227,0.14)]"
                  : "border-border bg-panel hover:border-accent/50",
              ].join(" ")}
            >
              {isRecommended && (
                <span className="absolute right-4 top-4 rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold text-white">
                  추천
                </span>
              )}
              <div className="text-[15px] font-semibold">{pkg.name}</div>
              <div className="mt-1 text-[12.5px] font-medium text-accent">
                {pkg.audienceTier.label}
              </div>
              <div className="mt-4 text-[19px] font-semibold tabular-nums">
                {won(pkg.baseFeePerWeek)}
              </div>
              <div className="mt-0.5 text-[11.5px] text-muted">
                / 주 (화~일) · VAT 별도
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
