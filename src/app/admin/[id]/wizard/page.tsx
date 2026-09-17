import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProAdminPage } from "@/lib/auth";
import {
  getQuoteById,
  getRateTableByVersion,
  getScreenTextContent,
  getRatesContent,
  getNoticeCalendarWindow,
  listAttachments,
  listDateBlocks,
  listWeekDemand,
} from "@/lib/db";
import { noticeCalendarMonthBounds } from "@/lib/content/noticeCalendarWindow";
import { AdminNav } from "@/components/admin/AdminNav";
import { LINK_BTN } from "@/components/admin/adminUi";
import { WizardShell } from "@/components/wizard/WizardShell";
import { WizardTextProvider } from "@/lib/content/wizardText";

export const metadata: Metadata = {
  title: "신청 내역 (위저드)",
};

/*
  운영자용 위저드 그대로 보기 (2026-09-17).

  "운영자가 신청자와 동일하게 다 볼 수 있어야 해. 미리보기 위저드 레벨이 아니라" —
  /admin/[id]/application은 심사자가 보기 편하게 재구성한 요약 표라 신청자가 실제로
  거쳐간 화면과는 다르다. 이 화면은 신청자가 실제로 밟은 그 위저드(달력·체크박스·
  자료 첨부까지 전부)를 실제 컴포넌트로, 실제 제출값(quote.selection)을 넣어 그대로
  보여준다 — WizardTextPreview.tsx(문구 편집용, mock 데이터, 캘린더 생략)와는 다른
  용도다. WizardShell의 readOnly 모드(스텝 본문을 <fieldset disabled>로 감싼다)로
  입력만 막는다.
*/

export default async function AdminQuoteWizardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireProAdminPage();

  const { id } = await params;
  const quote = await getQuoteById(id);
  if (!quote) notFound();

  const [rateTable, weekDemand, dateBlocks, ratesContent, screenText, calendarWindow, existingAttachments] =
    await Promise.all([
      getRateTableByVersion(quote.rateTableVersion),
      listWeekDemand(),
      listDateBlocks(),
      getRatesContent(),
      getScreenTextContent(),
      getNoticeCalendarWindow(),
      listAttachments(id),
    ]);
  const calendarMonthBounds = noticeCalendarMonthBounds(calendarWindow);

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin" user={admin} />

      <main className="flex flex-1 flex-col">
        <div className="container-site pt-6">
          <Link href={`/admin/${quote.id}/application`} className={LINK_BTN}>
            ← 신청 내역
          </Link>
        </div>

        <WizardTextProvider overrides={screenText.wizardStrings}>
          <WizardShell
            readOnly
            rateTable={rateTable}
            currentUser={admin}
            weekDemand={weekDemand}
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
            wizardCustomOptions={screenText.wizardCustomOptions}
            calendarMonthBounds={calendarMonthBounds}
            existingAttachments={existingAttachments}
          />
        </WizardTextProvider>
      </main>
    </div>
  );
}
