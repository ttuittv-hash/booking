// 상시 크론이 없는 배포 환경이라, 관련 페이지(신청 상세)를 조회하는 시점마다 알림이
// 필요한지 lazy하게 확인해서 발송한다. 세금계산서 미입금 5일 간격, 티켓오픈/시설회의
// 자료 미업로드(D-30 / D-7) 알림이 대상이다.
import crypto from "node:crypto";
import {
  createNotification,
  getFacilityMeetingByQuoteId,
  getTaxInvoice,
  getTicketOpenByQuoteId,
  isFacilityMeetingReminderDue,
  isInvoiceReminderDue,
  isTicketOpenReminderDue,
  notifyAdmins,
  touchFacilityMeetingReminder,
  touchInvoiceReminder,
  touchTicketOpenReminder,
} from "./db";
import type { InvoicePurpose, Quote } from "./pricing/types";

const PURPOSE_LABEL: Record<InvoicePurpose, string> = {
  CONTRACT: "계약금",
  SETTLEMENT: "정산금",
};

export async function checkAndFireReminders(quote: Quote) {
  const now = new Date();
  const nowIso = now.toISOString();

  for (const purpose of ["CONTRACT", "SETTLEMENT"] as InvoicePurpose[]) {
    const invoice = await getTaxInvoice(quote.id, purpose);
    if (invoice && isInvoiceReminderDue(invoice, now)) {
      const message = `${quote.id}의 ${PURPOSE_LABEL[purpose]} 세금계산서가 미입금 상태입니다. 입금 후 입금신청을 진행해주세요.`;
      await createNotification({
        id: crypto.randomUUID(),
        recipientId: quote.applicantId,
        quoteId: quote.id,
        message,
        createdAt: nowIso,
      });
      await notifyAdmins({ quoteId: quote.id, message: `${quote.id} ${message}`, createdAt: nowIso });
      await touchInvoiceReminder(quote.id, purpose, nowIso);
    }
  }

  const ticketOpen = await getTicketOpenByQuoteId(quote.id);
  if (ticketOpen && isTicketOpenReminderDue(ticketOpen, now)) {
    const message = `${quote.id}의 티켓오픈일(${ticketOpen.openDate})이 다가오는데 자료(포스터/상세페이지/좌석배치도)가 업로드되지 않았습니다.`;
    await createNotification({
      id: crypto.randomUUID(),
      recipientId: quote.applicantId,
      quoteId: quote.id,
      message,
      createdAt: nowIso,
    });
    await notifyAdmins({ quoteId: quote.id, message, createdAt: nowIso });
    await touchTicketOpenReminder(quote.id, nowIso);
  }

  const facilityMeeting = await getFacilityMeetingByQuoteId(quote.id);
  if (facilityMeeting && isFacilityMeetingReminderDue(facilityMeeting, now)) {
    const message = `${quote.id}의 시설회의일(${facilityMeeting.meetingDate})이 다가오는데 자료(운영 매뉴얼/프로덕션 노트)가 업로드되지 않았습니다.`;
    await createNotification({
      id: crypto.randomUUID(),
      recipientId: quote.applicantId,
      quoteId: quote.id,
      message,
      createdAt: nowIso,
    });
    await notifyAdmins({ quoteId: quote.id, message, createdAt: nowIso });
    await touchFacilityMeetingReminder(quote.id, nowIso);
  }
}
