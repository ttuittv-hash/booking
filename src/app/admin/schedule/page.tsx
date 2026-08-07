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
          연도별로 각 월의 주차를 대관 신청 가능/불가로 설정합니다. 막아둔 주차는 대관 신청
          화면의 달력에서 선택할 수 없고, 이미 열려 있는 주차는 별도 설정 없이 자유롭게(수시)
          신청받을 수 있습니다.
        </p>

        <ScheduleManager initialYear={now.getFullYear()} initialMonth={now.getMonth() + 1} />
      </main>
    </div>
  );
}
