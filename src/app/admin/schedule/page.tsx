import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { ScheduleManager } from "@/components/admin/ScheduleManager";

export default async function AdminSchedulePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/apply");

  const now = new Date();

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin/schedule" user={user} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <h1 className="text-[22px] font-semibold">일정 관리</h1>
        <p className="mt-2 text-[13.5px] leading-6 text-muted">
          한 달씩 달력을 보면서 아레나 · 중형공연장 예약 현황을 한 화면에서 확인하고, 날짜별로
          대관 신청 가능/불가를 설정합니다.
        </p>

        <ScheduleManager initialYear={now.getFullYear()} initialMonth={now.getMonth() + 1} />
      </main>
    </div>
  );
}
