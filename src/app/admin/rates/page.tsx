import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentRateTable } from "@/lib/db";
import { Label } from "@/components/ui/kit";
import { RatesForm } from "@/components/admin/RatesForm";
import { AdminNav } from "@/components/admin/AdminNav";
import { PAGE_LEAD, PAGE_TITLE } from "@/components/admin/adminUi";

export default async function AdminRatesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/apply");

  const rateTable = getCurrentRateTable();

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin/rates" />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8 sm:py-10">
        <header className="border-b border-border/20 pb-6">
          <Label className="mb-3 text-muted">Rate Table</Label>
          <h1 className={PAGE_TITLE}>요금표 관리</h1>
          <p className={PAGE_LEAD}>
            현재 버전: <span className="font-bold tabular-nums text-foreground">{rateTable.version}</span> · 저장하면
            새 버전이 생성되며, 이미 제출된 신청서의 금액에는 영향을 주지 않습니다(재현성 보장).
            패키지별 기본 대관료는 &ldquo;패키지 관리&rdquo;에서 편집하세요.
          </p>
        </header>

        <RatesForm rateTable={rateTable} />
      </main>
    </div>
  );
}
