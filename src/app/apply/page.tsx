import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { getCurrentRateTable, listDateBlocks, listWeekDemand } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { Band, Label } from "@/components/ui/kit";
import { WizardShell } from "@/components/wizard/WizardShell";

export const metadata: Metadata = {
  title: "대관 견적·신청 | 서울아레나",
};

export default async function ApplyPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  if (isPendingApplicant(currentUser)) redirect("/pending");

  const [rateTable, weekDemand, dateBlocks] = await Promise.all([
    getCurrentRateTable(),
    Promise.resolve(listWeekDemand()),
    Promise.resolve(listDateBlocks()),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/apply" currentUser={currentUser} />
      <Breadcrumb items={[{ label: "대관 신청" }]} />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="sm">
          <Label className="mb-5 text-muted">Host It</Label>
          <h1 className="type-kr-heading text-h3-m sm:text-h3">대관 견적 · 신청</h1>
          <p className="mt-5 max-w-2xl text-s text-muted">
            주차와 규모를 입력하면 예상 대관료를 바로 확인하고, 그대로 신청서까지 제출할 수 있습니다.
          </p>
        </Band>

        <WizardShell
          rateTable={rateTable}
          currentUser={currentUser}
          weekDemand={weekDemand}
          dateBlocks={dateBlocks}
        />
      </main>

      <SiteFooter />
    </div>
  );
}
