/** Stable layout IDs are independent of DB-managed display text. */
export const RECORD_LAYOUTS = {
  contacts: [1, 2, 1, 1, 2],
  companyHistory: [3, 2, 2, 1, 1],
  organizers: [1, 5],
  artistHistory: [2, 2, 1, 4],
  performanceHistory: [3, 2, 2, 2, 1, 1, 1, 1],
  promotionChannels: [1, 3, 2],
  tickets: [3, 3],
} as const;
export type RecordLayout = keyof typeof RECORD_LAYOUTS;
export const DOCUMENT_CONTENT_COLUMNS = 6;
export const DOCUMENT_COLUMN_MIN_WIDTH = 104;
export function recordLayout(layout?: RecordLayout) {
  const spans = layout ? RECORD_LAYOUTS[layout] : undefined;
  const columns = (spans?.reduce<number>((sum, span) => sum + span, 0) ?? DOCUMENT_CONTENT_COLUMNS) + 1;
  return { spans, columns, minWidth: columns > DOCUMENT_CONTENT_COLUMNS + 1 ? columns * DOCUMENT_COLUMN_MIN_WIDTH : undefined };
}
