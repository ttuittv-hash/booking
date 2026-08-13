// 세금계산서 미입금(5일 간격), 티켓오픈 자료 미업로드(D-30), 시설회의 자료 미업로드(D-7) 알림.
//
// 예전에는 신청서 상세 화면을 조회하는 시점마다 발송 여부를 확인했다. 그러면 아무도 그 화면을
// 열지 않는 동안에는 알림이 나가지 않고(정작 방치된 건일수록 안 열린다), 조회(GET)가 DB 쓰기를
// 유발하며, 누락돼도 기록이 남지 않았다. 지금은 스케줄러(k8s CronJob)가 하루 한 번
// /api/internal/reminders 를 호출해 전체를 훑는다.
//
// 재발송 간격은 각 레코드의 last_reminder_at 으로 판단하므로, 여러 번 호출돼도 중복 발송되지 않는다.
import crypto from "node:crypto";
import {
  createNotification,
  isFacilityMeetingReminderDue,
  isInvoiceReminderDue,
  isTicketOpenReminderDue,
  listAllFacilityMeetings,
  listAllTaxInvoices,
  listAllTicketOpens,
  listQuotes,
  listUsers,
  purgeExpiredRateLimits,
  touchFacilityMeetingReminder,
  touchInvoiceReminder,
  touchTicketOpenReminder,
} from "./db";
import type { InvoicePurpose } from "./pricing/types";

const PURPOSE_LABEL: Record<InvoicePurpose, string> = {
  CONTRACT: "계약금",
  SETTLEMENT: "정산금",
};

export interface ReminderSweepResult {
  invoice: number;
  ticketOpen: number;
  facilityMeeting: number;
}

export async function runReminderSweep(now = new Date()): Promise<ReminderSweepResult> {
  const nowIso = now.toISOString();
  const result: ReminderSweepResult = { invoice: 0, ticketOpen: 0, facilityMeeting: 0 };

  // 대상 판정에 필요한 데이터를 종류별로 한 번씩만 읽는다(신청서마다 조회하면 N+1).
  const [quotes, invoices, ticketOpens, facilityMeetings, users] = await Promise.all([
    listQuotes(),
    listAllTaxInvoices(),
    listAllTicketOpens(),
    listAllFacilityMeetings(),
    listUsers({ role: "ADMIN" }),
  ]);

  const applicantByQuoteId = new Map(quotes.map((quote) => [quote.id, quote.applicantId]));
  const adminIds = users.map((admin) => admin.id);

  async function notify(quoteId: string, message: string, adminMessage = message) {
    const applicantId = applicantByQuoteId.get(quoteId);
    if (!applicantId) return;
    await createNotification({
      id: crypto.randomUUID(),
      recipientId: applicantId,
      quoteId,
      message,
      createdAt: nowIso,
    });
    for (const adminId of adminIds) {
      await createNotification({
        id: crypto.randomUUID(),
        recipientId: adminId,
        quoteId,
        message: adminMessage,
        createdAt: nowIso,
      });
    }
  }

  for (const invoice of invoices) {
    if (!isInvoiceReminderDue(invoice, now)) continue;
    const message = `${invoice.quoteId}의 ${PURPOSE_LABEL[invoice.purpose]} 세금계산서가 미입금 상태입니다. 입금 후 입금신청을 진행해주세요.`;
    await notify(invoice.quoteId, message, `${invoice.quoteId} ${message}`);
    await touchInvoiceReminder(invoice.quoteId, invoice.purpose, nowIso);
    result.invoice += 1;
  }

  for (const ticketOpen of ticketOpens) {
    if (!isTicketOpenReminderDue(ticketOpen, now)) continue;
    const message = `${ticketOpen.quoteId}의 티켓오픈일(${ticketOpen.openDate})이 다가오는데 자료(포스터/상세페이지/좌석배치도)가 업로드되지 않았습니다.`;
    await notify(ticketOpen.quoteId, message);
    await touchTicketOpenReminder(ticketOpen.quoteId, nowIso);
    result.ticketOpen += 1;
  }

  for (const meeting of facilityMeetings) {
    if (!isFacilityMeetingReminderDue(meeting, now)) continue;
    const message = `${meeting.quoteId}의 시설회의일(${meeting.meetingDate})이 다가오는데 자료(운영 매뉴얼/프로덕션 노트)가 업로드되지 않았습니다.`;
    await notify(meeting.quoteId, message);
    await touchFacilityMeetingReminder(meeting.quoteId, nowIso);
    result.facilityMeeting += 1;
  }

  // 만료된 레이트리밋 카운터도 이 참에 정리한다(별도 잡을 두지 않기 위함).
  await purgeExpiredRateLimits();

  return result;
}
