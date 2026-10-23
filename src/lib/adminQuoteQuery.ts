import { CORE_LINE_IDS } from "./pricing/lineItemGroups";

export const ADMIN_QUOTE_SORT_KEYS = ["id", "company", "venue", "dates", "amount", "status"] as const;
export type AdminQuoteSortKey = (typeof ADMIN_QUOTE_SORT_KEYS)[number];
export type AdminQuoteSort = { key: AdminQuoteSortKey; direction: "asc" | "desc" };
export function adminQuoteSort(key?: string, direction?: string): AdminQuoteSort {
  return {
    key: ADMIN_QUOTE_SORT_KEYS.includes(key as AdminQuoteSortKey) ? key as AdminQuoteSortKey : "id",
    direction: direction === "asc" ? "asc" : "desc",
  };
}

// Only fixed expressions enter ORDER BY. User input never becomes SQL syntax.
export function adminQuoteOrder(sort: AdminQuoteSort): string {
  const safe = adminQuoteSort(sort.key, sort.direction);
  const direction = safe.direction === "asc" ? "ASC" : "DESC";
  const selection = "q.selection_json::jsonb";
  const venue = `CASE WHEN ${selection}->>'bookingMode' = 'SIMULTANEOUS' THEN '동시 대관' WHEN ${selection}->>'venueId' = 'medium-hall' THEN '중형공연장' ELSE '아레나' END`;
  const packageOrder = `(SELECT p.ordinality FROM rate_tables rt CROSS JOIN LATERAL jsonb_array_elements(rt.packages_json::jsonb) WITH ORDINALITY AS p(item, ordinality) WHERE rt.version = q.rate_table_version AND p.item->>'id' = ${selection}->>'packageId' LIMIT 1)`;
  const monthStart = `make_date((${selection}->'week'->>'year')::int, (${selection}->'week'->>'month')::int, 1)`;
  const firstTuesday = `(${monthStart} + ((9 - EXTRACT(ISODOW FROM ${monthStart})::int) % 7))`;
  const arenaDate = `(${firstTuesday} + ((${selection}->'week'->>'weekOfMonth')::int - 1) * 7)`;
  const date = `CASE WHEN ${selection}->>'venueId' = 'medium-hall' AND COALESCE(${selection}->>'bookingMode', 'SINGLE') <> 'SIMULTANEOUS' THEN (SELECT MIN(d)::date FROM jsonb_object_keys(COALESCE(NULLIF(${selection}->'midHallDays', 'null'::jsonb), '{}'::jsonb)) d) ELSE ${arenaDate} END`;
  // Same core-line set and effective VAT rule as contractSectionAmounts().
  const coreIds = [...CORE_LINE_IDS].map(id => `'${id}'`).join(",");
  const subtotal = `(SELECT COALESCE(SUM((item->>'amount')::numeric),0) FROM jsonb_array_elements(q.line_items_json::jsonb) item WHERE item->>'addonId' IN (${coreIds}) OR starts_with(item->>'addonId','midhall_show_'))`;
  const amount = `(${subtotal} + FLOOR(${subtotal} * CASE WHEN q.subtotal > 0 THEN q.vat::numeric / q.subtotal ELSE 0.1 END + 0.5))`;
  const status = `CASE WHEN q.status = 'SETTLED' THEN '정산 완료' WHEN q.status = 'CONTRACTED' THEN '계약 확정 (정산 대기)' WHEN q.review_json::jsonb->>'decision' = 'APPROVED' THEN '심사 승인' WHEN q.review_json::jsonb->>'decision' = 'HOLD' THEN '심사 보류' WHEN q.review_json::jsonb->>'decision' = 'REJECTED' THEN '심사 거절' ELSE '예상견적 (심사 대기)' END`;
  const expressions: Record<AdminQuoteSortKey, string[]> = {
    id: ["substring(q.id from '^([0-9]{4})-')::int", "substring(q.id from '-([0-9]+)$')::numeric"], company: ["u.company_name", "u.name"],
    venue: [venue, packageOrder], dates: [date], amount: [amount], status: [status],
  };
  return [...expressions[safe.key].map(expr => `${expr} ${direction} NULLS LAST`), "q.id DESC"].join(", ");
}

/** Treat %, _ and backslash as literal company-name characters. */
export function companySearchPattern(value: string): string {
  return `%${value.trim().slice(0, 200).replace(/[\\%_]/g, "\\$&")}%`;
}
