import { expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PreviewDesignContext, PreviewRepeatRow } from "./BookingPreviewForms";

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
