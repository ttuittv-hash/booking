import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { canAccessQuote, requireAccessedUser } from "@/lib/auth";
import { canApplicantEditQuote } from "@/lib/quoteStatus";
import {
  getCurrentRateTable,
  getNoticeCalendarWindow,
  getQuoteById,
  getRatesContent,
  getScreenTextContent,
  listApprovedQuoteBlocks,
  listAttachments,
  listDateBlocks,
  listMidHallWeekDemand,
  listWeekDemand,
} from "@/lib/db";
import { noticeCalendarMonthBounds } from "@/lib/content/noticeCalendarWindow";
import { PublicHeader } from "@/components/PublicHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { Band, PageHeading } from "@/components/ui/kit";
import { NAV_ACTION_HIDDEN } from "@/components/ui/nav-items";
import { WizardShell } from "@/components/wizard/WizardShell";
import { WizardTextProvider } from "@/lib/content/wizardText";

export const metadata: Metadata = {
  title: "신청서 수정",
};

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // 기획서 A15 접근권한 매트릭스 — 규칙은 accessPolicy.ts 한 곳에만 둔다
  const currentUser = await requireAccessedUser("/apply/edit");

  const { id } = await params;
  const quote = await getQuoteById(id);
  if (!quote) notFound();
  if (!(await canAccessQuote(currentUser, quote))) notFound();
  // 심사가 시작됐거나(review 기록) 접수 후 24시간이 지난 신청서는 신청자가 직접
  // 수정할 수 없다 — PUT /api/quotes/[id]와 같은 기준(2026-08-22, 2026-09-08 24시간 추가).
  if (!canApplicantEditQuote(quote)) redirect(`/mypage/${id}`);

  /*
    [신규 2026-09-18 18:00 접수 마감] "북잇 막으면, my > 임시저장하기 수정하기 기능도
    막혀야 합니다"(niki) / "아직, 아직.. 들어가집니다"(nora).

    접수 마감 스위치(백오피스 > 콘텐츠 관리 > 화면 문구 > BOOK IT 안내 체크박스)는
    /apply 한 곳만 닫고 있었다 — 이미 접수한 사람은 마이페이지 「수정하기」로 이 화면에
    그대로 들어와 마감 후에도 신청서를 고칠 수 있었다. 같은 스위치로 여기도 닫는다.

    운영자는 통과시킨다 — 마감 뒤 운영진이 대리로 확인·수정해야 하는 일이 있다.
    막힌 사람은 마이페이지 상세로 보낸다: 상단바 BOOK IT 이 이미 마감 안내로 바뀌어
    있어 왜 막혔는지가 전달되고, 자기 신청 내용은 계속 볼 수 있다.
  */
  const bookItNotice = NAV_ACTION_HIDDEN ? null : (await getScreenTextContent()).bookItNotice;
  const bookingClosed = NAV_ACTION_HIDDEN || !!bookItNotice?.enabled;
  if (bookingClosed && currentUser.role !== "ADMIN") redirect(`/mypage/${id}`);

  const [rateTable, weekDemand, midHallWeekDemand, adminBlocks, approvedBlocks, ratesContent, screenText, calendarWindow, existingAttachments] =
    await Promise.all([
      getCurrentRateTable(),
      listWeekDemand(),
      // [신규 2026-09-18] 중형 달력도 아레나처럼 경합(몇 개사 신청)을 보여준다(niki).
      listMidHallWeekDemand(),
      listDateBlocks(),
      // 승인된 신청서가 잡은 날짜도 막는다. 자기 자신은 뺀다 — 자기가 잡은 날짜에
      // 막혀 수정이 안 되면 안 된다(2026-09-02).
      listApprovedQuoteBlocks(id),
      getRatesContent(),
      getScreenTextContent(),
      getNoticeCalendarWindow(),
      // STEP7 필수 첨부 검사 — 이미 올라간 첨부가 있으면 다시 올리라고 막지 않는다(2026-09-08).
      listAttachments(id),
    ]);
  const dateBlocks = [...adminBlocks, ...approvedBlocks];
  const calendarMonthBounds = noticeCalendarMonthBounds(calendarWindow);

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/apply" currentUser={currentUser} />
      <Breadcrumb
        items={[
          { label: "대관 진행 내역", href: "/mypage" },
          { label: `${quote.id} 수정` },
        ]}
      />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="sm">
          <PageHeading
            size="md"
            title="신청서 수정"
            lead={`신청번호 ${quote.id} · 접수 후 심사 시작 전까지만 직접 수정할 수 있으며, 접수번호는 그대로 유지됩니다.`}
          />
        </Band>

        <WizardTextProvider overrides={screenText.wizardStrings}>
          <WizardShell
            rateTable={rateTable}
            currentUser={currentUser}
            weekDemand={weekDemand}
            midHallWeekDemand={midHallWeekDemand}
            dateBlocks={dateBlocks}
            editingQuoteId={quote.id}
            initialSelection={quote.selection}
            liveHallRateContent={ratesContent.liveHall}
            wizardStepText={screenText.wizardSteps}
            wizardSlotOrders={screenText.wizardSlotOrders}
            publicInterestDisabledItems={screenText.publicInterestDisabledItems}
            publicInterestDisabledGroups={screenText.publicInterestDisabledGroups}
            wizardFieldOrders={screenText.wizardFieldOrders}
            wizardDisabledFields={screenText.wizardDisabledFields}
            calendarMonthBounds={calendarMonthBounds}
            existingAttachments={existingAttachments}
          />
        </WizardTextProvider>
      </main>

      <SiteFooter />
    </div>
  );
}
