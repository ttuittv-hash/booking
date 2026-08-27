"use client";

import type { ReactNode } from "react";
import { ICON_BTN_SM, toggleClass } from "@/components/ui/kit";
import type { MarketingCooperation } from "@/lib/pricing/types";
import { useWizardText } from "@/lib/content/wizardText";
import { StepHeading, StepForm } from "./StepHeading";

// [개정 2026-08-27] "마케팅 및 서비스 연계 안내" 슬롯에서 동의 항목을 뺐다. 해제할 수
// 없는 잠긴 체크박스라 고를 것이 없었고, 그 하나 때문에 이 STEP 이 필수 게이트로 잡혀
// 있었다(validateMarketingCooperationStep 도 같이 삭제). 안내 문구는 그대로 남는다 —
// selection.marketingCooperation.seoulArenaPromotionConsent 는 계속 true 로 저장된다.
// true로 고정해 보여주므로(아래 체크박스가 disabled) 이 검사는 이제 실패할 일이
// 없지만, 옛 임시저장본을 열었을 때의 방어선으로 남겨둔다.

/*
  마케팅 실행 계획(온라인/오프라인)은 줄글이 아니라 항목을 하나씩 쌓는 자리다.
  예전에는 textarea 한 칸에 "· " 를 자동으로 붙여 여러 줄로 받았는데, 지우고 다시 쓰기가
  번거로워 항목 단위 행으로 바꿨다(2026-08-27). 저장은 배열로 하고, 예전 신청서·심사 채점이
  읽는 mediaMixOnline/mediaMixOffline 문자열은 이 배열에서 합성해 계속 채운다.
*/
function planItems(raw: string | undefined, items: string[] | undefined): string[] {
  if (Array.isArray(items)) return items.length > 0 ? items : [""];
  // 배열이 없던 시절 임시저장본 — 줄바꿈으로 나누고 앞의 가운데 점을 떼어 항목으로 읽는다.
  const parsed = (raw ?? "")
    .split("\n")
    .map((line) => line.replace(/^[·•-]\s*/, "").trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : [""];
}

/** 항목 배열 → 예전 문자열. 빈 항목은 버린다. */
function joinPlanItems(items: string[]): string {
  return items.map((v) => v.trim()).filter(Boolean).join("\n");
}

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

  function updateExecutionPlan(patch: Partial<MarketingCooperation["executionPlan"]>) {
    set("executionPlan", { ...info.executionPlan, ...patch });
  }

  // [개정 2026-08-26] "온라인/오프라인 마케팅 계획을 구분해서 입력" 요청 — 매체 믹스를
  // 둘로 나눈다. mediaMix(단일 텍스트)는 scoreQuote.ts의 A-MKT 채점이 그대로 읽고
  // 있어, 항목이 바뀔 때마다 합성해 하위호환을 유지한다.
  const onlineItems = planItems(info.executionPlan.mediaMixOnline, info.executionPlan.mediaMixOnlineItems);
  const offlineItems = planItems(info.executionPlan.mediaMixOffline, info.executionPlan.mediaMixOfflineItems);

  function updateMediaMix(patch: { online?: string[]; offline?: string[] }) {
    const online = patch.online ?? onlineItems;
    const offline = patch.offline ?? offlineItems;
    const onlineText = joinPlanItems(online);
    const offlineText = joinPlanItems(offline);
    const parts = [onlineText && `온라인: ${onlineText}`, offlineText && `오프라인: ${offlineText}`].filter(Boolean);
    updateExecutionPlan({
      mediaMixOnlineItems: online,
      mediaMixOfflineItems: offline,
      mediaMixOnline: onlineText,
      mediaMixOffline: offlineText,
      mediaMix: parts.join(" / "),
    });
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
              {t("marketing.executionPlanRequirementHint", "온라인·오프라인 중 1개 이상을 구체적 수치·금액·일자로 작성해 주세요.")}
            </p>
          </div>
          <p className="mt-1 mb-3 break-keep text-xs leading-6 text-muted">
            {t("marketing.executionPlanLead", "공연 홍보를 어떻게 진행할 계획인지 대략적인 방향을 항목별로 나눠 입력해 주세요.")}
          </p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {(
              [
                {
                  key: "online" as const,
                  items: onlineItems,
                  label: t("marketing.mediaMixOnlineLabel", "온라인 마케팅 계획"),
                  addLabel: t("marketing.mediaMixOnlineAdd", "＋ 항목 추가"),
                  placeholder: tStr("marketing.mediaMixOnlinePlaceholder", "예: SNS 광고 60%, 포털 배너 20%"),
                },
                {
                  key: "offline" as const,
                  items: offlineItems,
                  label: t("marketing.mediaMixOfflineLabel", "오프라인 마케팅 계획"),
                  addLabel: t("marketing.mediaMixOfflineAdd", "＋ 항목 추가"),
                  placeholder: tStr("marketing.mediaMixOfflinePlaceholder", "예: 옥외광고 30%, 지하철 광고, 언론 10%"),
                },
              ]
            ).map((group) => (
              <div key={group.key}>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <label className="block text-xs font-bold text-foreground">{group.label}</label>
                  <button
                    type="button"
                    onClick={() => updateMediaMix({ [group.key]: [...group.items, ""] })}
                    className={toggleClass(false)}
                  >
                    {group.addLabel}
                  </button>
                </div>
                <div className="space-y-2">
                  {group.items.map((value, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        value={value}
                        onChange={(e) =>
                          updateMediaMix({
                            [group.key]: group.items.map((v, j) => (j === i ? e.target.value : v)),
                          })
                        }
                        placeholder={group.placeholder}
                        className="field-base min-w-0 flex-1"
                      />
                      {/* 마지막 한 줄은 지우지 않고 비운다 — 행이 0개면 "＋ 항목 추가"를
                          눌러야만 다시 쓸 수 있어 빈 화면처럼 보인다. */}
                      <button
                        type="button"
                        aria-label={tStr("marketing.mediaMixRemoveItem", "항목 삭제")}
                        onClick={() =>
                          updateMediaMix({
                            [group.key]:
                              group.items.length > 1
                                ? group.items.filter((_, j) => j !== i)
                                : [""],
                          })
                        }
                        className={ICON_BTN_SM}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
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
            {t("marketing.serviceLinkHeading", "마케팅 및 서비스 연계 안내")}
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

        </div>

        {/* 2026-08-25, "공동스폰서십 슬롯은 삭제하고 이 내용을 넣어줘" — 자유 서술형
            스폰서십 목록 입력 슬롯과 아래 "공연 관련 데이터 제공 협조" 슬롯을 없애고,
            전달받은 디자인 시안 그대로 "협조 동의 항목" 한 슬롯으로 합쳤다. */}
        <div className="mt-8 border-t border-border/25 pt-5">
          <h3 className="type-kr-heading text-h6-m">
            {t("marketing.cooperationConsentHeading", "협조 동의 항목")}
          </h3>

          <div className="mt-3 space-y-2">
            <div className="flex flex-col gap-2 border border-border/25 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-s font-bold text-foreground">
                {t("marketing.coPromotionLabel", "공동 프로모션 협조")}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-xs text-muted">
                  {t("marketing.coPromotionHint", "2차 제작물 채널 활용 동의(좀 더 구체설명 예정)")}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => set("coPromotionConsent", true)}
                    className={toggleClass(info.coPromotionConsent === true)}
                  >
                    {t("marketing.consentYes", "동의")}
                  </button>
                  <button
                    type="button"
                    onClick={() => set("coPromotionConsent", false)}
                    className={toggleClass(info.coPromotionConsent === false)}
                  >
                    {t("marketing.consentNo", "비동의")}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 border border-border/25 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-s font-bold text-foreground">
                {t("marketing.coSponsorshipLabel", "공동 스폰서십·브랜딩 협업")}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-xs text-muted">
                  {t("marketing.coSponsorshipHint", "확보 시 즉시 통보·협업 의무(좀 더 구체 설명 예정)")}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => set("coSponsorshipConsent", true)}
                    className={toggleClass(info.coSponsorshipConsent === true)}
                  >
                    {t("marketing.consentYes", "동의")}
                  </button>
                  <button
                    type="button"
                    onClick={() => set("coSponsorshipConsent", false)}
                    className={toggleClass(info.coSponsorshipConsent === false)}
                  >
                    {t("marketing.consentNo", "비동의")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2026-08-25, "세일즈·실적 데이터 제공 협조 이거 박스형태로 있던거 그대로
            유지해야지.. 이 슬롯 기존대로 복구" — 위 "협조 동의 항목"에 합쳤던 걸
            되돌리고, 원래대로 독립 슬롯 + 2단 박스 레이아웃을 유지한다. */}
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
