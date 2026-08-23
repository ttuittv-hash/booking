"use client";

import { toggleClass } from "@/components/ui/kit";
import type { MarketingCooperation } from "@/lib/pricing/types";
import { StepHeading, StepForm } from "./StepHeading";

// 홍보 및 서비스 노출 동의는 무조건 선택해야 다음 단계로 넘어간다(2026-08-22,
// "홍보 및 서비스 노출 동의/비동의 -> 이거 선택은 무조건 필수"). 나머지(채널·스폰서십)는
// 선택 항목이라 여기서 검사하지 않는다.
export function validateMarketingCooperationStep(info: MarketingCooperation): string | null {
  if (info.seoulArenaPromotionConsent === null) {
    return "홍보 및 서비스 노출 동의 여부를 선택해 주세요.";
  }
  return null;
}

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
}: {
  info: MarketingCooperation;
  onChange: (info: MarketingCooperation) => void;
}) {
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
      <StepHeading title="홍보 및 서비스 계획" lead="프로모션 및 협업 관련 정보를 입력해 주세요." />

      <StepForm>
        <div className="border-t border-border/25 pt-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="type-kr-heading text-h6-m">마케팅 실행 계획(선택)</h3>
            <p className="text-xs text-muted">
              4요소 중 2개 이상을 구체적 수치·금액·일자로 작성해 주세요.
            </p>
          </div>
          <p className="mt-1 mb-3 break-keep text-xs leading-6 text-muted">
            공연 홍보를 어떻게 진행할 계획인지 대략적인 방향을 입력해 주세요.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-foreground">타겟 정의</label>
              <textarea
                value={info.executionPlan.targetDefinition}
                onChange={(e) => updateExecutionPlan({ targetDefinition: e.target.value })}
                placeholder="예: 20~30대 여성, 수도권 거주"
                rows={3}
                className="field-base"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-foreground">매체 믹스</label>
              <textarea
                value={info.executionPlan.mediaMix}
                onChange={(e) => updateExecutionPlan({ mediaMix: e.target.value })}
                placeholder="예: SNS 광고 60%, 옥외광고 30%, 언론 10%"
                rows={3}
                className="field-base"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-foreground">집행 예산(원)</label>
              <textarea
                value={info.executionPlan.budget}
                onChange={(e) => updateExecutionPlan({ budget: e.target.value })}
                placeholder="예: 총 50,000,000원"
                rows={3}
                className="field-base"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-foreground">타임라인(기간)</label>
              <textarea
                value={info.executionPlan.timeline}
                onChange={(e) => updateExecutionPlan({ timeline: e.target.value })}
                placeholder="예: 티켓 오픈 4주 전부터 공연일까지"
                rows={3}
                className="field-base"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border/25 pt-5">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="type-kr-heading text-h6-m">프로모션 채널(선택)</h3>
            <button type="button" onClick={addChannel} className={toggleClass(false)}>
              ＋ 채널 추가
            </button>
          </div>
          <p className="mt-1 mb-3 break-keep text-xs leading-6 text-muted">
            공연 운영 채널이 있다면 입력해주세요. 서울아레나와 연계하여 홍보 가능합니다.
          </p>
          {info.channels.length === 0 && <p className="text-xs text-muted">등록된 채널이 없습니다.</p>}
          <div className="space-y-2">
            {info.channels.map((row, i) => (
              <div
                key={i}
                className="grid grid-cols-1 gap-1.5 border-b border-border/15 py-2 sm:grid-cols-[1fr_2fr_1fr_auto]"
              >
                <input
                  value={row.platform}
                  placeholder="채널 (예: 인스타그램)"
                  onChange={(e) => updateChannel(i, { platform: e.target.value })}
                  className="field-base"
                />
                <input
                  value={row.handle}
                  placeholder="계정 / URL"
                  onChange={(e) => updateChannel(i, { handle: e.target.value })}
                  className="field-base"
                />
                <input
                  value={row.followers}
                  placeholder="구독자·팔로워 수"
                  onChange={(e) => updateChannel(i, { followers: e.target.value })}
                  className="field-base"
                />
                <button
                  type="button"
                  onClick={() => removeChannel(i)}
                  aria-label="채널 삭제"
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
          <h3 className="type-kr-heading text-h6-m">홍보 및 서비스 노출</h3>

          {/* 대관사가 부담 없이 읽을 수 있게 문장은 부드럽게 풀어 쓰되(2026-08-22,
              "대관사가 잘 이해할 수 있게 부드럽게" 피드백), "무엇을(제공 정보 및 콘텐츠)"과
              "어떻게(활용 목적 및 범위)"는 서로 다른 질문이라 한 박스로 뭉치지 않고
              두 박스로 나눠 보여준다("활용대상 박스, 노출/활용 범위박스를 두개 나눠서").
              문구는 2026-08-23에 정식 조항 텍스트로 교체됨. */}
          <p className="mt-3 break-keep text-xs leading-6 text-muted">
            서울아레나는 관람객에게 원활한 공연·이벤트 정보 및 서비스를 제공하기 위해
            대관사가 제공하는 공연 정보 및 관련 콘텐츠를 서울아레나 Web/App Service 등
            온·오프라인 채널에서 활용할 수 있습니다.
          </p>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border/25 bg-surface p-4">
              <p className="text-xs font-bold text-foreground">제공 정보 및 콘텐츠</p>
              <ul className="mt-1.5 list-disc space-y-1 break-keep pl-4 text-xs leading-6 text-muted">
                <li>공연·이벤트명, 아티스트, 공연 일정 및 프로그램 등 공연 기본 정보</li>
                <li>공연 소개, 포스터, 공식 이미지·영상 등 홍보 콘텐츠</li>
                <li>티켓 오픈·예매 및 관람 관련 정보</li>
                <li>입·퇴장, 운영시간, MD·F&amp;B, 부대행사 등 관람객 안내에 필요한 정보</li>
                <li>기타 공연 및 관람객 서비스 운영을 위해 상호 협의한 정보</li>
              </ul>
            </div>
            <div className="rounded-lg border border-border/25 bg-surface p-4">
              <p className="text-xs font-bold text-foreground">활용 목적 및 범위</p>
              <ul className="mt-1.5 list-disc space-y-1 break-keep pl-4 text-xs leading-6 text-muted">
                <li>서울아레나 Web/App Service 내 공연·이벤트 정보 제공</li>
                <li>공연 상세, 아티스트, 일정 등 공연 관련 콘텐츠 구성 및 노출</li>
                <li>공연·이벤트 홍보 및 프로모션</li>
                <li>관람객 특성 및 공연 일정에 따른 맞춤형 정보 제공·큐레이션</li>
                <li>입·퇴장, 혼잡시간, 시설 이용 등 관람객 안내 및 안전·질서 관리</li>
                <li>공연 및 관람객 서비스의 운영·개선</li>
                <li>공연장 운영 현황 분석 및 통계 데이터 구축·활용</li>
              </ul>
            </div>
          </div>

          <p className="mt-3 break-keep text-xs leading-6 text-muted">
            제공된 정보 및 콘텐츠는 해당 공연·이벤트의 관람객 서비스 제공, 홍보, 안전한
            공연장 운영 및 서울아레나 서비스 개선을 위한 목적으로 활용될 수 있습니다.
          </p>

          <p className="mt-3 break-keep text-xs leading-6 text-muted">
            이미지·영상 등의 사용 권한은 대관사가 미리 확보한 범위 내에서 제공해 주시면 되고,
            별도 협의가 필요한 콘텐츠는 서울아레나와 미리 상의해 주세요.
          </p>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => set("seoulArenaPromotionConsent", true)}
              className={toggleClass(info.seoulArenaPromotionConsent === true)}
            >
              동의
            </button>
            <button
              type="button"
              onClick={() => set("seoulArenaPromotionConsent", false)}
              className={toggleClass(info.seoulArenaPromotionConsent === false)}
            >
              비동의
            </button>
          </div>
          <p className="mt-2.5 break-keep text-xs text-muted">
            사전 동의 시, 세부 내역은 별도 협의를 통해 진행됩니다.
          </p>
        </div>

        <div className="mt-8 border-t border-border/25 pt-5">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="type-kr-heading text-h6-m">공동 스폰서십 · 브랜드 협업 연계(선택)</h3>
            <button type="button" onClick={addSponsorship} className={toggleClass(false)}>
              ＋ 항목 추가
            </button>
          </div>
          <p className="mt-1 mb-3 break-keep text-xs leading-6 text-muted">
            서울아레나의 공식 파트너 및 제휴 브랜드와 연계한 공동 스폰서십·프로모션 등 협업
            기회를 검토할 수 있습니다. 선택 시 공연·행사의 특성과 브랜드 적합성을 고려하여
            별도 협의를 통해 진행됩니다.
          </p>
          {info.sponsorships.length === 0 && (
            <p className="text-xs text-muted">등록된 스폰서십 · 협업 내역이 없습니다.</p>
          )}
          <div className="space-y-2">
            {info.sponsorships.map((row, i) => (
              <div
                key={i}
                className="grid grid-cols-1 gap-1.5 border-b border-border/15 py-2 sm:grid-cols-[1fr_2fr_auto]"
              >
                <input
                  value={row.brandName}
                  placeholder="스폰서 / 브랜드사명"
                  onChange={(e) => updateSponsorship(i, { brandName: e.target.value })}
                  className="field-base"
                />
                <input
                  value={row.campaignSummary}
                  placeholder="연계 캠페인 개요"
                  onChange={(e) => updateSponsorship(i, { campaignSummary: e.target.value })}
                  className="field-base"
                />
                <button
                  type="button"
                  onClick={() => removeSponsorship(i)}
                  aria-label="항목 삭제"
                  className="flex h-10 w-10 shrink-0 items-center justify-center text-muted transition-colors hover:text-danger"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 border-t border-border/25 pt-5">
          <h3 className="type-kr-heading text-h6-m">공연 관련 데이터 제공 협조</h3>
          <p className="mt-2 break-keep text-xs leading-6 text-muted">
            제공된 데이터는 서울아레나의 공연장 운영 통계에 활용됩니다.
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
                공연 실적 데이터 제공
              </label>
              <p className="mt-1.5 pl-6 break-keep text-xs leading-5 text-muted">
                {SALES_DATA_ITEMS.join(", ")} 등
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
                공연 데이터 외부 제공 동의 (Pollstar 등)
              </label>
              <p className="mt-1.5 pl-6 break-keep text-xs leading-5 text-muted">
                동의 시 아티스트, 공연일자, 공연장 정보와 함께 티켓 판매량, 판매가능 객석수,
                판매율, 티켓 가격 및 매출 등 개별 공연의 실적 정보가 외부 공연산업
                데이터베이스에 제공·공개될 수 있습니다.
                {!info.ticketSalesDataConsent && (
                  <span className="mt-1 block text-muted/80">
                    (좌측 공연 실적 데이터 제공에 동의해야 선택할 수 있습니다)
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
