import { expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PreviewDesignContext, PreviewRepeatRow, PreviewRecordTable } from "./BookingPreviewForms";

it("retains validation hooks and accessible labels while removing legacy grid styling", () => {
  const html = renderToStaticMarkup(React.createElement(PreviewDesignContext.Provider, { value: true },
    React.createElement(PreviewRepeatRow, {
      "data-field-key": "organizer", style: { gridTemplateColumns: "1fr 1fr" },
      children: React.createElement("input", { placeholder: "업체명", "data-field-key": "organizer.name", defaultValue: "기획사" }),
    } as React.ComponentProps<typeof PreviewRepeatRow>)));
  expect(html).toContain('data-field-key="organizer"');
  expect(html).toContain('data-field-key="organizer.name"');
  expect(html).toContain('aria-label="업체명"');
  expect(html).not.toContain('grid-template-columns');
});

it("renders repeated fields with one header and preserves field validation attributes", () => {
  const row = (key: string) => React.createElement(PreviewRepeatRow, { key },
    React.createElement("input", { "aria-label": "티켓 가격 (원)", "data-field-key": "ticket.price", value: "", readOnly: true }),
    React.createElement("button", { type: "button" }, "삭제"));
  const html = renderToStaticMarkup(React.createElement(PreviewDesignContext.Provider, { value: true },
    React.createElement(PreviewRecordTable, { label: "티켓 상품", children: [row("a"), row("b")] })));
  expect(html.match(/<thead>/g)).toHaveLength(1);
  expect(html.match(/data-field-key="ticket.price"/g)).toHaveLength(2);
  expect(html).toContain('aria-label="티켓 가격 (원) 2행"');
  expect(html).not.toContain('>관리<');
});
