import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentRateTable } from "@/lib/db";
import { RatesForm } from "@/components/admin/RatesForm";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminRatesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/apply");

  const rateTable = getCurrentRateTable();

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin/rates" />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <h1 className="text-[22px] font-semibold">요금표 관리</h1>
        <p className="mt-2 max-w-2xl text-[13.5px] leading-6 text-muted">
          현재 버전: <span className="font-medium text-foreground">{rateTable.version}</span> · 저장하면
          새 버전이 생성되며, 이미 제출된 신청서의 금액에는 영향을 주지 않습니다(재현성 보장).
        </p>

        <RatesForm rateTable={rateTable} />
      </main>
    </div>
  );
}
