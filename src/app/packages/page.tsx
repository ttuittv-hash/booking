import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { getCurrentRateTable } from "@/lib/db";
import { won } from "@/lib/format";
import { findAddon } from "@/lib/pricing/rateTableUtils";
import { MEDIA_TIER_LABEL } from "@/lib/pricing/types";
import { PublicHeader } from "@/components/PublicHeader";

export const metadata: Metadata = {
  title: "대관 패키지 안내 | 서울아레나",
};

export default async function PackagesPage() {
  const currentUser = await getCurrentUser();
  if (currentUser && isPendingApplicant(currentUser)) redirect("/pending");

  const rateTable = getCurrentRateTable();
  const packages = [...rateTable.packages].sort((a, b) => a.audienceTier.min - b.audienceTier.min);

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/guide" currentUser={currentUser} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16 sm:px-8">
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-accent">PACKAGES</p>
        <h1 className="mt-3 text-[30px] font-semibold tracking-tight sm:text-[36px]">대관 패키지 구성</h1>
        <p className="mt-6 max-w-3xl text-[15px] leading-8 text-muted">
          서울아레나의 대관료는 객석 규모별 패키지 단위의 정찰제로 운영됩니다. 예상 관객 규모에
          맞는 패키지를 선택하면 기본 대관료와 함께 대기실·프로덕션 장비 등 기본 포함 항목을
          바로 확인할 수 있습니다. 세부 견적은 대관 신청 화면에서 실시간으로 산출됩니다.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="flex flex-col border border-border bg-background p-7 transition-colors hover:border-accent/50"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-[16px] font-semibold">{pkg.name}</span>
                <span className="text-[12.5px] font-medium text-accent">{pkg.audienceTier.label}</span>
              </div>

              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="text-[26px] font-semibold tabular-nums tracking-tight">
                  {won(pkg.baseFeePerWeek)}
                </span>
                <span className="text-[12.5px] text-muted">/ 주 (화~일), VAT 별도</span>
              </div>

              <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-5 text-[12.5px]">
                <div>
                  <dt className="text-muted">세부 구성</dt>
                  <dd className="mt-0.5 font-medium">{pkg.dayBreakdown}</dd>
                </div>
                <div>
                  <dt className="text-muted">대관시간</dt>
                  <dd className="mt-0.5 font-medium">{pkg.rentalHours}</dd>
                </div>
                <div>
                  <dt className="text-muted">주차</dt>
                  <dd className="mt-0.5 font-medium">{pkg.parkingPerDay}</dd>
                </div>
                <div>
                  <dt className="text-muted">홍보 디지털 매체</dt>
                  <dd className="mt-0.5 font-medium">{pkg.mediaTier ? MEDIA_TIER_LABEL[pkg.mediaTier] : "미포함"}</dd>
                </div>
              </dl>

              <div className="mt-6">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">기본 포함 사항</div>
                <ul className="mt-3 divide-y divide-border/60">
                  {pkg.includedItems.length === 0 ? (
                    <li className="py-2 text-[12.5px] text-muted">별도 기본 포함 항목 없음</li>
                  ) : (
                    pkg.includedItems.map((item) => {
                      const addon = findAddon(rateTable, item.addonId);
                      return (
                        <li key={item.addonId} className="flex items-center justify-between py-2 text-[12.5px]">
                          <span>{addon?.name ?? item.addonId}</span>
                          <span className="font-medium text-accent">{item.quantity}</span>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>

              {pkg.waitingRoomNote && (
                <p className="mt-4 text-[12px] leading-5 text-muted">대기실: {pkg.waitingRoomNote}</p>
              )}
              {pkg.sideFacilities && (
                <p className="mt-1 text-[12px] leading-5 text-muted">부속공간: {pkg.sideFacilities}</p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-8">
          <p className="text-[13px] text-muted">
            부대시설 추가, 준비/공연 일수 조정 등 상세 옵션은 대관 신청 화면에서 실시간 견적으로 확인할 수 있습니다.
          </p>
          <Link
            href="/apply"
            className="inline-flex shrink-0 items-center gap-1 rounded bg-accent px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            대관 신청 시작하기
            <span aria-hidden>›</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
