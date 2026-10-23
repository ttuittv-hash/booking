import type { QuoteSelection } from "@/lib/pricing/types";
const KEY = "seoularena.design-preview.wizard.v1";
type Draft = { step: number; selection: QuoteSelection };
/** Preview drafts never read, overwrite or clear an actual application draft. */
export const previewDraftStore = {
  save(draft: Draft) {
    try { sessionStorage.setItem(KEY, JSON.stringify(draft)); } catch { /* Storage can be unavailable. */ }
  },
  load(): Draft | null {
    try {
      const value = JSON.parse(sessionStorage.getItem(KEY) || "null") as Draft | null;
      if (!value || !Number.isInteger(value.step) || value.step < 1 || value.step > 9 || !value.selection?.performanceInfo || !value.selection.week || !Array.isArray(value.selection.addons)) return null;
      return value;
    } catch { return null; }
  },
  clear() { try { sessionStorage.removeItem(KEY); } catch { /* Storage can be unavailable. */ } },
};
