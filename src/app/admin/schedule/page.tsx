import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getNoticeCalendarWindow } from "@/lib/db";
import { kstNowLocal } from "@/lib/content/noticeCalendarWindow";
import { AdminNav } from "@/components/admin/AdminNav";
import { ScheduleManager } from "@/components/admin/ScheduleManager";
import { NoticeCalendarWindowForm } from "@/components/admin/NoticeCalendarWindowForm";
import { PAGE_LEAD, PAGE_TITLE } from "@/components/admin/adminUi";

export default async function AdminSchedulePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/apply");

  const now = new Date();
  const calendarWindow = await getNoticeCalendarWindow();

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin/schedule" user={user} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 sm:py-10">
        <header className="border-b border-border/20 pb-6">
          <h1 className={PAGE_TITLE}>일정 관리</h1>
          <p className={PAGE_LEAD}>
            한 달씩 달력을 보면서 아레나 · 중형공연장 예약 현황을 한 화면에서 확인하고, 날짜별로
            대관 신청 가능/불가를 설정합니다.
          </p>
        </header>

        {/* [수정 2026-09-02] 달력보다 위에 둔다. 달력 + 날짜별 설정이 길어 아래에 두면
            화면 밖이라, 기능이 없는 것으로 읽혔다. */}
        <NoticeCalendarWindowForm initial={calendarWindow} nowLocal={kstNowLocal(now)} />

        <ScheduleManager initialYear={now.getFullYear()} initialMonth={now.getMonth() + 1} />
      </main>
    </div>
  );
}
