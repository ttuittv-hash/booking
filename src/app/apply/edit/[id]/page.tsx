import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { canAccessQuote, requireAccessedUser } from "@/lib/auth";
import {
  getCurrentRateTable,
  getQuoteById,
  getRatesContent,
  getScreenTextContent,
  listApprovedQuoteBlocks,
  listDateBlocks,
  listWeekDemand,
} from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { Band, PageHeading } from "@/components/ui/kit";
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
  if (quote.status !== "ESTIMATE") redirect(`/mypage/${id}`);
  // 심사가 시작된(review 기록이 있는) 신청서는 신청자가 직접 수정할 수 없다 —
  // PUT /api/quotes/[id]와 같은 기준(2026-08-22).
  if (quote.review) redirect(`/mypage/${id}`);

  const [rateTable, weekDemand, adminBlocks, approvedBlocks, ratesContent, screenText] =
    await Promise.all([
      getCurrentRateTable(),
      listWeekDemand(),
      listDateBlocks(),
      // 승인된 신청서가 잡은 날짜도 막는다. 자기 자신은 뺀다 — 자기가 잡은 날짜에
      // 막혀 수정이 안 되면 안 된다(2026-09-02).
      listApprovedQuoteBlocks(id),
      getRatesContent(),
      getScreenTextContent(),
    ]);
  const dateBlocks = [...adminBlocks, ...approvedBlocks];

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
            dateBlocks={dateBlocks}
            editingQuoteId={quote.id}
            initialSelection={quote.selection}
            liveHallRateContent={ratesContent.liveHall}
            wizardStepText={screenText.wizardSteps}
          />
        </WizardTextProvider>
      </main>

      <SiteFooter />
    </div>
  );
}
