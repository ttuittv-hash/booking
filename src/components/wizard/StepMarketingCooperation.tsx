"use client";

import type { ReactNode } from "react";
import { toggleClass } from "@/components/ui/kit";
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
  [개정 2026-09-02] 온라인·오프라인 마케팅 계획을 직접 쓰던 칸은 첨부파일로 바뀌었다.
  줄글을 항목 배열로 읽어 주던 planItems/joinPlanItems 도 함께 지웠다 — 이미 제출된
  신청서의 executionPlan.mediaMix* 값은 그대로 남아 있고 심사 채점(scoreQuote A-MKT)과
  운영자 상세 화면이 계속 읽는다. 새로 채우지 않을 뿐이다.
*/

// [개정 2026-09-08] "협업 내용에 반영해줘" — 제목을 "공동 콘텐츠·프로모션 및 서비스
// 협업"으로, 5항목(제목+설명 쌍)이던 목록을 4항목 단일 문장 목록으로 교체.
const SERVICE_SCOPE_ITEMS = [
  { key: "content", defaultText: "공연·아티스트 공식 채널과의 공동 게시물 및 SNS 협업" },
  { key: "media", defaultText: "아티스트 인터뷰, 현장 스케치 등 공연 연계 콘텐츠 제작" },
  { key: "promotion", defaultText: "서울아레나 공식 채널 및 시설 미디어와 연계한 공연 홍보" },
  {
    key: "service",
    defaultText: "공연 정보·콘텐츠·프로그램·이벤트 등의 서울아레나 온·오프라인 서비스 연계",
  },
] as const;

const EMPTY_CHANNEL = { platform: "", handle: "", followers: "" };

/**
 * [이동 2026-09-08] "해당 슬롯은 신청자 정보 및 규모 탭 하위 슬롯으로 이동" — 프로모션
 * 채널 입력을 이 스텝(마케팅 협업 안내)에서 빼서 StepAudience(신청자 정보 및 규모)
 * 안에서 보여준다. 데이터(selection.marketingCooperation.channels)는 그대로 두고
 * 렌더 위치만 옮긴다 — 다른 화면(제출 요약·운영자 상세)이 읽는 필드 경로가 안 바뀐다.
 */
