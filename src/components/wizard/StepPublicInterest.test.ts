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
  extra: { disabledItems?: string[]; disabledGroups?: string[]; overrides?: Record<string, string> } = {},
) {
  const element = React.createElement(StepPublicInterest, {
    info,
    onChange: () => {},
    selection,
    midHallInfo: null,
    onChangeMidHallInfo: () => {},
    title: "공공/공익 참여 여부",
    disabledItems: extra.disabledItems,
    disabledGroups: extra.disabledGroups,
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
  it("항목 12개가 그룹 머리글과 함께 한 줄씩 나온다", () => {
    const html = render({ ...INITIAL_PERFORMANCE_INFO });
    for (const g of PUBLIC_INTEREST_GROUPS) expect(html).toContain(g.label);
    expect(html.match(/type="checkbox"/g)?.length).toBe(12);
    // 체크 전에는 상세 입력이 열리지 않는다
    expect(html).not.toContain("<textarea");
  });

  // [삭제 2026-09-07] "해당없음·미확정 부분 삭제" — "검토 중"/"없음" 상태 응답 그룹을
  // 화면에서 뺐다.
  it('"해당 없음 · 미확정" 그룹이 더 이상 없다', () => {
    const html = render({ ...INITIAL_PERFORMANCE_INFO });
    expect(html).not.toContain("해당 없음 · 미확정");
  });

  // [삭제 2026-09-08] 항목을 켜면 아래 펼쳐지던 "계획을 간단히 적어주세요." 텍스트박스를
  // 운영진 요청(nora)으로 뺐다 — 체크해도 더 이상 열리지 않는다. 예전 신청서에 남은
  // publicInterestDetails 값은 이 화면에서 그리지 않는다(심사 화면은 그대로).
  it("체크해도 텍스트박스가 더 이상 펼쳐지지 않는다", () => {
    const html = render({
      ...INITIAL_PERFORMANCE_INFO,
      publicInterestItems: ["DISCOUNT_ACCESS"],
      publicInterestDetails: { DISCOUNT_ACCESS: "휠체어석 20석" },
    });
    expect(html).not.toContain("<textarea");
    expect(html).not.toContain("계획을 간단히 적어주세요.");
    // 체크 상태 자체는 유지된다 — 정적 마크업은 class 뒤에 checked="" 가 온다
    expect(html.match(/checked=""/g)?.length).toBe(1);
  });

  // [수정 2026-09-07] "자료첨부 탭 외의 탭에서는 첨부파일 넣기 슬롯 제거" — 섹션 전체용
  // 파일 첨부칸을 뺐다. 증빙 자료는 STEP7 "자료 첨부" 탭에서 받는다.
  it("파일 첨부 입력이 더 이상 없다", () => {
    const html = render({
      ...INITIAL_PERFORMANCE_INFO,
      publicInterestItems: ["DISCOUNT_ACCESS", "ACCESSIBILITY_SUPPORT"],
    });
    expect(html).not.toContain('type="file"');
  });

  // [신규 2026-09-06] "체크박스 항목들은 항목 자체를 On/off 할 수 있고, 항목 자체도
  // 수정/편집 가능하게" — disabledItems로 끄기, wizardStrings 오버라이드로 라벨·힌트 편집.
  it("disabledItems에 있는 항목은 체크박스 자체가 사라진다", () => {
    const html = render({ ...INITIAL_PERFORMANCE_INFO }, { disabledItems: ["DISCOUNT_ACCESS"] });
    expect(html).not.toContain("문화소외계층 할인");
    // 나머지 11개는 그대로 남는다
    expect(html.match(/type="checkbox"/g)?.length).toBe(11);
  });

  it("그룹의 모든 항목이 꺼지면 그 그룹 머리글도 사라진다", () => {
    const accessGroup = PUBLIC_INTEREST_GROUPS.find((g) => g.key === "ACCESS")!;
    const html = render({ ...INITIAL_PERFORMANCE_INFO }, { disabledItems: [...accessGroup.items] });
    expect(html).not.toContain(accessGroup.label);
  });

  // [신규 2026-09-06] "대분류 슬롯 온오프도" — 그룹 자체를 꺼서 소속 항목 전부 숨기기.
  it("disabledGroups에 있는 그룹은 개별 항목이 켜져 있어도 통째로 사라진다", () => {
    const accessGroup = PUBLIC_INTEREST_GROUPS.find((g) => g.key === "ACCESS")!;
    const html = render({ ...INITIAL_PERFORMANCE_INFO }, { disabledGroups: ["ACCESS"] });
    expect(html).not.toContain(accessGroup.label);
    expect(html).not.toContain("문화소외계층 할인");
    // 다른 그룹은 그대로 남는다
    const consumerGroup = PUBLIC_INTEREST_GROUPS.find((g) => g.key === "CONSUMER")!;
    expect(html).toContain(consumerGroup.label);
  });

  it("wizardStrings 오버라이드로 항목 라벨·힌트를 바꿀 수 있다", () => {
    const html = render(
      { ...INITIAL_PERFORMANCE_INFO },
      {
        overrides: {
          "publicInterest.item.DISCOUNT_ACCESS.label": "테스트 라벨",
          "publicInterest.item.DISCOUNT_ACCESS.hint": "테스트 힌트",
        },
      },
    );
    expect(html).toContain("테스트 라벨");
    expect(html).toContain("테스트 힌트");
    expect(html).not.toContain("문화소외계층 할인");
  });

  it("오버라이드가 없으면 기본 라벨·힌트 그대로다", () => {
    const html = render({ ...INITIAL_PERFORMANCE_INFO }, { overrides: {} });
    expect(html).toContain("문화소외계층 할인 · 초청석");
  });
});
