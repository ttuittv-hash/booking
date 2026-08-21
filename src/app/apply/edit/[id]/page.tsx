import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { canAccessQuote, getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { getCurrentRateTable, getQuoteById, listDateBlocks, listWeekDemand } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { Band, PageHeading } from "@/components/ui/kit";
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
  const quote = await getQuoteById(id);
  if (!quote) notFound();
  if (!(await canAccessQuote(currentUser, quote))) notFound();
  if (quote.status !== "ESTIMATE") redirect(`/mypage/${id}`);

  const [rateTable, weekDemand, dateBlocks] = await Promise.all([
    getCurrentRateTable(),
    listWeekDemand(),
    listDateBlocks(),
  ]);

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
            lead={`신청번호 ${quote.id} · 심사 전(예상견적) 상태에서만 내용을 수정할 수 있습니다.`}
          />
        </Band>

        <WizardShell
          rateTable={rateTable}
          currentUser={currentUser}
          weekDemand={weekDemand}
          dateBlocks={dateBlocks}
          editingQuoteId={quote.id}
          initialSelection={quote.selection}
        />
      </main>

      <SiteFooter />
    </div>
  );
}
