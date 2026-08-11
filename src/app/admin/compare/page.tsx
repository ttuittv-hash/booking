import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { findUserById, getQuoteById } from "@/lib/db";
import { won } from "@/lib/format";
import { totalRentalDays } from "@/lib/pricing/rateTableUtils";
import type { Quote } from "@/lib/pricing/types";
import { AdminNav } from "@/components/admin/AdminNav";

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
  const quotes = (await Promise.all(quoteIds.map((id) => getQuoteById(id)))).filter(
    (q): q is Quote => !!q,
  );

  const applicantIds = [...new Set(quotes.map((q) => q.applicantId))];
  const applicantById = new Map(
    (await Promise.all(applicantIds.map((aid) => findUserById(aid)))).map((u, i) => [
      applicantIds[i],
      u,
    ]),
  );

  const allAddonIds = [
    ...new Set(quotes.flatMap((q) => q.lineItems.map((i) => i.addonId))),
  ];
  const labelByAddonId = new Map<string, string>();
  for (const q of quotes) {
    for (const item of q.lineItems) labelByAddonId.set(item.addonId, item.label);
  }

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin" user={user} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <Link href="/admin" className="text-[12.5px] font-medium text-accent hover:underline">
          ← 신청 현황
        </Link>
        <h1 className="mt-3 text-[22px] font-semibold">신청서 비교</h1>
        <p className="mt-2 text-[13.5px] text-muted">
          같은 주차를 두고 경합 중인 신청서를 나란히 비교할 때 사용하세요.
        </p>

        {quotes.length < 2 ? (
          <p className="mt-8 text-[13.5px] text-muted">
            비교하려면 신청 현황에서 2건 이상 선택해주세요.
          </p>
        ) : (
          <div className="mt-8 overflow-x-auto rounded border border-border">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border bg-panel text-left text-[11.5px] font-medium text-muted">
                  <th className="sticky left-0 bg-panel px-4 py-3">항목</th>
                  {quotes.map((q) => (
                    <th key={q.id} className="min-w-[220px] px-4 py-3">
                      <Link href={`/admin/${q.id}`} className="text-accent hover:underline">
                        {q.id}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <CompareRow label="신청자" values={quotes.map((q) => applicantById.get(q.applicantId)?.name ?? "-")} />
                <CompareRow
                  label="회사"
                  values={quotes.map((q) => applicantById.get(q.applicantId)?.companyName ?? "-")}
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

                <tr className="border-b border-border bg-panel/60">
                  <td colSpan={quotes.length + 1} className="px-4 py-2 text-[11.5px] font-semibold uppercase tracking-wide text-muted">
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
                <tr>
                  <td className="sticky left-0 bg-background px-4 py-3 text-[13.5px] font-semibold">합계</td>
                  {quotes.map((q) => (
                    <td key={q.id} className="px-4 py-3 text-[15px] font-semibold tabular-nums">
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
    <tr className="border-b border-border/70">
      <td className="sticky left-0 bg-background px-4 py-2.5 text-muted">{label}</td>
      {values.map((v, i) => (
        <td key={i} className="px-4 py-2.5 tabular-nums">
          {v}
        </td>
      ))}
    </tr>
  );
}
