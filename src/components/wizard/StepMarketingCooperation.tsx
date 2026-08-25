"use client";

import type { ReactNode } from "react";
import { toggleClass } from "@/components/ui/kit";
import type { MarketingCooperation } from "@/lib/pricing/types";
import { useWizardText } from "@/lib/content/wizardText";
import { StepHeading, StepForm } from "./StepHeading";

// 서비스 연계 동의는 무조건 체크해야 다음 단계로 넘어간다(2026-08-22, "이거 선택은
// 무조건 필수" 합의가 유지됨). 2026-08-25에 동의/비동의 두 버튼에서 단일 체크박스로
// 개편됐지만 필수 검사 자체는 그대로다 — 체크 안 하면(null) 통과 못 한다.
// 나머지(채널·스폰서십)는 선택 항목이라 여기서 검사하지 않는다.
export function validateMarketingCooperationStep(info: MarketingCooperation): string | null {
  if (info.seoulArenaPromotionConsent !== true) {
    return "서비스 연계 동의에 체크해 주세요.";
  }
  return null;
}

// "주요 활용 범위" 5항목 — 제목+설명 쌍. PLEDGE_ITEMS(StepSafetyPledge)와 같은 패턴으로
// key는 t() 키 조합에만 쓰고 화면에 노출되지 않는다.
const SERVICE_SCOPE_ITEMS = [
  {
    key: "info",
    defaultTitle: "공연·아티스트 정보 제공 및 홍보",
    defaultDesc: "공연 일정, 공연 소개, 아티스트 정보 등을 활용하여 공연 정보를 제공하고 공연 및 아티스트의 홍보를 지원합니다.",
  },
  {
    key: "content",
    defaultTitle: "공연 콘텐츠 제공",
    defaultDesc:
      "공연 포스터, 아티스트 이미지, 공식 사진·영상, 공연 프로그램, 세트리스트 등 공연과 관련된 콘텐츠를 관람객에게 제공할 수 있습니다.",
  },
  {
    key: "md",
    defaultTitle: "MD·팝업·이벤트 정보 제공",
    defaultDesc: "공식 MD, 팝업스토어, 팬 이벤트, 프로모션 등 공연과 연계된 현장 프로그램 및 부대 콘텐츠를 안내할 수 있습니다.",
  },
  {
    key: "guide",
    defaultTitle: "관람객 안내 및 편의 서비스",
    defaultDesc:
      "공연 일정 및 운영 정보, 입장·퇴장, 교통, 시설 이용, 현장 프로그램 등 관람에 필요한 정보를 서울아레나 웹·앱 서비스와 연계하여 제공할 수 있습니다.",
  },
  {
    key: "safety",
    defaultTitle: "현장 운영 및 안전·질서 안내",
    defaultDesc:
      "공연별 운영 정보와 현장 상황을 기반으로 관람객 동선, 혼잡 관리, 안전 및 질서 유지 등을 위한 안내 서비스에 활용할 수 있습니다.",
  },
] as const;

const EMPTY_CHANNEL = { platform: "", handle: "", followers: "" };

// 티켓 판매량·판매율 데이터 제공 체크박스가 정확히 무엇을 포함하는지 보여주는
// 항목 — 표나 박스가 아니라 체크박스 라벨 밑에 텍스트로만 나열한다(2026-08-22,
// "취득 어쩌구는 우리 서울아레나 입장" · "표로 넣지 말고 텍스트로 나열" 피드백).
const SALES_DATA_ITEMS = [
  "총 판매매수",
  "유료 판매율",
  "판매가능 객석수",
  "좌석등급별 판매율",
  "일자별 판매 추이",
  "평균 객단가",
  "티켓 가격대",
  "총 티켓 매출액",
  "예매처별 판매 비중",
];

