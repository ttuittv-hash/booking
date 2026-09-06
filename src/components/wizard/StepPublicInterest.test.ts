import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StepPublicInterest } from "./StepPublicInterest";
import { WizardTextProvider } from "@/lib/content/wizardText";
import { INITIAL_PERFORMANCE_INFO } from "@/lib/pricing/performanceInfoDefaults";
import { PUBLIC_INTEREST_GROUPS } from "@/lib/pricing/types";
import type { PerformanceInfo, QuoteSelection } from "@/lib/pricing/types";

const selection = { bookingMode: "SINGLE" } as unknown as QuoteSelection;

function render(
  info: PerformanceInfo,
  files: { file: File }[] = [],
  extra: { disabledItems?: string[]; overrides?: Record<string, string> } = {},
) {
  const element = React.createElement(StepPublicInterest, {
    info,
    onChange: () => {},
    selection,
    midHallInfo: null,
    onChangeMidHallInfo: () => {},
    files: files as never,
    onFilesChange: () => {},
    title: "공공/공익 참여 여부",
    disabledItems: extra.disabledItems,
  });
  if (!extra.overrides) return renderToStaticMarkup(element);
  // .ts(비-JSX) 테스트라 createElement의 3-인자 children 형태를 못 쓴다(WizardTextProvider
  // 의 props 타입이 children을 필수로 선언해 타입 에러) — props로 children을 넘긴다.
  // eslint-disable-next-line react/no-children-prop
  const wrapped = React.createElement(WizardTextProvider, {
    overrides: extra.overrides,
    children: element,
  });
  return renderToStaticMarkup(wrapped);
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
    // [수정 2026-09-06] 파일 첨부는 더 이상 항목별이 아니라 섹션 전체에서 한 번만
    // 받는다 — 어느 항목을 골랐는지와 무관하게 맨 아래 첨부칸은 항상 있다.
    expect(html).toContain('type="file"');
    expect(html.match(/type="file"/g)?.length).toBe(1);
  });

  it("파일 첨부는 항목별이 아니라 섹션 전체에서 한 번만 받는다", () => {
    const html = render({
      ...INITIAL_PERFORMANCE_INFO,
      publicInterestItems: ["DISCOUNT_ACCESS", "ACCESSIBILITY_SUPPORT"],
    });
    expect(html.match(/type="file"/g)?.length).toBe(1);
  });

  // [신규 2026-09-06] "체크박스 항목들은 항목 자체를 On/off 할 수 있고, 항목 자체도
  // 수정/편집 가능하게" — disabledItems로 끄기, wizardStrings 오버라이드로 라벨·힌트 편집.
  it("disabledItems에 있는 항목은 체크박스 자체가 사라진다", () => {
    const html = render({ ...INITIAL_PERFORMANCE_INFO }, [], { disabledItems: ["DISCOUNT_ACCESS"] });
    expect(html).not.toContain("문화소외계층 할인");
    // 나머지 13개는 그대로 남는다
    expect(html.match(/type="checkbox"/g)?.length).toBe(13);
  });

  it("그룹의 모든 항목이 꺼지면 그 그룹 머리글도 사라진다", () => {
    const accessGroup = PUBLIC_INTEREST_GROUPS.find((g) => g.key === "ACCESS")!;
    const html = render({ ...INITIAL_PERFORMANCE_INFO }, [], { disabledItems: [...accessGroup.items] });
    expect(html).not.toContain(accessGroup.label);
  });

  it("wizardStrings 오버라이드로 항목 라벨·힌트를 바꿀 수 있다", () => {
    const html = render({ ...INITIAL_PERFORMANCE_INFO }, [], {
      overrides: {
        "publicInterest.item.DISCOUNT_ACCESS.label": "테스트 라벨",
        "publicInterest.item.DISCOUNT_ACCESS.hint": "테스트 힌트",
      },
    });
    expect(html).toContain("테스트 라벨");
    expect(html).toContain("테스트 힌트");
    expect(html).not.toContain("문화소외계층 할인");
  });

  it("오버라이드가 없으면 기본 라벨·힌트 그대로다", () => {
    const html = render({ ...INITIAL_PERFORMANCE_INFO }, [], { overrides: {} });
    expect(html).toContain("문화소외계층 할인 · 초청석");
  });
});
