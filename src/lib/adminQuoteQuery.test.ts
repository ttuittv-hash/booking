import { describe, expect, it } from "vitest";
import { adminQuoteOrder, adminQuoteSort, companySearchPattern } from "./adminQuoteQuery";

describe("admin quote query boundary", () => {
  it("defaults to newest application number and rejects untrusted SQL fragments", () => {
    expect(adminQuoteSort()).toEqual({key:"id", direction:"desc"});
    expect(adminQuoteOrder(adminQuoteSort("id; DROP TABLE quotes", "asc; --"))).toBe(adminQuoteOrder({key:"id",direction:"desc"}));
  });
  it("keeps company dropdown and literal name-search inputs independent", () => {
    expect(companySearchPattern("  회사_100%\\지점  ")).toBe("%회사\\_100\\%\\\\지점%");
    expect(companySearchPattern("' OR true --")).toBe("%' OR true --%");
  });
  it("uses rate-table package order instead of package names within a venue", () => {
    const sql=adminQuoteOrder({key:"venue",direction:"asc"});
    expect(sql).toContain("WITH ORDINALITY");
    expect(sql).toContain("rt.version = q.rate_table_version");
    expect(sql).toContain("SIMULTANEOUS");
  });
  it("sorts displayed contract amounts, including VAT, rather than the total quote", () => {
    const sql=adminQuoteOrder({key:"amount",direction:"desc"});
    expect(sql).toContain("midhall_show_");
    expect(sql).toContain("extra_days_rest");
    expect(sql).toContain("q.vat::numeric / q.subtotal");
    expect(sql).not.toContain("q.total");
  });
});
