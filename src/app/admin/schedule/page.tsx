import { requireProAdminPage } from "@/lib/auth";
import { getNoticeCalendarWindow, getScreenTextContent } from "@/lib/db";
import { scheduleLegend } from "@/lib/content/scheduleLegend";
import { clampMonthKey, kstNowMonth, nextMonthKey, noticeCalendarMonthBounds } from "@/lib/content/noticeCalendarWindow";
import { AdminNav } from "@/components/admin/AdminNav";
import { ScheduleManager } from "@/components/admin/ScheduleManager";
import { NoticeCalendarWindowForm } from "@/components/admin/NoticeCalendarWindowForm";
import { PAGE_LEAD, PAGE_TITLE } from "@/components/admin/adminUi";

export default async function AdminSchedulePage() {
  const user = await requireProAdminPage();

  const now = new Date();
  const [calendarWindow, screenText] = await Promise.all([getNoticeCalendarWindow(), getScreenTextContent()]);

  // [수정 2026-09-08] 위 「캘린더 노출월」에서 정한 범위를 아래 달력에도 그대로 건다 — 위에서
  // 2027년 7월로 잡아 놓고 아래는 오늘 달(2026년 9월)로 열리니 "설정이 반영 안 됐다"로
  // 읽혔다. 오픈 시점에는 운영자도 신청자와 같은 범위만 본다(사장님 결정). 마지막 달 뒤에
  // 이어 붙이는 날(endDay)이 있으면 그 달까지는 연다 — 신청자에게 보이는 날짜라 대관
  // 불가를 넣을 수 있어야 한다. key 로 묶어 저장 뒤 refresh 때 새 시작 달로 다시 연다.
  const windowBounds = noticeCalendarMonthBounds(calendarWindow);
  const monthBounds = {
    start: windowBounds.start,
    end: windowBounds.end && windowBounds.endDay ? nextMonthKey(windowBounds.end) : windowBounds.end,
  };
  const openingMonth = clampMonthKey(kstNowMonth(now), monthBounds);
  const [openingYear, openingMonthNo] = openingMonth.split("-").map(Number);

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin/schedule" user={user} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 sm:py-10">
        <header className="border-b border-border/25 pb-6">
          <h1 className={PAGE_TITLE}>일정 관리</h1>
          <p className={PAGE_LEAD}>
            한 달씩 달력을 보면서 아레나 · 중형공연장 예약 현황을 한 화면에서 확인하고, 날짜별로
            대관 신청 가능/불가를 설정합니다.
          </p>
        </header>

        {/* [수정 2026-09-02] 달력보다 위에 둔다. 달력 + 날짜별 설정이 길어 아래에 두면
            화면 밖이라, 기능이 없는 것으로 읽혔다. */}
        <NoticeCalendarWindowForm initial={calendarWindow} nowMonth={kstNowMonth(now)} />

        <ScheduleManager
          key={`${monthBounds.start ?? ""}~${monthBounds.end ?? ""}`}
          initialYear={openingYear}
          initialMonth={openingMonthNo}
          monthBounds={monthBounds}
          legend={scheduleLegend(screenText.wizardStrings)}
        />
      </main>
    </div>
  );
}
