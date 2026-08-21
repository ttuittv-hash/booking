import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import {
  getDepositByQuoteId,
  getFacilityMeetingByQuoteId,
  getTicketOpenByQuoteId,
  listAttachments,
  listQuotes,
} from "@/lib/db";
import { won } from "@/lib/format";
import type { Attachment, FacilityMeeting, Quote, TicketOpen } from "@/lib/pricing/types";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { QueryTabs } from "@/components/ui/QueryTabs";
import { TicketOpenPanel } from "@/components/TicketOpenPanel";
import { FacilityMeetingPanel } from "@/components/FacilityMeetingPanel";
import { SettlementMutualConfirm } from "@/components/SettlementMutualConfirm";
import {
  Band,
  ButtonLink,
  EmptyState,
  Note,
  PageHead,
} from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "대관 진행 내역 | 서울아레나",
};

/* ============================================================================
   HOST IT › 대관 진행 내역 — 탭: 티켓 오픈 정보 / 시설 회의 / 정산

   계약이 확정된 신청 건만 여기에 나타난다. 각 탭은 신청 건별 패널을 그대로 쓰므로
   상세 화면(`/mypage/[id]`)과 같은 기능을 하며, 여기서는 여러 건을 한 축으로 모아 본다.
   ========================================================================= */

interface Row {
  quote: Quote;
  depositConfirmed: boolean;
  ticketOpen: TicketOpen | null;
  facilityMeeting: FacilityMeeting | null;
  ticketOpenMaterials: Attachment[];
  facilityMeetingMaterials: Attachment[];
}

function QuoteHeading({ quote }: { quote: Quote }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3">
      <h3 className="type-kr-heading text-h5-m sm:text-h5">
        <Link href={`/mypage/${quote.id}`} className="underline-offset-4 hover:underline">
          {quote.id}
        </Link>
      </h3>
      <p className="text-xs tabular-nums text-muted">
        {quote.selection.week.year}.{quote.selection.week.month}{" "}
        {quote.selection.week.weekOfMonth}주차
      </p>
    </div>
  );
}

function EmptyTab({ label }: { label: string }) {
  return (
    <div className="pt-14">
      <EmptyState
        title={`${label} 단계에 해당하는 신청 건이 없습니다`}
        desc="계약이 확정되면 이곳에서 진행 내역을 관리하실 수 있습니다."
        action={
          <ButtonLink href="/mypage/process" variant="secondary">
            대관 신청 현황 보기
          </ButtonLink>
        }
      />
    </div>
  );
}

export default async function ApplicationHistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "APPLICANT") redirect("/admin");
  if (isPendingApplicant(user)) redirect("/pending");

  const all = await listQuotes(
    user.companyId ? { companyId: user.companyId } : { applicantId: user.id },
  );
  // 진행 내역은 계약이 잡힌 뒤부터 의미가 있다.
  const quotes = all.filter((q) => q.contract || q.settlement);

  const rows: Row[] = await Promise.all(
    quotes.map(async (quote) => {
      const [deposit, ticketOpen, facilityMeeting, ticketOpenMaterials, facilityMeetingMaterials] =
        await Promise.all([
          getDepositByQuoteId(quote.id),
          getTicketOpenByQuoteId(quote.id),
          getFacilityMeetingByQuoteId(quote.id),
          listAttachments(quote.id, "TICKET_OPEN"),
          listAttachments(quote.id, "FACILITY_MEETING"),
        ]);
      return {
        quote,
        depositConfirmed: deposit?.status === "CONFIRMED",
        ticketOpen: ticketOpen ?? null,
        facilityMeeting: facilityMeeting ?? null,
        ticketOpenMaterials,
        facilityMeetingMaterials,
      };
    }),
  );

  const settled = rows.filter((r) => r.quote.settlement);

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/mypage/history" currentUser={user} />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="lg">
          <PageHead
            en="BOOKING HISTORY"
            ko="대관 진행 내역"
            lead="계약이 확정된 신청 건의 티켓 오픈, 시설 회의, 정산 진행을 확인하고 자료를 제출하실 수 있습니다."
          />
        </Band>

        <Band tone="white">
          <QueryTabs
            param="stage"
            variant="line"
            ariaLabel="진행 단계"
            items={[
              {
                value: "ticket",
                label: "티켓 오픈 정보",
                panel:
                  rows.length === 0 ? (
                    <EmptyTab label="티켓 오픈" />
                  ) : (
                    <div className="space-y-10 pt-14">
                      {rows.map((r) => (
                        <section key={r.quote.id}>
                          <QuoteHeading quote={r.quote} />
                          <div className="mt-5">
                            <TicketOpenPanel
                              quoteId={r.quote.id}
                              depositConfirmed={r.depositConfirmed}
                              ticketOpen={r.ticketOpen}
                              materials={r.ticketOpenMaterials}
                              viewerRole="APPLICANT"
                            />
                          </div>
                        </section>
                      ))}
                    </div>
                  ),
              },
              {
                value: "meeting",
                label: "시설 회의",
                panel:
                  rows.length === 0 ? (
                    <EmptyTab label="시설 회의" />
                  ) : (
                    <div className="space-y-10 pt-14">
                      {rows.map((r) => (
                        <section key={r.quote.id}>
                          <QuoteHeading quote={r.quote} />
                          <div className="mt-5">
                            <FacilityMeetingPanel
                              quoteId={r.quote.id}
                              ticketOpenRegistered={!!r.ticketOpen?.openDate}
                              facilityMeeting={r.facilityMeeting}
                              materials={r.facilityMeetingMaterials}
                              viewerRole="APPLICANT"
                            />
                          </div>
                        </section>
                      ))}
                    </div>
                  ),
              },
              {
                value: "settlement",
                label: "정산",
                panel:
                  settled.length === 0 ? (
                    <EmptyTab label="정산" />
                  ) : (
                    <div className="space-y-10 pt-14">
                      {settled.map((r) => (
                        <section key={r.quote.id}>
                          <QuoteHeading quote={r.quote} />
                          <div className="mt-5 flex flex-wrap items-baseline justify-between gap-3 border-t-2 border-foreground pt-4">
                            <span className="text-xs text-muted">
                              확정일시{" "}
                              {new Date(r.quote.settlement!.decidedAt).toLocaleString("ko-KR")}
                            </span>
                            <span className="type-display text-h5-m tabular-nums sm:text-h5">
                              {won(r.quote.settlement!.finalTotal)}
                            </span>
                          </div>
                          <SettlementMutualConfirm
                            quoteId={r.quote.id}
                            settlement={r.quote.settlement!}
                            viewerRole="APPLICANT"
                          />
                        </section>
                      ))}
                    </div>
                  ),
              },
            ]}
          />

          <Note className="measure mt-10">
            계약서·전자 날인·세금계산서 등 신청 건별 상세는 대관 신청 현황에서 해당 건을 열어
            확인하실 수 있습니다.
          </Note>
        </Band>
      </main>

      <SiteFooter />
    </div>
  );
}