export function PromotionChannelsFields({
  info,
  onChange,
}: {
  info: MarketingCooperation;
  onChange: (info: MarketingCooperation) => void;
}) {
  const { t, tStr } = useWizardText();

  function addChannel() {
    onChange({ ...info, channels: [...info.channels, { ...EMPTY_CHANNEL }] });
  }

  function updateChannel(index: number, patch: Partial<MarketingCooperation["channels"][number]>) {
    onChange({
      ...info,
      channels: info.channels.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    });
  }

  function removeChannel(index: number) {
    onChange({ ...info, channels: info.channels.filter((_, i) => i !== index) });
  }

  return (
    // [수정 2026-09-08] "프로모션 채널 위에 줄 굵은줄로" — StepAudience(신청자 정보 및
    // 규모) 하위로 옮긴 뒤 얇은 선(border/25)만 남아 위 슬롯과 경계가 약했다. 다른
    // 슬롯 경계와 같은 굵은 줄(border-t-2 border-foreground)로 맞춘다.
    <div className="border-t-2 border-foreground pt-5">
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
              className="flex h-10 w-10 shrink-0 items-center justify-center text-muted transition-colors hover:text-danger"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

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
  const { t } = useWizardText();

  function set<K extends keyof MarketingCooperation>(key: K, value: MarketingCooperation[K]) {
    onChange({ ...info, [key]: value });
  }

  return (
    <section>
      <StepHeading title={title} lead={lead} />

      <StepForm>
        {/* [이동 2026-09-08] "프로모션 채널(선택)" 슬롯은 StepAudience(신청자 정보 및
            규모)로 옮겼다 — PromotionChannelsFields, 이 파일 위쪽에서 export. */}
        <div className="border-t border-border/25 pt-5">
          <h3 className="type-kr-heading text-h6-m">
            {t("marketing.serviceLinkHeading", "공동 콘텐츠·프로모션 및 서비스 협업")}
          </h3>

          {/* [개정 2026-09-07] 법무 검토용으로 새로 전달받은 문구로 전면 교체 — 임의로
              다듬지 않고 그대로 옮긴다. */}
          <p className="mt-3 break-keep text-xs leading-6 text-muted">
            {t(
              "marketing.serviceLinkLead",
              "서울아레나는 공연 홍보와 관람객 경험 확대를 위해 서울아레나 공식 Web/App, SNS 등 " +
                "디지털 채널과 시설 내 공간·미디어를 기반으로 공연 연계 콘텐츠·서비스 및 프로모션을 " +
                "제안할 수 있습니다.",
            )}
          </p>

          {/* [개정 2026-09-07] "선택 박스는 협업 동의·협업 미동의 두 개로만 노출하고
              레이아웃을 예쁘게 — 협업 내용 박스 하나, 동의 박스 하나로" 피드백으로
              단일 목록 + 버튼 나열이던 걸 예전부터 쓰던 2단 박스 레이아웃으로 되돌렸다. */}
          {/* [수정 2026-09-09] "여백이 너무 많은.. 이상한" 것 점검 — 그리드 기본값
              (align-items: stretch)이 두 박스 높이를 서로 맞춰, 내용이 짧은 쪽(협업
              내용)에 큰 빈 공간이 생겼다. items-start로 각자 내용만큼만 높이를 갖게 한다. */}
          <div className="mt-4 grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border/25 bg-surface p-4">
              <p className="text-xs font-bold text-foreground">
                {t("marketing.cooperationContentHeading", "협업 내용")}
              </p>
              <ul className="mt-3 list-disc space-y-2 break-keep pl-4 text-xs leading-6 text-foreground">
                {SERVICE_SCOPE_ITEMS.map((item) => (
                  <li key={item.key}>{t(`marketing.serviceScope.${item.key}`, item.defaultText)}</li>
                ))}
              </ul>
            </div>

            <div
              className="rounded-lg border border-border/25 bg-surface p-4"
              data-field-key="marketing.contentCooperationConsent"
            >
              <p className="text-xs font-bold text-foreground">
                {t("marketing.cooperationConsentBoxHeading", "협업 동의 여부")}
              </p>
              <p className="mt-2 break-keep text-xs leading-6 text-muted">
                {t(
                  "marketing.cooperationWillingnessLabel",
                  "서울아레나의 공연 연계 콘텐츠·서비스 및 프로모션 제안에 대해 협의를 진행할 " +
                    "의향이 있는지 선택해 주세요.",
                )}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => set("contentCooperationConsent", true)}
                  className={toggleClass(info.contentCooperationConsent === true)}
                >
                  {t("marketing.cooperationConsentYes", "협업 동의")}
                </button>
                <button
                  type="button"
                  onClick={() => set("contentCooperationConsent", false)}
                  className={toggleClass(info.contentCooperationConsent === false)}
                >
                  {t("marketing.cooperationConsentNo", "협업 미동의")}
                </button>
              </div>
              <p className="mt-4 break-keep text-xs leading-6 text-muted">
                {t(
                  "marketing.cooperationWillingnessFootnote",
                  "※ 본 항목은 향후 협업 제안에 대한 협의 가능 여부를 확인하기 위한 것으로, 콘텐츠 " +
                    "또는 아티스트 IP의 사용 권한을 부여하거나 특정 콘텐츠·서비스·프로모션의 진행에 " +
                    "동의하는 것을 의미하지 않습니다. 실제 진행 여부와 활용 범위, 제공 정보, 권리 및 " +
                    "조건은 대관사 및 관련 권리자와 건별로 별도 협의하여 확정합니다.",
                )}
              </p>
            </div>
          </div>
        </div>

        {/* [삭제 2026-09-07] "동의 구하는거 그 두줄 자체가 없어야해" — 위 "공동
            프로모션 협조"/"공동 스폰서십·브랜딩 협업" 동의 여부를 묻던 두 줄을
            신청 단계에서 뺐다. coPromotionConsent/coSponsorshipConsent 필드 자체는
            남겨둔다(scoreQuote 는 애초에 정책상 채점 제외, 옛 제출본 데이터 보존). */}

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
