import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProAdminPage } from "@/lib/auth";
import {
  getQuoteById,
  getRateTableByVersion,
  getScreenTextContent,
  getRatesContent,
  getNoticeCalendarWindow,
  listAttachments,
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
  // [버그 수정 2026-09-18] "「신청 상세보기」를 누르면 404" — 신청자 계정을 지우면
  // deleteUserCascade 가 그 계정의 신청서도 함께 지운다(테스트 계정 정리 때 실제로 발생).
  // 신청서 상세(../page.tsx)는 2026-09-03에, 「신청 내역」(../application/page.tsx)은
  // 2026-09-17에 같은 신고로 목록 리다이렉트·안내문으로 바꿨는데, 이 화면이 그 뒤에 새로
  // 생기면서 notFound() 를 그대로 물려받았다 — 형제 화면들과 동작을 맞춘다.
  // (권한 부족은 requireProAdminPage 가 전부 redirect 로 처리하므로 이 분기에 도달했다면
  //  원인은 언제나 "신청서가 없음"이다.)
  if (!quote) redirect("/admin");

  const [rateTable, ratesContent, screenText, calendarWindow, existingAttachments] = await Promise.all([
    getRateTableByVersion(quote.rateTableVersion),
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
            // [수정 2026-09-17] "캘린더는 표기가 안되어있어" — 실시간 대관 가능 여부
            // (dateBlocks·weekDemand)를 넣으면, 제출 이후 그 날짜가 새로 막히거나(다른
            // 신청 승인 등) 경합이 붙었을 때 캘린더가 "대관 불가"로 회색 처리되면서
            // 실제 제출된 준비/공연 배지가 안 보이는 것처럼 묻혀 버렸다. 이 화면은 지금
            // 예약 가능한지를 보는 화면이 아니라 그때 뭘 제출했는지를 보는 화면이라
            // 항상 빈 값을 넘긴다 — 그러면 캘린더가 제출값만으로 그려진다.
            weekDemand={[]}
            dateBlocks={[]}
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
