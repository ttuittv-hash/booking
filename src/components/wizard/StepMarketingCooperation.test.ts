import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StepMarketingCooperation } from "./StepMarketingCooperation";
import type { MarketingCooperation } from "@/lib/pricing/types";

const base: MarketingCooperation = {
  channels: [],
  seoulArenaPromotionConsent: true,
  sponsorships: [],
  coPromotionConsent: null,
  coSponsorshipConsent: null,
  ticketSalesDataConsent: false,
  pollstarConsent: false,
  executionPlan: {
    targetDefinition: "", mediaMix: "", mediaMixOnline: "", mediaMixOffline: "", budget: "", timeline: "",
  },
};

function render(info: MarketingCooperation) {
  return renderToStaticMarkup(
    React.createElement(StepMarketingCooperation, { info, onChange: () => {}, title: "홍보", lead: "" }),
  );
}

describe("StepMarketingCooperation", () => {
  it("연계 안내 슬롯에 동의 체크박스가 없다", () => {
    const html = render(base);
    expect(html).toContain("마케팅 및 서비스 연계 안내");
    expect(html).not.toContain("마케팅/서비스 연계 동의");
  });

  it("온·오프라인 각각 항목 행 + 추가 버튼이 나온다", () => {
    const html = render(base);
    expect(html).toContain("온라인 마케팅 계획");
    expect(html).toContain("오프라인 마케팅 계획");
    expect(html.match(/＋ 항목 추가/g)?.length).toBe(2);
    expect(html).not.toContain("<textarea");
  });

  it("예전 줄글 임시저장본은 줄 단위 항목으로 읽힌다", () => {
    const html = render({
      ...base,
      executionPlan: { ...base.executionPlan, mediaMixOnline: "· SNS 광고\n· 포털 배너" },
    });
    expect(html).toContain('value="SNS 광고"');
    expect(html).toContain('value="포털 배너"');
  });
});
