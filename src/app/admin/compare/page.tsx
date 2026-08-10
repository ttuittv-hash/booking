import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { findUserById, getQuoteById } from "@/lib/db";
import { won } from "@/lib/format";
import { totalRentalDays } from "@/lib/pricing/rateTableUtils";
import type { Quote } from "@/lib/pricing/types";
import { AdminNav } from "@/components/admin/AdminNav";
import {
  LINK_BTN,
  NONE,
  PAGE_LEAD,
  PAGE_TITLE,
  TABLE,
  TABLE_CARD,
  TABLE_HEAD,
  TABLE_HEAD_DESC,
  TABLE_HEAD_TITLE,
  TABLE_SCROLL,
  TD,
  TH,
  THEAD_ROW,
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
      <AdminNav active="/admin" user={user} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 sm:py-10">
        <Link href="/admin" className={LINK_BTN}>
          ← 신청 현황
        </Link>

        <header className="mt-5 border-b border-border/20 pb-6">
          <h1 className={PAGE_TITLE}>신청서 비교</h1>
          <p className={PAGE_LEAD}>같은 주차를 두고 경합 중인 신청서를 나란히 비교할 때 사용하세요.</p>
        </header>

        {quotes.length < 2 ? (
          <p className="mt-8 text-s text-muted">비교하려면 신청 현황에서 2건 이상 선택해주세요.</p>
        ) : (
          <div className={`mt-8 ${TABLE_CARD}`}>
            <div className={TABLE_HEAD}>
              <div>
                <p className={TABLE_HEAD_TITLE}>비교 대상 ({quotes.length}건)</p>
                <p className={TABLE_HEAD_DESC}>
                  신청번호를 누르면 해당 신청서 상세로 이동합니다.
                </p>
              </div>
            </div>
            <div className={TABLE_SCROLL}>
              <table className={TABLE}>
                <thead>
                  <tr className={THEAD_ROW}>
                    <th className={`${TH} sticky left-0 bg-background`}>항목</th>
                    {quotes.map((q) => (
                      <th key={q.id} className={`${TH} min-w-[220px]`}>
                        <Link href={`/admin/${q.id}`} className={LINK_BTN}>
                          {q.id}
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <CompareRow label="신청자" values={quotes.map((q) => findUserById(q.applicantId)?.name ?? NONE)} />
                  <CompareRow
                    label="회사"
                    values={quotes.map((q) => findUserById(q.applicantId)?.companyName ?? NONE)}
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
                    <td colSpan={quotes.length + 1} className="px-3 py-2 text-xs font-bold text-muted">
                      산출내역
                    </td>
                  </tr>
                  {allAddonIds.map((addonId) => (
                    <CompareRow
                      key={addonId}
                      label={labelByAddonId.get(addonId) ?? addonId}
                      values={quotes.map((q) => {
                        const item = q.lineItems.find((i) => i.addonId === addonId);
                        return item ? won(item.amount) : NONE;
                      })}
                    />
                  ))}
                  <CompareRow label="소계 (VAT 별도)" values={quotes.map((q) => won(q.subtotal))} />
                  <CompareRow label="부가세" values={quotes.map((q) => won(q.vat))} />
                  <tr className="border-t border-border">
                    <td className="sticky left-0 bg-panel px-3 py-3 text-s font-bold">합계</td>
                    {quotes.map((q) => (
                      <td key={q.id} className="type-display px-3 py-3 text-h6-m tabular-nums">
                        {won(q.total)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function CompareRow({ label, values }: { label: string; values: string[] }) {
  return (
    <tr className="border-b border-border-soft">
      <td className="sticky left-0 bg-panel px-3 py-2.5 text-xs text-muted">{label}</td>
      {values.map((v, i) => (
        <td key={i} className={`${TD} tabular-nums`}>
          {v}
        </td>
      ))}
    </tr>
  );
}
