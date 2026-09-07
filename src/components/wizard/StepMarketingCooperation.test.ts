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
  contentCooperationConsent: null,
};

function render(info: MarketingCooperation) {
  return renderToStaticMarkup(
    React.createElement(StepMarketingCooperation, {
      info,
      onChange: () => {},
      title: "홍보",
      lead: "",
    }),
  );
}

describe("StepMarketingCooperation", () => {
  it("연계 안내 슬롯에 동의 체크박스가 없다", () => {
    const html = render(base);
    expect(html).toContain("공연 연계 콘텐츠·서비스 및 프로모션 협업");
    expect(html).not.toContain("마케팅/서비스 연계 동의");
  });

  // [신규 2026-09-07] "마케팅 및 서비스 연계 안내 내역을 상기 내역으로 변경" —
  // 법무 검토용 새 문구로 전면 교체. 기존 "주요 활용 범위"/"안내사항" 2단 박스는
  // 사라지고 5항목 단일 목록 + 협의 가능 여부 3택 1 + 각주로 바뀐다.
  it("새 5항목 목록과 협의 가능 여부 선택지, 각주가 모두 나온다", () => {
    const html = render(base);
    expect(html).toContain("공연 정보 연계 및 안내");
    expect(html).toContain("공연·아티스트 연계 콘텐츠");
    expect(html).toContain("공연 연계 관람객 서비스");
    expect(html).toContain("서울아레나 공간·미디어 연계");
    expect(html).toContain("공동 프로모션 및 마케팅");
    expect(html).toContain("협업 동의");
    expect(html).toContain("협업 미동의");
    expect(html).toContain("콘텐츠 또는 아티스트 IP의 사용 권한을 부여");
    // 예전 2단 박스("주요 활용 범위"/"안내사항")는 완전히 없어졌다
    expect(html).not.toContain("주요 활용 범위");
    expect(html).not.toContain("안내사항");
  });

  // [개정 2026-09-07] "홍보 및 서비스 계획 메뉴에서 마케팅 계획서 첨부 슬롯 삭제" —
  // 온라인·오프라인 계획을 첨부파일로 받던 슬롯 자체를 없앴다(2026-09-02 개정의
  // 반대 방향). executionPlan.mediaMix* 값은 옛 임시저장본 방어선으로만 남는다.
  it("마케팅 실행 계획 첨부 슬롯이 더 이상 없다", () => {
    const html = render(base);
    expect(html).not.toContain("마케팅 실행 계획(선택)");
    expect(html).not.toContain('type="file"');
  });

  it("직접 입력하던 온·오프라인 칸은 더 이상 없다", () => {
    const html = render(base);
    expect(html).not.toContain("온라인 마케팅 계획");
    expect(html).not.toContain("오프라인 마케팅 계획");
  });

  it("예전 임시저장본의 줄글이 남아 있어도 화면에 다시 그리지 않는다", () => {
    // 이미 제출된 신청서의 mediaMix* 값은 DB 에 그대로 남아 심사 채점과 운영자
    // 상세 화면이 읽는다. 신청 화면이 다시 채우지 않을 뿐이다.
    const html = render({
      ...base,
      executionPlan: { ...base.executionPlan, mediaMixOnline: "· SNS 광고\n· 포털 배너" },
    });
    expect(html).not.toContain("SNS 광고");
  });
});
