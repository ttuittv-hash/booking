import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { canAccessQuote, getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { getCurrentRateTable, getQuoteById, listDateBlocks, listWeekDemand } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";
import { WizardShell } from "@/components/wizard/WizardShell";

export const metadata: Metadata = {
  title: "신청서 수정 | 서울아레나",
};

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  if (isPendingApplicant(currentUser)) redirect("/pending");

  const { id } = await params;
  const quote = getQuoteById(id);
  if (!quote) notFound();
  if (!canAccessQuote(currentUser, quote)) notFound();
  if (quote.status !== "ESTIMATE") redirect(`/mypage/${id}`);

  const [rateTable, weekDemand, dateBlocks] = await Promise.all([
    getCurrentRateTable(),
    Promise.resolve(listWeekDemand()),
    Promise.resolve(listDateBlocks()),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/apply" currentUser={currentUser} />
      <WizardShell
        rateTable={rateTable}
        currentUser={currentUser}
        weekDemand={weekDemand}
        dateBlocks={dateBlocks}
        editingQuoteId={quote.id}
        initialSelection={quote.selection}
      />
    </div>
  );
}
