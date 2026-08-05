import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { findUserById, getQuoteById } from "@/lib/db";
import { won } from "@/lib/format";
import { totalRentalDays } from "@/lib/pricing/rateTableUtils";
import type { Quote } from "@/lib/pricing/types";
import { Label } from "@/components/ui/kit";
import { AdminNav } from "@/components/admin/AdminNav";
import {
  LINK_BTN,
  PAGE_LEAD,
  PAGE_TITLE,
  TABLE,
  TABLE_WRAP,
  TH,
} from "@/components/admin/adminUi";

const STATUS_LABEL: Record<Quote["status"], string> = {
  ESTIMATE: "예상견적 (심사 대기)",
  CONTRACTED: "계약 확정 (정산 대기)",
  SETTLED: "정산 완료",
};

export default async function AdminComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/apply");

  const { ids } = await searchParams;
  const quoteIds = (ids ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const quotes = quoteIds.map((id) => getQuoteById(id)).filter((q): q is Quote => !!q);

  const allAddonIds = [
    ...new Set(quotes.flatMap((q) => q.lineItems.map((i) => i.addonId))),
  ];
  const labelByAddonId = new Map<string, string>();
  for (const q of quotes) {
    for (const item of q.lineItems) labelByAddonId.set(item.addonId, item.label);
  }

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin" />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 sm:py-10">
        <Link href="/admin" className={LINK_BTN}>
          ← 신청 현황
        </Link>

        <header className="mt-5 border-b border-border/20 pb-6">
          <Label className="mb-3 text-muted">Compare</Label>
          <h1 className={PAGE_TITLE}>신청서 비교</h1>
          <p className={PAGE_LEAD}>같은 주차를 두고 경합 중인 신청서를 나란히 비교할 때 사용하세요.</p>
        </header>

        {quotes.length < 2 ? (
          <p className="mt-8 text-s text-muted">비교하려면 신청 현황에서 2건 이상 선택해주세요.</p>
        ) : (
          <div className={`mt-8 ${TABLE_WRAP}`}>
            <table className={TABLE}>
              <thead>
                <tr className="border-b border-border-soft bg-background text-left">
                  <th className={`${TH} sticky left-0 bg-background`}>항목</th>
                  {quotes.map((q) => (
                    <th key={q.id} className={`${TH} min-w-[220px]`}>
                      <Link
                        href={`/admin/${q.id}`}
                        className="text-foreground underline decoration-accent decoration-2 underline-offset-4 transition-colors hover:text-muted-strong"
                      >
                        {q.id}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <CompareRow label="신청자" values={quotes.map((q) => findUserById(q.applicantId)?.name ?? "-")} />
                <CompareRow
                  label="회사"
                  values={quotes.map((q) => findUserById(q.applicantId)?.companyName ?? "-")}
                />
                <CompareRow
                  label="주차"
                  values={quotes.map(
                    (q) => `${q.selection.week.year}.${q.selection.week.month} ${q.selection.week.weekOfMonth}주차`,
                  )}
                />
                <CompareRow
                  label="총 대관일수"
                  values={quotes.map((q) => `${totalRentalDays(q.selection)}일`)}
                />
                <CompareRow
                  label="관객"
                  values={quotes.map((q) => `${q.selection.expectedAudience.toLocaleString()}명`)}
                />
                <CompareRow label="신청일시" values={quotes.map((q) => new Date(q.createdAt).toLocaleString("ko-KR"))} />
                <CompareRow label="상태" values={quotes.map((q) => STATUS_LABEL[q.status])} />

                <tr className="border-y border-border-soft bg-background">
                  <td colSpan={quotes.length + 1} className="type-label px-3 py-2 text-xs text-muted">
                    산출내역
                  </td>
                </tr>
                {allAddonIds.map((addonId) => (
                  <CompareRow
                    key={addonId}
                    label={labelByAddonId.get(addonId) ?? addonId}
                    values={quotes.map((q) => {
                      const item = q.lineItems.find((i) => i.addonId === addonId);
                      return item ? won(item.amount) : "-";
                    })}
                  />
                ))}
                <CompareRow label="소계 (VAT 별도)" values={quotes.map((q) => won(q.subtotal))} />
                <CompareRow label="부가세" values={quotes.map((q) => won(q.vat))} />
                <tr className="border-t border-border">
                  <td className="sticky left-0 bg-surface px-3 py-3 text-s font-bold">합계</td>
                  {quotes.map((q) => (
                    <td key={q.id} className="type-display px-3 py-3 text-h6-m tabular-nums">
                      {won(q.total)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

function CompareRow({ label, values }: { label: string; values: string[] }) {
  return (
    <tr className="border-b border-border-soft">
      <td className="sticky left-0 bg-surface px-3 py-2.5 text-xs text-muted">{label}</td>
      {values.map((v, i) => (
        <td key={i} className="px-3 py-2.5 tabular-nums">
          {v}
        </td>
      ))}
    </tr>
  );
}