export function StepMarketingCooperation({
  info,
  onChange,
  title,
  lead,
}: {
  info: MarketingCooperation;
  onChange: (info: MarketingCooperation) => void;
  title: ReactNode;
  lead: ReactNode;
}) {
  const { t, tStr } = useWizardText();

  function set<K extends keyof MarketingCooperation>(key: K, value: MarketingCooperation[K]) {
    onChange({ ...info, [key]: value });
  }

  function addChannel() {
    set("channels", [...info.channels, { ...EMPTY_CHANNEL }]);
  }

  function updateChannel(index: number, patch: Partial<MarketingCooperation["channels"][number]>) {
    set(
      "channels",
      info.channels.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function removeChannel(index: number) {
    set(
      "channels",
      info.channels.filter((_, i) => i !== index),
    );
  }

  function addSponsorship() {
    set("sponsorships", [...info.sponsorships, { brandName: "", campaignSummary: "" }]);
  }

  function updateSponsorship(index: number, patch: Partial<MarketingCooperation["sponsorships"][number]>) {
    set(
      "sponsorships",
      info.sponsorships.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function removeSponsorship(index: number) {
    set(
      "sponsorships",
      info.sponsorships.filter((_, i) => i !== index),
    );
  }

  function updateExecutionPlan(patch: Partial<MarketingCooperation["executionPlan"]>) {
    set("executionPlan", { ...info.executionPlan, ...patch });
  }

  return (
    <section>
      <StepHeading title={title} lead={lead} />

      <StepForm>
        <div className="border-t border-border/25 pt-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="type-kr-heading text-h6-m">
              {t("marketing.executionPlanHeading", "마케팅 실행 계획(선택)")}
            </h3>
            <p className="text-xs text-muted">
              {t("marketing.executionPlanRequirementHint", "4요소 중 2개 이상을 구체적 수치·금액·일자로 작성해 주세요.")}
            </p>
          </div>
          <p className="mt-1 mb-3 break-keep text-xs leading-6 text-muted">
            {t("marketing.executionPlanLead", "공연 홍보를 어떻게 진행할 계획인지 대략적인 방향을 입력해 주세요.")}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-foreground">
                {t("marketing.targetDefinitionLabel", "타겟 정의")}
              </label>
              <textarea
                value={info.executionPlan.targetDefinition}
                onChange={(e) => updateExecutionPlan({ targetDefinition: e.target.value })}
                placeholder={tStr("marketing.targetDefinitionPlaceholder", "예: 20~30대 여성, 수도권 거주")}
                rows={3}
                className="field-base"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-foreground">
                {t("marketing.mediaMixLabel", "매체 믹스")}
              </label>
              <textarea
                value={info.executionPlan.mediaMix}
                onChange={(e) => updateExecutionPlan({ mediaMix: e.target.value })}
                placeholder={tStr("marketing.mediaMixPlaceholder", "예: SNS 광고 60%, 옥외광고 30%, 언론 10%")}
                rows={3}
                className="field-base"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-foreground">
                {t("marketing.budgetLabel", "집행 예산(원)")}
              </label>
              <textarea
                value={info.executionPlan.budget}
                onChange={(e) => updateExecutionPlan({ budget: e.target.value })}
                placeholder={tStr("marketing.budgetPlaceholder", "예: 총 50,000,000원")}
                rows={3}
                className="field-base"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-foreground">
                {t("marketing.timelineLabel", "타임라인(기간)")}
              </label>
              <textarea
                value={info.executionPlan.timeline}
                onChange={(e) => updateExecutionPlan({ timeline: e.target.value })}
                placeholder={tStr("marketing.timelinePlaceholder", "예: 티켓 오픈 4주 전부터 공연일까지")}
                rows={3}
                className="field-base"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border/25 pt-5">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="type-kr-heading text-h6-m">{t("marketing.channelsHeading", "프로모션 채널(선택)")}</h3>
            <button type="button" onClick={addChannel} className={toggleClass(false)}>
              {t("marketing.addChannelButton", "＋ 채널 추가")}
            </button>
          </div>
          <p className="mt-1 mb-3 break-keep text-xs leading-6 text-muted">
            {t("marketing.channelsHint", "공연 운영 채널이 있다면 입력해주세요. 서울아레나와 연계하여 홍보 가능합니다.")}
          </p>
          {info.channels.length === 0 && (
            <p className="text-xs text-muted">{t("marketing.channelsEmpty", "등록된 채널이 없습니다.")}</p>
          )}
          <div className="space-y-2">
            {info.channels.map((row, i) => (
              <div
                key={i}
                className="grid grid-cols-1 gap-1.5 border-b border-border/15 py-2 sm:grid-cols-[1fr_2fr_1fr_auto]"
              >
                <input
                  value={row.platform}
                  placeholder={tStr("marketing.channelPlatformPlaceholder", "채널 (예: 인스타그램)")}
                  onChange={(e) => updateChannel(i, { platform: e.target.value })}
                  className="field-base"
                />
                <input
                  value={row.handle}
                  placeholder={tStr("marketing.channelHandlePlaceholder", "계정 / URL")}
                  onChange={(e) => updateChannel(i, { handle: e.target.value })}
                  className="field-base"
                />
                <input
                  value={row.followers}
                  placeholder={tStr("marketing.channelFollowersPlaceholder", "구독자·팔로워 수")}
                  onChange={(e) => updateChannel(i, { followers: e.target.value })}
                  className="field-base"
                />
                <button
                  type="button"
                  onClick={() => removeChannel(i)}
                  aria-label={tStr("marketing.removeChannelAriaLabel", "채널 삭제")}
                  // 입력 필드와 같은 무게의 버튼(보더·박스)이 아니라 옆에 딸린 보조
                  // 동작이라는 걸 보여주려고 아이콘만 둔다 — 삭제 버튼이 입력창과
                  // 같은 위계로 보인다는 지적으로 바꿨다.
                  className="flex h-10 w-10 shrink-0 items-center justify-center text-muted transition-colors hover:text-danger"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 border-t border-border/25 pt-5">
          <h3 className="type-kr-heading text-h6-m">
            {t("marketing.serviceLinkHeading", "서울아레나 웹·앱 서비스 연계")}
          </h3>

          {/* 2026-08-25, "서비스 에 대한 꼭지를 슬롯으로 하나 분리해서... 앱.웹서비스에 노출
              범위를 조정" 요청으로 기존 "홍보 및 서비스 노출"(제공 정보/활용 목적 두 박스 +
              동의/비동의 버튼)을 대체. 법무 검토용으로 전달받은 문구를 그대로 옮긴다 —
              임의로 다듬지 않는다. */}
          <p className="mt-3 break-keep text-xs leading-6 text-muted">
            {t(
              "marketing.serviceLinkLead",
              "서울아레나는 관람객에게 보다 편리하고 풍부한 공연 경험을 제공하기 위해, 대관사가 " +
                "제공하는 공연·아티스트 관련 정보 및 콘텐츠를 서울아레나 공식 웹사이트 및 모바일 " +
                "서비스에 연계하여 제공할 수 있습니다.",
            )}
          </p>

          {/* 2026-08-25, "너무 나열이야.. 박스 형태로.. 주요활용 범위, 안내 사항을 가로 축을
              반으로 나눠서" 피드백 — 세로로 죽 나열하던 두 섹션을 예전 "제공 정보 및
              콘텐츠 / 활용 목적 및 범위" 두 박스 레이아웃과 같은 grid-cols-2 박스로 되돌림. */}
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border/25 bg-surface p-4">
              <p className="text-xs font-bold text-foreground">
                {t("marketing.serviceScopeHeading", "주요 활용 범위")}
              </p>
              <ul className="mt-2 space-y-3">
                {SERVICE_SCOPE_ITEMS.map((item) => (
                  <li key={item.key}>
                    <p className="text-xs font-bold text-foreground">
                      {t(`marketing.serviceScope.${item.key}.title`, item.defaultTitle)}
                    </p>
                    <p className="mt-1 break-keep text-xs leading-6 text-muted">
                      {t(`marketing.serviceScope.${item.key}.desc`, item.defaultDesc)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-border/25 bg-surface p-4">
              <p className="text-xs font-bold text-foreground">
                {t("marketing.serviceNoticeHeading", "안내사항")}
              </p>
              <ul className="mt-2 list-disc space-y-1.5 break-keep pl-4 text-xs leading-6 text-muted">
                <li>
                  {t(
                    "marketing.serviceNoticeItem1",
                    "실제 활용되는 정보 및 콘텐츠의 제공 범위, 공개 여부, 노출 시점 등은 공연 준비 " +
                      "과정에서 대관사와 협의하여 확정합니다.",
                  )}
                </li>
                <li>
                  {t(
                    "marketing.serviceNoticeItem2",
                    "대관 신청 단계에서는 별도의 콘텐츠 파일을 제출하지 않으며, 필요한 자료는 공연 " +
                      "준비 과정에서 별도로 요청할 수 있습니다.",
                  )}
                </li>
                <li>
                  {t(
                    "marketing.serviceNoticeItem3",
                    "대관사가 제공하는 이미지·영상 등 콘텐츠는 서울아레나 웹·앱 서비스에서 활용 " +
                      "가능한 권리를 확보한 자료를 기준으로 합니다.",
                  )}
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs font-bold text-foreground">
              {t("marketing.serviceConsentHeading", "서비스 연계 동의")}
            </p>
            <label className="mt-2 flex cursor-pointer items-start gap-2 text-s">
              <input
                type="checkbox"
                checked={info.seoulArenaPromotionConsent === true}
                onChange={(e) => set("seoulArenaPromotionConsent", e.target.checked ? true : null)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
              />
              <span className="break-keep leading-6">
                {t(
                  "marketing.serviceConsentLabel",
                  "위 내용을 확인하였으며, 공연·아티스트 관련 정보 및 콘텐츠를 상기 목적에 따라 " +
                    "서울아레나 공식 웹사이트 및 모바일 서비스에 연계·활용하는 것에 동의합니다.",
                )}
              </span>
            </label>
          </div>
        </div>

        <div className="mt-8 border-t border-border/25 pt-5">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="type-kr-heading text-h6-m">
              {t("marketing.sponsorshipsHeading", "공동 스폰서십 · 브랜드 협업 연계(선택)")}
            </h3>
            <button type="button" onClick={addSponsorship} className={toggleClass(false)}>
              {t("marketing.addSponsorshipButton", "＋ 항목 추가")}
            </button>
          </div>
          <p className="mt-1 mb-3 break-keep text-xs leading-6 text-muted">
            {t(
              "marketing.sponsorshipsHint",
              "서울아레나의 공식 파트너 및 제휴 브랜드와 연계한 공동 스폰서십·프로모션 등 협업 " +
                "기회를 검토할 수 있습니다. 선택 시 공연·행사의 특성과 브랜드 적합성을 고려하여 " +
                "별도 협의를 통해 진행됩니다.",
            )}
          </p>
          {info.sponsorships.length === 0 && (
            <p className="text-xs text-muted">
              {t("marketing.sponsorshipsEmpty", "등록된 스폰서십 · 협업 내역이 없습니다.")}
            </p>
          )}
          <div className="space-y-2">
            {info.sponsorships.map((row, i) => (
              <div
                key={i}
                className="grid grid-cols-1 gap-1.5 border-b border-border/15 py-2 sm:grid-cols-[1fr_2fr_auto]"
              >
                <input
                  value={row.brandName}
                  placeholder={tStr("marketing.sponsorshipBrandNamePlaceholder", "스폰서 / 브랜드사명")}
                  onChange={(e) => updateSponsorship(i, { brandName: e.target.value })}
                  className="field-base"
                />
                <input
                  value={row.campaignSummary}
                  placeholder={tStr("marketing.sponsorshipCampaignSummaryPlaceholder", "연계 캠페인 개요")}
                  onChange={(e) => updateSponsorship(i, { campaignSummary: e.target.value })}
                  className="field-base"
                />
                <button
                  type="button"
                  onClick={() => removeSponsorship(i)}
                  aria-label={tStr("marketing.removeSponsorshipAriaLabel", "항목 삭제")}
                  className="flex h-10 w-10 shrink-0 items-center justify-center text-muted transition-colors hover:text-danger"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 border-t border-border/25 pt-5">
          <h3 className="type-kr-heading text-h6-m">
            {t("marketing.dataConsentHeading", "공연 관련 데이터 제공 협조")}
          </h3>
          <p className="mt-2 break-keep text-xs leading-6 text-muted">
            {t("marketing.dataConsentHint", "제공된 데이터는 서울아레나의 공연장 운영 통계에 활용됩니다.")}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <div>
              <label className="flex cursor-pointer items-center gap-2 text-s">
                <input
                  type="checkbox"
                  checked={info.ticketSalesDataConsent}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    // 오른쪽(외부 제공 동의)은 이 실적 데이터를 서울아레나가 받아야
                    // 성립하는 항목이라, 왼쪽을 끄면 같이 꺼서 논리적으로 불가능한
                    // 조합(왼쪽 비동의 + 오른쪽 동의)이 저장되지 않게 한다(2026-08-22).
                    onChange({
                      ...info,
                      ticketSalesDataConsent: checked,
                      pollstarConsent: checked ? info.pollstarConsent : false,
                    });
                  }}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                {t("marketing.salesDataConsentLabel", "공연 실적 데이터 제공")}
              </label>
              <p className="mt-1.5 pl-6 break-keep text-xs leading-5 text-muted">
                {t("marketing.salesDataItemsList", SALES_DATA_ITEMS.join(", "))}{" "}
                {t("marketing.salesDataItemsSuffix", "등")}
              </p>
            </div>
            <div>
              <label
                className={`flex items-center gap-2 text-s ${
                  info.ticketSalesDataConsent ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={info.pollstarConsent}
                  disabled={!info.ticketSalesDataConsent}
                  onChange={(e) => set("pollstarConsent", e.target.checked)}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                {t("marketing.pollstarConsentLabel", "공연 데이터 외부 제공 동의 (Pollstar 등)")}
              </label>
              <p className="mt-1.5 pl-6 break-keep text-xs leading-5 text-muted">
                {t(
                  "marketing.pollstarConsentHint",
                  "동의 시 아티스트, 공연일자, 공연장 정보와 함께 티켓 판매량, 판매가능 객석수, " +
                    "판매율, 티켓 가격 및 매출 등 개별 공연의 실적 정보가 외부 공연산업 " +
                    "데이터베이스에 제공·공개될 수 있습니다.",
                )}
                {!info.ticketSalesDataConsent && (
                  <span className="mt-1 block text-muted/80">
                    {t(
                      "marketing.pollstarConsentDisabledNote",
                      "(좌측 공연 실적 데이터 제공에 동의해야 선택할 수 있습니다)",
                    )}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </StepForm>
    </section>
  );
}
