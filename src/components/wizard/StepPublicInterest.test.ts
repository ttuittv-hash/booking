import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StepPublicInterest } from "./StepPublicInterest";
import { INITIAL_PERFORMANCE_INFO } from "@/lib/pricing/performanceInfoDefaults";
import { PUBLIC_INTEREST_GROUPS } from "@/lib/pricing/types";
import type { PerformanceInfo, QuoteSelection } from "@/lib/pricing/types";

const selection = { bookingMode: "SINGLE" } as unknown as QuoteSelection;

function render(info: PerformanceInfo, files: { item: never; file: File }[] = []) {
  return renderToStaticMarkup(
    React.createElement(StepPublicInterest, {
      info,
      onChange: () => {},
      selection,
      midHallInfo: null,
      onChangeMidHallInfo: () => {},
      files: files as never,
      onFilesChange: () => {},
      title: "공공/공익 참여 여부",
    }),
  );
}

describe("StepPublicInterest 렌더", () => {
  it("항목 14개가 그룹 머리글과 함께 한 줄씩 나온다", () => {
    const html = render({ ...INITIAL_PERFORMANCE_INFO });
    for (const g of PUBLIC_INTEREST_GROUPS) expect(html).toContain(g.label);
    expect(html).toContain("해당 없음 · 미확정");
    expect(html.match(/type="checkbox"/g)?.length).toBe(14);
    // 체크 전에는 상세 입력이 열리지 않는다
    expect(html).not.toContain("<textarea");
  });

  it("체크한 항목만 텍스트박스·파일 첨부가 펼쳐진다", () => {
    const html = render({
      ...INITIAL_PERFORMANCE_INFO,
      publicInterestItems: ["DISCOUNT_ACCESS"],
      publicInterestDetails: { DISCOUNT_ACCESS: "휠체어석 20석" },
    });
    expect(html.match(/<textarea/g)?.length).toBe(1);
    expect(html).toContain("휠체어석 20석");
    expect(html).toContain('type="file"');
  });

  it('"검토 중"·"없음"은 상세를 받지 않는다', () => {
    const html = render({ ...INITIAL_PERFORMANCE_INFO, publicInterestItems: ["NONE"] });
    expect(html).not.toContain("<textarea");
    expect(html).not.toContain('type="file"');
  });
});
