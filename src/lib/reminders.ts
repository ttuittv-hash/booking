// 세금계산서 미입금, 티켓오픈 자료 미업로드, 시설회의 자료 미업로드 알림.
//
// 예전에는 신청서 상세 화면을 조회하는 시점마다 발송 여부를 확인했다. 그러면 아무도 그 화면을
// 열지 않는 동안에는 알림이 나가지 않고(정작 방치된 건일수록 안 열린다), 조회(GET)가 DB 쓰기를
// 유발하며, 누락돼도 기록이 남지 않았다. 지금은 스케줄러(k8s CronJob)가 하루 한 번
// /api/internal/reminders 를 호출해 전체를 훑는다.
//
// 재발송 간격은 각 레코드의 last_reminder_at 으로 판단하므로, 여러 번 호출돼도 중복 발송되지 않는다.
//
// 발송 여부(enabled)·간격·문구는 하드코딩하지 않고 notification_rules 테이블에서 읽는다
// (/admin/notification-rules, 2026-08-22). 세 트리거 모두 규칙이 꺼져 있으면(enabled=false)
// 그 종류는 이번 스윕에서 건너뛴다. 시스템 규칙 자체가 없는(마이그레이션 전) 예외적인 경우에는
// db.ts 함수들의 기본 파라미터(예전 하드코딩과 같은 값)로 동작한다.
import crypto from "node:crypto";
import {
  createNotification,
  getNotificationRuleByTypeCode,
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
  CONTRACT_BALANCE: "잔금",
  SETTLEMENT: "정산금",
};

export interface ReminderSweepResult {
  invoice: number;
  ticketOpen: number;
  facilityMeeting: number;
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => vars[key] ?? match);
}

export async function runReminderSweep(now = new Date()): Promise<ReminderSweepResult> {
  const nowIso = now.toISOString();
  const result: ReminderSweepResult = { invoice: 0, ticketOpen: 0, facilityMeeting: 0 };

  // 대상 판정에 필요한 데이터를 종류별로 한 번씩만 읽는다(신청서마다 조회하면 N+1).
  const [quotes, invoices, ticketOpens, facilityMeetings, users, invoiceRule, ticketOpenRule, facilityMeetingRule] =
    await Promise.all([
      listQuotes(),
      listAllTaxInvoices(),
      listAllTicketOpens(),
      listAllFacilityMeetings(),
      listUsers({ role: "ADMIN" }),
      getNotificationRuleByTypeCode("INVOICE_UNPAID"),
      getNotificationRuleByTypeCode("TICKET_OPEN_MISSING"),
      getNotificationRuleByTypeCode("FACILITY_MEETING_MISSING"),
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

  if (!invoiceRule || invoiceRule.enabled) {
    const intervalDays = invoiceRule?.repeatIntervalDays ?? 5;
    const template = invoiceRule?.messageTemplate ?? "{quoteId}의 {purposeLabel} 세금계산서가 미입금 상태입니다. 입금 후 입금신청을 진행해주세요.";
    for (const invoice of invoices) {
      if (!isInvoiceReminderDue(invoice, now, intervalDays)) continue;
      const message = renderTemplate(template, {
        quoteId: invoice.quoteId,
        purposeLabel: PURPOSE_LABEL[invoice.purpose],
      });
      await notify(invoice.quoteId, message, `${invoice.quoteId} ${message}`);
      await touchInvoiceReminder(invoice.quoteId, invoice.purpose, nowIso);
      result.invoice += 1;
    }
  }

  if (!ticketOpenRule || ticketOpenRule.enabled) {
    const thresholdDays = ticketOpenRule?.thresholdDays ?? 30;
    const repeatIntervalDays = ticketOpenRule?.repeatIntervalDays ?? 1;
    const template =
      ticketOpenRule?.messageTemplate ??
      "{quoteId}의 티켓오픈일({openDate})이 다가오는데 자료(포스터/상세페이지/좌석배치도)가 업로드되지 않았습니다.";
    for (const ticketOpen of ticketOpens) {
      if (!isTicketOpenReminderDue(ticketOpen, now, thresholdDays, repeatIntervalDays)) continue;
      const message = renderTemplate(template, {
        quoteId: ticketOpen.quoteId,
        openDate: ticketOpen.openDate ?? "",
      });
      await notify(ticketOpen.quoteId, message);
      await touchTicketOpenReminder(ticketOpen.quoteId, nowIso);
      result.ticketOpen += 1;
    }
  }

  if (!facilityMeetingRule || facilityMeetingRule.enabled) {
    const thresholdDays = facilityMeetingRule?.thresholdDays ?? 7;
    const repeatIntervalDays = facilityMeetingRule?.repeatIntervalDays ?? 1;
    const template =
      facilityMeetingRule?.messageTemplate ??
      "{quoteId}의 시설회의일({meetingDate})이 다가오는데 자료(운영 매뉴얼/프로덕션 노트)가 업로드되지 않았습니다.";
    for (const meeting of facilityMeetings) {
      if (!isFacilityMeetingReminderDue(meeting, now, thresholdDays, repeatIntervalDays)) continue;
      const message = renderTemplate(template, {
        quoteId: meeting.quoteId,
        meetingDate: meeting.meetingDate ?? "",
      });
      await notify(meeting.quoteId, message);
      await touchFacilityMeetingReminder(meeting.quoteId, nowIso);
      result.facilityMeeting += 1;
    }
  }

  // 만료된 레이트리밋 카운터도 이 참에 정리한다(별도 잡을 두지 않기 위함).
  await purgeExpiredRateLimits();

  return result;
}
